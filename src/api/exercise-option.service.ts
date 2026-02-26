import api from './axios'

export type ExerciseOptionType =
  | 'muscle_group'
  | 'equipment'
  | 'movement_pattern'

export interface ExerciseOption {
  id: number
  type: ExerciseOptionType
  name: string
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface ListExerciseOptionsResponse {
  statusCode: number
  data: { rows: ExerciseOption[] }
  message?: string
}

export interface GetExerciseOptionResponse {
  statusCode: number
  data: ExerciseOption
  message?: string
}

const base = 'admin/exercise-option'

export const exerciseOptionService = {
  list: (type?: ExerciseOptionType) =>
    api.get<ListExerciseOptionsResponse>(
      `${base}/list`,
      type ? { params: { type } } : {}
    ),

  getById: (id: number) =>
    api.get<GetExerciseOptionResponse>(`${base}/find-by-id/${id}`),

  create: (payload: {
    type: ExerciseOptionType
    name: string
    sortOrder?: number
  }) => api.post<GetExerciseOptionResponse>(`${base}/create`, payload),

  update: (id: number, payload: { name?: string; sortOrder?: number }) =>
    api.put<GetExerciseOptionResponse>(`${base}/update-by-id/${id}`, payload),

  delete: (id: number) =>
    api.delete<{ statusCode: number; status: string; message?: string }>(
      `${base}/delete-by-id/${id}`
    ),
}
