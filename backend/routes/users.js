import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get user by username
router.get('/:username', async (req, res) => {
    try {
        const { username } = req.params;
        const { data: user, error } = await supabase
            .from('users')
            .select('id, username, display_name, avatar_name, bio, created_at')
            .eq('username', username)
            .single();

        if (error) throw error;
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json(user);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update user settings
router.put('/settings', verifyToken, async (req, res) => {
    try {
        const { display_name, bio, avatar_name } = req.body;
        const userId = req.user.userId;

        const { data, error } = await supabase
            .from('users')
            .update({ 
                display_name, 
                bio, 
                avatar_name,
                updated_at: new Date().toISOString()
            })
            .eq('id', userId)
            .select()
            .single();

        if (error) throw error;
        res.json(data);
    } catch (error) {
        console.error('Error updating user settings:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user stats
router.get('/:username/stats', async (req, res) => {
    try {
        const { username } = req.params;
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('username', username)
            .single();

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        const stats = await supabase.rpc('get_user_stats', { user_id: user.id });
        res.json(stats.data);
    } catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;