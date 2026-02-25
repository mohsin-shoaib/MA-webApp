import api from './axios'

export const analyticsService = {
  getCompliance: (rollingDays = 30) =>
    api.get('athlete/analytics/compliance', { params: { rollingDays } }),
  getStreak: () => api.get('athlete/analytics/streak'),
  getPersonalRecords: () => api.get('athlete/analytics/personal-records'),
  getTestResults: (limit?: number) =>
    api.get('athlete/analytics/test-results', { params: { limit } }),
  getProgress: (params?: { from?: string; to?: string; programId?: number }) =>
    api.get('athlete/analytics/progress', { params }),
  getVolume: (params?: { from?: string; to?: string; rollingWeeks?: number }) =>
    api.get('athlete/analytics/volume', { params }),
  getSessionDuration: () => api.get('athlete/analytics/session-duration'),
  getCycleHistory: () => api.get('athlete/analytics/cycle-history'),
  getGoalCountdown: () => api.get('athlete/analytics/goal-countdown'),
  getBodyweightTrend: (days = 90) =>
    api.get('athlete/analytics/bodyweight/trend', { params: { days } }),
  upsertBodyweight: (data: { date: string; valueKg: number; note?: string }) =>
    api.post('athlete/analytics/bodyweight', data),
  deleteBodyweight: (date: string) =>
    api.delete('athlete/analytics/bodyweight', { params: { date } }),
}
