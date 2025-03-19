import express from 'express';
import { supabase } from '../config/supabaseClient.js';
import { verifyToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get user notifications with pagination
router.get('/', verifyToken, async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const userId = req.user.userId;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        // Get total count for pagination
        const { count, error: countError } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId);

        if (countError) throw countError;

        // Get notifications with related actors and include post_id
        const { data: notifications, error } = await supabase
            .from('notifications')
            .select(`
                *,
                post_id,
                actors:notification_actors(
                    user:users(
                        username,
                        display_name,
                        avatar_name
                    )
                )
            `)
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .range(offset, offset + parseInt(limit) - 1);

        if (error) throw error;

        // Transform the data to match the expected format
        const processedNotifications = notifications.map(notification => ({
            ...notification,
            actor: notification.actors?.[0]?.user || null // Take the first actor for now
        }));

        res.json({
            notifications: processedNotifications,
            pagination: {
                total: count,
                page: parseInt(page),
                limit: parseInt(limit),
                hasMore: offset + notifications.length < count
            }
        });
    } catch (error) {
        console.error('Error getting notifications:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mark notifications as viewed (updates is_viewed)
router.post('/viewed', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const now = new Date().toISOString();

        // Update all unviewed notifications for the user
        const { error } = await supabase
            .from('notifications')
            .update({ is_viewed: true, updated_at: now })
            .eq('user_id', userId)
            .eq('is_viewed', false);

        if (error) throw error;

        res.json({ message: 'Notifications marked as viewed' });
    } catch (error) {
        console.error('Error marking notifications as viewed:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mark specific notification as opened
router.post('/opened/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;
        const userId = req.user.userId;
        const now = new Date().toISOString();

        const { error } = await supabase
            .from('notifications')
            .update({ is_opened: true, updated_at: now })
            .eq('id', id)
            .eq('user_id', userId);

        if (error) throw error;

        res.json({ message: 'Notification marked as opened' });
    } catch (error) {
        console.error('Error marking notification as opened:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get unread notification count
router.get('/unread-count', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const { count, error } = await supabase
            .from('notifications')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', userId)
            .eq('is_viewed', false);

        if (error) throw error;

        res.json({ count });
    } catch (error) {
        console.error('Error getting unread count:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;