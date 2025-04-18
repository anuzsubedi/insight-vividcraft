import express from "express";
import { supabase } from "../config/supabaseClient.js";
import { verifyToken, optionalAuth } from "../middleware/authMiddleware.js";
import { addReactionsToPosts } from "../utils/reactionHelpers.js";
import { canPost } from "../middleware/permissions.js";
import { createVoteMilestoneNotification, createMentionNotification } from '../utils/notificationHelpers.js';

const router = express.Router();

async function generateUniqueSlug(title) {
    const baseSlug = title
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
    let slug = baseSlug;
    let counter = 1;
    while (true) {
        const { data } = await supabase
            .from('posts')
            .select('id')
            .eq('slug', slug)
            .single();
        if (!data) break;
        slug = `${baseSlug}-${counter}`;
        counter++;
    }
    return slug;
}

// Helper function to get post data with active comment count
async function getPostWithDetails(post, currentUserId) {
    const upvotes = post.reactions?.filter(r => r.reaction_type === 'upvote').length || 0;
    const downvotes = post.reactions?.filter(r => r.reaction_type === 'downvote').length || 0;
    const userReaction = post.reactions?.find(r => r.user_id === currentUserId)?.reaction_type || null;
    
    // Get active comment count using the new function
    const { data: commentCount, error: countError } = await supabase
        .rpc('get_active_comment_count', { p_post_id: post.id });
    
    if (countError) {
        console.error('Error getting active comment count:', countError);
    }
    
    // Remove the reactions array and comments from the response
    const { reactions, comments, ...postWithoutReactions } = post;
    
    return {
        ...postWithoutReactions,
        reactions: {
            upvotes,
            downvotes
        },
        userReaction,
        comment_count: commentCount || 0,
        // Add score for sorting
        score: upvotes - downvotes
    };
}

// Update existing functions to use the new helper
async function processPostsWithDetails(posts, currentUserId) {
    return Promise.all(posts.map(post => getPostWithDetails(post, currentUserId)));
}

// Create post (requires post permission)
router.post("/", verifyToken, canPost, async (req, res) => {
    try {
        const { title, body, type, categoryId, tags, status, scheduledFor } = req.body;
        const authorId = req.user.userId;

        // Validation with detailed errors
        const validationErrors = {};
        if (!body) validationErrors.body = "Content is required";
        if (!type) validationErrors.type = "Type is required";
        if (!status) validationErrors.status = "Status is required";
        
        // Only require category for articles
        if (type === 'article' && !categoryId) {
            validationErrors.categoryId = "Category is required for articles";
        }
        
        if (Object.keys(validationErrors).length > 0) {
            return res.status(400).json({ 
                error: "Missing required fields",
                details: validationErrors
            });
        }

        if (type === 'article' && !title?.trim()) {
            return res.status(400).json({ error: "Title is required for articles" });
        }

        const { data: post, error: postError } = await supabase
            .from('posts')
            .insert({
                title: title || '',
                slug: title ? 
                    await generateUniqueSlug(title) : 
                    await generateUniqueSlug(`post-${Date.now()}`),
                body,
                type,
                category_id: type === 'article' ? categoryId : null,
                author_id: authorId,
                status,
                scheduled_for: status === 'scheduled' ? scheduledFor : null,
                published_at: status === 'published' ? new Date().toISOString() : null,
                tags: type === 'article' && Array.isArray(tags) ? tags.map(tag => tag.toLowerCase()) : []
            })
            .select(`
                *,
                author:users(id, username, display_name)
            `)
            .single();

        if (postError) {
            console.error('Database error while creating post:', postError);
            return res.status(500).json({ 
                error: "Failed to create post", 
                details: postError.message 
            });
        }

        if (!post) {
            return res.status(500).json({ 
                error: "Failed to create post",
                details: "No post data returned from database" 
            });
        }

        // Check for mentions and create notifications
        const mentionRegex = /@(\w+)/g;
        let match;
        while ((match = mentionRegex.exec(body)) !== null) {
            const username = match[1];
            // Get the mentioned user's ID
            const { data: mentionedUser } = await supabase
                .from('users')
                .select('id')
                .eq('username', username)
                .single();

            if (mentionedUser && mentionedUser.id !== authorId) { // Don't notify if mentioning self
                try {
                    await createMentionNotification(mentionedUser.id, 'post', post.id, authorId);
                } catch (notificationError) {
                    console.error('Error creating mention notification:', notificationError);
                }
            }
        }

        return res.status(201).json({
            message: "Post created successfully",
            post
        });
    } catch (error) {
        console.error('Unexpected error in post creation:', error);
        return res.status(500).json({ 
            error: "Failed to create post",
            details: error.message
        });
    }
});

