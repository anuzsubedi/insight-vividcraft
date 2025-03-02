import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';
import useAuthState from '../hooks/useAuthState';

export const profileService = {
    async getProfile() {
        try {
            const response = await api.get(ENDPOINTS.PROFILE.GET);
            return response.data;
        } catch (error) {
            console.error('[GET PROFILE] Error:', error);
            if (error.response?.status === 404) {
                throw new Error("Profile not found");
            }
            throw error;
        }
    },

    async updateProfile(data) {
        try {
            const updateData = {
                bio: data.bio,
                avatarName: data.avatarName,
                username: data.username,
                displayName: data.displayName
            };

            const response = await api.put(ENDPOINTS.PROFILE.UPDATE, updateData);
            
            // Update auth state with new user data if available
            const currentUser = useAuthState.getState().user;
            if (currentUser && response.data.profile) {
                useAuthState.getState().setUser({
                    ...currentUser,
                    username: response.data.profile.username || currentUser.username,
                    displayName: response.data.profile.displayName || currentUser.displayName,
                    bio: response.data.profile.bio || currentUser.bio,
                    avatarName: response.data.profile.avatarName || currentUser.avatarName
                });
            }
            
            return response.data;
        } catch (error) {
            console.error('[UPDATE PROFILE] Error:', error);
            if (error.response?.status === 404) {
                throw new Error("Profile not found");
            }
            throw error;
        }
    },

    async getProfileByUsername(username) {
        try {
            const response = await api.get(ENDPOINTS.PROFILE.GET_BY_USERNAME(username));
            return response.data;
        } catch (error) {
            console.error('[GET PROFILE BY USERNAME] Error:', error);
            if (error.response?.status === 404) {
                throw new Error("User not found");
            }
            throw error;
        }
    }
};