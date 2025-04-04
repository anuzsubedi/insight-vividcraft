import { WebSocketServer } from 'ws';
import { verifyWebSocketToken } from '../middleware/authMiddleware.js';
import { supabase } from '../config/supabaseClient.js';

class NotificationWebSocketServer {
    constructor(server) {
        this.wss = new WebSocketServer({ 
            server,
            path: '/ws',
            clientTracking: true,
            perMessageDeflate: false
        });
        this.clients = new Map(); // userId -> Set of WebSocket connections
        this.setupWebSocketServer();
    }

    setupWebSocketServer() {
        this.wss.on('connection', async (ws, req) => {
            let userId = null;
            try {
                // Get token from URL
                const url = new URL(req.url, 'ws://localhost');
                const token = url.searchParams.get('token');

                if (!token) {
                    console.error('No token provided');
                    ws.close(1008, 'Authentication required');
                    return;
                }

                // Verify token and get user ID
                const user = await verifyWebSocketToken(token);
                if (!user) {
                    console.error('Invalid token');
                    ws.close(1008, 'Authentication required');
                    return;
                }

                userId = user.userId;

                // Check if user already has an active connection
                const existingConnections = this.clients.get(userId);
                if (existingConnections?.size > 0) {
                    existingConnections.forEach(client => {
                        if (client !== ws) {
                            client.close(1000, 'New connection established');
                        }
                    });
                }

                // Store the connection
                if (!this.clients.has(userId)) {
                    this.clients.set(userId, new Set());
                }
                this.clients.get(userId).add(ws);

                // Set up ping/pong to keep connection alive
                ws.isAlive = true;
                ws.on('pong', () => {
                    ws.isAlive = true;
                });

                // Handle client messages
                ws.on('message', async (message) => {
                    try {
                        const data = JSON.parse(message);
                        await this.handleClientMessage(userId, data, ws);
                    } catch (error) {
                        console.error('Error handling client message:', error);
                        ws.send(JSON.stringify({ error: 'Invalid message format' }));
                    }
                });

                // Handle client disconnect
                ws.on('close', () => {
                    this.handleClientDisconnect(userId, ws);
                });

                // Handle errors
                ws.on('error', (error) => {
                    console.error('WebSocket error for user:', userId, error);
                    this.handleClientDisconnect(userId, ws);
                });

                // Send initial unread count
                await this.sendUnreadCount(userId);

            } catch (error) {
                console.error('WebSocket connection error:', error);
                if (userId) {
                    this.handleClientDisconnect(userId, ws);
                }
                ws.close(1011, 'Internal server error');
            }
        });

        // Set up interval to check for dead connections
        setInterval(() => {
            this.wss.clients.forEach((ws) => {
                if (ws.isAlive === false) {
                    return ws.terminate();
                }
                ws.isAlive = false;
            });
        }, 30000);
    }

    async handleClientMessage(userId, data, ws) {
        if (!userId) {
            console.error('No user ID found when handling client message');
            return;
        }

        switch (data.type) {
            case 'ping':
                ws.send(JSON.stringify({ type: 'pong' }));
                break;
            case 'mark_viewed':
                await this.handleMarkViewed(userId, data.notificationIds);
                break;
            case 'mark_opened':
                await this.handleMarkOpened(userId, data.notificationId);
                break;
            case 'get_preferences':
                await this.sendNotificationPreferences(userId);
                break;
            case 'update_preferences':
                await this.handleUpdatePreferences(userId, data.preferences);
                break;
            case 'get_notifications':
                await this.sendNotifications(userId);
                break;
            default:
                console.warn('Unknown message type:', data.type);
        }
    }

    async handleMarkViewed(userId, notificationIds) {
        try {
            if (!userId || !notificationIds?.length) {
                console.error('Invalid parameters for mark_viewed:', { userId, notificationIds });
                return;
            }

            const { error } = await supabase
                .from('notifications')
                .update({ is_viewed: true, updated_at: new Date().toISOString() })
                .eq('user_id', userId)
                .in('id', notificationIds);

            if (error) throw error;

            // Send updated unread count
            await this.sendUnreadCount(userId);
        } catch (error) {
            console.error('Error marking notifications as viewed:', error);
        }
    }

    async handleMarkOpened(userId, notificationId) {
        try {
            if (!userId || !notificationId) {
                console.error('Invalid parameters for mark_opened:', { userId, notificationId });
                return;
            }

            const { error } = await supabase
                .from('notifications')
                .update({ is_opened: true, updated_at: new Date().toISOString() })
                .eq('id', notificationId)
                .eq('user_id', userId);

            if (error) throw error;
        } catch (error) {
            console.error('Error marking notification as opened:', error);
        }
    }

    async sendNotificationPreferences(userId) {
        try {
            if (!userId) {
                console.error('No user ID provided for sending preferences');
                return;
            }

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

            this.sendToUser(userId, {
                type: 'notification_preferences',
                preferences: transformedPreferences
            });
        } catch (error) {
            console.error('Error sending notification preferences:', error);
        }
    }

