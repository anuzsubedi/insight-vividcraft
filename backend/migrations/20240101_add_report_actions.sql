-- Add reports table if it doesn't exist
CREATE TABLE IF NOT EXISTS reports (
    id uuid NOT NULL DEFAULT uuid_generate_v4() PRIMARY KEY,
    target_id text NOT NULL,
    user_id uuid NOT NULL,
    category text NOT NULL,
    reason text DEFAULT ''::text,
    created_at timestamp without time zone DEFAULT now(),
    target_type text NOT NULL DEFAULT 'post'::text,
    status text NOT NULL DEFAULT 'pending'::text,
    reviewed_by uuid,
    reviewed_at timestamp without time zone
);

-- Add report_actions table if it doesn't exist
CREATE TABLE IF NOT EXISTS report_actions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    report_id uuid NOT NULL REFERENCES reports(id),
    admin_id uuid NOT NULL REFERENCES users(id),
    action_type text NOT NULL CHECK (action_type IN ('ban', 'post_ban', 'comment_ban', 'delete_post', 'delete_comment', 'dismiss')),
    created_at timestamp NOT NULL DEFAULT now(),
    details jsonb,
    expires_at timestamp
);

-- Add user_restrictions table if it doesn't exist
CREATE TABLE IF NOT EXISTS user_restrictions (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES users(id),
    restriction_type text NOT NULL CHECK (restriction_type IN ('ban', 'post_ban', 'comment_ban')),
    expires_at timestamp,
    created_at timestamp NOT NULL DEFAULT now(),
    created_by uuid NOT NULL REFERENCES users(id),
    reason text,
    report_id uuid REFERENCES reports(id)
);

-- Add content_moderation table to track admin actions on content
CREATE TABLE IF NOT EXISTS content_moderation (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    target_id text NOT NULL,
    target_type text NOT NULL CHECK (target_type IN ('post', 'comment')),
    action_type text NOT NULL CHECK (action_type IN ('remove', 'delete')),
    admin_id uuid NOT NULL REFERENCES users(id),
    report_id uuid REFERENCES reports(id),
    created_at timestamp NOT NULL DEFAULT now(),
    details jsonb
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_reviewed_by ON reports(reviewed_by);
CREATE INDEX IF NOT EXISTS idx_reports_target_id ON reports(target_id);
CREATE INDEX IF NOT EXISTS idx_report_actions_report_id ON report_actions(report_id);
CREATE INDEX IF NOT EXISTS idx_report_actions_admin_id ON report_actions(admin_id);
CREATE INDEX IF NOT EXISTS idx_user_restrictions_user_id ON user_restrictions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_restrictions_created_by ON user_restrictions(created_by);
CREATE INDEX IF NOT EXISTS idx_content_moderation_target ON content_moderation(target_id, target_type);
CREATE INDEX IF NOT EXISTS idx_content_moderation_admin ON content_moderation(admin_id);
CREATE INDEX IF NOT EXISTS idx_content_moderation_report ON content_moderation(report_id);

-- Create a trigger to notify admins of new reports
CREATE OR REPLACE FUNCTION notify_new_report() RETURNS trigger AS $$
BEGIN
    PERFORM pg_notify('new_report', json_build_object(
        'report_id', NEW.id,
        'target_type', NEW.target_type,
        'category', NEW.category,
        'created_at', NEW.created_at
    )::text);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS notify_report_created ON reports;
CREATE TRIGGER notify_report_created
    AFTER INSERT ON reports
    FOR EACH ROW
    EXECUTE FUNCTION notify_new_report();

-- Create function to handle report actions with improved transaction handling
CREATE OR REPLACE FUNCTION handle_report(
    p_report_id uuid,
    p_admin_id uuid,
    p_action text,
    p_details jsonb
) RETURNS void AS $$
DECLARE
    v_target_id text;
    v_target_type text;
    v_user_id uuid;
BEGIN
    -- Start transaction
    BEGIN
        -- Get report details
        SELECT target_id, target_type, user_id
        INTO v_target_id, v_target_type, v_user_id
        FROM reports
        WHERE id = p_report_id
        FOR UPDATE;

        IF NOT FOUND THEN
            RAISE EXCEPTION 'Report not found';
        END IF;

        -- Update report status
        UPDATE reports
        SET status = 'reviewed',
            reviewed_by = p_admin_id,
            reviewed_at = now()
        WHERE id = p_report_id;

        -- Create action record
        INSERT INTO report_actions (
            report_id,
            admin_id,
            action_type,
            details,
            expires_at
        ) VALUES (
            p_report_id,
            p_admin_id,
            p_action,
            p_details,
            (p_details->>'expiresAt')::timestamp
        );

        -- Handle user restrictions
        IF p_action IN ('ban', 'post_ban', 'comment_ban') THEN
            -- First check if there's already an active restriction
            DELETE FROM user_restrictions
            WHERE user_id = v_user_id 
            AND restriction_type = p_action
            AND (expires_at IS NULL OR expires_at > now());

            -- Create new restriction
            INSERT INTO user_restrictions (
                user_id,
                restriction_type,
                expires_at,
                created_by,
                reason,
                report_id
            ) VALUES (
                v_user_id,
                p_action,
                (p_details->>'expiresAt')::timestamp,
                p_admin_id,
                p_details->>'reason',
                p_report_id
            );
        END IF;

        -- Handle content deletion/removal
        IF p_action = 'delete_post' AND v_target_type = 'post' THEN
            -- Only mark the post as deleted, leave comments untouched
            UPDATE posts
            SET deleted_at = now()
            WHERE id::text = v_target_id;

            -- Log the moderation action
            INSERT INTO content_moderation (
                target_id,
                target_type,
                action_type,
                admin_id,
                report_id,
                details
            ) VALUES (
                v_target_id,
                'post',
                'delete',
                p_admin_id,
                p_report_id,
                jsonb_build_object(
                    'reason', p_details->>'reason',
                    'category', (SELECT category FROM reports WHERE id = p_report_id)
                )
            );

        ELSIF p_action = 'delete_comment' AND v_target_type = 'comment' THEN
            -- Only remove the specific comment, keep replies visible
            UPDATE comments
            SET removed_at = now()
            WHERE id::text = v_target_id;

            -- Log the moderation action
            INSERT INTO content_moderation (
                target_id,
                target_type,
                action_type,
                admin_id,
                report_id,
                details
            ) VALUES (
                v_target_id,
                'comment',
                'remove',
                p_admin_id,
                p_report_id,
                jsonb_build_object(
                    'reason', p_details->>'reason',
                    'category', (SELECT category FROM reports WHERE id = p_report_id)
                )
            );
        END IF;

    EXCEPTION WHEN OTHERS THEN
        RAISE; -- Re-raise the error to trigger rollback
    END;
END;
$$ LANGUAGE plpgsql;

-- Function to get moderation history for content
CREATE OR REPLACE FUNCTION get_content_moderation_history(
    p_target_id text,
    p_target_type text
) RETURNS TABLE (
    moderation_id uuid,
    action_type text,
    admin_username text,
    admin_display_name text,
    created_at timestamp,
    report_category text,
    reason text
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.id as moderation_id,
        cm.action_type,
        u.username as admin_username,
        u.display_name as admin_display_name,
        cm.created_at,
        r.category as report_category,
        cm.details->>'reason' as reason
    FROM content_moderation cm
    JOIN users u ON u.id = cm.admin_id
    LEFT JOIN reports r ON r.id = cm.report_id
    WHERE cm.target_id = p_target_id
    AND cm.target_type = p_target_type
    ORDER BY cm.created_at DESC;
END;
$$ LANGUAGE plpgsql;