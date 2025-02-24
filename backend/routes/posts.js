import express from "express";
import { supabase } from "../config/supabaseClient.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Create or update tags and return their IDs
async function getTagIds(tagNames) {
    const tags = [];
    for (const name of tagNames) {
        const normalizedName = name.toLowerCase().trim();
        // Try to get existing tag
        let { data: tag } = await supabase
            .from('tags')
            .select('id')
            .eq('name', normalizedName)
            .single();

        if (!tag) {
            // Create new tag if it doesn't exist
            const { data: newTag, error } = await supabase
                .from('tags')
                .insert({ name: normalizedName })
                .select('id')
                .single();

            if (error) throw error;
            tag = newTag;
        }
        tags.push(tag.id);
    }
    return tags;
}

// Create a new post
router.post("/", verifyToken, async (req, res) => {
    try {
        const {
            title,
            body,
            type,
            categoryId,
            tags,
            status,
            scheduledFor
        } = req.body;

        // Validate required fields
        if (!title || !body || !type || !categoryId || !status) {
            return res.status(400).json({ error: "Missing required fields" });
        }

        // Validate post type
        if (!['article', 'post'].includes(type)) {
            return res.status(400).json({ error: "Invalid post type" });
        }

        // Validate status
        if (!['draft', 'published', 'scheduled'].includes(status)) {
            return res.status(400).json({ error: "Invalid status" });
        }

        // Validate scheduled time if status is scheduled
        if (status === 'scheduled' && !scheduledFor) {
            return res.status(400).json({ error: "Scheduled time is required for scheduled posts" });
        }

        // Create post
        const { data: post, error: postError } = await supabase
            .from('posts')
            .insert({
                title,
                body,
                type,
                category_id: categoryId,
                author_id: req.user.userId,
                status,
                scheduled_for: scheduledFor,
                published_at: status === 'published' ? new Date() : null
            })
            .select()
            .single();

        if (postError) throw postError;

        // Handle tags if provided
        if (tags && tags.length > 0) {
            const tagIds = await getTagIds(tags);
            const postTags = tagIds.map(tagId => ({
                post_id: post.id,
                tag_id: tagId
            }));

            const { error: tagError } = await supabase
                .from('post_tags')
                .insert(postTags);

            if (tagError) throw tagError;
        }

        return res.status(201).json({ message: "Post created successfully", post });
    } catch (error) {
        console.error("Create post error:", error);
        return res.status(500).json({ error: "Failed to create post" });
    }
});

