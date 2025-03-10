import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Helper function to get reaction counts and user reaction
async function getPostReactions(postId, userId) {
    // Get reaction counts
    const { data: counts, error: countsError } = await supabase
        .rpc('get_post_reaction_counts', { post_id: postId });

    if (countsError) throw countsError;

    // Get user's reaction if user is logged in
    let userReaction = null;
    if (userId) {
        const { data: reaction } = await supabase
            .from('post_reactions')
            .select('reaction_type')
            .eq('user_id', userId)
            .eq('post_id', postId)
            .single();

        if (reaction) {
            userReaction = reaction.reaction_type;
        }
    }

    return {
        upvotes: counts?.[0]?.upvotes || 0,
        downvotes: counts?.[0]?.downvotes || 0,
        userReaction
    };
}

// Helper function to add reactions to posts
async function addReactionsToPosts(posts, userId) {
    return Promise.all(posts.map(async (post) => {
        try {
            const reactions = await getPostReactions(post.id, userId);
            return {
                ...post,
                reactions: {
                    upvotes: reactions.upvotes,
                    downvotes: reactions.downvotes
                },
                userReaction: reactions.userReaction
            };
        } catch (error) {
            console.error('Error getting reactions for post:', post.id, error);
            return {
                ...post,
                reactions: { upvotes: 0, downvotes: 0 },
                userReaction: null
            };
        }
    }));
}

// Helper function to get sort query based on parameters
function getSortQuery(query, sort = 'recent', period = 'all') {
    if (sort === 'recent') {
        return query.order('published_at', { ascending: false });
    }

    // For top posts, we need to order by reaction count
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
            startDate = new Date(0); // Beginning of time
            break;
    }

    return query
        .gte('published_at', startDate.toISOString())
        .order('published_at', { ascending: false }); // We'll sort by reactions after fetching
}

// Get feed posts (following)
router.get('/following', authMiddleware, async (req, res) => {
    try {
        const { user } = req;
        const { page = 1, limit = 10, sort = 'recent', period = 'all' } = req.query;
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
                author:users (
                    username,
                    display_name,
                    avatar_name
                ),
                category:categories (
                    id,
                    name
                )
            `)
            .eq('status', 'published')
            .in('author_id', userIds);

        // Only add muted filter if there are muted users
        if (mutedIds.length > 0) {
            query = query.filter('author_id', 'not.in', `(${mutedIds.join(',')})`);
        }

        // Apply sorting
        query = getSortQuery(query, sort, period);

        // Get posts from users being followed
        const { data: posts, error: postsError } = await query
            .range(offset, offset + limit - 1);

        if (postsError) {
            console.error('Posts query error:', postsError);
            throw postsError;
        }

        console.log('Found posts:', posts?.length || 0); // Debug log

        // Add reactions to posts
        const postsWithReactions = await addReactionsToPosts(posts || [], user.userId);

        // Sort by reactions if needed
        if (sort === 'top') {
            postsWithReactions.sort((a, b) => {
                const scoreA = (a.reactions?.upvotes || 0) - (a.reactions?.downvotes || 0);
                const scoreB = (b.reactions?.upvotes || 0) - (b.reactions?.downvotes || 0);
                return scoreB - scoreA;
            });
        }

        res.json({
            posts: postsWithReactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: posts?.length === parseInt(limit)
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
        const { page = 1, limit = 10, sort = 'recent', period = 'all' } = req.query;
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

        if (mutedError) throw mutedError;

        const mutedIds = mutedUsers?.map(m => m.muted_id) || [];

        let query = supabase
            .from('posts')
            .select(`
                *,
                author:users (
                    username,
                    display_name,
                    avatar_name
                ),
                category:categories (
                    id,
                    name
                )
            `)
            .eq('status', 'published')
            .in('author_id', uniqueUserIds)
            .not('author_id', 'eq', user.userId); // Exclude your own posts

        // Only add muted filter if there are muted users
        if (mutedIds.length > 0) {
            query = query.filter('author_id', 'not.in', `(${mutedIds.join(',')})`);
        }

        // Apply sorting
        query = getSortQuery(query, sort, period);

        // Get posts from both following and network users
        const { data: posts, error: postsError } = await query
            .range(offset, offset + limit - 1);

        if (postsError) throw postsError;

        // Add reactions to posts
        const postsWithReactions = await addReactionsToPosts(posts || [], user.userId);

        // Sort by reactions if needed
        if (sort === 'top') {
            postsWithReactions.sort((a, b) => {
                const scoreA = (a.reactions?.upvotes || 0) - (a.reactions?.downvotes || 0);
                const scoreB = (b.reactions?.upvotes || 0) - (b.reactions?.downvotes || 0);
                return scoreB - scoreA;
            });
        }

        res.json({
            posts: postsWithReactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: posts?.length === parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Feed error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

// Get explore feed (posts from selected categories)
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

            if (mutedError) throw mutedError;

            const mutedIds = mutedUsers?.map(m => m.muted_id) || [];

            let query = supabase
                .from('posts')
                .select(`
                    *,
                    author:users (
                        username,
                        display_name,
                        avatar_name
                    ),
                    category:categories (
                        id,
                        name
                    )
                `)
                .eq('status', 'published');

            if (mutedIds.length > 0) {
                query = query.filter('author_id', 'not.in', `(${mutedIds.join(',')})`);
            }

            const { data: posts, error } = await query
                .order('published_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) throw error;

            // Add reactions to posts
            const postsWithReactions = await addReactionsToPosts(posts || [], user.userId);

            return res.json({
                posts: postsWithReactions,
                categories: availableCategories,
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    hasMore: posts.length === parseInt(limit)
                }
            });
        }

        // Get muted users for category-filtered explore
        const { data: mutedUsers, error: mutedError } = await supabase
            .from('mutes')
            .select('muted_id')
            .eq('user_id', user.userId);

        if (mutedError) throw mutedError;

        const mutedIds = mutedUsers?.map(m => m.muted_id) || [];

        let query = supabase
            .from('posts')
            .select(`
                *,
                author:users (
                    username,
                    display_name,
                    avatar_name
                ),
                category:categories (
                    id,
                    name
                )
            `)
            .eq('status', 'published')
            .in('category_id', categoryIds);

        if (mutedIds.length > 0) {
            query = query.filter('author_id', 'not.in', `(${mutedIds.join(',')})`);
        }

        const { data: posts, error } = await query
            .order('published_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;

        // Add reactions to posts
        const postsWithReactions = await addReactionsToPosts(posts || [], user.userId);

        res.json({
            posts: postsWithReactions,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: posts.length === parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Feed error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

export default router;