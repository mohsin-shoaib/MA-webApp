import api from './axios'
import type { GetAthletesResponse, GetCoachesResponse } from '@/types/coach'

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
}
