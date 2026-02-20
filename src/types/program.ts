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

/** Section type (Phase 4) */
export type SectionType = 'default' | 'superset' | 'circuit' | 'amrap' | 'emom'

/** Section config for AMRAP/EMOM */
export interface SectionConfig {
  minutes?: number
  durationMinutes?: number
  rounds?: number
}

/** Section within a day (Phase 3/4) */
export interface SectionDTO {
  sectionType?: SectionType
  sectionConfig?: SectionConfig | null
  exercises: ExerciseDTO[]
}

export interface DailyExerciseDTO {
  day: string // "day1", "day2" for Red/Green, ISO date string for Amber
  /** If true, this day is a rest day; no exercises required. */
  isRestDay?: boolean
  /** Phase 4: block type for this day (one section per day in builder) */
  sectionType?: SectionType
  exercise_name: string
  exercise_description?: string
  exercise_time?: string
  workout_timer?: string
  rest_timer?: string
  exercises: ExerciseDTO[]
  /** Phase 3/4: when present, workout player can render by section type */
  sections?: SectionDTO[]
}

/** Phase 3: Week → Days → Sections → Exercises (optional; when sent, backend uses this shape) */
export interface WeekInProgramDTO {
  weekNumber: number
  days: DayInWeekDTO[]
}

export interface DayInWeekDTO {
  dayNumber: number
  isRestDay?: boolean
  sections: SectionDTO[]
}

/** When backend returns dailyExercise with hierarchy it may be { weeks: WeekInProgramDTO[] } */
export interface WeeklyStructureDTO {
  weeks: WeekInProgramDTO[]
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
  /** Phase 3: optional hierarchy; when provided, backend may prefer this over dailyExercises */
  weeklyStructure?: WeeklyStructureDTO
  /** Phase 6: Custom 1:1 program assigned to one athlete */
  isCustom?: boolean
  assignedToUserId?: number | null
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
  weeklyStructure?: WeeklyStructureDTO
  isCustom?: boolean
  assignedToUserId?: number | null
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
  /** Phase 6: Custom 1:1 program */
  isCustom?: boolean
  assignedToUserId?: number | null
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
  subCategory?: string
  isActive?: boolean
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

/** Response from athlete program list (by cycle / subCategory) */
export interface ProgramListByCycleResponse {
  statusCode: number
  data: Program[] | { rows: Program[] }
  message?: string
}

/** Program with cycle relation (athlete GET /athlete/program/:id) */
export interface ProgramWithCycle extends Program {
  cycle?: {
    id: number
    name: string
    description?: string
    duration?: number
  }
}

/** Response from POST /athlete/program/enroll */
export interface EnrollProgramResponse {
  statusCode: number
  data: {
    enrollment: {
      id: number
      userId: number
      programId: number
      isActive: boolean
      startDate: string
      endDate?: string | null
      program?: {
        id: number
        name: string
        cycleId: number
        cycle?: { id: number; name: string }
      }
    }
    warning?: string
  }
  message?: string
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

/** Current enrolled program (GET /athlete/program/current). dailyExercise may be array or object keyed by day. */
export interface UserProgram {
  id: number
  userId: number
  programId: number
  isActive: boolean
  startDate: string
  endDate: string | null
  program: Program & {
    dailyExercise: DailyExerciseDTO[] | Record<string, DailyExerciseDTO>
    cycle?: {
      id: number
      name: string
      description?: string
      duration?: number
    }
  }
}

export interface CurrentProgramResponse {
  statusCode: number
  data: UserProgram | null
  message?: string
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
