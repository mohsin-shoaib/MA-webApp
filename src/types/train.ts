import type { DailyExerciseDTO } from '@/types/program'

/** MASS Phase 7: exercise swap for this session (apply when rendering blocks) */
export interface ExerciseSwapItem {
  originalExerciseId: number
  newExerciseId: number
  newExercise?: { id: number; name: string }
}

/** Response from GET /athlete/train/today or scheduled-workout?date= */
export interface TodayWorkoutResponse {
  statusCode: number
  status?: string
  data: {
    date: string
    phase: string
    weekIndex: number
    dayIndex?: number
    /** Optional: API may send only dayExercise.day */
    dayKey?: string
    dayExercise: DailyExerciseDTO
    currentCycle?: string
    currentCycleId?: number
    currentCycleName?: string
    programId?: number
    programName?: string
    completed?: boolean
    sessionId?: number
    /** Lowercase status (today endpoint) */
    status?: 'scheduled' | 'in_progress' | 'completed' | 'skipped'
    /** Uppercase from scheduled-workout e.g. "COMPLETED" */
    sessionStatus?: string
    completedAt?: string
    /** MASS Phase 7: session notes from ProgramDay */
    sessionNotes?: string
    /** MASS Phase 7: full day structure (sections with exercises) for block view */
    dayStructure?: Record<string, unknown>
    /** MASS Phase 7: exercise swaps for this session */
    exerciseSwaps?: ExerciseSwapItem[]
    /** Red 3.1: when Red program is complete (last day done or past endDate) */
    redProgramComplete?: boolean
    /** 3.3 Green: when Green program is complete (event date reached); recommend return to Red */
    greenProgramComplete?: boolean
    /** Red 3.1 / 3.3 Green: e.g. 'Amber' or 'Red' — confirm transition to this cycle */
    recommendTransitionTo?: string
    /** Red 3.1 / 3.3 Green: message when redProgramComplete or greenProgramComplete */
    message?: string
  }
  message?: string
}

/** MASS Phase 7: one PR entry when status=COMPLETED */
export interface SessionSummaryPR {
  exerciseKey: string
  exerciseName?: string
  type: string
  previousValue: number
  newValue: number
  unit: string
}

/** MASS Phase 7: computed when status=COMPLETED */
export interface SessionSummary {
  totalSets: number
  volumeKg: number
  durationMinutes?: number
  prs?: SessionSummaryPR[]
}

/** Workout session (one scheduled day) */
export interface WorkoutSession {
  id: number
  userId: number
  scheduledDate: string
  phase?: string
  weekIndex?: number
  dayKey?: string
  programId?: number
  status: 'scheduled' | 'in_progress' | 'completed' | 'skipped'
  complianceType?: 'full_log' | 'quick_toggle'
  completedAt?: string
  createdAt: string
  updatedAt: string
  setLogs?: SetLog[]
  /** MASS Phase 7: when status=COMPLETED */
  sessionSummary?: SessionSummary
  /** MASS Phase 7: athlete comments on completion */
  sessionComments?: string | null
  /** MASS Phase 8: coach response (visible to athlete) */
  coachResponseComment?: string | null
  intensityRating?: number | null
  /** Red 3.1: set when completing last day of Red program */
  redComplete?: boolean
  /** Red 3.1: e.g. 'Amber' */
  recommendTransitionTo?: string
  exerciseSwaps?: Array<{
    originalExerciseId: number
    newExerciseId: number
    newExercise?: { id: number; name: string }
  }>
}

/** Single set log */
export interface SetLog {
  id: number
  workoutSessionId: number
  exerciseKey?: string
  exerciseId?: string
  exerciseName?: string
  setIndex: number
  reps?: number
  weightLb?: number
  weightKg?: number
  rpe?: number
  sectionExerciseId?: number
  isModified?: boolean
  completedAt?: string
}

export interface WorkoutSessionsResponse {
  statusCode: number
  data: WorkoutSession[] | { rows: WorkoutSession[]; meta?: unknown }
  message?: string
}

export interface WorkoutSessionResponse {
  statusCode: number
  data: WorkoutSession
  message?: string
}

/** Body for POST /athlete/train/sessions */
export interface CreateSessionDTO {
  date: string
  phase?: string
  weekIndex?: number
  dayIndex?: number
  dayKey?: string
  programId?: number
}

/** Body for PATCH /athlete/train/sessions/:id */
export interface UpdateSessionDTO {
  status: 'COMPLETED' | 'SKIPPED'
  complianceType?: 'FULL_LOG' | 'QUICK_TOGGLE'
  /** MASS Phase 7: 1-10 when status=COMPLETED */
  intensityRating?: number
  /** MASS Phase 7: optional comments when status=COMPLETED */
  sessionComments?: string
}

/** Body for POST /athlete/train/sessions/:id/sets */
export interface LogSetDTO {
  exerciseKey?: string
  exerciseId?: string
  exerciseName?: string
  exerciseSource?: 'main' | 'alternate'
  setIndex: number
  reps?: number
  weightLb?: number
  weightKg?: number
  rpe?: number
  sectionExerciseId?: number
  isModified?: boolean
}
