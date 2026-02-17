import api from './axios'
import type {
  TodayWorkoutResponse,
  WorkoutSessionResponse,
  WorkoutSessionsResponse,
  CreateSessionDTO,
  UpdateSessionDTO,
  LogSetDTO,
} from '@/types/train'

export const trainService = {
  /**
   * Get today's scheduled workout (or for a given date).
   * GET /athlete/train/today or GET /athlete/train/scheduled-workout?date=
   */
  getTodayWorkout: (date?: string) => {
    const params = date ? { date } : {}
    return api.get<TodayWorkoutResponse>('athlete/train/today', { params })
  },

  /**
   * Get scheduled workout for a specific date.
   * GET /athlete/train/scheduled-workout?date=YYYY-MM-DD
   */
  getScheduledWorkout: (date: string) =>
    api.get<TodayWorkoutResponse>('athlete/train/scheduled-workout', {
      params: { date },
    }),

  /**
   * Create or get session for a date.
   * POST /athlete/train/sessions
   */
  createOrGetSession: (body: CreateSessionDTO) =>
    api.post<WorkoutSessionResponse>('athlete/train/sessions', body),

  /**
   * Update session status (complete/skip).
   * PATCH /athlete/train/sessions/:id
   */
  updateSession: (sessionId: number, body: UpdateSessionDTO) =>
    api.patch<WorkoutSessionResponse>(
      `athlete/train/sessions/${sessionId}`,
      body
    ),

  /**
   * Get session by ID (with set logs).
   * GET /athlete/train/sessions/:id
   */
  getSession: (sessionId: number) =>
    api.get<WorkoutSessionResponse>(`athlete/train/sessions/${sessionId}`),

  /**
   * Get workout history.
   * GET /athlete/train/sessions?from=&to=
   */
  getSessions: (from?: string, to?: string) => {
    const params: Record<string, string> = {}
    if (from) params.from = from
    if (to) params.to = to
    return api.get<WorkoutSessionsResponse>('athlete/train/sessions', {
      params,
    })
  },

  /**
   * Log a set for a session.
   * POST /athlete/train/sessions/:id/sets
   */
  logSet: (sessionId: number, body: LogSetDTO) =>
    api.post<WorkoutSessionResponse>(
      `athlete/train/sessions/${sessionId}/sets`,
      body
    ),
}
