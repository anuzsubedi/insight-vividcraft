import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';

class NotificationService {
    async getNotifications(page = 1, limit = 20) {
        try {
            const response = await api.get(ENDPOINTS.NOTIFICATIONS.LIST, {
                params: { page, limit }
            });
            return response.data;
        } catch (error) {
            console.error('[GET NOTIFICATIONS] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to fetch notifications');
        }
    }

    async markAsViewed() {
        try {
            const response = await api.post(ENDPOINTS.NOTIFICATIONS.MARK_VIEWED);
            return response.data;
        } catch (error) {
            console.error('[MARK VIEWED] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to mark notifications as viewed');
        }
    }

    async markAsOpened(notificationId) {
        try {
            const response = await api.post(`${ENDPOINTS.NOTIFICATIONS.MARK_OPENED}/${notificationId}`);
            return response.data;
        } catch (error) {
            console.error('[MARK OPENED] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to mark notification as opened');
        }
    }

    async getUnreadCount() {
        try {
            const response = await api.get(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT);
            return response.data.count;
        } catch (error) {
            console.error('[GET UNREAD COUNT] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to get unread count');
        }
    }
}

export default new NotificationService();