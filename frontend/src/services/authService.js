import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import useAuthState from '../hooks/useAuthState';

export const authService = {
    async signup(userData) {
        try {
            console.log('[SIGNUP] Attempting signup with:', userData);
            const response = await api.post(ENDPOINTS.AUTH.SIGNUP, userData);
            console.log('[SIGNUP] Response:', response.data);
            return response.data;
        } catch (error) {
            console.error('[SIGNUP] Error:', error);
            throw error;
        }
    },

    async login(credentials) {
        try {
            console.log('[LOGIN] Attempting login with:', credentials);
            const response = await api.post(ENDPOINTS.AUTH.LOGIN, {
                login: credentials.email, // can be email or username
                password: credentials.password
            });
            console.log('[LOGIN] Response:', response.data);

            // Store token and user data
            if (response.data.token) {
                localStorage.setItem('token', response.data.token);
                useAuthState.getState().setUser(response.data.user);
            }

            return response.data;
        } catch (error) {
            console.error('[LOGIN] Error:', error);
            throw error;
        }
    },

    async verifyEmail(email, code) {
        try {
            console.log('[VERIFY] Attempting verification:', { email, code });
            const response = await api.post(ENDPOINTS.AUTH.VERIFY_EMAIL, {
                email: email.toLowerCase(), // Normalize email
                code
            });
            console.log('[VERIFY] Response:', response.data);
            return response.data;
        } catch (error) {
            console.error('[VERIFY] Error:', error);
            throw error;
        }
    },

    async checkHealth() {
        const response = await api.get(ENDPOINTS.HEALTH);
        return response.data;
    },

    async requestPasswordReset(email) {
        const response = await api.post('/api/auth/request-password-reset', { email });
        return response.data;
    },

    async resetPassword(email, code, newPassword) {
        const response = await api.post('/api/auth/reset-password', {
            email,
            code,
            newPassword
        });
        return response.data;
    },

    // Add method to check if token is valid
    async validateSession() {
        try {
            const token = localStorage.getItem('token');
            if (!token) return false;

            // Make a request to validate the token
            const response = await api.get(ENDPOINTS.AUTH.VALIDATE_SESSION);
            return response.data.isValid;
        } catch (error) {
            console.error('[VALIDATE SESSION] Error:', error);
            return false;
        }
    }
};