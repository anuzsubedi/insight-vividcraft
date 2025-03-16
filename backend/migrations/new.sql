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
            -- Delete associated reactions first
            DELETE FROM post_reactions WHERE post_id = v_target_id::integer;
            
            -- Delete associated comments and their reactions
            DELETE FROM comment_reactions 
            WHERE comment_id IN (
                SELECT id FROM comments WHERE post_id = v_target_id::integer
            );
            DELETE FROM comments WHERE post_id = v_target_id::integer;
            
            -- Finally delete the post
            DELETE FROM posts WHERE id = v_target_id::integer;

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