import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Get feed posts (following)
router.get('/following', authMiddleware, async (req, res) => {
    try {
        const { user } = req;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        console.log('Feed request for user:', user.userId); // Debug log

        // Get following IDs first
        const { data: followingIds, error: followingError } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.userId);

        if (followingError) {
            console.error('Following query error:', followingError);
            throw followingError;
        }

        console.log('Following IDs:', followingIds); // Debug log

        // If not following anyone, return empty array
        if (!followingIds || followingIds.length === 0) {
            return res.json({
                posts: [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    hasMore: false
                }
            });
        }

        // Extract the IDs
        const userIds = followingIds.map(f => f.following_id);

        // Get posts from users being followed
        const { data: followingPosts, error: postsError } = await supabase
            .from('posts')
            .select(`
                *,
                author:users!posts_author_id_fkey (username, display_name, avatar_name),
                category:categories!posts_category_id_fkey (id, name)
            `)
            .eq('status', 'published')
            .in('author_id', userIds)
            .order('published_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (postsError) {
            console.error('Posts query error:', postsError);
            throw postsError;
        }

        console.log('Found posts:', followingPosts?.length || 0); // Debug log

        res.json({
            posts: followingPosts || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: followingPosts?.length === parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Feed error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Get extended network feed (posts from users followed by users you follow)
router.get('/extended', authMiddleware, async (req, res) => {
    try {
        const { user } = req;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // Get posts from extended network, excluding muted users and already followed users
        const { data: extendedPosts, error } = await supabase
            .from('posts')
            .select(`
                *,
                author:user_id (username, display_name, avatar_name),
                category:category_id (id, name)
            `)
            .eq('status', 'published')
            .in('user_id',
                supabase
                    .from('follows as f1')
                    .select('following_id')
                    .eq('follower_id', 
                        supabase
                            .from('follows as f2')
                            .select('following_id')
                            .eq('follower_id', user.id)
                    )
                    .not('following_id', 'in',
                        supabase
                            .from('follows')
                            .select('following_id')
                            .eq('follower_id', user.id)
                    )
                    .not('following_id', 'in',
                        supabase
                            .from('mutes')
                            .select('muted_id')
                            .eq('muter_id', user.id)
                    )
            )
            .order('published_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            posts: extendedPosts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: extendedPosts.length === parseInt(limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get explore feed (random posts from selected categories)
router.get('/explore', authMiddleware, async (req, res) => {
    try {
        const { user } = req;
        const { page = 1, limit = 10, categories } = req.query;
        const offset = (page - 1) * limit;
        const categoryIds = categories ? categories.split(',') : [];

        // Get available categories if none specified
        if (!categories) {
            const { data: availableCategories, error: categoryError } = await supabase
                .from('categories')
                .select('id, name')
                .order('name');

            if (categoryError) throw categoryError;

            // Get random posts from all categories, excluding muted users
            const { data: explorePosts, error } = await supabase
                .from('posts')
                .select(`
                    *,
                    author:user_id (username, display_name, avatar_name),
                    category:category_id (id, name)
                `)
                .eq('status', 'published')
                .not('user_id', 'in',
                    supabase
                        .from('mutes')
                        .select('muted_id')
                        .eq('muter_id', user.id)
                )
                .order('published_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            return res.json({
                posts: explorePosts,
                categories: availableCategories,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    hasMore: explorePosts.length === parseInt(limit)
                }
            });
        }

        // Get posts from selected categories, excluding muted users
        const { data: explorePosts, error } = await supabase
            .from('posts')
            .select(`
                *,
                author:user_id (username, display_name, avatar_name),
                category:category_id (id, name)
            `)
            .eq('status', 'published')
            .in('category_id', categoryIds)
            .not('user_id', 'in',
                supabase
                    .from('mutes')
                    .select('muted_id')
                    .eq('muter_id', user.id)
            )
            .order('published_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        res.json({
            posts: explorePosts,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: explorePosts.length === parseInt(limit)
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;