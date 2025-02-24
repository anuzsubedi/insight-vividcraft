import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_BACKEND_URL,
    timeout: 15000, // Increase timeout to 15 seconds
    headers: {
        'Content-Type': 'application/json',
    }
});

// Add request interceptor for debugging
api.interceptors.request.use(
    (config) => {
        console.log('API Request:', {
            url: config.url,
            method: config.method,
            data: config.data,
            baseURL: config.baseURL,
        });
        return config;
    },
    (error) => {
        console.error('Request Error:', error);
        return Promise.reject(error);
    }
);

// Add request interceptor for adding token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Add response interceptor for debugging
api.interceptors.response.use(
    (response) => {
        console.log('API Response:', response);
        return response;
    },
    (error) => {
        if (error.code === 'ECONNABORTED') {
            console.error('Request timeout:', error);
            return Promise.reject({
                response: {
                    data: {
                        error: 'Request timed out. Please try again.'
                    }
                }
            });
        }

        if (!error.response) {
            console.error('Network Error:', error);
            return Promise.reject({
                response: {
                    data: {
                        error: 'Unable to connect to server. Please check your internet connection.'
                    }
                }
            });
        }

        console.error('Response Error:', error);
        return Promise.reject(error);
    }
);

export default api;