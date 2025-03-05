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
        const { data: mutedUsers, error: mutedError } = await supabase
            .from('mutes')
            .select('muted_id')
            .eq('user_id', user.userId);

        if (mutedError) {
            console.error('Muted users query error:', mutedError);
            throw mutedError;
        }

        const mutedIds = mutedUsers?.map(m => m.muted_id) || [];
        
        let query = supabase
            .from('posts')
            .select(`
                *,
                author:users!posts_author_id_fkey (username, display_name, avatar_name),
                category:categories!posts_category_id_fkey (id, name)
            `)
            .eq('status', 'published')
            .in('author_id', userIds);

        // Only add muted filter if there are muted users
        if (mutedIds.length > 0) {
            query = query.filter('author_id', 'not.in', `(${mutedIds.join(',')})`);
        }

        // Get posts from users being followed
        const { data: followingPosts, error: postsError } = await query
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

// Get network feed (posts from users followed by users you follow)
router.get('/network', authMiddleware, async (req, res) => {
    try {
        const { user } = req;
        const { page = 1, limit = 10 } = req.query;
        const offset = (page - 1) * limit;

        // Get users you follow
        const { data: following, error: followingError } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.userId);

        if (followingError) throw followingError;

        if (!following || following.length === 0) {
            return res.json({
                posts: [],
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    hasMore: false
                }
            });
        }

        const followingIds = following.map(f => f.following_id);

        // Get network users (users followed by users you follow)
        const { data: networkUsers, error: networkError } = await supabase
            .from('follows')
            .select('following_id')
            .filter('follower_id', 'in', `(${followingIds.join(',')})`)
            .filter('following_id', 'neq', user.userId);

        if (networkError) throw networkError;

        // Combine both following and network users (removing duplicates)
        const networkUserIds = [
            ...followingIds,
            ...networkUsers.map(u => u.following_id)
        ];
        const uniqueUserIds = [...new Set(networkUserIds)];

        // Get muted users
        const { data: mutedUsers, error: mutedError } = await supabase
            .from('mutes')
            .select('muted_id')
            .eq('user_id', user.userId);

        if (mutedError) {
            console.error('Muted users query error:', mutedError);
            throw mutedError;
        }

        const mutedIds = mutedUsers?.map(m => m.muted_id) || [];

        let query = supabase
            .from('posts')
            .select(`
                *,
                author:users!posts_author_id_fkey (username, display_name, avatar_name),
                category:categories!posts_category_id_fkey (id, name)
            `)
            .eq('status', 'published')
            .in('author_id', uniqueUserIds)
            .not('author_id', 'eq', user.userId); // Exclude your own posts

        // Only add muted filter if there are muted users
        if (mutedIds.length > 0) {
            query = query.filter('author_id', 'not.in', `(${mutedIds.join(',')})`);
        }

        // Get posts from both following and network users
        const { data: networkPosts, error: postsError } = await query
            .order('published_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (postsError) throw postsError;

        res.json({
            posts: networkPosts || [],
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: networkPosts?.length === parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Feed error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
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

            // Get muted users
            const { data: mutedUsers, error: mutedError } = await supabase
                .from('mutes')
                .select('muted_id')
                .eq('user_id', user.userId);

            if (mutedError) {
                console.error('Muted users query error:', mutedError);
                throw mutedError;
            }

            const mutedIds = mutedUsers?.map(m => m.muted_id) || [];

            let query = supabase
                .from('posts')
                .select(`
                    *,
                    author:user_id (username, display_name, avatar_name),
                    category:category_id (id, name)
                `)
                .eq('status', 'published');

            // Only add muted filter if there are muted users
            if (mutedIds.length > 0) {
                query = query.filter('user_id', 'not.in', `(${mutedIds.join(',')})`);
            }

            // Get random posts from all categories, excluding muted users
            const { data: explorePosts, error } = await query
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

        // Get muted users for category-filtered explore
        const { data: mutedUsers, error: mutedError } = await supabase
            .from('mutes')
            .select('muted_id')
            .eq('user_id', user.userId);

        if (mutedError) {
            console.error('Muted users query error:', mutedError);
            throw mutedError;
        }

        const mutedIds = mutedUsers?.map(m => m.muted_id) || [];

        let query = supabase
            .from('posts')
            .select(`
                *,
                author:user_id (username, display_name, avatar_name),
                category:category_id (id, name)
            `)
            .eq('status', 'published')
            .in('category_id', categoryIds);

        // Only add muted filter if there are muted users
        if (mutedIds.length > 0) {
            query = query.filter('user_id', 'not.in', `(${mutedIds.join(',')})`);
        }

        // Get posts from selected categories, excluding muted users
        const { data: explorePosts, error } = await query
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