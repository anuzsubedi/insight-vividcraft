-- Add fields for enhanced notification consolidation
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS consolidated_count INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS event_group TEXT,
ADD COLUMN IF NOT EXISTS first_actor_id INTEGER,
ADD COLUMN IF NOT EXISTS second_actor_id INTEGER,
ADD COLUMN IF NOT EXISTS milestone_value INTEGER;

-- Add index on event_group for faster consolidation queries
CREATE INDEX IF NOT EXISTS idx_notifications_event_group ON notifications(user_id, event_group);

-- Add clear notification function
CREATE OR REPLACE FUNCTION clear_old_notifications(user_id_param INTEGER, days_to_keep INTEGER)
RETURNS VOID AS $$
BEGIN
  DELETE FROM notifications 
  WHERE user_id = user_id_param 
  AND created_at < NOW() - (days_to_keep || ' days')::INTERVAL;
END;
$$ LANGUAGE plpgsql;

-- Drop existing consolidation trigger if it exists
DROP TRIGGER IF EXISTS trigger_consolidate_notifications ON notifications;
DROP FUNCTION IF EXISTS consolidate_notifications();

-- Create new consolidation function with enhanced logic
CREATE OR REPLACE FUNCTION consolidate_notifications()
RETURNS trigger AS $$
BEGIN
    -- Only try to consolidate if this is a notification that can be consolidated
    -- and it has an event_group (different notification types will use different grouping logic)
    IF NEW.event_group IS NOT NULL THEN
        -- Find a similar unread notification created in the last hour
        WITH similar_unread AS (
            SELECT id, consolidated_count, first_actor_id, second_actor_id
            FROM notifications
            WHERE user_id = NEW.user_id
            AND event_group = NEW.event_group
            AND is_viewed = false
            AND created_at > NOW() - INTERVAL '1 hour'
            AND id != NEW.id
            ORDER BY created_at DESC
            LIMIT 1
        )
        UPDATE notifications n
        SET 
            consolidated_count = s.consolidated_count + 1,
            -- Only store the two most recent actors for formatting purposes
            second_actor_id = 
                CASE WHEN NEW.first_actor_id != s.first_actor_id 
                     THEN NEW.first_actor_id 
                     ELSE s.second_actor_id 
                END
        FROM similar_unread s
        WHERE n.id = s.id
        RETURNING n.id INTO NEW.id;
        
        -- If we updated an existing notification, we can delete this one
        IF FOUND THEN
            -- This will prevent the insert
            RETURN NULL;
        END IF;
    END IF;

    -- If we didn't consolidate, just proceed with the insert
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the consolidation trigger
CREATE TRIGGER trigger_consolidate_notifications
BEFORE INSERT ON notifications
FOR EACH ROW
EXECUTE FUNCTION consolidate_notifications();
