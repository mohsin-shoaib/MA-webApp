export interface ConfirmCycleTransitionDTO {
  cycleName: string
  programId?: number
}

export interface CycleTransition {
  id: number
  athleteId: number
  fromCycleId?: number | null
  toCycleId: number
  programId?: number | null
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  reason?: string | null
  requestedAt: string
  approvedAt?: string | null
  approvedBy?: number | null
  fromCycle?: {
    id: number
    name: string
    description?: string
    duration?: number
  }
  toCycle?: {
    id: number
    name: string
    description?: string
    duration?: number
  }
  program?: {
    id: number
    name: string
    description?: string
    isActive?: boolean
    category?: string
    subCategory?: string
    cycleId?: number
    dailyExercise?: Record<string, unknown>
    alternateExercise?: Record<string, unknown>
  } | null
  createdAt?: string
  updatedAt?: string
}

export interface CycleTransitionResponse {
  statusCode: number
  data: CycleTransition | CycleTransition[]
  message: string
}
