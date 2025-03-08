import axios from 'axios';
import { API_URL } from '../config';

export const searchBarService = {
    async searchContent(query, token) {
        if (!token) {
            throw new Error('Authentication required');
        }

        try {
            console.log('Making search request:', { query, API_URL }); // Debug log
            const response = await axios.get(`${API_URL}/search`, {
                params: { query },
                headers: { 
                    'Authorization': `Bearer ${token}`
                }
            });
            console.log('Search API response:', response.data); // Debug log
            return response.data;
        } catch (error) {
            console.error('Search error details:', {
                status: error.response?.status,
                data: error.response?.data,
                message: error.message
            });
            throw new Error(error.response?.data?.error || 'Search failed');
        }
    }
};