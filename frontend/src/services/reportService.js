import { api } from './api';
import { ENDPOINTS } from '../api/endpoints';

class ReportService {
  async createReport({ postId, category, reason }) {
    try {
      const response = await api.post(ENDPOINTS.REPORTS.CREATE, {
        postId,
        category,
        reason
      });
      return response.data;
    } catch (error) {
      console.error('[CREATE REPORT] Error:', error);
      throw new Error(error.response?.data?.error || 'Failed to submit report');
    }
  }
}

export const reportService = new ReportService();
