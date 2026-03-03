import api from './axios'

export const coachAnalyticsService = {
  getRoster: (params?: { programId?: number; limit?: number }) =>
    api.get('coach/analytics/roster', { params }),
  getComplianceAggregate: (params?: {
    programId?: number
    rollingDays?: number
  }) => api.get('coach/analytics/compliance-aggregate', { params }),
  getMissedSessions: (params?: { programId?: number; rollingDays?: number }) =>
    api.get('coach/analytics/missed-sessions', { params }),
  getCommunicationActivity: () =>
    api.get('coach/analytics/communication-activity'),
  getCurriculumProgress: () => api.get('coach/analytics/curriculum-progress'),
  getUpcomingEvents: (daysAhead?: number) =>
    api.get('coach/analytics/upcoming-events', { params: { daysAhead } }),

  /** MASS Phase 8 — Working maxes per assigned athlete */
  getLiftProgress: () => api.get('coach/analytics/lift-progress'),

  /** MASS Phase 8 — Readiness survey trends (1–5) per athlete */
  getReadinessTrends: (params?: { days?: number }) =>
    api.get('coach/analytics/readiness-trends', { params }),

  /** MASS Phase 8 — Training summary (sessions, volume, avg duration) per athlete */
  getTrainingSummary: (params?: { rollingDays?: number }) =>
    api.get('coach/analytics/training-summary', { params }),
}
