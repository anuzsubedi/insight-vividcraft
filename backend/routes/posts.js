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
                published_at: status === 'published' ? new Date().toISOString() : null
            })
            .select()
            .single();

        if (postError || !post) {
            return res.status(500).json({ error: "Failed to create post" });
        }

        if (tags && tags.length > 0 && post.id) {
            try {
                const tagIds = [];
                for (const tag of tags) {
                    const { data: existingTag } = await supabase
                        .from('tags')
                        .select('id')
                        .eq('name', tag.toLowerCase())
                        .single();

                    if (existingTag) {
                        tagIds.push(existingTag.id);
                    } else {
                        const { data: newTag } = await supabase
                            .from('tags')
                            .insert({ name: tag.toLowerCase() })
                            .select('id')
                            .single();

                        if (newTag) {
                            tagIds.push(newTag.id);
                        }
                    }
                }

                if (tagIds.length > 0) {
                    await supabase
                        .from('post_tags')
                        .insert(tagIds.map(tagId => ({
                            post_id: post.id,
                            tag_id: tagId
                        })));
                }
            } catch (tagError) {
                // Silently handle tag processing errors
            }
        }

        const { data: completePost, error: fetchError } = await supabase
            .from('posts')
            .select(`
                *,
                author:users(id, username, display_name),
                tags:post_tags(tag:tags(id, name))
            `)
            .eq('id', post.id)
            .single();

        if (fetchError) {
            return res.status(201).json({
                message: "Post created successfully",
                post
            });
        }

        return res.status(201).json({
            message: "Post created successfully",
            post: completePost
        });

    } catch (error) {
        return res.status(500).json({ error: "Failed to create post" });
    }
});

// In the PUT /:slug route, update the validation and scheduling logic:
router.put("/:slug", verifyToken, async (req, res) => {
    try {
        const { title, body, type, categoryId, tags, status, scheduledFor } = req.body;
        const slug = req.params.slug;

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
            .eq('slug', slug)
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
            published_at: status === 'published' ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
        };

        if (title && title !== existingPost.title) {
            updates.slug = await generateUniqueSlug(title);
        }

        const { data: post, error: updateError } = await supabase
            .from('posts')
            .update(updates)
            .eq('id', existingPost.id)
            .select(`
                *,
                author:users!posts_author_id_fkey (id, username, display_name),
                category:categories!posts_category_id_fkey (id, name),
                tags:post_tags (tag:tags (id, name))
            `)
            .single();

        if (updateError) {
            return res.status(500).json({ error: "Failed to update post" });
        }

        // Handle tags update
        if (tags) {
            await supabase
                .from('post_tags')
                .delete()
                .eq('post_id', existingPost.id);

            if (tags.length > 0) {
                const tagPromises = tags.map(tag => {
                    return supabase
                        .from('tags')
                        .select('id')
                        .eq('name', tag.toLowerCase())
                        .single()
                        .then(async ({ data: existingTag }) => {
                            if (!existingTag) {
                                const { data: newTag } = await supabase
                                    .from('tags')
                                    .insert({ name: tag.toLowerCase() })
                                    .select('id')
                                    .single();
                                return newTag.id;
                            }
                            return existingTag.id;
                        });
                });

                const tagIds = await Promise.all(tagPromises);

                await supabase
                    .from('post_tags')
                    .insert(tagIds.map(tagId => ({
                        post_id: existingPost.id,
                        tag_id: tagId
                    })));
            }
        }

        return res.status(200).json({
            message: "Post updated successfully",
            post
        });

    } catch (error) {
        console.error('Update post error:', error);
        return res.status(500).json({ error: "Failed to update post" });
    }
});

router.get("/:slug", async (req, res) => {
    try {
        const { data: post, error } = await supabase
            .from('posts')
            .select(`
                *,
                author:users(id, username, display_name),
                category:categories(id, name),
                tags:post_tags(tag:tags(id, name))
            `)
            .eq('slug', req.params.slug)
            .single();

        if (error || !post) {
            return res.status(404).json({ error: "Post not found" });
        }

        return res.status(200).json({ post });
    } catch (error) {
        return res.status(500).json({ error: "Failed to fetch post" });
    }
});

// Update the GET posts route with better error handling
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
                categories!posts_category_id_fkey (id, name),
                post_tags (tags (id, name))
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

router.delete("/:slug", verifyToken, async (req, res) => {
    try {
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('id')
            .eq('slug', req.params.slug)
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

router.post("/:slug/publish", verifyToken, async (req, res) => {
    try {
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('*')
            .eq('slug', req.params.slug)
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
                tags:post_tags(tag:tags(id, name)),
                comments:post_comments(count),
                likes:post_likes(count)
            `, { count: 'exact' }) // Count comments and likes using exact method
            .eq("status", "published")
            //.order("published_at", { ascending: false }) // Default: Most recent first
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
            query = query.contains("tags.tag.name", [tag]); // Filter by tags
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
                tags:post_tags(tag:tags(id, name)),
                comments:post_comments(count),
                likes:post_likes(count)
            `, { count: "exact" })
            .eq("status", "published")
            .range(offset, offset + limit - 1);

        if (category) {
            query = query.eq("category_id", category);
        }

        if (tag) {
            query = query.contains("tags.tag.name", [tag]);
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
                break;
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


export default router;