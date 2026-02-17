import type { DailyExerciseDTO, ExerciseDTO } from '@/types/program'

/** One day's exercise block (matches program dailyExercise element). Reused for roadmap timeline/dailyExercise. */
export type RoadmapDayExercise = DailyExerciseDTO

/** Single exercise item within a day (name, video, reps, sets, etc.). */
export type RoadmapExerciseItem = ExerciseDTO

/** Legacy: week -> string[] (mock). New: week -> array of day objects. */
export type TimelineWeekValue = string[] | RoadmapDayExercise[]

/** One phase (Red/Amber/Green): week key -> array of day exercises. */
export type TimelinePhase = Record<string, RoadmapDayExercise[]>

/** Real timeline: phase -> weeks with day objects. */
export interface RoadmapTimelineReal {
  Red?: TimelinePhase
  Amber?: TimelinePhase
  Green?: TimelinePhase
}

/** Real dailyExercise: phase -> day key -> day object. */
export interface RoadmapDailyExerciseReal {
  Red?: Record<string, RoadmapDayExercise>
  Amber?: Record<string, RoadmapDayExercise>
  Green?: Record<string, RoadmapDayExercise>
}

/** Type guard: value is array of day objects (real) not strings (legacy). */
export function isRealTimelineWeek(
  value: unknown
): value is RoadmapDayExercise[] {
  return (
    Array.isArray(value) &&
    value.length > 0 &&
    typeof value[0] === 'object' &&
    value[0] !== null &&
    'exercise_name' in (value[0] as RoadmapDayExercise)
  )
}

/** Type guard: dailyExercise is real shape (phase -> day -> object). */
export function isRealDailyExerciseByPhase(
  value: unknown
): value is RoadmapDailyExerciseReal {
  if (typeof value !== 'object' || value === null) return false
  const o = value as Record<string, unknown>
  const phase = o.Red ?? o.Amber ?? o.Green
  if (!phase || typeof phase !== 'object') return false
  const firstDay = Object.values(phase as Record<string, unknown>)[0]
  return (
    firstDay !== undefined &&
    typeof firstDay === 'object' &&
    firstDay !== null &&
    'exercise_name' in firstDay
  )
}

// Legacy types (kept for backward compatibility)
export interface RoadmapTimeline {
  [week: string]: string[]
}

export interface RoadmapDailyExercise {
  [day: string]: string[]
}

// Legacy types - kept for backward compatibility
// Main Roadmap Create Payload
export interface RoadmapProps {
  currentCycleId: number
  // goalId: number

  primaryGoalStart: string // ISO date string
  primaryGoalEnd: string // ISO date string
  sustainmentStart: string // ISO date string

  timeline: RoadmapTimeline
  dailyExercise: RoadmapDailyExercise
}

export interface RoadmapResponse {
  id: number
  userId: number
  goalId: number
  currentCycleId: number

  timeline: RoadmapTimeline
  dailyExercise: RoadmapDailyExercise

  primaryGoalStart: string | null
  primaryGoalEnd: string | null
  sustainmentStart: string | null

  createdAt: string
  updatedAt: string
}

// New types for recommendation flow
export interface GenerateRoadmapDTO {
  recommendedCycle?: string
  primaryGoal?: string
  eventDate?: string
}

export interface RoadmapCycle {
  cycleType: string
  cycleName: string
  programId?: number
  programName?: string
  startDate: string
  endDate: string
  durationWeeks: number
  isActive: boolean
  isCompleted: boolean
}

export interface Roadmap {
  id: number
  userId: number
  goalId: number
  /** Phase (Red/Amber/Green) -> week -> day objects[] or legacy string[]. */
  timeline: RoadmapTimelineReal | Record<string, Record<string, string[]>>
  currentCycleId: number
  primaryGoalStart?: string | null
  primaryGoalEnd?: string | null
  sustainmentStart?: string | null
  /** Real: phase -> day -> day object. Legacy: flat day -> string[]. */
  dailyExercise: RoadmapDailyExerciseReal | Record<string, unknown>
  cycles?: RoadmapCycle[]
  primaryGoal?: string
  eventDate?: string
  totalWeeks?: number
  currentCycle?: string
  generatedAt?: string
  onboardingId?: number
  createdAt?: string
  updatedAt?: string
}

export interface RoadmapResponseV2 {
  statusCode: number
  data: Roadmap
  message: string
}
