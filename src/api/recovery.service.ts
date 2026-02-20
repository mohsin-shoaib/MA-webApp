import api from './axios'

export interface RecoveryProtocol {
  id: number
  name: string
  description?: string | null
  content?: string | null
  createdById?: number | null
  approvedById?: number | null
  isActive?: boolean
  createdAt?: string
}

export const adminRecoveryService = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<{
      statusCode: number
      data: {
        rows: RecoveryProtocol[]
        meta?: { total: number; page: number; limit: number; pages: number }
      }
    }>('admin/recovery', { params }),

  create: (body: { name: string; description?: string; content?: string }) =>
    api.post<{ statusCode: number; data: RecoveryProtocol }>(
      'admin/recovery',
      body
    ),

  approve: (id: number) =>
    api.post<{ statusCode: number; data: RecoveryProtocol }>(
      `admin/recovery/${id}/approve`
    ),

  update: (
    id: number,
    body: {
      name?: string
      description?: string
      content?: string
      isActive?: boolean
    }
  ) =>
    api.patch<{ statusCode: number; data: RecoveryProtocol }>(
      `admin/recovery/${id}`,
      body
    ),
}

export const athleteRecoveryService = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<{
      statusCode: number
      data: {
        rows: RecoveryProtocol[]
        meta?: { total: number; page: number; limit: number; pages: number }
      }
    }>('athlete/recovery', { params }),
}
