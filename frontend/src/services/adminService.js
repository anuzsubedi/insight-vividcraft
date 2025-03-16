import api from '../api/axios';

export const adminService = {
    getAdmins: async () => {
        const response = await api.get('/admin/admins');
        return response.data;
    },

    addAdmin: async (username) => {
        const response = await api.post('/admin/admins', { username });
        return response.data;
    },

    removeAdmin: async (username) => {
        const response = await api.delete(`/admin/admins/${username}`);
        return response.data;
    },

    searchUsers: async (query) => {
        const response = await api.get(`/admin/search-users?query=${encodeURIComponent(query)}`);
        return response.data;
    }
};