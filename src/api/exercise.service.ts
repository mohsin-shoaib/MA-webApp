import api from './axios'
import type {
  CreateExercisePayload,
  UpdateExercisePayload,
  GetExercisesQuery,
  GetExercisesResponse,
  GetExerciseResponse,
  ListForProgramBuilderResponse,
} from '@/types/exercise'

const base = 'admin/exercise'

export const exerciseService = {
  create: (payload: CreateExercisePayload) =>
    api.post<GetExerciseResponse>(`${base}/create`, payload),

  update: (id: number, payload: UpdateExercisePayload) =>
    api.put<GetExerciseResponse>(`${base}/update-by-id/${id}`, payload),

  getAll: (query: GetExercisesQuery = {}) =>
    api.post<GetExercisesResponse>(`${base}/get-all`, query),

  getById: (id: number) =>
    api.get<GetExerciseResponse>(`${base}/find-by-id/${id}`),

  delete: (id: number) =>
    api.delete<{ statusCode: number; status: string; message?: string }>(
      `${base}/delete-by-id/${id}`
    ),

  /** Lightweight list for program builder exercise picker */
  listForProgramBuilder: (q?: string) =>
    api.get<ListForProgramBuilderResponse>(
      `${base}/list-for-program-builder`,
      q ? { params: { q } } : {}
    ),
}
