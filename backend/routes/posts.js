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

        if (!title || !type || !status) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        const { data: post, error: postError } = await supabase
            .from('posts')
            .insert({
                title,
                slug: await generateUniqueSlug(title),
                body,
                type,
                category_id: categoryId,
                author_id: authorId,
                status,
                scheduled_for: status === 'scheduled' ? scheduledFor : null,
                published_at: status === 'published' ? new Date().toISOString() : null,
                tags: Array.isArray(tags) ? tags.map(tag => tag.toLowerCase()) : []
            })
            .select(`
                *,
                author:users(id, username, display_name)
            `)
            .single();

        if (postError || !post) {
            return res.status(500).json({ error: "Failed to create post" });
        }

        return res.status(201).json({
            message: "Post created successfully",
            post
        });

    } catch (error) {
        console.error('Create post error:', error);
        return res.status(500).json({ error: "Failed to create post" });
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
            tags: Array.isArray(tags) ? tags.map(tag => tag.toLowerCase()) : existingPost.tags // Handle tags as text array
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

// Get posts with filters
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
            tag,
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

// Get posts scheduled for publication
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

// GET Feed - Retrieve blog posts with filtering options
router.get("/feed", async (req, res) => {
    try {
        const { filter = "recent", limit = 10, page = 1, category, tag } = req.query;
        const offset = (page - 1) * limit;

        let query = supabase
            .from("posts")
            .select(`
                *,
                author:users!posts_author_id_fkey (id, username, display_name),
                category:categories!posts_category_id_fkey (id, name),
                comments:post_comments(count),
                likes:post_likes(count)
            `, { count: 'exact' })
            .eq("status", "published")
            .range(offset, offset + limit - 1);

        switch (filter) {
            case "most_liked":
                query = query.order("likes", { ascending: false });
                break;
            case "most_commented":
                query = query.order("comments", { ascending: false });
                break;
            case "chronological":
                query = query.order("published_at", { ascending: true });
                break;
            default:
                query = query.order("published_at", { ascending: false });
        }

        if (category) {
            query = query.eq("category_id", category);
        }

        if (tag) {
            // Update tag filtering to use contains on the text array
            query = query.contains('tags', [tag.toLowerCase()]);
        }

        const { data: posts, error } = await query;

        if (error) {
            throw error;
        }

        return res.status(200).json({ posts: posts || [] });

    } catch (error) {
        console.error("Feed endpoint error:", error);
        return res.status(500).json({
            error: "Failed to fetch feed",
            details: error.message
        });
    }
});

router.get("/filter", async (req, res) => {
    try {
        const {
            category,
            tag,
            author,
            startDate,
            endDate,
            popularity = "none",
            limit = 10,
            page = 1
        } = req.query;

        const offset = (page - 1) * limit;

        let query = supabase
            .from("posts")
            .select(`
                *,
                author:users!posts_author_id_fkey (id, username, display_name),
                category:categories!posts_category_id_fkey (id, name),
                comments:post_comments(count),
                likes:post_likes(count)
            `, { count: "exact" })
            .eq("status", "published")
            .range(offset, offset + limit - 1);

        if (category) {
            query = query.eq("category_id", category);
        }

        if (tag) {
            // Update tag filtering to use contains on the text array
            query = query.contains('tags', [tag.toLowerCase()]);
        }

        if (author) {
            query = query.eq("author_id", author);
        }

        if (startDate && endDate) {
            query = query.gte("published_at", startDate).lte("published_at", endDate);
        } else if (startDate) {
            query = query.gte("published_at", startDate);
        } else if (endDate) {
            query = query.lte("published_at", endDate);
        }

        switch (popularity) {
            case "most_liked":
                query = query.order("likes.count", { ascending: false });
                break;
            case "most_commented":
                query = query.order("comments.count", { ascending: false });
                break;
            default:
                query = query.order("published_at", { ascending: false });
        }

        const { data: posts, error } = await query;

        if (error) {
            throw error;
        }

        return res.status(200).json({ posts: posts || [] });

    } catch (error) {
        console.error("Filter endpoint error:", error);
        return res.status(500).json({
            error: "Failed to filter posts",
            details: error.message
        });
    }
});

// GET Search - Search users based on username, display_name, or email.
router.get("/search", async (req, res) => {
    try {
        const { query, page = 1, limit = 10 } = req.query;
        
        // Validate that a search query is provided
        if (!query || query.trim() === "") {
            return res.status(400).json({ error: "Search query is required" });
        }

        const offset = (page - 1) * limit;

        // Build the search query using ILIKE for case-insensitive matching
        let supabaseQuery = supabase
            .from("users")
            .select("id, username, display_name, avatar_name, bio")
            .or(
                `username.ilike.%${query}%, display_name.ilike.%${query}%, email.ilike.%${query}%`
            )
            .range(offset, offset + limit - 1);

        // Execute the query
        const { data: users, error } = await supabaseQuery;

        if (error) {
            throw error;
        }

        return res.status(200).json({ users: users || [] });

    } catch (error) {
        console.error("User search error:", error);
        return res.status(500).json({
            error: "Failed to search users",
            details: error.message
        });
    }
});

// GET Search - Search posts based on title, body, author, tag, and category.
router.get("/find", async (req, res) => { 
    try {
        const { 
            query, 
            author, 
            tag, 
            category, 
            page = 1, 
            limit = 10 
        } = req.query;

        const offset = (page - 1) * limit;

        // Base query: Only fetch published posts
        let supabaseQuery = supabase
            .from("posts")
            .select(`
                id, title, body, published_at, 
                author:users!posts_author_id_fkey (id, username, display_name),
                category:categories!posts_category_id_fkey (id, name)
            `)
            .eq("status", "published") // Ensure only published posts are shown
            .order("published_at", { ascending: false }) // Default sorting by date
            .range(offset, offset + limit - 1);

        // Search by post title or content keywords (case-insensitive)
        if (query) {
            supabaseQuery = supabaseQuery.or(`
                title.ilike.%${query}%, 
                body.ilike.%${query}%
            `);
        }

        // Filter by author (username)
        if (author) {
            supabaseQuery = supabaseQuery.eq("author.username", author);
        }

        // Filter by category
        if (category) {
            supabaseQuery = supabaseQuery.eq("category_id", category);
        }

        // Filter by tag
        if (tag) {
            supabaseQuery = supabaseQuery.contains("tags.tag.name", [tag]);
        }

        // Execute the query
        const { data: posts, error } = await supabaseQuery;

        if (error) {
            throw error;
        }

        return res.status(200).json({ posts: posts || [] });

    } catch (error) {
        console.error("Post search error:", error);
        return res.status(500).json({
            error: "Failed to search posts",
            details: error.message
        });
    }
});

// Get user posts by username with filters
router.get("/user/:username", async (req, res) => {
    try {
        const { username } = req.params;
        const { category, type = "all", limit = 20, page = 1 } = req.query;
        const offset = (page - 1) * limit;

        // First get the user ID
        const { data: user, error: userError } = await supabase
            .from("users")
            .select("id")
            .eq("username", username.toLowerCase())
            .single();

        if (userError || !user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Build query for posts
        let query = supabase
            .from("posts")
            .select(`
                *,
                author:users!posts_author_id_fkey (id, username, display_name),
                category:categories!posts_category_id_fkey (id, name)
            `)
            .eq("author_id", user.id)
            .eq("status", "published")
            .range(offset, offset + limit - 1);

        // Apply filters
        if (category) {
            query = query.eq("category_id", category);
        }
        
        if (type !== "all") {
            query = query.eq("type", type);
        }

        // Order by most recent first
        query = query.order("published_at", { ascending: false });

        const { data: posts, error } = await query;

        if (error) {
            throw error;
        }

        // Get unique categories for this user's posts
        const { data: userCategories } = await supabase
            .from("posts")
            .select(`
                category:categories!posts_category_id_fkey (id, name)
            `)
            .eq("author_id", user.id)
            .eq("status", "published");

        const uniqueCategories = userCategories
            ? Array.from(new Set(userCategories
                .filter(post => post.category)
                .map(post => post.category)))
            : [];

        return res.status(200).json({ 
            posts: posts || [],
            categories: uniqueCategories
        });

    } catch (error) {
        console.error("Get user posts error:", error);
        return res.status(500).json({
            error: "Failed to fetch user posts",
            details: error.message
        });
    }
});

export default router;