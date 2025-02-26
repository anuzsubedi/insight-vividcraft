import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';

export const profileService = {
    async getProfile() {
        try {
            const response = await api.get(ENDPOINTS.PROFILE.GET);
            console.log('Profile response:', response.data); // Add logging
            return response.data;
        } catch (error) {
            console.error('[GET PROFILE] Error:', error);
            throw error;
        }
    },

    async updateProfile(data) {
        try {
            // Get current profile first
            const currentProfile = await this.getProfile();

            // Merge current data with updates
            const updateData = {
                displayName: data.displayName ?? currentProfile.profile.displayName,
                username: data.username ?? currentProfile.profile.username,
                email: data.email ?? currentProfile.profile.email,
                bio: data.bio ?? currentProfile.profile.bio,
                avatarName: data.avatarName ?? currentProfile.profile.avatarName
            };

            const response = await api.put(ENDPOINTS.PROFILE.UPDATE, updateData);
            return response.data;
        } catch (error) {
            console.error('[UPDATE PROFILE] Error:', error);
            throw error;
        }
    },

    async getProfileByUsername(username) {
        try {
            const response = await api.get(ENDPOINTS.PROFILE.GET_BY_USERNAME(username));
            console.log('Profile by username response:', response.data); // Add logging
            return response.data;
        } catch (error) {
            console.error('[GET PROFILE BY USERNAME] Error:', error);
            throw error;
        }
    }
};