    async handleUpdatePreferences(userId, preferences) {
        try {
            if (!userId) {
                console.error('No user ID provided for updating preferences');
                return;
            }

            const now = new Date().toISOString();

            // Delete existing preferences
            const { error: deleteError } = await supabase
                .from('notification_preferences')
                .delete()
                .eq('user_id', userId);

            if (deleteError) throw deleteError;

            // Insert new preferences
            const newPreferences = [];
            if (preferences.email_notifications) {
                newPreferences.push({
                    user_id: userId,
                    notification_type: 'all',
                    is_enabled: true,
                    delivery_method: ['email'],
                    updated_at: now
                });
            }
            if (preferences.push_notifications) {
                newPreferences.push({
                    user_id: userId,
                    notification_type: 'all',
                    is_enabled: true,
                    delivery_method: ['websocket'],
                    updated_at: now
                });
            }

            if (newPreferences.length > 0) {
                const { error: insertError } = await supabase
                    .from('notification_preferences')
                    .insert(newPreferences);

                if (insertError) throw insertError;
            }

            // Send updated preferences back
            await this.sendNotificationPreferences(userId);
        } catch (error) {
            console.error('Error updating notification preferences:', error);
        }
    }

    async sendUnreadCount(userId) {
        try {
            if (!userId) {
                console.error('No user ID provided for sending unread count');
                return;
            }

            const { count, error } = await supabase
                .from('notifications')
                .select('*', { count: 'exact', head: true })
                .eq('user_id', userId)
                .eq('is_viewed', false);

            if (error) throw error;

            this.sendToUser(userId, {
                type: 'unread_count',
                count
            });
        } catch (error) {
            console.error('Error sending unread count:', error);
        }
    }

    handleClientDisconnect(userId, ws) {
        if (!userId) {
            console.error('No user ID provided for client disconnect');
            return;
        }

        const userConnections = this.clients.get(userId);
        if (userConnections) {
            userConnections.delete(ws);
            if (userConnections.size === 0) {
                this.clients.delete(userId);
            }
        }
    }

    sendToUser(userId, data) {
        if (!userId) {
            console.error('No user ID provided for sending message to user');
            return;
        }

        const userConnections = this.clients.get(userId);
        if (userConnections) {
            const message = JSON.stringify(data);
            userConnections.forEach(client => {
                if (client.readyState === WebSocket.OPEN) {
                    client.send(message);
                }
            });
        }
    }

    // Public method to send notification to a user
    async sendNotification(userId, notification) {
        try {
            if (!userId) {
                console.error('No user ID provided for sending notification');
                return;
            }

            // Add preview content if not provided
            if (!notification.preview_content || !notification.post_id) {
                try {
                    if (notification.target_type === 'post' && notification.target_id) {
                        // For posts, get the title or first part of content
                        const { data: post, error: postError } = await supabase
                            .from('posts')
                            .select('id, title, content')
                            .eq('id', notification.target_id)
                            .single();
                            
                        if (!postError && post) {
                            notification.preview_content = notification.preview_content || post.title || (post.content ? post.content.substring(0, 100) : '');
                            // Set post_id if it's not already set
                            if (!notification.post_id) {
                                notification.post_id = post.id;
                            }
                        }
                    } else if (notification.target_type === 'comment' && notification.target_id) {
                        // For comments, get the content and the associated post
                        const { data: comment, error: commentError } = await supabase
                            .from('comments')
                            .select('content, post_id')
                            .eq('id', notification.target_id)
                            .single();
                            
                        if (!commentError && comment) {
                            if (comment.content) {
                                notification.preview_content = notification.preview_content || comment.content.substring(0, 100);
                            }
                            
                            // Set post_id from the comment if not already set
                            if (!notification.post_id && comment.post_id) {
                                notification.post_id = comment.post_id;
                            }
                        }
                    }
                } catch (previewError) {
                    console.error('Error fetching preview content:', previewError);
                }
            }

            // Insert notification into database
            const { data, error } = await supabase
                .from('notifications')
                .insert(notification)
                .select()
                .single();

            if (error) throw error;

            // Send real-time notification to connected clients
            this.sendToUser(userId, {
                type: 'new_notification',
                notification: data
            });

            // Update unread count
            await this.sendUnreadCount(userId);

            return data;
        } catch (error) {
            console.error('Error sending notification:', error);
            throw error;
        }
    }

    async sendNotifications(userId) {
        try {
            const { data: notifications, error } = await supabase
                .from('notifications')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error) {
                console.error('Error fetching notifications:', error);
                return;
            }

            this.sendToUser(userId, {
                type: 'notifications_list',
                notifications
            });
        } catch (error) {
            console.error('Error sending notifications:', error);
        }
    }

    // Helper method to check if a user has notification preferences enabled
    async hasNotificationPreference(userId, type) {
        try {
            const { data: preferences, error } = await supabase
                .from('notification_preferences')
                .select('*')
                .eq('user_id', userId)
                .eq('notification_type', type)
                .eq('is_enabled', true);

            if (error) throw error;
            return preferences?.length > 0;
        } catch (error) {
            console.error('Error checking notification preferences:', error);
            return false;
        }
    }

    // Helper method to get user's notification preferences
    async getUserPreferences(userId) {
        try {
            const { data: preferences, error } = await supabase
                .from('notification_preferences')
                .select('*')
                .eq('user_id', userId);

            if (error) throw error;
            return preferences;
        } catch (error) {
            console.error('Error getting user preferences:', error);
            return [];
        }
    }
}

export default NotificationWebSocketServer; 