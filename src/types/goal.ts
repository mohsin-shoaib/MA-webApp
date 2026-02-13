export interface Goal extends Record<string, unknown> {
  id: number
  goalTypeId: number
  goalType?: {
    id: number
    category: string
    subCategory: string
    description?: string
  }
  name: string
  createdAt?: string
  updatedAt?: string
}

export interface CreateGoalDTO {
  goalTypeId: number
  name: string
}

export interface UpdateGoalDTO {
  name: string
}

export interface GetGoalsResponse {
  status: string
  statusCode: number
  message: string
  data: {
    rows: Goal[]
    meta: {
      total: number
      page: number
      limit: number
      totalPages: number
    }
  }
}

export interface GetGoalResponse {
  status: string
  statusCode: number
  message: string
  data: Goal
}

export interface CreateGoalResponse {
  status: string
  statusCode: number
  message: string
  data: Goal
}

export interface UpdateGoalResponse {
  status: string
  statusCode: number
  message: string
  data: Goal
}
