import api from './axios'
import type {
  GetAthletesResponse,
  GetCoachesResponse,
  GetMyAthletesResponse,
} from '@/types/coach'

export const coachService = {
  /**
   * Get athletes (coach and coach_head only)
   * @param page - Page number (default: 1)
   * @param pageSize - Items per page (default: 10)
   * @param search - Search query (optional)
   */
  getAthletes: (params?: {
    page?: number
    pageSize?: number
    search?: string
    programId?: number
    cycleId?: number
    includeStats?: boolean
  }) =>
    api.get<GetAthletesResponse>('coach/athletes', {
      params: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 10,
        ...(params?.search && { search: params.search }),
        ...(params?.programId != null && { programId: params.programId }),
        ...(params?.cycleId != null && { cycleId: params.cycleId }),
        ...(params?.includeStats === true && { includeStats: true }),
      },
    }),

  /**
   * Get coaches (coach_head only)
   * @param page - Page number (default: 1)
   * @param pageSize - Items per page (default: 10)
   * @param search - Search query (optional)
   */
  getCoaches: (params?: {
    page?: number
    pageSize?: number
    search?: string
  }) =>
    api.get<GetCoachesResponse>('coach/coaches', {
      params: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 10,
        ...(params?.search && { search: params.search }),
      },
    }),

  /** Coach's 1:1 assigned athletes (for marketplace assign, etc.). GET coach/my-athletes */
  getMyAthletes: () => api.get<GetMyAthletesResponse>('coach/my-athletes'),

  /** 90 Unchained: Assign custom program to an assigned athlete with date range. POST coach/user-program/assign */
  assignCustomProgram: (body: {
    athleteId: number
    programId: number
    startDate: string
    endDate: string
  }) =>
    api.post<{ statusCode: number; data: unknown }>(
      'coach/user-program/assign',
      body
    ),

  /** 3.5 Custom / 1:1: Assign a program day to an athlete's calendar date (ad-hoc session). POST coach/custom-session/assign */
  assignCustomSessionToDate: (body: {
    athleteId: number
    programId: number
    date: string
    programDayId: number
  }) =>
    api.post<{ statusCode: number; data: { session: unknown } }>(
      'coach/custom-session/assign',
      body
    ),

  /** List active 1:1 program assignments for coach's athletes. GET coach/user-program/active-1to1 */
  listActive1to1: () =>
    api.get<{ statusCode: number; data: { assignments: unknown[] } }>(
      'coach/user-program/active-1to1'
    ),

  /** MASS Phase 3: Get all working maxes for an athlete. GET coach/athletes/:athleteId/working-max */
  getAthleteWorkingMax: (athleteId: number) =>
    api.get<{
      statusCode: number
      data: {
        workingMaxes: Array<{
          exerciseId: number
          exerciseName: string
          value: number
          unit: string
          source: string
          updatedAt: string
        }>
      }
    }>(`coach/athletes/${athleteId}/working-max`),

  /** MASS Phase 3: Set athlete working max manually. POST coach/athletes/:athleteId/working-max */
  setAthleteWorkingMax: (
    athleteId: number,
    body: { exerciseId: number; value: number; unit: 'lb' | 'kg' }
  ) =>
    api.post<{ statusCode: number; data: { workingMax: unknown } }>(
      `coach/athletes/${athleteId}/working-max`,
      body
    ),

  /** MASS Phase 8: Get athlete detail summary (profile, program, roadmap, tests, recovery). GET coach/athletes/:athleteId/summary */
  getAthleteSummary: (athleteId: number) =>
    api.get<{
      statusCode: number
      data: {
        profile: {
          id: number
          firstName: string | null
          lastName: string | null
          email: string
          role: string
          createdAt: string | null
        } | null
        currentProgram: {
          programName: string
          cycleName: string | null
          startDate: string
          currentWeekIndex: number | null
          currentDayIndex: number | null
        } | null
        roadmap: {
          currentCycleName: string | null
          primaryGoalEnd: string | null
          goalSubCategory: string | null
        } | null
        tests: Array<{
          id: number
          testName: string
          loggedAt: string
          totalScore: number | null
          passed: boolean | null
        }>
        recovery: Array<{
          id: number
          protocolName: string
          protocolType: string
          scheduledDate: string
          status: string
          completedAt: string | null
        }>
      }
    }>(`coach/athletes/${athleteId}/summary`),

  /** MASS Phase 8: Get athlete sessions (calendar/scorecards). GET coach/athletes/:athleteId/sessions */
  getAthleteSessions: (
    athleteId: number,
    params?: { from?: string; to?: string }
  ) =>
    api.get<{ statusCode: number; data: unknown[] }>(
      `coach/athletes/${athleteId}/sessions`,
      { params: { ...params } }
    ),

  /** MASS Phase 8: Get athlete session detail (drill-down). GET coach/athletes/:athleteId/sessions/:sessionId */
  getAthleteSession: (athleteId: number, sessionId: number) =>
    api.get<{ statusCode: number; data: unknown }>(
      `coach/athletes/${athleteId}/sessions/${sessionId}`
    ),

  /** MASS Phase 8: Add/update coach response comment. PATCH coach/athletes/:athleteId/sessions/:sessionId */
  updateCoachResponse: (
    athleteId: number,
    sessionId: number,
    body: { coachResponseComment?: string }
  ) =>
    api.patch<{ statusCode: number; data: unknown }>(
      `coach/athletes/${athleteId}/sessions/${sessionId}`,
      body
    ),
}
