export const ENDPOINTS = {
    HEALTH: '/health',
    AUTH: {
        LOGIN: '/api/auth/login',
        SIGNUP: '/api/auth/signup',
        VERIFY_EMAIL: '/api/auth/verify-email',
        VALIDATE_SESSION: '/api/auth/validate-session',
    },
    PROFILE: {
        GET: '/api/profile',
        UPDATE: '/api/profile/update',
        GET_BY_USERNAME: (username) => `/api/profile/${username}`,
    },
    SOCIAL: {
        FOLLOW: (username) => `/api/social/follow/${username}`,
        UNFOLLOW: (username) => `/api/social/follow/${username}`,
        MUTE: (username) => `/api/social/mute/${username}`,
        UNMUTE: (username) => `/api/social/mute/${username}`,
        GET_STATUS: (username) => `/api/social/status/${username}`
    }
};