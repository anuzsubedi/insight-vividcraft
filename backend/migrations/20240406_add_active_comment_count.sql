-- Function to count active comments for a post
CREATE OR REPLACE FUNCTION get_active_comment_count(p_post_id integer)
RETURNS integer AS $$
DECLARE
    active_count integer;
BEGIN
    SELECT COUNT(*)
    INTO active_count
    FROM comments c
    WHERE c.post_id = p_post_id
    AND c.deleted_at IS NULL
    AND c.removed_at IS NULL;
    
    RETURN active_count;
END;
$$ LANGUAGE plpgsql;