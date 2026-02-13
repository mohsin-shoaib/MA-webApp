// Weekly timeline structure
export interface RoadmapTimeline {
  [week: string]: string[] // e.g. "week1": ["exercise1", "exercise2"]
}

// Daily exercises structure
export interface RoadmapDailyExercise {
  [day: string]: string[] // e.g. "monday": ["squat", "push-up"]
}

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
