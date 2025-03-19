export const ENDPOINTS = {
    HEALTH: '/health',
    AUTH: {
        LOGIN: '/auth/login',
        SIGNUP: '/auth/signup',
        VERIFY_EMAIL: '/auth/verify-email',
        VALIDATE_SESSION: '/auth/validate-session',
        REQUEST_PASSWORD_RESET: '/auth/request-password-reset',
        RESET_PASSWORD: '/auth/reset-password',
        REQUEST_EMAIL_CHANGE: '/auth/request-email-change',
        VERIFY_EMAIL_CHANGE: '/auth/verify-email-change',
        UPDATE_PASSWORD: '/auth/update-password',
    },
    PERMISSIONS: {
        CAN_POST: '/permissions/can-post'
    },
    PROFILE: {
        GET: '/profile',
        UPDATE: '/profile/update',
        GET_BY_USERNAME: (username) => `/profile/${username}`,
    },
    SOCIAL: {
        FOLLOW: (username) => `/social/follow/${username}`,
        UNFOLLOW: (username) => `/social/follow/${username}`, // DELETE method
        MUTE: (username) => `/social/mute/${username}`,
        UNMUTE: (username) => `/social/mute/${username}`, // DELETE method
        GET_STATUS: (username) => `/social/status/${username}`,
        GET_FOLLOWING: (username) => `/social/${username}/following`,
        GET_FOLLOWERS: (username) => `/social/${username}/followers`,
        GET_MUTUAL: (username) => `/social/${username}/mutual`,
        REMOVE_FOLLOWER: (username) => `/social/remove-follower/${username}`
    },
    POSTS: {
        CREATE: '/posts',
        UPDATE: (id) => `/posts/${id}`,
        DELETE: (id) => `/posts/${id}`,
        LIST: '/posts',
        GET_USER_POSTS: (username) => `/posts/user/${username}`,
        PUBLISH: (id) => `/posts/${id}/publish`,
        PUBLISH_DUE: '/posts/scheduled/publish-due',
        PUBLISH_SCHEDULED: '/posts/scheduled/publish-due',
        GET: (id) => `/posts/${id}`,
        ADD_REACTION: (id) => `/posts/${id}/reactions`,
    },
    CATEGORIES: {
        LIST: '/categories',
        CREATE: '/categories',
        UPDATE: (id) => `/categories/${id}`,
        DELETE: (id) => `/categories/${id}`
    },
    FEED: {
        FOLLOWING: '/feed/following',
        NETWORK: '/feed/network',
        EXPLORE: '/feed/explore'
    },
    COMMENTS: {
        GET_POST_COMMENTS: (postId) => `/comments/post/${postId}`,
        CREATE_COMMENT: '/comments',
        UPDATE_COMMENT: (id) => `/comments/${id}`,
        DELETE_COMMENT: (id) => `/comments/${id}`,
        ADD_REACTION: (id) => `/comments/${id}/reactions`,
        GET_REACTIONS: (id) => `/comments/${id}/reactions`,
    },
    SEARCH: {
        USERS: '/search/users',
        POSTS: '/search/posts'
    },
    REPORTS: {
        CREATE: '/reports',
        CATEGORIES: '/reports/categories'
    },
    MENTIONS: {
        SUGGEST: '/mentions/suggest'
    },
    ADMIN: {
        GET_ADMINS: '/admin/admins',
        ADD_ADMIN: '/admin/admins',
        REMOVE_ADMIN: (username) => `/admin/admins/${username}`,
        SEARCH_USERS: '/admin/search-users',
        GET_REPORTS: '/admin/reports',
        REVIEW_REPORT: (reportId) => `/admin/reports/${reportId}/review`,
        RESTRICT_USER: (userId) => `/admin/users/${userId}/restrict`,
        GET_USER_RESTRICTIONS: (userId) => `/admin/users/${userId}/restrictions`,
        GET_ACTIONS: '/admin/actions',
        GET_MODERATION_HISTORY: '/admin/moderation/history'
    }
};