// Get reaction counts and user reaction in a single query
async function getPostReactionsWithUser(postId, userId) {
    try {
        // Get both counts and user reaction in a single query
        const { data, error } = await supabase
            .from('post_reactions')
            .select(`
                reaction_type,
                post_id,
                user_id
            `)
            .match({ post_id: postId });

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
        console.error('Error getting post reactions:', error);
        return { upvotes: 0, downvotes: 0, userReaction: null };
    }
}

// Get post by ID
router.get('/:id', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;

        const { data: post, error } = await supabase
            .from('posts')
            .select(`
                *,
                author:users(id, username, display_name, avatar_name),
                category:categories(id, name)
            `)
            .eq('id', id)
            .single();

        if (error) throw error;
        if (!post) {
            return res.status(404).json({ error: 'Post not found' });
        }

        // Get reactions including user's reaction
        const reactions = await getPostReactionsWithUser(id, userId);
        
        // Add reactions to post object
        const postWithReactions = {
            ...post,
            reactions: {
                upvotes: reactions.upvotes,
                downvotes: reactions.downvotes
            },
            userReaction: reactions.userReaction
        };

        // Ensure tags is always an array
        postWithReactions.tags = postWithReactions.tags || [];

        res.json({ post: postWithReactions });
    } catch (error) {
        console.error('Error getting post:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update post (requires post permission)
router.put("/:id", verifyToken, canPost, async (req, res) => {
    try {
        const { title, body, type, categoryId, tags, status, scheduledFor } = req.body;
        const postId = req.params.id;

        // Validate scheduled posts have a future date
        if (status === 'scheduled') {
            if (!scheduledFor) {
                return res.status(400).json({
                    error: "Scheduled posts must have a scheduled_for date"
                });
            }
            if (new Date(scheduledFor) <= new Date()) {
                return res.status(400).json({
                    error: "Scheduled date must be in the future"
                });
            }
        }

        const { data: existingPost, error: fetchError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .eq('author_id', req.user.userId)
            .single();

        if (fetchError || !existingPost) {
            return res.status(404).json({ error: "Post not found" });
        }

        const updates = {
            title: title || existingPost.title,
            body: body || existingPost.body,
            type: type || existingPost.type,
            category_id: categoryId || existingPost.category_id,
            status: status || existingPost.status,
            scheduled_for: status === 'scheduled' ? scheduledFor : null,
            published_at: status === 'published' ? new Date().toISOString() : existingPost.published_at,
            updated_at: new Date().toISOString(),
            tags: Array.isArray(tags) ? tags.map(tag => tag.toLowerCase()) : existingPost.tags
        };

        // Update slug if title changed
        if (title && title !== existingPost.title) {
            updates.slug = await generateUniqueSlug(title);
        }

        // Update the post
        const { data: post, error: updateError } = await supabase
            .from('posts')
            .update(updates)
            .eq('id', existingPost.id)
            .select(`
                *,
                author:users!posts_author_id_fkey (id, username, display_name),
                category:categories!posts_category_id_fkey (id, name)
            `)
            .single();

        if (updateError) {
            console.error('Post update error:', updateError);
            return res.status(500).json({ error: "Failed to update post" });
        }

        return res.status(200).json({
            message: "Post updated successfully",
            post
        });
    } catch (error) {
        console.error('Update post error:', error);
        return res.status(500).json({ error: "Failed to update post", details: error.message });
    }
});

// Delete post
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        // First check if user is admin
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('is_admin')
            .eq('id', req.user.userId)
            .single();

        if (userError) throw userError;

        // Get the post
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('id, author_id')
            .eq('id', req.params.id)
            .single();

        if (fetchError || !post) {
            return res.status(404).json({ error: "Post not found" });
        }

        // Check if user is either admin or post author
        if (!user.is_admin && post.author_id !== req.user.userId) {
            return res.status(403).json({ error: "Not authorized to delete this post" });
        }

        // Delete associated reactions first
        const { error: reactionsError } = await supabase
            .from('post_reactions')
            .delete()
            .eq('post_id', post.id);

        if (reactionsError) {
            console.error('Error deleting post reactions:', reactionsError);
            return res.status(500).json({ error: "Failed to delete post reactions" });
        }

        // Delete associated comments and their reactions
        const { data: comments, error: commentsError } = await supabase
            .from('comments')
            .select('id')
            .eq('post_id', post.id);

        if (!commentsError && comments?.length > 0) {
            const commentIds = comments.map(c => c.id);

            // Delete comment reactions
            const { error: commentReactionsError } = await supabase
                .from('comment_reactions')
                .delete()
                .in('comment_id', commentIds);

            if (commentReactionsError) {
                console.error('Error deleting comment reactions:', commentReactionsError);
                return res.status(500).json({ error: "Failed to delete comment reactions" });
            }

            // Delete comments
            const { error: deleteCommentsError } = await supabase
                .from('comments')
                .delete()
                .eq('post_id', post.id);

            if (deleteCommentsError) {
                console.error('Error deleting comments:', deleteCommentsError);
                return res.status(500).json({ error: "Failed to delete comments" });
            }
        }

        // Finally delete the post
        const { error: deleteError } = await supabase
            .from('posts')
            .delete()
            .eq('id', post.id);

        if (deleteError) {
            console.error('Error deleting post:', deleteError);
            return res.status(500).json({ error: "Failed to delete post" });
        }

        return res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error('Delete post error:', error);
        return res.status(500).json({ error: "Failed to delete post", details: error.message });
    }
});

