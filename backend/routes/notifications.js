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

        // Get preview content for posts and comments
        const enhancedNotifications = await Promise.all(notifications.map(async notification => {
            let previewContent = notification.preview_content || '';
            let postId = notification.post_id;
            
            // If no preview content exists in the notification already, fetch it
            if (!previewContent || !postId) {
                try {
                    if (notification.target_type === 'post' && notification.target_id) {
                        // For posts, get the title or first part of content
                        const { data: post, error: postError } = await supabase
                            .from('posts')
                            .select('id, title, content')
                            .eq('id', notification.target_id)
                            .single();
                            
                        if (!postError && post) {
                            // Set post_id if not already set
                            if (!postId) {
                                postId = post.id;
                            }
                            previewContent = post.title || (post.content ? post.content.substring(0, 100) : '');
                        }
                    } else if (notification.target_type === 'comment' && notification.target_id) {
                        // For comments, get the content and associated post_id
                        const { data: comment, error: commentError } = await supabase
                            .from('comments')
                            .select('content, post_id')
                            .eq('id', notification.target_id)
                            .single();
                            
                        if (!commentError && comment) {
                            // Set post_id if not already set
                            if (!postId && comment.post_id) {
                                postId = comment.post_id;
                            }
                            
                            if (comment.content) {
                                previewContent = comment.content.substring(0, 100);
                            }
                        }
                    }
                } catch (previewError) {
                    console.error('Error fetching preview content:', previewError);
                }
            }
            
            return {
                ...notification,
                preview_content: previewContent,
                post_id: postId,
                actors: notification.actors || []
            };
        }));

        // Transform the data to match the expected format
        const processedNotifications = enhancedNotifications.map(notification => ({
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

// Get user notification preferences
router.get('/preferences', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const { data: preferences, error } = await supabase
            .from('notification_preferences')
            .select('*')
            .eq('user_id', userId);

        if (error) throw error;

        // Transform preferences to match frontend expectations
        const transformedPreferences = {
            email_notifications: preferences?.some(p => p.delivery_method.includes('email')) ?? true,
            push_notifications: preferences?.some(p => p.delivery_method.includes('websocket')) ?? true
        };

        res.json(transformedPreferences);
    } catch (error) {
        console.error('Error getting notification preferences:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update user notification preferences
router.put('/preferences', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { email_notifications, push_notifications } = req.body;
        const now = new Date().toISOString();

        // Delete existing preferences
        const { error: deleteError } = await supabase
            .from('notification_preferences')
            .delete()
            .eq('user_id', userId);

        if (deleteError) throw deleteError;

        // Insert new preferences
        const preferences = [];
        if (email_notifications) {
            preferences.push({
                user_id: userId,
                notification_type: 'all',
                is_enabled: true,
                delivery_method: ['email'],
                updated_at: now
            });
        }
        if (push_notifications) {
            preferences.push({
                user_id: userId,
                notification_type: 'all',
                is_enabled: true,
                delivery_method: ['websocket'],
                updated_at: now
            });
        }

        if (preferences.length > 0) {
            const { error: insertError } = await supabase
                .from('notification_preferences')
                .insert(preferences);

            if (insertError) throw insertError;
        }

        res.json({
            email_notifications,
            push_notifications
        });
    } catch (error) {
        console.error('Error updating notification preferences:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create a new notification (for testing or manual creation)
router.post('/', verifyToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const { type, actor_id, post_id, comment_id, content } = req.body;
        const now = new Date().toISOString();

        const { data, error } = await supabase
            .from('notifications')
            .insert({
                user_id: userId,
                type,
                actor_id,
                post_id,
                comment_id,
                content,
                created_at: now,
                updated_at: now
            })
            .select()
            .single();

        if (error) throw error;

        res.json(data);
    } catch (error) {
        console.error('Error creating notification:', error);
        res.status(500).json({ error: error.message });
    }
});

export default router;