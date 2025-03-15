import express from "express";
import { supabase } from "../config/supabaseClient.js";
import { verifyToken } from "../middleware/authMiddleware.js";

const router = express.Router();

// Get mention suggestions
router.get("/suggest", verifyToken, async (req, res) => {
    try {
        const { query, limit = 5 } = req.query;
        const userId = req.user.userId;

        if (!query) {
            return res.json({ users: [] });
        }

        // First get frequently interacted users (from follows, comments, mentions)
        const { data: frequentUsers } = await supabase
            .rpc('get_frequently_interacted_users', { 
                current_user_id: userId,
                search_query: `%${query.toLowerCase()}%`,
                limit_val: limit
            });

        // Then get other matching users
        const { data: otherUsers } = await supabase
            .from('users')
            .select('username, display_name, avatar_name')
            .ilike('username', `%${query}%`)
            .not('id', 'eq', userId)
            .limit(limit);

        // Combine and deduplicate results, prioritizing frequent users
        const combinedUsers = [...(frequentUsers || []), ...(otherUsers || [])];
        const uniqueUsers = Array.from(new Set(combinedUsers.map(u => u.username)))
            .map(username => combinedUsers.find(u => u.username === username))
            .slice(0, limit);

        res.json({ users: uniqueUsers });
    } catch (error) {
        console.error('Error getting mention suggestions:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;