// Update a post
router.put("/:id", verifyToken, async (req, res) => {
    try {
        const postId = req.params.id;
        const {
            title,
            body,
            type,
            categoryId,
            tags,
            status,
            scheduledFor
        } = req.body;

        // Check if post exists and belongs to user
        const { data: existingPost, error: fetchError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .eq('author_id', req.user.userId)
            .single();

        if (fetchError || !existingPost) {
            return res.status(404).json({ error: "Post not found" });
        }

        if (existingPost.status === 'deleted') {
            return res.status(400).json({ error: "Cannot update deleted post" });
        }

        // Update post
        const updates = {
            title: title || existingPost.title,
            body: body || existingPost.body,
            type: type || existingPost.type,
            category_id: categoryId || existingPost.category_id,
            status: status || existingPost.status,
            scheduled_for: scheduledFor || existingPost.scheduled_for,
            published_at: status === 'published' && existingPost.status !== 'published'
                ? new Date()
                : existingPost.published_at
        };

        const { data: updatedPost, error: updateError } = await supabase
            .from('posts')
            .update(updates)
            .eq('id', postId)
            .select()
            .single();

        if (updateError) throw updateError;

        // Update tags if provided
        if (tags) {
            // Remove existing tags
            await supabase
                .from('post_tags')
                .delete()
                .eq('post_id', postId);

            // Add new tags
            if (tags.length > 0) {
                const tagIds = await getTagIds(tags);
                const postTags = tagIds.map(tagId => ({
                    post_id: postId,
                    tag_id: tagId
                }));

                await supabase
                    .from('post_tags')
                    .insert(postTags);
            }
        }

        return res.status(200).json({ message: "Post updated successfully", post: updatedPost });
    } catch (error) {
        console.error("Update post error:", error);
        return res.status(500).json({ error: "Failed to update post" });
    }
});

// Soft delete a post
router.delete("/:id", verifyToken, async (req, res) => {
    try {
        const postId = req.params.id;

        // Check if post exists and belongs to user
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .eq('author_id', req.user.userId)
            .single();

        if (fetchError || !post) {
            return res.status(404).json({ error: "Post not found" });
        }

        if (post.status === 'deleted') {
            return res.status(400).json({ error: "Post already deleted" });
        }

        // Soft delete the post
        const { error: deleteError } = await supabase
            .from('posts')
            .update({
                status: 'deleted',
                deleted_at: new Date()
            })
            .eq('id', postId);

        if (deleteError) throw deleteError;

        return res.status(200).json({ message: "Post deleted successfully" });
    } catch (error) {
        console.error("Delete post error:", error);
        return res.status(500).json({ error: "Failed to delete post" });
    }
});

// Get all posts for a user (with filters)
router.get("/", verifyToken, async (req, res) => {
    try {
        const {
            status,
            type,
            categoryId,
            page = 1,
            limit = 10
        } = req.query;

        let query = supabase
            .from('posts')
            .select(`
                *,
                category:categories(name),
                tags:post_tags(tag:tags(name))
            `)
            .eq('author_id', req.user.userId)
            .neq('status', 'deleted')
            .order('created_at', { ascending: false });

        // Apply filters
        if (status) query = query.eq('status', status);
        if (type) query = query.eq('type', type);
        if (categoryId) query = query.eq('category_id', categoryId);

        // Apply pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data: posts, error } = await query;

        if (error) throw error;

        return res.status(200).json({ posts });
    } catch (error) {
        console.error("Fetch posts error:", error);
        return res.status(500).json({ error: "Failed to fetch posts" });
    }
});

// Publish a scheduled post
router.post("/:id/publish", verifyToken, async (req, res) => {
    try {
        const postId = req.params.id;

        // Check if post exists and belongs to user
        const { data: post, error: fetchError } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .eq('author_id', req.user.userId)
            .eq('status', 'scheduled')
            .single();

        if (fetchError || !post) {
            return res.status(404).json({ error: "Scheduled post not found" });
        }

        // Publish the post
        const { data: publishedPost, error: publishError } = await supabase
            .from('posts')
            .update({
                status: 'published',
                published_at: new Date(),
                scheduled_for: null
            })
            .eq('id', postId)
            .select()
            .single();

        if (publishError) throw publishError;

        return res.status(200).json({
            message: "Post published successfully",
            post: publishedPost
        });
    } catch (error) {
        console.error("Publish post error:", error);
        return res.status(500).json({ error: "Failed to publish post" });
    }
});

// Publish all due scheduled posts (for cron job)
router.post("/scheduled/publish-due", async (req, res) => {
    try {
        const now = new Date();

        // Get all due scheduled posts
        const { data: duePosts, error: fetchError } = await supabase
            .from('posts')
            .select('id')
            .eq('status', 'scheduled')
            .lte('scheduled_for', now);

        if (fetchError) throw fetchError;

        if (!duePosts || duePosts.length === 0) {
            return res.status(200).json({ message: "No due posts to publish" });
        }

        // Publish all due posts
        const { error: publishError } = await supabase
            .from('posts')
            .update({
                status: 'published',
                published_at: now,
                scheduled_for: null
            })
            .in('id', duePosts.map(post => post.id));

        if (publishError) throw publishError;

        return res.status(200).json({
            message: `Successfully published ${duePosts.length} posts`,
            publishedCount: duePosts.length
        });
    } catch (error) {
        console.error("Publish due posts error:", error);
        return res.status(500).json({ error: "Failed to publish due posts" });
    }
});

export default router;