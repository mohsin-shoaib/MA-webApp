export interface EquipmentAvailability {
  available: string[]
}

export interface OnboardingProps {
  height: number
  weight: number
  age: number
  gender: string
  trainingExperience: string
  primaryGoal: string
  secondaryGoal?: string
  equipment: string[]
  testDate: string // ISO date string (YYYY-MM-DD)
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
