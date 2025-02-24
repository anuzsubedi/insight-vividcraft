import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';

const categoryService = {
    async getCategories() {
        try {
            const response = await api.get(ENDPOINTS.CATEGORIES.LIST);
            return response.data;
        } catch (error) {
            console.error('[GET CATEGORIES] Error:', error);
            throw error;
        }
    }
};

export default categoryService;