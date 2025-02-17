import { useState } from 'react';
import api from '../api/axios';

export const useApi = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const callApi = async (endpoint, options = {}) => {
        setLoading(true);
        setError(null);
        try {
            const response = await api(endpoint, options);
            return response.data;
        } catch (err) {
            setError(err.response?.data?.message || err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return {
        loading,
        error,
        callApi
    };
};