import api from './axios'
import type {
  AdminExerciseGetAllPayload,
  AdminExerciseGetAllResponse,
  AdminExerciseCreateUpdatePayload,
  Exercise,
} from '@/types/exercise'

interface GetAllApiResponse {
  statusCode: number
  data: AdminExerciseGetAllResponse
}

interface GetOneApiResponse {
  statusCode: number
  data: Exercise
}

export const exerciseService = {
  /**
   * Admin: List exercises with filters and pagination.
   * POST /admin/exercise/get-all
   */
  getAll: (payload: AdminExerciseGetAllPayload) =>
    api.post<GetAllApiResponse>('admin/exercise/get-all', payload),

  /**
   * Admin: Get exercise by ID.
   * GET /admin/exercise/find-by-id/:id
   */
  getById: (id: number | string) =>
    api.get<GetOneApiResponse>(`admin/exercise/find-by-id/${id}`),

  /**
   * Admin: Create exercise.
   * POST /admin/exercise/create
   */
  create: (payload: AdminExerciseCreateUpdatePayload) =>
    api.post<GetOneApiResponse>('admin/exercise/create', payload),

  /**
   * Admin: Update exercise.
   * PUT /admin/exercise/update-by-id/:id
   */
  update: (id: number | string, payload: AdminExerciseCreateUpdatePayload) =>
    api.put<GetOneApiResponse>(`admin/exercise/update-by-id/${id}`, payload),

  /**
   * Admin: Delete exercise.
   * DELETE /admin/exercise/delete-by-id/:id
   */
  delete: (id: number | string) =>
    api.delete<{ statusCode: number; message?: string }>(
      `admin/exercise/delete-by-id/${id}`
    ),
}
