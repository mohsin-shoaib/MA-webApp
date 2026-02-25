/** Exercise from library (admin CRUD) */
export interface Exercise {
  id: number
  name: string
  description?: string | null
  videoUrl?: string | null
  muscleGroup?: string | null
  equipment?: string | null
  movementPattern?: string | null
  tags?: string[] | null
  substitutionIds?: number[] | null
  isActive: boolean
  isApproved?: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateExercisePayload {
  name: string
  description?: string
  videoUrl?: string
  muscleGroup?: string
  equipment?: string
  movementPattern?: string
  tags?: string[]
  substitutionIds?: number[]
  isActive?: boolean
}

export interface UpdateExercisePayload {
  name?: string
  description?: string
  videoUrl?: string
  muscleGroup?: string
  equipment?: string
  movementPattern?: string
  tags?: string[]
  substitutionIds?: number[]
  isActive?: boolean
}

export interface GetExercisesQuery {
  page?: number
  limit?: number
  q?: string
  muscleGroup?: string
  equipment?: string
  movementPattern?: string
  isActive?: boolean
}

export interface GetExercisesResponse {
  statusCode: number
  data: {
    rows: Exercise[]
    meta: { total: number; page: number; limit: number; pages: number }
  }
  message?: string
}

export interface GetExerciseResponse {
  statusCode: number
  data: Exercise
  message?: string
}

export interface ExerciseListForBuilderItem {
  id: number
  name: string
  muscleGroup?: string | null
  equipment?: string | null
  movementPattern?: string | null
}

export interface ListForProgramBuilderResponse {
  statusCode: number
  data: { rows: ExerciseListForBuilderItem[] }
  message?: string
}
