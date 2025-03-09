import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';

export const postService = {
    // Individual post operations
    async createPost(postData) {
        try {
            const response = await api.post(ENDPOINTS.POSTS.CREATE, postData);
            return response.data;
        } catch (error) {
            console.error('[CREATE POST] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to create post');
        }
    },

    async getPost(postId) {
        try {
            const response = await api.get(ENDPOINTS.POSTS.GET(postId));
            return response.data;
        } catch (error) {
            console.error('[GET POST] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to fetch post');
        }
    },

    async updatePost(postId, postData) {
        try {
            const response = await api.put(ENDPOINTS.POSTS.UPDATE(postId), postData);
            return response.data;
        } catch (error) {
            console.error('[UPDATE POST] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to update post');
        }
    },

    async deletePost(postId) {
        try {
            const response = await api.delete(ENDPOINTS.POSTS.DELETE(postId));
            return response.data;
        } catch (error) {
            console.error('[DELETE POST] Error:', error);
            throw error;
        }
    },

    async publishPost(postId) {
        try {
            const response = await api.post(ENDPOINTS.POSTS.PUBLISH(postId));
            return response.data;
        } catch (error) {
            console.error('[PUBLISH POST] Error:', error);
            throw error;
        }
    },

    // Reaction operations
    async addReaction(postId, type) {
        try {
            const response = await api.post(`/api/posts/${postId}/reactions`, { type });
            return response.data;
        } catch (error) {
            console.error('[ADD REACTION] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to add reaction');
        }
    },

    async getReactions(postId) {
        try {
            const response = await api.get(`/api/posts/${postId}/reactions`);
            return response.data;
        } catch (error) {
            console.error('[GET REACTIONS] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to get reactions');
        }
    },

    // User posts operations
    async getUserPosts(username, filters = {}) {
        try {
            const {
                page = 1,
                limit = 10,
                category,
                type,
                sortBy = "newest"
            } = filters;

            const response = await api.get(ENDPOINTS.POSTS.GET_USER_POSTS(username), {
                params: {
                    page,
                    limit,
                    category: category !== "all" ? category : undefined,
                    type: type !== "all" ? type : undefined,
                    sortBy
                },
                timeout: 30000
            });

            return {
                posts: response.data.posts || [],
                categories: response.data.categories || [],
                pagination: response.data.pagination || {
                    total: 0,
                    page,
                    limit,
                    hasMore: false
                }
            };
        } catch (error) {
            console.error('[GET USER POSTS] Error:', error);
            if (!error.response) {
                throw new Error('Network error. Please check your connection.');
            }
            if (error.response.status === 404) {
                throw new Error('User not found');
            }
            throw new Error(error.response?.data?.error || 'Failed to fetch user posts');
        }
    },

    // My posts operations
    async getMyPosts(filters = {}) {
        try {
            const response = await api.get(ENDPOINTS.POSTS.LIST, {
                params: {
                    ...filters,
                    author: 'me'
                },
                timeout: 30000
            });
            return response.data;
        } catch (error) {
            console.error('[GET MY POSTS] Error:', error);
            if (!error.response) {
                throw new Error('Network error. Please check your connection.');
            }
            if (error.response.status === 401) {
                throw new Error('Please log in to view posts');
            }
            throw new Error(error.response?.data?.error || 'Failed to fetch posts');
        }
    },

    // Scheduled posts operations
    async publishScheduledPosts() {
        try {
            const response = await api.get(ENDPOINTS.POSTS.PUBLISH_SCHEDULED);
            return response.data;
        } catch (error) {
            console.error('[PUBLISH SCHEDULED] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to publish scheduled posts');
        }
    }
}