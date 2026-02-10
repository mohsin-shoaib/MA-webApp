export interface ReadinessProps {
  trainingExperience: string
  primaryGoal: string
  testDate: string
}

export interface ReadinessResponse {
  data: {
    cycle: {
      recommendedCycle: string
    }
  }
}
