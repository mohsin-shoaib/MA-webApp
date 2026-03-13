// Nested exercise types matching backend DTOs
export interface AlternateExerciseDTO {
  video?: string
  name: string
  description?: string
  pointsOfPerformance?: string
  total_reps?: number
  sets?: number
  lb?: number
}

/** MASS Phase 3: working max and last logged from backend */
export interface WorkingMaxDTO {
  value: number
  unit: 'lb' | 'kg'
  source: 'auto' | 'manual' | 'test'
  updatedAt: string
}

export interface LastLoggedDTO {
  weightLb?: number
  weightKg?: number
  reps?: number
  completedAt: string
}

export interface ExerciseDTO {
  exercise_id: string
  video?: string
  name: string
  description?: string
  /** MASS Phase 2: coaching cues, shown to athletes */
  pointsOfPerformance?: string
  total_reps?: number
  sets?: number
  lb?: number
  /** MASS Phase 3: weight % of working max (e.g. 75) */
  weight_percent?: number
  /** MASS Phase 3: resolved working max for this exercise */
  working_max?: WorkingMaxDTO
  /** MASS Phase 3: prescribed weight from % (lb or kg) */
  prescribed_weight_lb?: number
  prescribed_weight_kg?: number
  /** MASS Phase 3: last logged set */
  last_logged?: LastLoggedDTO
  alternate_exercise?: AlternateExerciseDTO | null
}

// --- Program Builder hierarchy: Program → Weeks → Days → Blocks → Exercises (MASS 2.2). In code, blocks are typed as ProgramStructureSection (Section = Block). ---
/** MASS Phase 4: per-set prescription row */
export interface ProgramStructureSetRow {
  setIndex?: number
  reps?: number
  repsDisplay?: string
  weightMode?: string
  weightValue?: number
  /** Build to Heavy or other text (when weightMode is build_to_heavy) */
  weightDisplay?: string
  rpe?: number
  tempo?: string
  restSeconds?: number
}

export interface ProgramStructureSectionExercise {
  exerciseId: number
  sets?: number
  reps?: number
  rpe?: number
  weightPercent?: number
  tempo?: string
  rest?: string
  coachingNotes?: string
  /** MASS Phase 4: per-set prescription */
  setsRows?: ProgramStructureSetRow[]
  exercise?: {
    id: number
    name: string
    description?: string | null
    videoUrl?: string | null
  }
}

/** MASS 2.7: Format-specific params for conditioning circuit blocks */
export interface ConditioningConfig {
  timeCapSeconds?: number
  durationSeconds?: number
  intervalLengthSeconds?: number
  rounds?: number
  workSeconds?: number
  restSeconds?: number
}

export interface ProgramStructureSection {
  id?: number
  sectionType?: 'normal' | 'superset' | 'circuit' | 'AMRAP' | 'EMOM'
  /** MASS Phase 4: EXERCISE | CIRCUIT | SUPERSET */
  blockType?: 'EXERCISE' | 'CIRCUIT' | 'SUPERSET'
  /** MASS 2.6: Uncategorized, Prep, Speed/Agility, Skill/Tech, Strength/Power, Conditioning, Recovery */
  blockCategory?: string
  name?: string
  instructions?: string
  resultTrackingType?: string
  videoUrls?: unknown
  /** MASS 2.7: AMRAP, EMOM, For Time, Tabata, Custom Interval, For Completion */
  conditioningFormat?: string
  /** MASS 2.7: Timer/result params per format */
  conditioningConfig?: ConditioningConfig
  parentSectionId?: number
  /** Client-side superset grouping: index of parent section within the same day (before parentSectionId is set) */
  parentSectionIndex?: number
  supersetRounds?: number
  restBetweenExercises?: string
  restBetweenRounds?: string
  exercises: ProgramStructureSectionExercise[]
}

export interface ProgramStructureDay {
  /** MASS Phase 6: DB id for Amber session assignment */
  id?: number
  dayIndex: number
  isRestDay?: boolean
  dayName?: string
  /** MASS Phase 4 */
  sessionNotes?: string
  estimatedDurationMinutes?: number
  sections?: ProgramStructureSection[]
}

export interface ProgramStructureWeek {
  /** Week ID for API (add day, duplicate, reorder, delete week) */
  id?: number
  weekIndex: number
  weekName?: string
  days: ProgramStructureDay[]
}

export interface ProgramStructure {
  weeks: ProgramStructureWeek[]
}

/** MASS 2.1: Cycle type (required for create). */
export type ProgramCycleType =
  | 'RED'
  | 'AMBER'
  | 'GREEN'
  | 'SUSTAINMENT'
  | 'CUSTOM'

// Create Program DTO (matches backend CreateProgramDTO)
export interface CreateProgramDTO {
  program_name: string
  program_description: string
  category?: string | null
  subCategory?: string | null
  /** MASS 2.1: Required. Red, Amber, Green, Sustainment, Custom */
  cycleType: ProgramCycleType
  /** Legacy: cycle ID; optional if cycleType is sent */
  cycleId?: number
  /** MASS 2.1: Required at creation. Pre-generates that many empty week rows when createEmptyWeeks. */
  numberOfWeeks: number
  goalTypeId?: number
  durationWeeks?: number
  isActive?: boolean
  /** Only ADMIN can set true at create; coach-created start as draft. */
  isPublished?: boolean
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
  /** Only ADMIN can set true (publish); coach can set false (unpublish) */
  isPublished?: boolean
  goalTypeId?: number | null
  durationWeeks?: number | null
  programStructure?: ProgramStructure
}

// Program response from API (relational: programStructure is source of truth for content)
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
  /** MASS 2.1: Computed from week count (null for Amber). Returned by getProgramById. */
  durationWeeks?: number | null
  /** MASS 2.1: Average training days per week. Returned by getProgramById. */
  sessionsPerWeek?: number | null
  alternateExercise?: Record<string, unknown>
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
  /** true = published, false = draft (Phase 5 list filter) */
  isPublished?: boolean
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
}

/** Response from athlete program list (by cycle / subCategory) */
export interface ProgramListByCycleResponse {
  statusCode: number
  data: Program[] | { rows: Program[] }
  message?: string
}

/** Section exercise with embedded exercise (from API when using relational) */
export interface ProgramStructureSectionExerciseWithExercise extends ProgramStructureSectionExercise {
  exercise?: {
    id: number
    name: string
    description?: string | null
    videoUrl?: string | null
  }
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

/** Current enrolled program (GET /athlete/program/current). Use program.programStructure for days/exercises. */
export interface UserProgram {
  id: number
  userId: number
  programId: number
  isActive: boolean
  startDate: string
  endDate: string | null
  program: Program & {
    programStructure?: ProgramStructure | null
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
