import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';

export const healthService = {

    async checkHealth() {
        const response = await api.get(ENDPOINTS.HEALTH);
        return response.data;
    },

};