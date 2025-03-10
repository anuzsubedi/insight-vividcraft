import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';

export const searchService = {
    async searchUsers(query, limit = 10) {
        try {
            console.log('Searching users:', { query, limit });
            const response = await api.get(ENDPOINTS.SEARCH.USERS, {
                params: { q: query, limit }
            });
            console.log('Users search response:', response.data);
            return response.data;
        } catch (error) {
            console.error('[SEARCH USERS] Error:', error);
            console.error('Response details:', {
                status: error.response?.status,
                data: error.response?.data,
                headers: error.response?.headers
            });
            if (!error.response) {
                throw new Error('Network error. Please check your connection.');
            }
            if (error.response.status === 401) {
                throw new Error('Please log in to search.');
            }
            throw new Error(error.response?.data?.error || 'Failed to search users');
        }
    },

    async searchPosts(query, type = 'all', limit = 10) {
        try {
            console.log('Searching posts:', { query, type, limit });
            const response = await api.get(ENDPOINTS.SEARCH.POSTS, {
                params: { q: query, type, limit }
            });
            console.log('Posts search response:', response.data);
            return response.data;
        } catch (error) {
            console.error('[SEARCH POSTS] Error:', error);
            console.error('Response details:', {
                status: error.response?.status,
                data: error.response?.data,
                headers: error.response?.headers
            });
            if (!error.response) {
                throw new Error('Network error. Please check your connection.');
            }
            if (error.response.status === 401) {
                throw new Error('Please log in to search.');
            }
            throw new Error(error.response?.data?.error || 'Failed to search posts');
        }
    }
};