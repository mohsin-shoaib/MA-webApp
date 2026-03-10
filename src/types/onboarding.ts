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

/** Job role options (PDF onboarding step 5) */
export const JOB_ROLE_OPTIONS = [
  { label: 'Active-Duty Military', value: 'ACTIVE_DUTY_MILITARY' },
  { label: 'National Guard / Reserve', value: 'NATIONAL_GUARD_RESERVE' },
  { label: 'Law Enforcement', value: 'LAW_ENFORCEMENT' },
  { label: 'Firefighter', value: 'FIREFIGHTER' },
  { label: 'First Responder', value: 'FIRST_RESPONDER' },
  { label: 'Federal / Government', value: 'FEDERAL_GOVERNMENT' },
  { label: 'Civilian', value: 'CIVILIAN' },
  { label: 'Student', value: 'STUDENT' },
] as const

/** Equipment access (PDF onboarding step 6) - single select */
export const EQUIPMENT_ACCESS_OPTIONS = [
  { label: 'Full Gym', value: 'FULL_GYM' },
  { label: 'Limited Equipment (Dumbbells / Kettlebells)', value: 'LIMITED' },
  { label: 'Minimal Equipment (Bodyweight / Bands)', value: 'MINIMAL' },
  { label: 'Deployed / Field Conditions', value: 'DEPLOYED' },
] as const

// New types for recommendation flow
export interface CreateOnboardingDTO {
  height: number
  weight: number
  age: number
  gender: string
  trainingExperience: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  /** 4-question flow: 120+ day break → Red */
  trainingBreak120Days?: boolean
  primaryGoal: string
  /** Category for event date visibility (e.g. Improve Operational Readiness = no event) */
  primaryGoalCategory?: string
  secondaryGoal?: string
  equipment?: string[]
  /** Single select per PDF */
  equipmentAccess?: 'FULL_GYM' | 'LIMITED' | 'MINIMAL' | 'DEPLOYED'
  eventDate?: string // Used for roadmap generation; required when goal requires event
  job?: string
  /** When true: user selected "Other" for Primary Goal and chose closest option; flag for admin review */
  goalFlaggedForReview?: boolean
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
  /** Red Cycle (3.1): Start date at assignment (ISO date). Defaults to today if omitted. */
  startDate?: string
}

/** Response from POST /athlete/onboarding/confirm (optional; backend may return onboarding + message) */
export interface ConfirmOnboardingResponse {
  statusCode: number
  /** When backend returns 200 for duplicate confirm, data.alreadyConfirmed is true */
  data?: { alreadyConfirmed?: boolean }
  message: string
}
