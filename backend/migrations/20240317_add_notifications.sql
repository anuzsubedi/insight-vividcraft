-- Step 1: Remove Existing Constraints (If They Exist)
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS fk_notifications_user;
ALTER TABLE mentions DROP CONSTRAINT IF EXISTS fk_mentions_mentioner;
ALTER TABLE mentions DROP CONSTRAINT IF EXISTS fk_mentions_mentioned;
ALTER TABLE notification_actors DROP CONSTRAINT IF EXISTS fk_notification_actors_notification;
ALTER TABLE notification_actors DROP CONSTRAINT IF EXISTS fk_notification_actors_user;

-- Step 2: Drop Tables If Needed (To Ensure a Clean Setup)
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS mentions CASCADE;
DROP TABLE IF EXISTS notification_actors CASCADE;

-- Step 3: Drop Existing Triggers to Prevent Duplication
DROP TRIGGER IF EXISTS post_vote_milestone_trigger ON post_reactions;
DROP TRIGGER IF EXISTS comment_vote_milestone_trigger ON comment_reactions;
DROP TRIGGER IF EXISTS comment_notification_trigger ON comments;
DROP TRIGGER IF EXISTS reply_notification_trigger ON comments;

-- Step 4: Recreate Mentions Table
CREATE TABLE mentions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    target_id TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
    mentioner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    mentioned_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    CONSTRAINT unique_mention UNIQUE (target_id, target_type, mentioner_id, mentioned_id)
);

-- Step 5: Recreate Notifications Table
CREATE TABLE notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('comment', 'reply', 'mention', 'vote_milestone')),
    target_id TEXT NOT NULL,
    target_type TEXT NOT NULL CHECK (target_type IN ('post', 'comment')),
    actors JSONB NOT NULL DEFAULT '[]'::jsonb,
    milestone INTEGER,
    is_viewed BOOLEAN DEFAULT FALSE,
    is_opened BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now(),
    consolidated_count INTEGER DEFAULT 0
);

-- Step 6: Recreate Notification_Actors Table
CREATE TABLE notification_actors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE (notification_id, user_id)
);

-- Step 7: Indexes for Performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_target ON notifications(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_notification_actors_notification_id ON notification_actors(notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_actors_user_id ON notification_actors(user_id);

-- Step 8: Trigger to Update "updated_at" Column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_notifications_updated_at
    BEFORE UPDATE ON notifications
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