// Publish post
router.post("/:id/publish", verifyToken, async (req, res) => {
    try {
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', req.params.id)
            .eq('author_id', req.user.userId)
            .single();

        if (fetchError || !post) {
            return res.status(404).json({ error: "Post not found" });
        }

        const { error: updateError } = await supabase
            .from('posts')
            .update({
                status: 'published',
                published_at: new Date().toISOString(),
                scheduled_for: null
            })
            .eq('id', post.id);

        if (updateError) {
            return res.status(500).json({ error: "Failed to publish post" });
        }

        return res.status(200).json({ message: "Post published successfully" });
    } catch (error) {
        return res.status(500).json({ error: "Failed to publish post" });
    }
});

// Get posts with filters (for my posts)
router.get("/", async (req, res, next) => {
    try {
        // If requesting "my posts", require authentication
        if (req.query.author === 'me') {
            return verifyToken(req, res, () => {
                next();
            });
        }
        next();
    } catch (error) {
        console.error("Auth middleware error:", error);
        return res.status(401).json({ error: "Authentication failed" });
    }
}, async (req, res) => {
    try {
        const {
            author,
            category,
            status = 'published',
            page = 1,
            limit = 10
        } = req.query;

        // Build the base query
        let query = supabase
            .from('posts')
            .select(`
                *,
                users!posts_author_id_fkey (id, username, display_name),
                categories!posts_category_id_fkey (id, name)
            `);

        // Add filters
        if (author === 'me' && req.user) {
            query = query.eq('author_id', req.user.userId);
        }

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        // Execute query
        const { data: posts, error } = await query;

        if (error) {
            throw error;
        }

        return res.status(200).json({ posts: posts || [] });
    } catch (error) {
        console.error('Posts endpoint error:', error);
        return res.status(500).json({
            error: "Failed to fetch posts",
            details: error.message
        });
    }
});

