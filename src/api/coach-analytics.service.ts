import api from './axios'

export const coachAnalyticsService = {
  getRoster: (params?: { programId?: number; limit?: number }) =>
    api.get('coach/analytics/roster', { params }),
  getComplianceAggregate: (params?: {
    programId?: number
    rollingDays?: number
  }) => api.get('coach/analytics/compliance-aggregate', { params }),
  getUpcomingEvents: (daysAhead?: number) =>
    api.get('coach/analytics/upcoming-events', { params: { daysAhead } }),
}
