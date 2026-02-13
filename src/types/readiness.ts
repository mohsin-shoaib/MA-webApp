// Legacy types - kept for backward compatibility
export interface ReadinessProps {
  trainingExperience: string
  primaryGoal: string
  eventDate: string
}

export interface RecommendationData {
  recommended_cycle: string
  recommended_program_family: string
  confidence: number
  reason: string
  weeks_to_event: number
  cycle_details: CycleDetails
}

export interface RecommendationResponse {
  data: RecommendationData
}

export interface ConfirmProps {
  cycle: string
  confirmed: boolean
}

export interface CycleDetails {
  id: number
  name: string
  description: string
  duration: number
}

export interface ConfirmationResponse {
  status: 'CONFIRMED' | 'PENDING' | 'CANCELLED' // if there are other statuses, you can add them
  active_cycle: string
  program_assigned: string
  start_date: string // ISO date string (YYYY-MM-DD)
  cycle_details: CycleDetails
}

export interface ConfirmResponse {
  data: ConfirmationResponse
}

export interface SelectionProps {
  primaryGoal: string
  cycleName: string
}

// New types for recommendation flow
export interface EvaluateReadinessDTO {
  trainingExperience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  primaryGoal: string
  eventDate?: string
}

export interface ReadinessRecommendation {
  id: number
  athleteId?: number
  onboardingId?: number
  recommendedCycle: string
  recommendedCycleId: number
  recommendedProgramId?: number
  goalProgramId?: number
  confidence: number
  reason: string
  reasonCodes: string[]
  weeksToEvent: number
  eventDate?: string
  status: 'PENDING' | 'CONFIRMED' | 'DECLINED'
  recommendedCycleRef?: {
    id: number
    name: string
    description?: string
    duration?: number
  }
  recommendedProgram?: {
    id: number
    name: string
    description?: string
    isActive?: boolean
    category?: string
    subCategory?: string
    cycleId?: number
    dailyExercise?: Record<string, unknown>
    alternateExercise?: Record<string, unknown>
  }
  goalProgram?: {
    id: number
    name: string
  } | null
  transitionNote?: string
  createdAt: string
  updatedAt: string
}

export interface ReadinessRecommendationResponse {
  statusCode: number
  data: ReadinessRecommendation
  message: string
}
