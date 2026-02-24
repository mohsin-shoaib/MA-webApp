import api from './axios'

export const adminAnalyticsService = {
  getTimeToFirstWorkout: () => api.get('admin/analytics/time-to-first-workout'),
  getProgramPopularity: () => api.get('admin/analytics/program-popularity'),
  getCycleDistribution: () => api.get('admin/analytics/cycle-distribution'),
  getRetention: () => api.get('admin/analytics/retention'),
}
