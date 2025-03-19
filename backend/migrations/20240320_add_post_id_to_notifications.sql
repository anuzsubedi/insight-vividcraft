-- Drop existing post_id column if it exists
ALTER TABLE notifications 
DROP COLUMN IF EXISTS post_id;

-- Add post_id column to notifications table
ALTER TABLE notifications 
ADD COLUMN post_id INTEGER;

-- Backfill post_id for existing notifications
-- For direct post notifications (comments, mentions, vote_milestone)
UPDATE notifications 
SET post_id = CAST(target_id AS INTEGER)
WHERE target_type = 'post';

-- For comment-related notifications (replies, comment mentions)
UPDATE notifications n
SET post_id = c.post_id
FROM comments c
WHERE n.target_type = 'comment' 
AND n.target_id = c.id::text;

-- Add foreign key constraint after backfilling
ALTER TABLE notifications
ADD CONSTRAINT fk_notifications_post_id
FOREIGN KEY (post_id)
REFERENCES posts(id)
ON DELETE CASCADE;