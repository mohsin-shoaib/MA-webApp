import api from './axios'
import type {
  CreateGoalTypeDTO,
  UpdateGoalTypeDTO,
  GetGoalTypeQueryDTO,
  GetGoalTypesResponse,
  GetGoalTypeResponse,
  CreateGoalTypeResponse,
  UpdateGoalTypeResponse,
} from '@/types/goal-type'

export const goalTypeService = {
  /**
   * Create a new goal type (Admin only)
   */
  create: (data: CreateGoalTypeDTO) =>
    api.post<CreateGoalTypeResponse>('admin/goalType/create', data),

  /**
   * Get all goal types with filtering and pagination
   */
  getAll: (query: GetGoalTypeQueryDTO = {}) =>
    api.post<GetGoalTypesResponse>('shared/goalType/get-all', query),

  /**
   * Get goal type by ID
   */
  getById: (goalTypeId: number) =>
    api.get<GetGoalTypeResponse>(`shared/goalType/find-by-id/${goalTypeId}`),

  /**
   * Update goal type by ID (Admin only)
   */
  update: (goalTypeId: number, data: UpdateGoalTypeDTO) =>
    api.put<UpdateGoalTypeResponse>(
      `admin/goalType/update-by-id/${goalTypeId}`,
      data
    ),
}
