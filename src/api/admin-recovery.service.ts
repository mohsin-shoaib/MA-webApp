import api from './axios'
import type { RecoveryProtocolWithCreator } from '@/types/recovery'

interface ListResponse {
  statusCode: number
  data: RecoveryProtocolWithCreator[]
  message?: string
}

interface SingleResponse {
  statusCode: number
  data: RecoveryProtocolWithCreator
  message?: string
}

export const adminRecoveryService = {
  /** GET /admin/recovery-protocol/list */
  list: () => api.get<ListResponse>('admin/recovery-protocol/list'),

  /** GET /admin/recovery-protocol/:id */
  getOne: (id: number) =>
    api.get<SingleResponse>(`admin/recovery-protocol/${id}`),

  /** POST /admin/recovery-protocol/create */
  create: (body: {
    name: string
    description?: string
    type: string
    content?: unknown
    isPublished?: boolean
  }) => api.post<SingleResponse>('admin/recovery-protocol/create', body),

  /** PATCH /admin/recovery-protocol/update/:id */
  update: (
    id: number,
    body: {
      name?: string
      description?: string
      type?: string
      content?: unknown
      isPublished?: boolean
    }
  ) => api.patch<SingleResponse>(`admin/recovery-protocol/update/${id}`, body),

  /** DELETE /admin/recovery-protocol/:id */
  delete: (id: number) =>
    api.delete<{ statusCode: number; data: { id: number }; message?: string }>(
      `admin/recovery-protocol/${id}`
    ),
}
