import type { DailyExerciseDTO, ExerciseDTO } from '@/types/program'

/** One day's exercise block (matches program dailyExercise element). Used for roadmap timeline. */
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

// Legacy types (kept for backward compatibility)
export interface RoadmapTimeline {
  [week: string]: string[]
}

// Main Roadmap Create Payload
export interface RoadmapProps {
  currentCycleId: number
  // goalId: number

  primaryGoalStart: string // ISO date string
  primaryGoalEnd: string // ISO date string
  sustainmentStart: string // ISO date string

  timeline: RoadmapTimeline
}

export interface RoadmapResponse {
  id: number
  userId: number
  goalId: number
  currentCycleId: number

  timeline: RoadmapTimeline

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
  cycles?: RoadmapCycle[]
  primaryGoal?: string
  eventDate?: string
  totalWeeks?: number
  currentCycle?: string
  /** PRD 6.2: Next block name (e.g. Green) */
  nextBlockName?: string | null
  /** PRD 6.2: Weeks until next transition */
  countdownWeeks?: number | null
  /** PRD 6.1.6: When Sustainment may be recommended */
  sustainmentNote?: string | null
  /** PRD 6.3.3: true when current cycle is Sustainment (show as distinct overlay) */
  isSustainmentCycle?: boolean
  /** PRD 6.4.1: Personal records from SetLog */
  prList?: Array<{
    exerciseName: string
    weight: number
    unit: string
    date: string
  }>
  /** PRD 6.4.2: Performance over time (compliance by week) */
  complianceByWeek?: Array<{
    weekStart: string
    completed: number
    total: number
    percent: number
  }>
  /** PRD 6.4.3: Test results (placeholder) */
  testResults?: Array<{
    id: number
    name: string
    date: string
    result: string
  }>
  generatedAt?: string
  onboardingId?: number
  createdAt?: string
  updatedAt?: string
  /** True when plan was trimmed to last N weeks to fit event (skip starting weeks) */
  trimmedToEvent?: boolean
  /** Program weeks used when trimmed (e.g. 8) */
  programWeeksUsed?: number
  /** Total program weeks (e.g. 12) when trimmed */
  programTotalWeeks?: number
  /** PRD 4.7.1: true when timeline was prioritized over ideal performance; show warning */
  timelinePriorityWarning?: boolean
}

export interface RoadmapResponseV2 {
  statusCode: number
  data: Roadmap
  message: string
}
