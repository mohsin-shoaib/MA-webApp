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
   * Get Amber exercise for a specific date (date-driven Amber program).
   * GET /athlete/amber/exercise?date=YYYY-MM-DD
   * Returns day exercise for that date or empty/notSet when not configured.
   */
  getAmberExerciseForDate: (date: string) =>
    api.get<{
      statusCode: number
      data?: Record<string, unknown>
      message?: string
    }>('athlete/amber/exercise', { params: { date } }),

  /**
   * Create or get session for a date.
   * POST /athlete/train/sessions
   */
  createOrGetSession: (body: CreateSessionDTO) =>
    api.post<WorkoutSessionResponse>('athlete/train/sessions', body),

  /**
   * Update session status (complete/skip). MASS Phase 7: intensityRating, sessionComments.
   * PATCH /athlete/train/sessions/:id
   */
  updateSession: (sessionId: number, body: UpdateSessionDTO) =>
    api.patch<WorkoutSessionResponse>(
      `athlete/train/sessions/${sessionId}`,
      body
    ),

  /**
   * MASS Phase 7: Submit pre-session readiness survey (1-5 for Sleep, Stress, Energy, Soreness, Mood).
   * POST /athlete/train/readiness
   */
  submitReadiness: (body: {
    sessionDate: string
    workoutSessionId?: number
    sleep: number
    stress: number
    energy: number
    soreness: number
    mood: number
  }) =>
    api.post<{ statusCode: number; data: unknown }>(
      'athlete/train/readiness',
      body
    ),

  /**
   * MASS Phase 7: Get readiness for a date. GET /athlete/train/readiness?date=
   */
  getReadiness: (date: string) =>
    api.get<{ statusCode: number; data: unknown }>('athlete/train/readiness', {
      params: { date },
    }),

  /**
   * MASS Phase 7: Record exercise swap for this session only.
   * POST /athlete/train/sessions/:id/swap
   */
  swapExercise: (
    sessionId: number,
    body: { originalExerciseId: number; newExerciseId: number }
  ) =>
    api.post<WorkoutSessionResponse>(
      `athlete/train/sessions/${sessionId}/swap`,
      body
    ),

  /**
   * MASS Phase 7: Reschedule session to another date. Completed sessions not moveable.
   * POST /athlete/train/sessions/:id/reschedule
   */
  rescheduleSession: (sessionId: number, targetDate: string) =>
    api.post<WorkoutSessionResponse>(
      `athlete/train/sessions/${sessionId}/reschedule`,
      { targetDate }
    ),

  /**
   * Get session by ID (with set logs).
   * GET /athlete/train/sessions/:id
   */
  getSession: (sessionId: number) =>
    api.get<WorkoutSessionResponse>(`athlete/train/sessions/${sessionId}`),

  /**
   * Get workout history (sessions in date range).
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
   * Get day history (workout/rest/none per day in range). PRD 9.3.4.
   * GET /athlete/train/history?from=&to=
   */
  getDayHistory: (from?: string, to?: string) => {
    const params: Record<string, string> = {}
    if (from) params.from = from
    if (to) params.to = to
    return api.get<{
      statusCode: number
      data: {
        days: Array<{
          date: string
          type: string
          daySummary?: string
          session?: unknown
        }>
      }
    }>('athlete/train/history', { params })
  },

  /**
   * MASS Phase 7: Get linked substitution exercises for swap (show first in swap modal).
   * GET /athlete/train/exercises/:id/substitutions
   */
  getExerciseSubstitutions: (exerciseId: number) =>
    api.get<{
      statusCode: number
      data: {
        substitutions: Array<{ id: number; name: string; description?: string }>
      }
    }>(`athlete/train/exercises/${exerciseId}/substitutions`),

  /**
   * Get exercise library with optional filters (PRD 9.2).
   * GET /athlete/train/exercises?search=&muscleGroup=&equipment=&cycleSafe=
   */
  getExerciseLibrary: (params?: {
    search?: string
    muscleGroup?: string
    equipment?: string
    cycleSafe?: string
  }) =>
    api.get<{
      statusCode: number
      data: Array<{
        name: string
        description?: string
        video?: string
        exercise_id?: string
        muscle_group?: string
        equipment?: string
        cycleName?: string
      }>
    }>('athlete/train/exercises', { params: params ?? {} }),

  /**
   * Log a set for a session.
   * POST /athlete/train/sessions/:id/sets
   */
  logSet: (sessionId: number, body: LogSetDTO) =>
    api.post<WorkoutSessionResponse>(
      `athlete/train/sessions/${sessionId}/sets`,
      body
    ),

  /**
   * Get working max (MASS Phase 3). With exerciseId: single exercise + lastLogged; without: list all.
   */
  getWorkingMax: (exerciseId?: number) => {
    const params = exerciseId != null ? { exerciseId } : {}
    return api.get<{
      statusCode: number
      data: {
        workingMax?: {
          value: number
          unit: string
          source: string
          updatedAt: string
        } | null
        lastLogged?: {
          weightLb?: number
          weightKg?: number
          reps?: number
          completedAt: string
        } | null
        workingMaxes?: Array<{
          exerciseId: number
          exerciseName: string
          value: number
          unit: string
          source: string
          updatedAt: string
        }>
      }
    }>('athlete/train/working-max', { params })
  },

  /**
   * Set working max manually (MASS Phase 3). POST /athlete/train/working-max
   */
  setWorkingMax: (body: {
    exerciseId: number
    value: number
    unit: 'lb' | 'kg'
  }) =>
    api.post<{ statusCode: number; data: { workingMax: unknown } }>(
      'athlete/train/working-max',
      body
    ),
}
