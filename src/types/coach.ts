import type { User } from './admin'

export interface GetAthletesResponse {
  statusCode: number
  status: string
  data: {
    rows: User[]
    meta: {
      total: number
      page: number
      pageSize: number
      pages: number
    }
  }
  message: string
}

export interface GetCoachesResponse {
  statusCode: number
  status: string
  data: {
    rows: User[]
    meta: {
      total: number
      page: number
      pageSize: number
      pages: number
    }
  }
  message: string
}
