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

// Helper function to add post details including active comment count
async function addPostDetails(posts, userId) {
    return Promise.all(posts.map(async (post) => {
        // Get reactions
        const reactions = await getPostReactions(post.id, userId);
        
        // Get active comment count
        const { data: commentCount, error: commentError } = await supabase
            .rpc('get_active_comment_count', { p_post_id: post.id });
            
        if (commentError) {
            console.error('Error getting comment count:', commentError);
            return {
                ...post,
                reactions: {
                    upvotes: reactions.upvotes,
                    downvotes: reactions.downvotes
                },
                userReaction: reactions.userReaction,
                comment_count: 0
            };
        }

        return {
            ...post,
            reactions: {
                upvotes: reactions.upvotes,
                downvotes: reactions.downvotes
            },
            userReaction: reactions.userReaction,
            comment_count: commentCount || 0
        };
    }));
}

// Replace the existing addReactionsToPosts function with this one
async function addReactionsToPosts(posts, userId) {
    if (!posts?.length) return [];
    return addPostDetails(posts, userId);
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
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        // Get following IDs first
        const { data: followingIds, error: followingError } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', user.userId);

        if (followingError) {
            console.error('Following query error:', followingError);
            throw followingError;
        }

        // If not following anyone, return empty array
        if (!followingIds || followingIds.length === 0) {
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

        const userIds = followingIds.map(f => f.following_id);

        // Get muted users
        const { data: mutedUsers, error: mutedError } = await supabase
            .from('mutes')
            .select('muted_id')
            .eq('user_id', user.userId);

        if (mutedError) throw mutedError;

        const mutedIds = mutedUsers?.map(m => m.muted_id) || [];

        // Build base query for counting total posts
        let countQuery = supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published')
            .in('author_id', userIds);

        if (mutedIds.length > 0) {
            countQuery = countQuery.filter('author_id', 'not.in', `(${mutedIds.join(',')})`);
        }

        // Get total count
        const { count, error: countError } = await countQuery;
        
        if (countError) {
            console.error('Count error:', countError);
            throw countError;
        }

        // Build main query for fetching posts
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

        if (mutedIds.length > 0) {
            query = query.filter('author_id', 'not.in', `(${mutedIds.join(',')})`);
        }

        // Apply sorting
        query = getSortQuery(query, sort, period);

        // Apply pagination
        const { data: posts, error: postsError } = await query
            .range(offset, offset + limitNum - 1);

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
                total: count,
                page: pageNum,
                limit: limitNum,
                hasMore: offset + posts.length < count
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
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

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
                    total: 0,
                    page: pageNum,
                    limit: limitNum,
                    hasMore: false
                }
            });
        }

        const followingIds = following.map(f => f.following_id);

        // Get network users
        const { data: networkUsers, error: networkError } = await supabase
            .from('follows')
            .select('following_id')
            .filter('follower_id', 'in', `(${followingIds.join(',')})`)
            .filter('following_id', 'neq', user.userId);

        if (networkError) throw networkError;

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

        // Build base query for counting total posts
        let countQuery = supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published')
            .in('author_id', uniqueUserIds)
            .not('author_id', 'eq', user.userId);

        if (mutedIds.length > 0) {
            countQuery = countQuery.filter('author_id', 'not.in', `(${mutedIds.join(',')})`);
        }

        // Get total count
        const { count, error: countError } = await countQuery;
        
        if (countError) {
            console.error('Count error:', countError);
            throw countError;
        }

        // Build main query
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
            .not('author_id', 'eq', user.userId);

        if (mutedIds.length > 0) {
            query = query.filter('author_id', 'not.in', `(${mutedIds.join(',')})`);
        }

        // Apply sorting
        query = getSortQuery(query, sort, period);

        // Apply pagination
        const { data: posts, error: postsError } = await query
            .range(offset, offset + limitNum - 1);

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
                total: count,
                page: pageNum,
                limit: limitNum,
                hasMore: offset + posts.length < count
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
        const { page = 1, limit = 10, categories, sort = 'recent', period = 'all' } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;
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

            // Build base query for counting total posts
            let countQuery = supabase
                .from('posts')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'published');

            if (mutedIds.length > 0) {
                countQuery = countQuery.filter('author_id', 'not.in', `(${mutedIds.join(',')})`);
            }

            // Get total count
            const { count, error: countError } = await countQuery;
            
            if (countError) {
                console.error('Count error:', countError);
                throw countError;
            }

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

            // Apply sorting and pagination
            query = getSortQuery(query, sort, period)
                .range(offset, offset + limitNum - 1);

            const { data: posts, error } = await query;

            if (error) throw error;

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

            return res.json({
                posts: postsWithReactions,
                categories: availableCategories,
                pagination: {
                    total: count,
                    page: pageNum,
                    limit: limitNum,
                    hasMore: offset + posts.length < count
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

        // Build base query for counting total posts
        let countQuery = supabase
            .from('posts')
            .select('*', { count: 'exact', head: true })
            .eq('status', 'published')
            .in('category_id', categoryIds);

        if (mutedIds.length > 0) {
            countQuery = countQuery.filter('author_id', 'not.in', `(${mutedIds.join(',')})`);
        }

        // Get total count
        const { count, error: countError } = await countQuery;
        
        if (countError) {
            console.error('Count error:', countError);
            throw countError;
        }

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

        // Apply sorting and pagination
        query = getSortQuery(query, sort, period)
            .range(offset, offset + limitNum - 1);

        const { data: posts, error } = await query;

        if (error) throw error;

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
                total: count,
                page: pageNum,
                limit: limitNum,
                hasMore: offset + posts.length < count
            }
        });
    } catch (error) {
        console.error('Feed error:', error);
        res.status(500).json({ error: error.message || 'Internal server error' });
    }
});

export default router;