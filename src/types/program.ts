// Nested exercise types matching backend DTOs
export interface AlternateExerciseDTO {
  video?: string
  name: string
  description?: string
  total_reps?: number
  sets?: number
  lb?: number
}

export interface ExerciseDTO {
  exercise_id: string
  video?: string
  name: string
  description?: string
  total_reps?: number
  sets?: number
  lb?: number
  alternate_exercise?: AlternateExerciseDTO | null
}

export interface DailyExerciseDTO {
  day: string // "day1", "day2" for Red/Green, ISO date string for Amber
  exercise_name: string
  exercise_description?: string
  exercise_time?: string
  workout_timer?: string
  rest_timer?: string
  exercises: ExerciseDTO[]
}

// Create Program DTO (matches backend CreateProgramDTO)
export interface CreateProgramDTO {
  program_name: string
  program_description: string
  category?: string | null // Required for Red/Green, optional for Amber
  subCategory?: string | null // Required for Red/Green, optional for Amber
  cycleId: number
  isActive?: boolean
  dailyExercises: DailyExerciseDTO[]
}

// Update Program DTO (all fields optional)
export interface UpdateProgramDTO {
  program_name?: string
  program_description?: string
  category?: string | null
  subCategory?: string | null
  cycleId?: number
  isActive?: boolean
  dailyExercises?: DailyExerciseDTO[]
}

// Program response from API
export interface Program extends Record<string, unknown> {
  id: number
  name: string
  description: string
  isActive: boolean
  category: string | null
  subCategory: string | null
  cycleId: number
  dailyExercise: DailyExerciseDTO[] // JSON field from database
  alternateExercise: Record<string, unknown> // Empty object for backward compatibility
  createdAt: string
  updatedAt: string
}

export interface CreateProgramResponse {
  statusCode: number
  status: string
  data: Program
  message: string
}

export interface UpdateProgramResponse {
  statusCode: number
  status: string
  data: Program
  message: string
}

export interface GetProgramResponse {
  statusCode: number
  status: string
  data: Program
  message: string
}

export interface GetProgramsQueryDTO {
  page?: number
  limit?: number
  q?: string
  cycleId?: number
  category?: string
  isActive?: boolean
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

export interface GetProgramsResponse {
  statusCode: number
  status: string
  data: {
    rows: Program[]
    meta?: {
      total: number
      page: number
      limit: number
      pages: number
    }
  }
  message: string
}

// Legacy types (kept for backward compatibility)
export interface ProgramProps {
  name: string
  description: string
  isActive: boolean
  category: string
  subCategory?: string
  cycleId: number
  dailyExercise: DailyExerciseDTO[]
  alternateExercise?: Record<string, unknown>
}

export interface ProgramResponse {
  data: {
    id: number
    name: string
    description: string
    isActive: boolean
    category: string
    subCategory?: string
    cycleId: number
    dailyExercise: DailyExerciseDTO[]
    alternateExercise?: Record<string, unknown>
    createdAt: string
    updatedAt: string
  }
}
