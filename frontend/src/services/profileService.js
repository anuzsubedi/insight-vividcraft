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
            
            // Update auth state with new user data
            const currentUser = useAuthState.getState().user;
            if (currentUser) {
                useAuthState.getState().setUser({
                    ...currentUser,
                    username: data.username || currentUser.username,
                    displayName: data.displayName || currentUser.displayName,
                    bio: data.bio || currentUser.bio,
                    avatarName: data.avatarName || currentUser.avatarName
                });
            }
            
            return response.data;
        } catch (error) {
            console.error('[UPDATE PROFILE] Error:', error);
            throw error;
        }
    },

    async getProfileByUsername(username) {
        try {
            const response = await api.get(ENDPOINTS.PROFILE.GET_BY_USERNAME(username));
            return response.data;
        } catch (error) {
            console.error('[GET PROFILE BY USERNAME] Error:', error);
            throw error;
        }
    }
};