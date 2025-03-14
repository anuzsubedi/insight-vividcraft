import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { verifyToken, optionalAuth } from '../middleware/authMiddleware.js';

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

// Helper function to recursively mark comments as deleted
const markCommentsAsDeleted = async (commentId, db) => {
    const now = new Date().toISOString();
    
    // Get all replies recursively using a CTE (Common Table Expression)
    const { data: replies } = await db.from('comments')
        .select('id')
        .eq('parent_id', commentId);

    if (replies?.length > 0) {
        // Recursively mark child comments as deleted
        for (const reply of replies) {
            await markCommentsAsDeleted(reply.id, db);
        }
    }

    // Mark the current comment as deleted
    await db.from('comments')
        .update({ deleted_at: now })
        .eq('id', commentId);
};

// Get comments for a post
router.get('/post/:postId', optionalAuth, async (req, res) => {
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

        // Process comments to handle deleted/removed state
        const processedComments = comments.map(comment => {
            if (comment.removed_at) {
                // Admin removed comments - hide user info
                return {
                    ...comment,
                    content: '[Comment removed by moderator]',
                    profiles: {
                        username: 'moderator',
                        display_name: 'Moderator',
                        avatar_name: null
                    }
                };
            } else if (comment.deleted_at) {
                // User deleted comments - keep user info but mark content as deleted
                return {
                    ...comment,
                    content: '[Comment deleted by user]'
                    // Keep original profiles data
                };
            }
            return comment;
        });

        // Get reactions for all comments in parallel
        const commentsWithReactions = await Promise.all(processedComments.map(async (comment) => {
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

    // Verify the user exists first
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError || !user) {
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

    if (error) throw error;

    // Add initial reaction state using the same function as other endpoints for consistency
    const reactions = await getCommentReactionsWithUser(data.id, userId);
    const comment = {
      ...data,
      reactions: {
        upvotes: reactions.upvotes,
        downvotes: reactions.downvotes
      },
      userReaction: reactions.userReaction
    };
    
    res.json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
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
    const reactions = await getCommentReactionsWithUser(id, userId);
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
    console.error('Error updating comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a comment (user soft delete)
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;

        // Check if comment exists and belongs to user
        const { data: comment, error: getError } = await supabase
            .from('comments')
            .select('*')
            .eq('id', id)
            .single();

        if (getError || !comment) {
            return res.status(404).json({ error: 'Comment not found' });
        }

        if (comment.user_id !== userId) {
            return res.status(403).json({ error: 'Not authorized to delete this comment' });
        }

        // Soft delete only this comment
        const { error: updateError } = await supabase
            .from('comments')
            .update({ deleted_at: new Date().toISOString() })
            .eq('id', id);

        if (updateError) {
            throw updateError;
        }

        return res.status(200).json({ message: 'Comment deleted successfully' });
    } catch (error) {
        console.error('Delete comment error:', error);
        return res.status(500).json({ error: 'Failed to delete comment' });
    }
});

// Admin remove comment
router.post('/:id/remove', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    // Verify user is an admin
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', userId)
      .single();

    if (userError || !user || !user.is_admin) {
      return res.status(403).json({ error: "Unauthorized. Admin access required." });
    }

    // Remove the comment (admin action)
    const { error } = await supabase
      .from('comments')
      .update({ removed_at: new Date().toISOString() })
      .eq('id', id);

    if (error) throw error;

    res.json({ message: 'Comment removed by admin successfully' });
  } catch (error) {
    console.error('Error removing comment:', error);
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
router.get('/:id/reactions', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.userId;
    
    const reactions = await getCommentReactionsWithUser(id, userId);
    res.json(reactions);
  } catch (error) {
    console.error('Error getting reactions:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;