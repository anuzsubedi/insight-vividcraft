import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import verifyToken from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', verifyToken, async (req, res) => {
    try {
        const { query } = req.query;
        console.log('Search query:', query); // Debug log
        
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }

        // If searching for users (query starts with @)
        if (query.startsWith('@')) {
            const searchQuery = query.substring(1).toLowerCase();
            const { data: users, error } = await supabase
                .from('users')
                .select('username, display_name, avatar_name')
                .ilike('username', `%${searchQuery}%`);

            console.log('Users result:', users); // Debug log
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
                .eq('type', 'post'),

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
                .eq('type', 'article')
                .or(`title.ilike.%${query}%,body.ilike.%${query}%`)
        ]);

        console.log('Search results:', { posts: postsResult.data, articles: articlesResult.data }); // Debug log

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