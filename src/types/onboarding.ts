export interface EquipmentAvailability {
  available: string[]
}

// Legacy types - kept for backward compatibility
export interface OnboardingProps {
  height: number
  weight: number
  age: number
  gender: string
  trainingExperience: string
  primaryGoal: string
  secondaryGoal?: string
  equipment: string[]
  testDate?: string // ISO date string (YYYY-MM-DD) - deprecated, use eventDate
  eventDate?: string // ISO date string (YYYY-MM-DD) - used for roadmap generation
}

export interface OnboardingResponse {
  data: {
    onboarding: {
      id: number
      height: number
      weight: number
      age: number
      gender: string
      trainingExperience: string
      primaryGoal: string
      secondaryGoal: string
      equipment: string[]
      testDate: string
      userId: number
    }
  }
}

// New types for recommendation flow
export interface CreateOnboardingDTO {
  height: number
  weight: number
  age: number
  gender: string
  trainingExperience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  primaryGoal: string
  secondaryGoal: string
  equipment?: string[]
  eventDate?: string // Used for roadmap generation
  job?: string
}

export interface UpdateOnboardingDTO {
  height?: number
  weight?: number
  age?: number
  gender?: string
  trainingExperience?: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  primaryGoal?: string
  secondaryGoal?: string
  equipment?: string[]
  eventDate?: string // Used for roadmap generation
  job?: string
}

// Enhanced OnboardingResponse for new API structure
export interface OnboardingResponseV2 {
  statusCode: number
  data: {
    id: number
    height: number
    weight: number
    age: number
    gender: string
    trainingExperience: string
    primaryGoal: string
    secondaryGoal: string
    equipment?: string[]
    testDate?: string
    eventDate?: string
    job?: string
    userId: number
    createdAt: string
    updatedAt: string
  }
  message: string
}

/** Payload for defer-save: confirm onboarding (create + recommendation + roadmap + transition) in one call */
export interface ConfirmOnboardingPayload {
  onboarding: CreateOnboardingDTO
  cycleName: string
  programId?: number
}

/** Response from POST /athlete/onboarding/confirm (optional; backend may return onboarding + message) */
export interface ConfirmOnboardingResponse {
  statusCode: number
  /** When backend returns 200 for duplicate confirm, data.alreadyConfirmed is true */
  data?: { alreadyConfirmed?: boolean }
  message: string
}
