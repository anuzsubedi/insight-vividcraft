import express from "express";
import { supabase } from "../config/supabaseClient.js";
import { verifyToken } from "../middleware/authMiddleware.js";

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

// Create post
router.post("/", verifyToken, async (req, res) => {
    try {
        const { title, body, type, categoryId, tags, status, scheduledFor } = req.body;
        const authorId = req.user.userId;

        console.log('Creating post with data:', {
            title, type, categoryId, status,
            bodyLength: body?.length,
            tagsCount: tags?.length,
            scheduledFor,
            authorId
        });

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
            console.log('Validation errors:', validationErrors);
            return res.status(400).json({ 
                error: "Missing required fields",
                details: validationErrors
            });
        }

        if (type === 'article' && !title?.trim()) {
            console.log('Article validation error: missing title');
            return res.status(400).json({ error: "Title is required for articles" });
        }

        const { data: post, error: postError } = await supabase
            .from('posts')
            .insert({
                title: title || '',
                // Generate slug for all posts, using timestamp if no title
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
            console.error('No post data returned after creation');
            return res.status(500).json({ 
                error: "Failed to create post",
                details: "No post data returned from database" 
            });
        }

        console.log('Post created successfully:', { postId: post.id, type: post.type });
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

// Get post by ID
router.get("/:id", async (req, res) => {
    try {
        const { data: post, error } = await supabase
            .from('posts')
            .select(`
                *,
                author:users(id, username, display_name),
                category:categories(id, name)
            `)
            .eq('id', req.params.id)
            .single();

        if (error || !post) {
            return res.status(404).json({ error: "Post not found" });
        }

        // Ensure tags is always an array
        post.tags = post.tags || [];

        return res.status(200).json({ post });
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch post" });
    }
});

// Update post
router.put("/:id", verifyToken, async (req, res) => {
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

        // Start a transaction for the update
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
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('id')
            .eq('id', req.params.id)
            .eq('author_id', req.user.userId)
            .single();

        if (fetchError || !post) {
            return res.status(404).json({ error: "Post not found" });
        }

        const { error: deleteError } = await supabase
            .from('posts')
            .delete()
            .eq('id', post.id);

        if (deleteError) {
            return res.status(500).json({ error: "Failed to delete post" });
        }

        return res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        return res.status(500).json({ error: "Failed to delete post" });
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
            console.log('Authenticating request for my posts...');
            return verifyToken(req, res, () => {
                console.log('Authentication successful, continuing...');
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
        console.log('Processing posts request:', {
            query: req.query,
            user: req.user
        });

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
            console.log('Filtering by author ID:', req.user.userId);
            query = query.eq('author_id', req.user.userId);
        }

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        // Execute query
        const { data: posts, error } = await query;

        if (error) {
            console.error('Supabase query error:', error);
            throw error;
        }

        console.log(`Found ${posts?.length || 0} posts`);
        return res.status(200).json({ posts: posts || [] });

    } catch (error) {
        console.error('Posts endpoint error:', error);
        return res.status(500).json({
            error: "Failed to fetch posts",
            details: error.message
        });
    }
});

// Get user posts by username
router.get("/user/:username", async (req, res) => {
    try {
        const { username } = req.params;
        const { 
            category, 
            type = "all", 
            limit = 10, 
            page = 1,
            sortBy = "newest"
        } = req.query;
        const offset = (page - 1) * limit;

        console.log('Getting posts for user:', { username, category, type, limit, page, offset, sortBy });

        // First get the user ID
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("username", username.toLowerCase())
            .single();

        if (userError || !user) {
            console.error('User not found:', userError);
            return res.status(404).json({ error: "User not found" });
        }

        // Build query for posts
        let query = supabase
            .from("posts")
            .select(`
                *,
                author:users!posts_author_id_fkey (id, username, display_name),
                category:categories!posts_category_id_fkey (id, name)
            `, { count: 'exact' })
            .eq("author_id", user.id)
            .eq("status", "published");

        // Apply filters
        if (category && category !== "all") {
            query = query.eq("category_id", category);
        }
        
        if (type && type !== "all") {
            query = query.eq("type", type);
        }

        // Apply sorting
        switch (sortBy) {
            case "oldest":
                query = query.order("published_at", { ascending: true });
                break;
            case "newest":
            default:
                query = query.order("published_at", { ascending: false });
        }

        // Apply pagination
        query = query.range(offset, offset + limit - 1);

        console.log('Executing query for user posts');
        const { data: posts, error, count } = await query;

        if (error) {
            console.error('Error fetching posts:', error);
            throw error;
        }

        // Get unique categories for this user's posts (for filters)
        const { data: userCategories } = await supabase
            .from("posts")
            .select(`
                category:categories!posts_category_id_fkey (id, name)
            `)
            .eq("author_id", user.id)
            .eq("status", "published");

        const uniqueCategories = userCategories
            ? Array.from(new Set(
                userCategories
                    .filter(post => post.category)
                    .map(post => post.category)
                    .filter((category, index, self) => 
                        index === self.findIndex(c => c.id === category.id)
                    )
            ))
            : [];

        console.log('Returning posts:', { 
            count, 
            postsLength: posts?.length, 
            categoriesLength: uniqueCategories?.length 
        });

        return res.status(200).json({ 
            posts: posts || [],
            categories: uniqueCategories,
            pagination: {
                total: count || 0,
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: count > offset + posts.length
            }
        });

    } catch (error) {
        console.error("Get user posts error:", error);
        return res.status(500).json({
            error: "Failed to fetch user posts",
            details: error.message
        });
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

//Get reactions count for a post
router.get("/reactions/:postId", async (req, res) => {
    try {
      const { postId } = req.params;

      const { data, error } = await supabase
        .from('post_reactions')
        .select('upvote_count, downvote_count')
        .eq('post_id', postId)
  
/*         console.log("Supabase error =>", error);
        console.log("Supabase data =>", data); */

      if (error) {
        return res.status(500).json({ 
          error: "Failed to fetch reactions", 
          details: error.message 
        });
      }

        if (!data || data.length === 0) {
            return res.status(200).json({ 
            reactions: { upvote: 0, downvote: 0 }
            });
        }

        const totalUpvotes = data.reduce((sum, row) => sum + (row.upvote_count || 0), 0);
        const totalDownvotes = data.reduce((sum, row) => sum + (row.downvote_count || 0), 0);
/*         console.log("Post ID =>", postId);
        console.log("Total upvotes =>", totalUpvotes);
        console.log("Total downvotes =>", totalDownvotes); */

      return res.status(200).json({
        reactions: {
          upvote: totalUpvotes || 0,
          downvote: totalDownvotes || 0
        }
      });
  
    } catch (error) {
      console.error('Get reactions error:', error);
      return res.status(500).json({
        error: "Failed to fetch reactions",
        details: error.message
      });
    }
  });  

// Add or update reaction to a post
router.post("/reactions", verifyToken, async (req, res) => {
    try{
        const { postId, type } = req.body;
        const userId = req.user.userId;

        if (!postId || !type) {
            return res.status(400).json({ error: "Missing required fields" });
        }
        // Check if the user has already reacted to the post
        const { data: existingReaction, error: fetchError } = await supabase
            .from('post_reactions')
            .select('*')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .single();

        if (fetchError && fetchError.code !== "PGRST116") {//PGRST116 is the code for no data found
            return res.status(500).json({ error: "Failed to check existing reaction" });
        }
        // If the user has already reacted to the post, update the reaction
        if (existingReaction && (
            (type === "upvote" && existingReaction.upvote_count === 1) ||
            (type === "downvote" && existingReaction.downvote_count === 1)
        )) {
            await supabase
                .from("post_reactions")
                .delete()
                .eq("id", existingReaction.id);

            return res.status(200).json({ message: "Reaction removed successfully" });
        }

        // Update the reaction
        if (existingReaction) {
            await supabase
                .from('post_reactions')
                .update({ 
                    upvote_count: type === "upvote" ? 1 : 0,
                    downvote_count: type === "downvote" ? 1 : 0,
                })
                .eq('id', existingReaction.id);

            return res.status(200).json({ message: "Reaction updated successfully" });
        }

        // Add a new reaction
        await supabase
            .from('post_reactions')
            .insert({
                post_id: postId, 
                user_id: userId,
                upvote_count: type === "upvote" ? 1 : 0,
                downvote_count: type === "downvote" ? 1 : 0,
            })

        return res.status(201).json({ message: "Reaction added successfully", reaction });     
    } catch (error) {
        console.error('Add reaction error:', error);
        return res.status(500).json({ error: "Failed to add reaction", details: error.message });
    }
});

// Remove a reaction from a post
router.delete("/reactions", verifyToken, async (req, res) => {
    try {
        const { postId } = req.body;
        const userId = req.user.userId;

        if (!postId) {
            return res.status(400).json({ error: "Missing postId" });
        }
        // Delete the reaction
        const { error: deleteError } = await supabase
            .from("post_reactions")
            .delete()
            .eq("post_id", postId)
            .eq("user_id", userId)

        if (deleteError) {
            return res.status(500).json({ error: "Failed to remove reaction" });
        }

        if(count === 0){
            return res.status(404).json({ error: "Reaction not found" });
        }
/*         // Check if the user has reacted to the post
        const { data: existingReaction, error: fetchError } = await supabase
            .from("post_reactions")
            .select("id")
            .eq("post_id", postId)
            .eq("user_id", userId)
            //.single();

        if (fetchError || !existingReaction) {
            return res.status(404).json({ error: "Reaction not found" });
        } */

        return res.status(200).json({ message: "Reaction removed successfully" });

    } catch (error) {
        console.error("Remove reaction error:", error);
        return res.status(500).json({ error: "Failed to remove reaction", details: error.message });
    }
});

export default router;