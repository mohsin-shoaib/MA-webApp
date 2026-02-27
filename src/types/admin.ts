export interface User extends Record<string, unknown> {
  id: string | number
  email: string
  name?: string
  firstName?: string
  lastName?: string
  role: string
  profilePicture?: string
  createdAt?: string
  updatedAt?: string
  isActive?: boolean
  referralCode?: string
}

export interface GetUsersResponse {
  statusCode: number
  status: string
  data: {
    rows: User[]
    meta: {
      total: number
      page: number
      limit: number
      pages: number
    }
  }
  message: string
}

export interface UpdateUserRoleProps {
  role: string
}

export interface UpdateUserRoleResponse {
  statusCode: number
  status: string
  data: {
    user: User
  }
  message: string
}

/** Onboarding row when flagged for review (user selected "Other" goal and chose closest option) */
export interface FlaggedOnboarding {
  id: number
  height: number
  weight: number
  age: number
  gender: string
  trainingExperience: string
  primaryGoal: string
  primaryGoalCategory?: string | null
  eventDate?: string | null
  job?: string | null
  goalFlaggedForReview: boolean
  userId: number
  user?: {
    id: number
    firstName?: string | null
    lastName?: string | null
    email: string
    role: string
    createdAt?: string
  }
}

export interface GetFlaggedOnboardingsResponse {
  statusCode: number
  status: string
  data: { rows: FlaggedOnboarding[]; total: number }
  message: string
}

export interface ClearOnboardingFlagResponse {
  statusCode: number
  status: string
  data: { id: number; goalFlaggedForReview: boolean }
  message: string
}
