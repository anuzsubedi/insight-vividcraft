-- Add preview content to notifications
ALTER TABLE notifications 
ADD COLUMN preview_content TEXT,
ADD COLUMN preview_media_url TEXT,
ADD COLUMN consolidated_notifications jsonb[] DEFAULT '{}',
ADD COLUMN category text CHECK (category IN ('social', 'achievement', 'mention', 'system'));

-- Add indexes for better performance
CREATE INDEX idx_notifications_user_created ON notifications(user_id, created_at DESC);
CREATE INDEX idx_notifications_viewed ON notifications(user_id, is_viewed) WHERE NOT is_viewed;

-- Add cascading delete for post_id
ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS fk_notifications_post_id,
ADD CONSTRAINT fk_notifications_post_id
    FOREIGN KEY (post_id)
    REFERENCES posts(id)
    ON DELETE CASCADE;

-- Create a function to consolidate similar notifications
CREATE OR REPLACE FUNCTION consolidate_notifications()
RETURNS trigger AS $$
BEGIN
    -- Find similar notifications in the last hour
    WITH similar_notifications AS (
        SELECT id, created_at
        FROM notifications
        WHERE user_id = NEW.user_id
        AND type = NEW.type
        AND target_type = NEW.target_type
        AND target_id = NEW.target_id
        AND created_at > NOW() - INTERVAL '1 hour'
        AND id != NEW.id
    )
    UPDATE notifications
    SET consolidated_count = (
        SELECT COUNT(*) + 1
        FROM similar_notifications
    )
    WHERE id = NEW.id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for notification consolidation
CREATE TRIGGER trigger_consolidate_notifications
AFTER INSERT ON notifications
FOR EACH ROW
EXECUTE FUNCTION consolidate_notifications();
