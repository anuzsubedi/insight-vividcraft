import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { verifyToken, optionalAuth } from '../middleware/authMiddleware.js';
import { canComment } from '../middleware/permissions.js';
import { createCommentNotification, createReplyNotification, createMentionNotification } from '../utils/notificationHelpers.js';

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

// Helper function to recursively mark comments as removed
const markCommentsAsRemoved = async (commentId, userId, db) => {
    const now = new Date().toISOString();
    
    // Get all replies recursively
    const { data: replies } = await db.from('comments')
        .select('id')
        .eq('parent_id', commentId);

    if (replies?.length > 0) {
        // Recursively mark child comments as removed
        for (const reply of replies) {
            await markCommentsAsRemoved(reply.id, userId, db);
        }
    }

    // Mark the current comment as removed
    await db.from('comments')
        .update({ 
            removed_at: now,
            removed_by: userId 
        })
        .eq('id', commentId);
};

// Helper function to recursively mark comments as deleted by user
const markCommentsAsDeletedByUser = async (commentId, db) => {
    const now = new Date().toISOString();
    
    // Get all replies recursively
    const { data: replies } = await db.from('comments')
        .select('id')
        .eq('parent_id', commentId);

    if (replies?.length > 0) {
        // Recursively mark child comments as deleted
        for (const reply of replies) {
            await markCommentsAsDeletedByUser(reply.id, db);
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

// Create a comment (requires comment permission)
router.post('/', verifyToken, canComment, async (req, res) => {
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
    let parentComment;
    if (parentId) {
      const { data: parent, error: parentError } = await supabase
        .from('comments')
        .select('id, user_id, post_id')
        .eq('id', parentId)
        .eq('post_id', postId)
        .single();

      if (parentError || !parent) {
        return res.status(404).json({ error: "Parent comment not found" });
      }
      parentComment = parent;
    }

    // Get the post owner's ID
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('author_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Create the comment
    const { data, error } = await supabase
      .from('comments')
      .insert([{
        content,
        post_id: postId,
        user_id: userId,
        parent_id: parentId
      }])
      .select(`
        *,
        profiles:users(id, username, display_name, avatar_name)
      `)
      .single();

    if (error) throw error;

    // Add initial reaction state
    const reactions = await getCommentReactionsWithUser(data.id, userId);
    const comment = {
      ...data,
      reactions: {
        upvotes: reactions.upvotes,
        downvotes: reactions.downvotes
      },
      userReaction: reactions.userReaction
    };

    // Create notifications
    try {
        if (parentId) {
            // This is a reply, notify the parent comment owner
            if (parentComment.user_id !== userId) { // Don't notify if replying to own comment
                await createReplyNotification(parentComment.user_id, comment.id, userId);
            }
        } else {
            // This is a top-level comment, notify the post owner
            if (post.author_id !== userId) { // Don't notify if commenting on own post
                await createCommentNotification(post.author_id, postId, userId);
            }
        }

        // Check for mentions and create notifications for them
        const mentionRegex = /@(\w+)/g;
        let match;
        while ((match = mentionRegex.exec(content)) !== null) {
            const username = match[1];
            // Get the mentioned user's ID
            const { data: mentionedUser } = await supabase
                .from('users')
                .select('id')
                .eq('username', username)
                .single();

            if (mentionedUser && mentionedUser.id !== userId) { // Don't notify if mentioning self
                await createMentionNotification(mentionedUser.id, 'comment', comment.id, userId);
            }
        }
    } catch (notificationError) {
        console.error('Error creating notifications:', notificationError);
        // Don't fail the comment creation if notification fails
    }
    
    res.json(comment);
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Update a comment (requires comment permission)
router.put('/:id', verifyToken, canComment, async (req, res) => {
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

    // Check for new mentions and create notifications
    const mentionRegex = /@(\w+)/g;
    let match;
    while ((match = mentionRegex.exec(content)) !== null) {
        const username = match[1];
        // Get the mentioned user's ID
        const { data: mentionedUser } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();

        if (mentionedUser && mentionedUser.id !== userId) { // Don't notify if mentioning self
            await createMentionNotification(mentionedUser.id, 'comment', comment.id, userId);
        }
    }

    res.json(commentWithReactions);
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: error.message });
  }
});

// Delete a comment (regular user deletion)
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { user } = req;

    // Get the comment
    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', id)
      .single();

    if (commentError) throw commentError;
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }

    // Regular users can only delete their own comments
    if (comment.user_id !== user.userId && !user.isAdmin) {
      return res.status(403).json({ error: 'Not authorized to delete this comment' });
    }

    // If it's a user deleting their own comment
    if (comment.user_id === user.userId) {
      await markCommentsAsDeletedByUser(id, supabase);
      return res.json({ message: 'Comment deleted successfully' });
    }

    // If we get here, it's an admin, so use removed_at instead
    await supabase
      .from('comments')
      .update({ removed_at: new Date().toISOString() })
      .eq('id', id);

    // Log moderation action for admin deletion
    await supabase
      .from('content_moderation')
      .insert({
        target_id: id,
        target_type: 'comment',
        action_type: 'delete',
        admin_id: user.userId,
        details: {
          reason: 'Admin removed comment'
        }
      });

    res.json({ message: 'Comment removed successfully' });
  } catch (error) {
    console.error('Error with comment deletion:', error);
    res.status(500).json({ error: error.message });
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

            // Check if we need to create a milestone notification
            if (type === 'upvote' && reactions.upvotes % 10 === 0) {
                // Get comment owner
                const { data: comment } = await supabase
                    .from('comments')
                    .select('user_id')
                    .eq('id', id)
                    .single();

                if (comment && comment.user_id !== userId) {
                    try {
                        await createVoteMilestoneNotification(comment.user_id, 'comment', id, reactions.upvotes);
                    } catch (notificationError) {
                        console.error('Error creating vote milestone notification:', notificationError);
                    }
                }
            }

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