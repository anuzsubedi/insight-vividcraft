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
    },

    async getFollowing(username) {
        try {
            const response = await api.get(ENDPOINTS.SOCIAL.GET_FOLLOWING(username));
            return response.data;
        } catch (error) {
            console.error('[GET FOLLOWING] Error:', error);
            throw error;
        }
    },

    async getFollowers(username) {
        try {
            const response = await api.get(ENDPOINTS.SOCIAL.GET_FOLLOWERS(username));
            return response.data;
        } catch (error) {
            console.error('[GET FOLLOWERS] Error:', error);
            throw error;
        }
    },

    async getMutualFollowers(username) {
        try {
            const response = await api.get(ENDPOINTS.SOCIAL.GET_MUTUAL(username));
            return response.data;
        } catch (error) {
            console.error('[GET MUTUAL FOLLOWERS] Error:', error);
            throw error;
        }
    },

    async removeFollower(username) {
        try {
            const response = await api.delete(ENDPOINTS.SOCIAL.REMOVE_FOLLOWER(username));
            return response.data;
        } catch (error) {
            console.error('[REMOVE FOLLOWER] Error:', error);
            throw error;
        }
    }
};