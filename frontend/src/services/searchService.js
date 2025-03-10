import api from '../api/axios';

export const searchService = {
    async searchUsers(query, limit = 10) {
        try {
            const response = await api.get('/api/search/users', {
                params: { q: query, limit }
            });
            return response.data;
        } catch (error) {
            console.error('[SEARCH USERS] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to search users');
        }
    },

    async searchPosts(query, type = 'all', limit = 10) {
        try {
            const response = await api.get('/api/search/posts', {
                params: { q: query, type, limit }
            });
            return response.data;
        } catch (error) {
            console.error('[SEARCH POSTS] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to search posts');
        }
    }
};