-- Add reported_user_id column to reports table
ALTER TABLE reports
ADD COLUMN reported_user_id uuid;

-- Add foreign key constraint
ALTER TABLE reports
ADD CONSTRAINT reports_reported_user_id_fkey
FOREIGN KEY (reported_user_id)
REFERENCES users(id)
ON DELETE SET NULL;

-- Update existing reports to set reported_user_id based on content author
-- For posts
UPDATE reports r
SET reported_user_id = p.author_id
FROM posts p
WHERE r.target_type = 'post' 
AND r.target_id = p.id::text;

-- For comments
UPDATE reports r
SET reported_user_id = c.user_id
FROM comments c
WHERE r.target_type = 'comment'
AND r.target_id = c.id::text;