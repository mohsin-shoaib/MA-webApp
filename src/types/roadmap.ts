// Weekly timeline structure
export interface RoadmapTimeline {
  [week: string]: string[] // e.g. "week1": ["exercise1", "exercise2"]
}

// Daily exercises structure
export interface RoadmapDailyExercise {
  [day: string]: string[] // e.g. "monday": ["squat", "push-up"]
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
  timeline: Record<string, Record<string, string[]>>
  currentCycleId: number
  primaryGoalStart?: string | null
  primaryGoalEnd?: string | null
  sustainmentStart?: string | null
  dailyExercise: Record<string, unknown>
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
