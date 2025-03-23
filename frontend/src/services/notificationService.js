import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import websocketService from './websocketService';

export const notificationService = {
    // Load initial unread count regardless of websocket connection
    async loadInitialUnreadCount() {
        try {
            // Check if user is authenticated before making the request
            const token = localStorage.getItem('token');
            if (!token) return 0;
            
            const response = await api.get(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
            return response.data.count;
        } catch (error) {
            console.error('[LOAD INITIAL UNREAD COUNT] Error:', error);
            return 0; // Return 0 if error to avoid UI issues
        }
    },

    async getNotifications(page = 1, limit = 50) {
        try {
            const response = await api.get(ENDPOINTS.NOTIFICATIONS.LIST, {
                params: { page, limit }
            });
            return response.data;
        } catch (error) {
            console.error('[GET NOTIFICATIONS] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to fetch notifications');
        }
    },

    async markAsViewed(notificationIds) {
        try {
            // Send through WebSocket
            websocketService.markAsViewed(notificationIds);
            
            // Also update in database
            const response = await api.post(ENDPOINTS.NOTIFICATIONS.MARK_VIEWED, {
                notificationIds
            });
            return response.data;
        } catch (error) {
            console.error('[MARK VIEWED] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to mark notifications as viewed');
        }
    },

    async markAsOpened(notificationId) {
        try {
            // Send through WebSocket
            websocketService.markAsOpened(notificationId);
            
            // Also update in database
            const response = await api.post(`${ENDPOINTS.NOTIFICATIONS.MARK_OPENED}/${notificationId}`);
            return response.data;
        } catch (error) {
            console.error('[MARK OPENED] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to mark notification as opened');
        }
    },

    async getUnreadCount() {
        try {
            const response = await api.get(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
            return response.data.count;
        } catch (error) {
            console.error('[GET UNREAD COUNT] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to get unread count');
        }
    },

    async getNotificationPreferences() {
        try {
            const response = await api.get(ENDPOINTS.NOTIFICATIONS.PREFERENCES);
            return response.data;
        } catch (error) {
            console.error('[GET PREFERENCES] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to get notification preferences');
        }
    },

    async updateNotificationPreferences(preferences) {
        try {
            // Send through WebSocket
            websocketService.updatePreferences(preferences);
            
            // Also update in database
            const response = await api.put(ENDPOINTS.NOTIFICATIONS.PREFERENCES, {
                preferences
            });
            return response.data;
        } catch (error) {
            console.error('[UPDATE PREFERENCES] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to update notification preferences');
        }
    },

    // Helper method to create a notification
    async createNotification(data) {
        try {
            const response = await api.post(ENDPOINTS.NOTIFICATIONS.CREATE, data);
            return response.data;
        } catch (error) {
            console.error('[CREATE NOTIFICATION] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to create notification');
        }
    }
};