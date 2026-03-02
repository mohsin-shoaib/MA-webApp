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
  }) =>
    api.get<GetAthletesResponse>('coach/athletes', {
      params: {
        page: params?.page || 1,
        pageSize: params?.pageSize || 10,
        ...(params?.search && { search: params.search }),
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
}
