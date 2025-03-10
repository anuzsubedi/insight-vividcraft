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

// Search users - removed authMiddleware
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

// Search posts and articles - removed authMiddleware
router.get('/posts', async (req, res) => {
    try {
        const { q: query, type, limit = 10 } = req.query;
        if (!query) return res.json({ posts: [] });

        let dbQuery = supabase
            .from('posts')
            .select(`
                *,
                author:users!posts_author_id_fkey (username, display_name, avatar_name),
                category:categories!posts_category_id_fkey (id, name)
            `)
            .eq('status', 'published')
            .or(`title.ilike.%${query}%,body.ilike.%${query}%`);

        if (type && type !== 'all') {
            dbQuery = dbQuery.eq('type', type);
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