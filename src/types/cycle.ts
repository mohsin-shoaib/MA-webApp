export interface Cycle extends Record<string, unknown> {
  id: number
  name: string
  description?: string
  duration: number
  createdAt: string
  updatedAt: string
}

export interface GetCyclesResponse {
  statusCode: number
  status: string
  data: Cycle[]
  message: string
}
