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
                tags: tags || [],
                scheduled_for: status === 'scheduled' ? scheduledFor : null,
                published_at: status === 'published' ? new Date().toISOString() : null
            })
            .select(`
                *,
                author:users(id, username, display_name),
                category:categories(id, name)
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
        return res.status(500).json({ error: "Failed to create post" });
    }
});

router.put("/:slug", verifyToken, async (req, res) => {
    try {
        const { title, body, type, categoryId, tags, status, scheduledFor } = req.body;
        const slug = req.params.slug;

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
            tags: tags || existingPost.tags,
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
                category:categories!posts_category_id_fkey (id, name)
            `)
            .single();

        if (updateError) {
            return res.status(500).json({ error: "Failed to update post" });
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
                category:categories(id, name)
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

router.get("/", async (req, res, next) => {
    try {
        if (req.query.author === 'me') {
            return verifyToken(req, res, () => {
                next();
            });
        }
        next();
    } catch (error) {
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

        let query = supabase
            .from('posts')
            .select(`
                *,
                users!posts_author_id_fkey (id, username, display_name),
                categories!posts_category_id_fkey (id, name)
            `);

        if (author === 'me' && req.user) {
            query = query.eq('author_id', req.user.userId);
        }

        if (status !== 'all') {
            query = query.eq('status', status);
        }

        const { data: posts, error } = await query;

        if (error) {
            throw error;
        }

        return res.status(200).json({ posts: posts || [] });
    } catch (error) {
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

router.get("/scheduled/publish-due", verifyToken, async (req, res) => {
    try {
        const now = new Date().toISOString();

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

export default router;