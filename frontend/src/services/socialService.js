import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';

export const socialService = {
    async followUser(username) {
        try {
            const response = await api.post(ENDPOINTS.SOCIAL.FOLLOW(username));
            return response.data;
        } catch (error) {
            console.error('[FOLLOW USER] Error:', error);
            throw error;
        }
    },

    async unfollowUser(username) {
        try {
            const response = await api.delete(ENDPOINTS.SOCIAL.UNFOLLOW(username));
            return response.data;
        } catch (error) {
            console.error('[UNFOLLOW USER] Error:', error);
            throw error;
        }
    },

    async muteUser(username) {
        try {
            const response = await api.post(ENDPOINTS.SOCIAL.MUTE(username));
            return response.data;
        } catch (error) {
            console.error('[MUTE USER] Error:', error);
            throw error;
        }
    },

    async unmuteUser(username) {
        try {
            const response = await api.delete(ENDPOINTS.SOCIAL.UNMUTE(username));
            return response.data;
        } catch (error) {
            console.error('[UNMUTE USER] Error:', error);
            throw error;
        }
    }
};