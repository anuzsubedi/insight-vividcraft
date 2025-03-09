import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get comments for a post
router.get('/:postId', async (req, res) => {
  try {
    const { postId } = req.params;
    console.log('[GET COMMENTS] Request for postId:', postId);
    
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        profiles:users(id, username, display_name, avatar_name)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    console.log('[GET COMMENTS] Query result:', { 
      success: !error,
      commentCount: data?.length || 0,
      error: error?.message,
      firstComment: data?.[0]
    });

    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('[GET COMMENTS] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Create a comment
router.post('/', verifyToken, async (req, res) => {
  try {
    const { content, postId, parentId } = req.body;
    const userId = req.user.userId;

    console.log('[CREATE COMMENT] Creating comment:', {
      content,
      postId,
      parentId,
      userId
    });

    // Verify the user exists first
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[CREATE COMMENT] User not found:', userError || 'No user with this ID');
      return res.status(401).json({ error: "User not found or unauthorized" });
    }

    // If parentId is provided, verify it exists and belongs to the same post
    if (parentId) {
      const { data: parentComment, error: parentError } = await supabase
        .from('comments')
        .select('id')
        .eq('id', parentId)
        .eq('post_id', postId)
        .single();

      if (parentError || !parentComment) {
        console.error('[CREATE COMMENT] Parent comment not found:', parentError);
        return res.status(404).json({ error: "Parent comment not found" });
      }
    }

    const { data, error } = await supabase
      .from('comments')
      .insert([
        {
          content,
          post_id: postId,
          user_id: userId,
          parent_id: parentId
        }
      ])
      .select(`
        *,
        profiles:users(id, username, display_name, avatar_name)
      `)
      .single();

    if (error) {
      console.error('[CREATE COMMENT] Error:', error);
      throw error;
    }
    
    console.log('[CREATE COMMENT] Success:', data);
    res.json(data);
  } catch (error) {
    console.error('[CREATE COMMENT] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a comment
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.userId;

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[UPDATE COMMENT] User not found:', userError || 'No user with this ID');
      return res.status(401).json({ error: "User not found or unauthorized" });
    }

    const { data, error } = await supabase
      .from('comments')
      .update({ content })
      .eq('id', id)
      .eq('user_id', userId)
      .select(`
        *,
        profiles:users(id, username, display_name, avatar_name)
      `)
      .single();

    if (error) throw error;
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete a comment
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify user exists
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      console.error('[DELETE COMMENT] User not found:', userError || 'No user with this ID');
      return res.status(401).json({ error: "User not found or unauthorized" });
    }

    // First delete all child comments (this works because of the ON DELETE CASCADE)
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
    res.json({ message: 'Comment deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;