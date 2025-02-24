import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';

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
            // Get current profile first
            const currentProfile = await this.getProfile();

            // Merge current data with updates
            const updateData = {
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
            return response.data;
        } catch (error) {
            console.error('[GET PROFILE BY USERNAME] Error:', error);
            throw error;
        }
    }
};