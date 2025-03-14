import axios from 'axios';
import useAuthState from '../hooks/useAuthState';

const api = axios.create({
    baseURL: 'http://localhost:5000/api',
    timeout: 15000,
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
        console.log('[API Response]', {
            url: response.config.url,
            method: response.config.method,
            status: response.status,
            data: response.data
        });
        return response;
    },
    (error) => {
        console.error('[API Error]', {
            url: error.config?.url,
            method: error.config?.method,
            status: error.response?.status,
            statusText: error.response?.statusText,
            data: error.response?.data,
            error: error.message,
            request: {
                headers: error.config?.headers,
                params: error.config?.params,
                data: error.config?.data
            }
        });

        if (error.code === 'ECONNABORTED') {
            console.error('[Request timeout]:', error);
            return Promise.reject({
                response: {
                    data: {
                        error: 'Request timed out. Please try again.'
                    }
                }
            });
        }

        if (!error.response) {
            console.error('[Network Error]:', error);
            return Promise.reject({
                response: {
                    data: {
                        error: 'Unable to connect to server. Please check your internet connection.'
                    }
                }
            });
        }

        return Promise.reject(error);
    }
);

// Add response interceptor for handling token expiration
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If the error is 401 and we haven't tried to refresh yet
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            // Clear auth state
            const logout = useAuthState.getState().logout;
            logout();
            // Don't use window.location, let React Router handle navigation
            // The AuthProvider will handle redirecting to login
        }

        return Promise.reject(error);
    }
);

export default api;