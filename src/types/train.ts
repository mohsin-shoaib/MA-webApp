import type { DailyExerciseDTO } from '@/types/program'

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
  }
  message?: string
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
}

/** Single set log */
export interface SetLog {
  id: number
  workoutSessionId: number
  exerciseId?: string
  exerciseName?: string
  setIndex: number
  reps?: number
  weightLb?: number
  weightKg?: number
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
  status: 'in_progress' | 'completed' | 'skipped'
  complianceType?: 'full_log' | 'quick_toggle'
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
}
