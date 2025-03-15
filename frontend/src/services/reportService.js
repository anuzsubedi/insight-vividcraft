import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';

class ReportService {
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
      throw new Error(error.response?.data?.error || 'Failed to submit report');
    }
  }
}

export const reportService = new ReportService();
