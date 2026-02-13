import api from './axios'
import type {
  CreateGoalDTO,
  UpdateGoalDTO,
  GetGoalsResponse,
  GetGoalResponse,
  CreateGoalResponse,
  UpdateGoalResponse,
} from '@/types/goal'

export const goalService = {
  /**
   * Get all goals
   */
  getAll: (params?: { page?: number; limit?: number; search?: string }) =>
    api.post<GetGoalsResponse>('shared/goal/get-all', {
      page: params?.page || 1,
      limit: params?.limit || 10,
      ...(params?.search && { q: params.search }),
    }),

  /**
   * Get goal by ID
   */
  getById: (goalId: number) =>
    api.get<GetGoalResponse>(`shared/goal/find-by-id/${goalId}`),

  /**
   * Create a new goal
   */
  create: (data: CreateGoalDTO) =>
    api.post<CreateGoalResponse>('shared/goal/create', data),

  /**
   * Update goal by ID
   */
  update: (goalId: number, data: UpdateGoalDTO) =>
    api.put<UpdateGoalResponse>(`shared/goal/update-by-id/${goalId}`, data),
}
