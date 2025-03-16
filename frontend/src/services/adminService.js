import api from '../api/axios';
import { ENDPOINTS } from '../api/endpoints';

class AdminService {
    // Cache for report stats
    #reportStats = null;
    #lastStatsFetch = null;
    #statsCacheDuration = 5 * 60 * 1000; // 5 minutes

    async getAdmins() {
        try {
            const response = await api.get(ENDPOINTS.ADMIN.GET_ADMINS);
            return response.data;
        } catch (error) {
            console.error('[GET ADMINS] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to fetch admins');
        }
    }

    async addAdmin(username) {
        try {
            const response = await api.post(ENDPOINTS.ADMIN.ADD_ADMIN, { username });
            return response.data;
        } catch (error) {
            console.error('[ADD ADMIN] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to add admin');
        }
    }

    async removeAdmin(username) {
        try {
            const response = await api.delete(ENDPOINTS.ADMIN.REMOVE_ADMIN(username));
            return response.data;
        } catch (error) {
            console.error('[REMOVE ADMIN] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to remove admin');
        }
    }

    async searchUsers(query) {
        try {
            const response = await api.get(ENDPOINTS.ADMIN.SEARCH_USERS, {
                params: { query }
            });
            return response.data;
        } catch (error) {
            console.error('[SEARCH USERS] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to search users');
        }
    }

    // Report Management
    async getReports(filters = {}) {
        try {
            const response = await api.get(ENDPOINTS.ADMIN.GET_REPORTS, { 
                params: filters,
                timeout: 10000 // 10 second timeout
            });
            return response.data;
        } catch (error) {
            console.error('[GET REPORTS] Error:', error);
            throw new Error(error.response?.data?.details || error.response?.data?.error || 'Failed to fetch reports');
        }
    }

    async getReportStats() {
        // Return cached stats if available and not expired
        const now = Date.now();
        if (this.#reportStats && this.#lastStatsFetch && (now - this.#lastStatsFetch < this.#statsCacheDuration)) {
            return this.#reportStats;
        }

        try {
            // Fetch stats for different periods and categories
            const [pending, today, week, month] = await Promise.all([
                this.getReports({ status: 'pending' }),
                this.getReports({ status: 'all', since: '24h' }),
                this.getReports({ status: 'all', since: '7d' }),
                this.getReports({ status: 'all', since: '30d' })
            ]);

            const stats = {
                pendingCount: pending.reports.length,
                todayCount: today.reports.length,
                weekCount: week.reports.length,
                monthCount: month.reports.length,
                byCategory: this.#aggregateByCategory(month.reports),
                byType: this.#aggregateByType(month.reports)
            };

            // Update cache
            this.#reportStats = stats;
            this.#lastStatsFetch = now;

            return stats;
        } catch (error) {
            console.error('[GET REPORT STATS] Error:', error);
            throw new Error('Failed to fetch report statistics');
        }
    }

    #aggregateByCategory(reports) {
        return reports.reduce((acc, report) => {
            acc[report.category] = (acc[report.category] || 0) + 1;
            return acc;
        }, {});
    }

    #aggregateByType(reports) {
        return reports.reduce((acc, report) => {
            acc[report.target_type] = (acc[report.target_type] || 0) + 1;
            return acc;
        }, {});
    }

    async reviewReport(reportId, data) {
        try {
            const response = await api.post(ENDPOINTS.ADMIN.REVIEW_REPORT(reportId), data);
            // Clear stats cache when a report is reviewed
            this.#reportStats = null;
            this.#lastStatsFetch = null;
            return response.data;
        } catch (error) {
            console.error('[REVIEW REPORT] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to review report');
        }
    }

    // User Restrictions
    async restrictUser(userId, data) {
        try {
            const response = await api.post(ENDPOINTS.ADMIN.RESTRICT_USER(userId), data);
            return response.data;
        } catch (error) {
            console.error('[RESTRICT USER] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to restrict user');
        }
    }

    async getUserRestrictions(userId) {
        try {
            const response = await api.get(ENDPOINTS.ADMIN.GET_USER_RESTRICTIONS(userId));
            return response.data;
        } catch (error) {
            console.error('[GET USER RESTRICTIONS] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to fetch user restrictions');
        }
    }

    async getAdminActions() {
        try {
            const response = await api.get(ENDPOINTS.ADMIN.GET_ACTIONS);
            return response.data;
        } catch (error) {
            console.error('[GET ADMIN ACTIONS] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to fetch admin actions');
        }
    }

    async getModerationHistory(targetId, targetType) {
        try {
            const response = await api.get(ENDPOINTS.ADMIN.GET_MODERATION_HISTORY, {
                params: { targetId, targetType }
            });
            return response.data;
        } catch (error) {
            console.error('[GET MODERATION HISTORY] Error:', error);
            throw new Error(error.response?.data?.error || 'Failed to fetch moderation history');
        }
    }

    // Clear all caches (useful when testing or when data might be stale)
    clearCaches() {
        this.#reportStats = null;
        this.#lastStatsFetch = null;
    }
}

export const adminService = new AdminService();