// Helper function to get sort query based on parameters
function getSortQuery(query, sortBy = 'recent', period = 'all') {
    if (sortBy === 'recent') {
        return query.order('published_at', { ascending: false });
    }

    // For top posts, filter by time period first
    const now = new Date();
    let startDate = new Date();

    switch (period) {
        case 'day':
            startDate.setDate(now.getDate() - 1);
            break;
        case 'week':
            startDate.setDate(now.getDate() - 7);
            break;
        case 'month':
            startDate.setMonth(now.getMonth() - 1);
            break;
        case 'year':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
        case 'all':
        default:
            startDate = new Date(0);
            break;
    }

    return query
        .gte('published_at', startDate.toISOString())
        .order('published_at', { ascending: false });
}

// Get user posts by username
router.get("/user/:username", verifyToken, async (req, res) => {
  try {
    const { username } = req.params;
    const { page = 1, limit = 10, type = 'all', sortBy = 'recent', period = 'all' } = req.query;
    const currentUserId = req.user?.userId;
    const pageNum = parseInt(page, 10);
    const limitNum = parseInt(limit, 10);
    const offset = (pageNum - 1) * limitNum;
    
    // Get user ID from username - ensure case-insensitive comparison
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();
      
    if (userError || !userData) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Build the base query for counting total posts
    let countQuery = supabase
      .from('posts')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userData.id)
      .eq('status', 'published');
      
    // Apply type filter to count query
    if (type !== 'all') {
      countQuery = countQuery.eq('type', type);
    }
    
    // Apply time period filter for top posts to count query
    if (sortBy === 'top') {
      const now = new Date();
      let startDate = new Date();
      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
        default:
          startDate = new Date(0);
          break;
      }
      countQuery = countQuery.gte('published_at', startDate.toISOString());
    }
    
    // Get total count
    const { count, error: countError } = await countQuery;
    if (countError) {
      console.error('Error getting post count:', countError);
      return res.status(500).json({ error: 'Failed to get post count' });
    }
    
    const total = count || 0;
    
    // If there are no posts, return empty array early
    if (total === 0) {
      return res.json({
        posts: [],
        pagination: {
          total: 0,
          page: pageNum,
          limit: limitNum,
          hasMore: false
        }
      });
    }
    
    // Build the main query for fetching posts
    let query = supabase
      .from('posts')
      .select(`
        *,
        category:categories (
          id,
          name
        ),
        author:users (
          id,
          username,
          display_name,
          avatar_name
        ),
        reactions:post_reactions (
          reaction_type,
          user_id
        ),
        comments(count)
      `)
      .eq('author_id', userData.id)
      .eq('status', 'published');
      
    // Apply type filter
    if (type !== 'all') {
      query = query.eq('type', type);
    }
    
    // Apply time period filter for top posts
    if (sortBy === 'top') {
      const now = new Date();
      let startDate = new Date();
      switch (period) {
        case 'day':
          startDate.setDate(now.getDate() - 1);
          break;
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
        case 'all':
        default:
          startDate = new Date(0);
          break;
      }
      query = query.gte('published_at', startDate.toISOString());
    }
    
    // Apply sorting at the database level
    if (sortBy === 'top') {
      // For top posts, we'll sort by published_at first to get the most recent posts
      // Then we'll sort by score in memory
      query = query.order('published_at', { ascending: false });
    } else {
      // For recent posts, sort by published_at
      query = query.order('published_at', { ascending: false });
    }
    
    // Apply pagination at the database level
    query = query.range(offset, offset + limitNum - 1);
    
    // Get paginated posts
    const { data: posts, error: postsError } = await query;
    
    if (postsError) {
      console.error('Error fetching posts:', postsError);
      return res.status(500).json({ error: 'Failed to fetch posts' });
    }
    
    // Process posts to include reactions
    const processedPosts = await processPostsWithDetails(posts, currentUserId);
    
    // Apply top sorting in memory if needed
    if (sortBy === 'top') {
      processedPosts.sort((a, b) => b.score - a.score);
    }
    
    // Calculate if there are more posts
    const hasMore = offset + processedPosts.length < total;
    
    // Return response
    res.json({
      posts: processedPosts,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        hasMore
      }
    });
  } catch (error) {
    console.error('Error in /user/:username endpoint:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get scheduled posts for publication
router.get("/scheduled/publish-due", verifyToken, async (req, res) => {
    try {
        const now = new Date().toISOString();
        // Get all posts that are scheduled and due for publication
        const { data: posts, error } = await supabase
            .from('posts')
            .select(`
                *,
                author:users!posts_author_id_fkey (id, username, display_name),
                category:categories!posts_category_id_fkey (id, name)
            `)
            .eq('status', 'scheduled')
            .lte('scheduled_for', now);

        if (error) {
            throw error;
        }

        // Update all due posts to published status
        if (posts && posts.length > 0) {
            const { error: updateError } = await supabase
                .from('posts')
                .update({
                    status: 'published',
                    published_at: now,
                    scheduled_for: null
                })
                .in('id', posts.map(p => p.id));

            if (updateError) {
                throw updateError;
            }
        }

        return res.status(200).json({
            message: `${posts?.length || 0} posts published`,
            posts: posts || []
        });
    } catch (error) {
        console.error('Publish scheduled posts error:', error);
        return res.status(500).json({
            error: "Failed to publish scheduled posts",
            details: error.message
        });
    }
});

// Add reaction to a post
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
            .from('post_reactions')
            .select()
            .eq('user_id', userId)
            .eq('post_id', id)
            .single();

        if (existingReaction) {
            if (existingReaction.reaction_type === type) {
                // Remove reaction if same type (toggle off)
                const { error } = await supabase
                    .from('post_reactions')
                    .delete()
                    .eq('user_id', userId)
                    .eq('post_id', id);

                if (error) throw error;
                
                // Get updated reactions with user reaction
                const reactions = await getPostReactionsWithUser(id, userId);
                return res.json({ 
                    message: 'Reaction removed',
                    ...reactions
                });
            } else {
                // Update to new reaction type
                const { error } = await supabase
                    .from('post_reactions')
                    .update({ reaction_type: type })
                    .eq('user_id', userId)
                    .eq('post_id', id);

                if (error) throw error;
                
                // Get updated reactions with user reaction
                const reactions = await getPostReactionsWithUser(id, userId);

                // Check if updating to upvote creates a milestone
                if (type === 'upvote' && reactions.upvotes % 10 === 0) {
                    // Get post owner
                    const { data: post } = await supabase
                        .from('posts')
                        .select('author_id')
                        .eq('id', id)
                        .single();

                    if (post && post.author_id !== userId) {
                        try {
                            await createVoteMilestoneNotification(post.author_id, 'post', id, reactions.upvotes);
                        } catch (notificationError) {
                            console.error('Error creating vote milestone notification:', notificationError);
                        }
                    }
                }

                return res.json({ 
                    message: 'Reaction updated',
                    ...reactions
                });
            }
        } else {
            // Create new reaction
            const { error } = await supabase
                .from('post_reactions')
                .insert([{
                    user_id: userId,
                    post_id: id,
                    reaction_type: type
                }]);

            if (error) throw error;
            
            // Get updated reactions with user reaction
            const reactions = await getPostReactionsWithUser(id, userId);

            // Check if we need to create a milestone notification
            if (type === 'upvote' && reactions.upvotes % 10 === 0) {
                // Get post owner
                const { data: post } = await supabase
                    .from('posts')
                    .select('author_id')
                    .eq('id', id)
                    .single();

                if (post && post.author_id !== userId) {
                    try {
                        await createVoteMilestoneNotification(post.author_id, 'post', id, reactions.upvotes);
                    } catch (notificationError) {
                        console.error('Error creating vote milestone notification:', notificationError);
                    }
                }
            }

            return res.json({ 
                message: 'Reaction added',
                ...reactions
            });
        }
    } catch (error) {
        console.error('Error handling reaction:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get reactions for a post
router.get('/:id/reactions', optionalAuth, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user?.userId;
        
        const reactions = await getPostReactionsWithUser(id, userId);
        res.json(reactions);
    } catch (error) {
        console.error('Error getting reactions:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;