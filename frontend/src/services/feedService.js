import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';

export const feedService = {
    // Get following feed
    async getFollowingFeed(params = {}) {
        try {
            const response = await api.get(ENDPOINTS.FEED.FOLLOWING, { params });
            
            // Check if response has the expected structure
            if (!response.data || !response.data.hasOwnProperty('posts')) {
                console.error('Invalid response format:', response.data);
                throw new Error('Invalid response format');
            }

            // Ensure posts is always an array
            const posts = Array.isArray(response.data.posts) ? response.data.posts : [];
            
            return {
                ...response.data,
                posts
            };
        } catch (error) {
            console.error('[GET FOLLOWING FEED] Error:', error);
            if (!error.response) {
                throw new Error('Network error. Please check your connection.');
            }
            if (error.response?.status === 401) {
                throw new Error('Please log in to view feed');
            }
            throw new Error(error.response?.data?.error || 'Failed to load feed');
        }
    },

    // Get extended network feed
    async getExtendedFeed(params = {}) {
        try {
            const response = await api.get(ENDPOINTS.FEED.EXTENDED, { params });
            return response.data;
        } catch (error) {
            console.error('[GET EXTENDED FEED] Error:', error);
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