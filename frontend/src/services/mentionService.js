import api from '../api/axios';

export const mentionService = {
    async searchUsers(query) {
        try {
            // Rename query parameter to match backend expectation
            const response = await api.get('search/mention', {
                params: { 
                    q: query // Change query to q to match backend
                }
            });
            return response.data.users;
        } catch (error) {
            console.error('[MENTION SEARCH] Error:', error);
            return [];
        }
    }
};
