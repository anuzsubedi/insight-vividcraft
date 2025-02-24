export const ENDPOINTS = {
    HEALTH: '/health',
    AUTH: {
        LOGIN: '/api/auth/login',
        SIGNUP: '/api/auth/signup',
        VERIFY_EMAIL: '/api/auth/verify-email',
    },
    PROFILE: {
        GET: '/api/profile',
        UPDATE: '/api/profile/update',
        GET_BY_USERNAME: (username) => `/api/profile/${username}`,
    }
};