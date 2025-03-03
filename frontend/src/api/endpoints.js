export const ENDPOINTS = {
    HEALTH: '/health',
    AUTH: {
        LOGIN: '/api/auth/login',
        SIGNUP: '/api/auth/signup',
        VERIFY_EMAIL: '/api/auth/verify-email',
        VALIDATE_SESSION: '/api/auth/validate-session',
        REQUEST_PASSWORD_RESET: '/api/auth/request-password-reset',
        RESET_PASSWORD: '/api/auth/reset-password',
        REQUEST_EMAIL_CHANGE: '/api/auth/request-email-change',
        VERIFY_EMAIL_CHANGE: '/api/auth/verify-email-change',
        UPDATE_PASSWORD: '/api/auth/update-password',
    },
    PROFILE: {
        GET: '/api/profile',
        UPDATE: '/api/profile/update',
        GET_BY_USERNAME: (username) => `/api/profile/${username}`,
    },
    SOCIAL: {
        FOLLOW: (username) => `/api/social/follow/${username}`,
        UNFOLLOW: (username) => `/api/social/unfollow/${username}`,
        MUTE: (username) => `/api/social/mute/${username}`,
        UNMUTE: (username) => `/api/social/unmute/${username}`,
        GET_STATUS: (username) => `/api/social/status/${username}`
    },
    POSTS: {
        CREATE: '/api/posts',
        UPDATE: (id) => `/api/posts/${id}`,
        DELETE: (id) => `/api/posts/${id}`,
        LIST: '/api/posts',
        GET_USER_POSTS: (username) => `/api/posts/user/${username}`,
        PUBLISH: (id) => `/api/posts/${id}/publish`,
        PUBLISH_DUE: '/api/posts/scheduled/publish-due',
        PUBLISH_SCHEDULED: '/api/posts/scheduled/publish-due',
        GET: (id) => `/api/posts/${id}`,
    },
    CATEGORIES: {
        LIST: '/api/categories',
        CREATE: '/api/categories',
        UPDATE: (id) => `/api/categories/${id}`,
        DELETE: (id) => `/api/categories/${id}`
    },
    FEED: {
        FOLLOWING: '/api/feed/following',
        EXTENDED: '/api/feed/extended',
        EXPLORE: '/api/feed/explore',
    }
};