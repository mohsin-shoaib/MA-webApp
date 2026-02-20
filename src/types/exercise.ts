/**
 * Exercise tag structure (stored as JSON on Exercise).
 */
export interface ExerciseTags {
  muscleGroup?: string[]
  equipment?: string[]
  movementPattern?: string[]
}

/**
 * Exercise entity (admin list item and get-by-id response).
 */
export interface Exercise {
  id: number
  name: string
  description?: string | null
  videoUrl?: string | null
  tags?: ExerciseTags | null
  isActive?: boolean
  createdById?: number | null
  createdAt?: string
  updatedAt?: string
  /** Phase 2.3 richer fields */
  rpe?: number | null
  loadingPercent?: number | null
  tempo?: string | null
  restSeconds?: number | null
  coachingNotes?: string | null
}

/**
 * Admin: get-all request body.
 */
export interface AdminExerciseGetAllPayload {
  page: number
  limit: number
  q?: string
  muscleGroup?: string
  equipment?: string
  movementPattern?: string
  isActive?: boolean
}

/**
 * Admin: get-all response data.
 */
export interface AdminExerciseGetAllResponse {
  data: Exercise[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

/**
 * Admin: create/update exercise payload.
 */
export interface AdminExerciseCreateUpdatePayload {
  name: string
  description?: string
  videoUrl?: string
  tags?: ExerciseTags
  isActive?: boolean
  rpe?: number
  loadingPercent?: number
  tempo?: string
  restSeconds?: number
  coachingNotes?: string
}
