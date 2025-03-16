import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';

class ReportService {
  // Cache for report categories
  #categories = null;

  async getCategories() {
    try {
      // Use cached categories if available
      if (this.#categories) {
        return this.#categories;
      }

      const response = await api.get(ENDPOINTS.REPORTS.CATEGORIES);
      this.#categories = response.data.categories;
      return this.#categories;
    } catch (error) {
      console.error('[GET CATEGORIES] Error:', error);
      // Return default categories if API fails
      return [
        { value: 'Spam', description: 'Content that is promotional, repetitive, or unrelated' },
        { value: 'Violence and Sex', description: 'Content containing explicit violence or sexual material' },
        { value: 'Promotes Bullying', description: 'Content that encourages harassment or targets individuals' },
        { value: 'Other', description: 'Any other concerns not covered above' }
      ];
    }
  }

  async createReport({ targetId, targetType, category, reason }) {
    try {
      const response = await api.post(ENDPOINTS.REPORTS.CREATE, {
        targetId,
        targetType,
        category,
        reason
      });

      return response.data;
    } catch (error) {
      console.error('[CREATE REPORT] Error:', error);
      if (error.response?.status === 429) {
        throw new Error(error.response.data.message || 'You have submitted too many reports. Please try again later.');
      }
      if (error.response?.status === 400 && error.response.data.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error(error.response?.data?.error || 'Failed to submit report');
    }
  }

  // Clear categories cache (useful when testing or when categories might change)
  clearCache() {
    this.#categories = null;
  }
}

export const reportService = new ReportService();
