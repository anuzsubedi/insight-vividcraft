-- First move existing deletion records to content_moderation table
INSERT INTO content_moderation (
    target_id,
    target_type,
    action_type,
    admin_id,
    created_at,
    details
)
SELECT 
    id::text,
    'post',
    'delete',
    deleted_by,
    deleted_at,
    jsonb_build_object('reason', 'Migrated from deleted_by column')
FROM posts
WHERE deleted_by IS NOT NULL;

-- Then remove the deleted_by column
ALTER TABLE posts DROP COLUMN deleted_by;