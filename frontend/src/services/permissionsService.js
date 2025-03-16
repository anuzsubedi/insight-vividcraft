import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';

export const permissionsService = {
    async canPost() {
        try {
            const response = await api.get(ENDPOINTS.PERMISSIONS.CAN_POST);
            return response.data;
        } catch (error) {
            console.error('[CAN POST] Error:', error);
            if (error.response?.status === 403) {
                return {
                    canPost: false,
                    reason: error.response.data.error
                };
            }
            throw error;
        }
    }
};