import express from 'express';
import { supabase } from '../config/supabaseClient.js';

const router = express.Router();

// Helper function to clean and prepare search query
const prepareSearchQuery = (query) => {
    return query.toLowerCase().trim();
};

// Helper function to rank username matches
const rankUserMatch = (username, query) => {
    const normalizedQuery = query.toLowerCase().replace('@', '');
    const normalizedUsername = username.toLowerCase();
    
    if (normalizedUsername === normalizedQuery) return 100;
    if (normalizedUsername.startsWith(normalizedQuery)) return 90;
    if (normalizedUsername.includes(normalizedQuery)) return 80;
    return 0;
};

// Search users
router.get('/users', async (req, res) => {
    try {
        const { q: query, limit = 10 } = req.query;
        if (!query) return res.json({ users: [] });

        const searchQuery = prepareSearchQuery(query);
        const isUsernameSearch = searchQuery.startsWith('@');
        const cleanQuery = searchQuery.replace('@', '');

        const { data: users, error } = await supabase
            .from('users')
            .select('username, display_name, avatar_name')
            .or(`username.ilike.%${cleanQuery}%,display_name.ilike.%${cleanQuery}%`)
            .limit(limit);

        if (error) throw error;

        // Sort results by relevance
        const sortedUsers = users
            .map(user => ({
                ...user,
                score: rankUserMatch(user.username, searchQuery)
            }))
            .sort((a, b) => b.score - a.score)
            .map(({ score, ...user }) => user); // Remove score from response

        res.json({ users: sortedUsers });
    } catch (error) {
        console.error('Search users error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Search posts and articles with different search strategies
router.get('/posts', async (req, res) => {
    try {
        const { q: query, type, limit = 10 } = req.query;
        if (!query) return res.json({ posts: [] });

        const searchQuery = prepareSearchQuery(query);
        let dbQuery = supabase
            .from('posts')
            .select(`
                *,
                author:users!posts_author_id_fkey (username, display_name, avatar_name),
                category:categories!posts_category_id_fkey (id, name)
            `)
            .eq('status', 'published');

        if (type === 'article') {
            // For articles, search by tags
            dbQuery = dbQuery
                .eq('type', 'article')
                // Using contains operator for array to check if any tag includes the search query
                .filter('tags', 'cs', `{${searchQuery}}`);
        } else if (type === 'post') {
            // For posts, search by content
            dbQuery = dbQuery
                .eq('type', 'post')
                .or(`title.ilike.%${searchQuery}%,body.ilike.%${searchQuery}%`);
        } else {
            // If no type specified, search both but with their respective strategies
            dbQuery = dbQuery.or(
                `and(type.eq.post,or(title.ilike.%${searchQuery}%,body.ilike.%${searchQuery}%)),` +
                `and(type.eq.article,tags.cs.{${searchQuery}})`
            );
        }

        const { data: posts, error } = await dbQuery
            .order('published_at', { ascending: false })
            .limit(limit);

        if (error) throw error;

        res.json({ posts });
    } catch (error) {
        console.error('Search posts error:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;