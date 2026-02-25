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
  /** If true, this day is a rest day; no exercises required. */
  isRestDay?: boolean
  exercise_name: string
  exercise_description?: string
  exercise_time?: string
  workout_timer?: string
  rest_timer?: string
  exercises: ExerciseDTO[]
}

// --- Program Builder hierarchy: Program → Weeks → Days → Sections → Exercises ---
export interface ProgramStructureSectionExercise {
  exerciseId: number
  sets?: number
  reps?: number
  rpe?: number
  weightPercent?: number
  tempo?: string
  rest?: string
  coachingNotes?: string
}

export interface ProgramStructureSection {
  sectionType?: 'normal' | 'superset' | 'circuit' | 'AMRAP' | 'EMOM'
  name?: string
  exercises: ProgramStructureSectionExercise[]
}

export interface ProgramStructureDay {
  dayIndex: number
  isRestDay?: boolean
  dayName?: string
  sections?: ProgramStructureSection[]
}

export interface ProgramStructureWeek {
  weekIndex: number
  weekName?: string
  days: ProgramStructureDay[]
}

export interface ProgramStructure {
  weeks: ProgramStructureWeek[]
}

// Create Program DTO (matches backend CreateProgramDTO)
export interface CreateProgramDTO {
  program_name: string
  program_description: string
  category?: string | null
  subCategory?: string | null
  cycleId: number
  isActive?: boolean
  /** Legacy flat structure; required if programStructure not provided */
  dailyExercises?: DailyExerciseDTO[]
  /** Program Builder hierarchy; when provided, backend derives dailyExercise */
  programStructure?: ProgramStructure
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
  programStructure?: ProgramStructure
}

// Program response from API
export interface Program extends Record<string, unknown> {
  id: number
  name: string
  description: string
  isActive: boolean
  /** Coach-created programs start unpublished; admin approves (publishes) to show in Program Browser */
  isPublished?: boolean
  category: string | null
  subCategory: string | null
  cycleId: number
  dailyExercise: DailyExerciseDTO[]
  alternateExercise: Record<string, unknown>
  programStructure?: ProgramStructure | null
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

/** Response from GET /athlete/program/recommended-next (PRD 10.7) */
export interface RecommendedNextResponse {
  statusCode: number
  data: {
    program: Program | null
    reason: string | null
  }
  message?: string
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
