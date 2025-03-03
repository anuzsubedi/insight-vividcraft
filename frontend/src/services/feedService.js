import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';

export const feedService = {
    // Get following feed
    async getFollowingFeed(params = {}) {
        try {
            const response = await api.get(ENDPOINTS.FEED.FOLLOWING, { params });
            return response.data;
        } catch (error) {
            console.error('[GET FOLLOWING FEED] Error:', error);
            if (!error.response) {
                throw new Error('Network error. Please check your connection.');
            }
            if (error.response.status === 401) {
                throw new Error('Please log in to view feed');
            }
            throw new Error(error.response?.data?.error || 'Failed to load feed');
        }
    },

    // Get network feed (renamed from extended)
    async getNetworkFeed(params = {}) {
        try {
            const response = await api.get(ENDPOINTS.FEED.NETWORK, { params });
            return response.data;
        } catch (error) {
            console.error('[GET NETWORK FEED] Error:', error);
            if (!error.response) {
                throw new Error('Network error. Please check your connection.');
            }
            if (error.response.status === 401) {
                throw new Error('Please log in to view feed');
            }
            throw new Error(error.response?.data?.error || 'Failed to load feed');
        }
    },

    // Get explore feed
    async getExploreFeed(params = {}) {
        try {
            const response = await api.get(ENDPOINTS.FEED.EXPLORE, { params });
            return response.data;
        } catch (error) {
            console.error('[GET EXPLORE FEED] Error:', error);
            if (!error.response) {
                throw new Error('Network error. Please check your connection.');
            }
            if (error.response.status === 401) {
                throw new Error('Please log in to view feed');
            }
            throw new Error(error.response?.data?.error || 'Failed to load feed');
        }
    }
};