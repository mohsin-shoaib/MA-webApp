export const Category = {
  TacticalSelectionSchool: 'TacticalSelectionSchool',
  CompetitionPerformance: 'CompetitionPerformance',
  ImproveOperationalReadiness: 'ImproveOperationalReadiness',
} as const

export type Category = (typeof Category)[keyof typeof Category]

/** Primary Goal display labels (same as onboarding; do not use legacy "Selection, School, Competition, Personal"). */
export const CATEGORY_LABELS: Record<Category, string> = {
  TacticalSelectionSchool: 'Tactical Selection / School',
  CompetitionPerformance: 'Competition / Performance',
  ImproveOperationalReadiness: 'Improve Operational Readiness',
}

export interface GoalType extends Record<string, unknown> {
  id: number
  category: Category
  subCategory: string
  description?: string
  createdAt: string
  updatedAt: string
}

export interface CreateGoalTypeDTO {
  category: Category
  subCategory: string
  description?: string
}

export interface UpdateGoalTypeDTO {
  category?: Category
  subCategory?: string
  description?: string
}

export interface GetGoalTypeQueryDTO {
  page?: number
  limit?: number
  q?: string
  category?: Category
  sortBy?: string
  sortOrder?: 'ASC' | 'DESC'
  createdAtFrom?: string
  createdAtTo?: string
  updatedAtFrom?: string
  updatedAtTo?: string
}

export interface GetGoalTypesResponse {
  status: string
  statusCode: number
  message: string
  data: {
    rows: GoalType[]
    meta: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }
}

export interface GetGoalTypeResponse {
  status: string
  statusCode: number
  message: string
  data: GoalType
}

export interface CreateGoalTypeResponse {
  status: string
  statusCode: number
  message: string
  data: GoalType
}

export interface UpdateGoalTypeResponse {
  status: string
  statusCode: number
  message: string
  data: GoalType
}
