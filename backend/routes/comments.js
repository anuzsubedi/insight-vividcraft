import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper function to get reaction counts and user reaction
async function getCommentReactions(commentId, userId) {
  // Get reaction counts
  const { data: counts, error: countsError } = await supabase
    .rpc('get_comment_reaction_counts', { comment_id: commentId });

  if (countsError) throw countsError;

  // Get user's reaction if user is logged in
  let userReaction = null;
  if (userId) {
    const { data: reaction } = await supabase
      .from('comment_reactions')
      .select('reaction_type')
      .eq('user_id', userId)
      .eq('comment_id', commentId)
      .single();

    if (reaction) {
      userReaction = reaction.reaction_type;
    }
  }

  return {
    ...counts[0],
    userReaction
  };
}

// Helper function to get reaction counts and user reaction in a single query
async function getCommentReactionsWithUser(commentId, userId) {
    try {
        // Get both counts and user reaction in a single query
        const { data, error } = await supabase
            .from('comment_reactions')
            .select(`
                reaction_type,
                comment_id,
                user_id
            `)
            .eq('comment_id', commentId);

        if (error) throw error;

        // Calculate counts
        const upvotes = data.filter(r => r.reaction_type === 'upvote').length;
        const downvotes = data.filter(r => r.reaction_type === 'downvote').length;
        
        // Get user's reaction if they are logged in
        const userReaction = userId ? 
            (data.find(r => r.user_id === userId)?.reaction_type || null) : 
            null;

        return {
            upvotes,
            downvotes,
            userReaction
        };
    } catch (error) {
        console.error('Error getting comment reactions:', error);
        return { upvotes: 0, downvotes: 0, userReaction: null };
    }
}

// Get comments for a post
router.get('/post/:postId', async (req, res) => {
    try {
        const { postId } = req.params;
        const userId = req.user?.userId;

        const { data: comments, error } = await supabase
            .from('comments')
            .select(`
                *,
                profiles:users(id, username, display_name, avatar_name)
            `)
            .eq('post_id', postId)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Get reactions for all comments in parallel
        const commentsWithReactions = await Promise.all(comments.map(async (comment) => {
            const reactions = await getCommentReactionsWithUser(comment.id, userId);
            return {
                ...comment,
                reactions: {
                    upvotes: reactions.upvotes,
                    downvotes: reactions.downvotes
                },
                userReaction: reactions.userReaction
            };
        }));

        res.json(commentsWithReactions);
    } catch (error) {
        console.error('Error getting comments:', error);
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

    // Add initial reaction state
    const comment = {
      ...data,
      reactions: { upvotes: 0, downvotes: 0 },
      userReaction: null
    };
    
    console.log('[CREATE COMMENT] Success:', comment);
    res.json(comment);
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

    const { data: comment, error } = await supabase
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

    // Get reactions for updated comment
    const reactions = await getCommentReactions(id, userId);
    const commentWithReactions = {
      ...comment,
      reactions: {
        upvotes: reactions.upvotes,
        downvotes: reactions.downvotes
      },
      userReaction: reactions.userReaction
    };

    res.json(commentWithReactions);
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

// Add reaction to a comment
router.post('/:id/reactions', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const { type } = req.body;
        const userId = req.user.userId;

        if (!['upvote', 'downvote'].includes(type)) {
            return res.status(400).json({ error: "Invalid reaction type" });
        }

        // Get existing reaction if any
        const { data: existingReaction } = await supabase
            .from('comment_reactions')
            .select()
            .eq('user_id', userId)
            .eq('comment_id', id)
            .single();

        if (existingReaction) {
            if (existingReaction.reaction_type === type) {
                // Remove reaction if same type (toggle off)
                const { error } = await supabase
                    .from('comment_reactions')
                    .delete()
                    .eq('user_id', userId)
                    .eq('comment_id', id);

                if (error) throw error;
                
                // Get updated reactions
                const reactions = await getCommentReactionsWithUser(id, userId);
                return res.json({ 
                    message: 'Reaction removed',
                    upvotes: reactions.upvotes,
                    downvotes: reactions.downvotes,
                    userReaction: reactions.userReaction
                });
            } else {
                // Update to new reaction type
                const { error } = await supabase
                    .from('comment_reactions')
                    .update({ reaction_type: type })
                    .eq('user_id', userId)
                    .eq('comment_id', id);

                if (error) throw error;
                
                // Get updated reactions
                const reactions = await getCommentReactionsWithUser(id, userId);
                return res.json({ 
                    message: 'Reaction updated',
                    upvotes: reactions.upvotes,
                    downvotes: reactions.downvotes,
                    userReaction: reactions.userReaction
                });
            }
        } else {
            // Create new reaction
            const { error } = await supabase
                .from('comment_reactions')
                .insert([{
                    user_id: userId,
                    comment_id: id,
                    reaction_type: type
                }]);

            if (error) throw error;
            
            // Get updated reactions
            const reactions = await getCommentReactionsWithUser(id, userId);
            return res.json({ 
                message: 'Reaction added',
                upvotes: reactions.upvotes,
                downvotes: reactions.downvotes,
                userReaction: reactions.userReaction
            });
        }
    } catch (error) {
        console.error('Error handling reaction:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get reactions for a comment
router.get('/:id/reactions', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    const reactions = await getCommentReactions(id, userId);
    res.json(reactions);
  } catch (error) {
    console.error('Error getting reactions:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;