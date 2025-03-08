import axios from 'axios';
import { API_URL } from '../config';

export const searchBarService = {
    async searchContent(query, token) {
        try {
            const response = await axios.get(`${API_URL}/search`, {
                params: { query },
                headers: { 
                    Authorization: `Bearer ${token}`,
                }
            });
            return response.data;
        } catch (error) {
            throw new Error(error.response?.data?.error || 'Search failed');
        }
    }
};