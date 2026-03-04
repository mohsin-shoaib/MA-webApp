import api from './axios'
import type {
  GetExercisesResponse,
  GetExerciseResponse,
} from '@/types/exercise'

export interface AthleteExerciseListQuery {
  page?: number
  limit?: number
  q?: string
  tags?: string[]
}

export const athleteExerciseService = {
  getAll: (query: AthleteExerciseListQuery = {}) =>
    api.post<GetExercisesResponse>('athlete/exercise/get-all', query),

  getById: (id: number) =>
    api.get<GetExerciseResponse>(`athlete/exercise/find-by-id/${id}`),
}
