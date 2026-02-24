/** PRD 5: Athlete goal/event with type and optional date */
export interface AthleteGoal {
  id: number
  userId: number
  goalTypeId: number
  eventDate: string | null
  isPrimary: boolean
  effectiveFrom: string | null
  createdAt: string
  updatedAt: string
  goalType: {
    id: number
    category: string
    subCategory: string
    description?: string
  }
}

export interface CreateAthleteGoalDTO {
  goalTypeId: number
  eventDate?: string
  isPrimary?: boolean
}

export interface UpdateAthleteGoalDTO {
  goalTypeId?: number
  eventDate?: string
  isPrimary?: boolean
}

/** PRD 5.3: When to apply primary goal change */
export type SetPrimaryWhen = 'now' | 'end_of_block' | 'date'

export interface SetPrimaryGoalDTO {
  when: SetPrimaryWhen
  effectiveDate?: string
}

export interface AthleteGoalsResponse {
  statusCode: number
  data: AthleteGoal[]
  message: string
}

export interface AthleteGoalResponse {
  statusCode: number
  data: AthleteGoal
  message: string
}
