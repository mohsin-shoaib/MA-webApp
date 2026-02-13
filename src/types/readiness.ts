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
