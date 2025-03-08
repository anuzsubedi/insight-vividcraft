import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, async (req, res) => {
    try {
        const { query } = req.query;
        const isUserSearch = query.startsWith('@');

        if (isUserSearch) {
            const searchQuery = query.substring(1);
            const { data: users, error } = await supabase
                .from('users')
                .select('username, display_name, avatar_name')
                .ilike('username', `%${searchQuery}%`)
                .limit(10);

            if (error) throw error;
            return res.json({ users });
        }

        // Search posts and articles
        const [postsResult, articlesResult] = await Promise.all([
            supabase
                .from('posts')
                .select(`
                    id,
                    body,
                    type,
                    published_at,
                    author:user_id (username, avatar_name)
                `)
                .ilike('body', `%${query}%`)
                .eq('type', 'post')
                .limit(5),

            supabase
                .from('posts')
                .select(`
                    id,
                    title,
                    body,
                    type,
                    published_at,
                    author:user_id (username, avatar_name),
                    category:category_id (id, name)
                `)
                .or(`title.ilike.%${query}%, body.ilike.%${query}%`)
                .eq('type', 'article')
                .limit(5)
        ]);

        if (postsResult.error) throw postsResult.error;
        if (articlesResult.error) throw articlesResult.error;

        return res.json({
            posts: postsResult.data || [],
            articles: articlesResult.data || []
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});

export default router;