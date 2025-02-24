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
    },
    POSTS: {
        CREATE: '/api/posts',
        UPDATE: (id) => `/api/posts/${id}`,
        DELETE: (id) => `/api/posts/${id}`,
        LIST: '/api/posts',
        PUBLISH: (id) => `/api/posts/${id}/publish`,
        PUBLISH_DUE: '/api/posts/scheduled/publish-due',
        PUBLISH_SCHEDULED: '/api/posts/scheduled/publish-due',
        GET: (slug) => `/api/posts/${slug}`,
    },
    CATEGORIES: {
        LIST: '/api/categories',
        CREATE: '/api/categories',
        UPDATE: (id) => `/api/categories/${id}`,
        DELETE: (id) => `/api/categories/${id}`
    }
};