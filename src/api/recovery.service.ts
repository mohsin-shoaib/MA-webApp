import api from './axios'
import type { RecoveryProtocol, RecoverySession } from '@/types/recovery'

interface ListProtocolsResponse {
  statusCode: number
  data: RecoveryProtocol[]
  message?: string
}

interface SessionsResponse {
  statusCode: number
  data: RecoverySession[]
  message?: string
}

interface SingleSessionResponse {
  statusCode: number
  data: RecoverySession
  message?: string
}

export const recoveryService = {
  listProtocols: () =>
    api.get<ListProtocolsResponse>('athlete/recovery/protocols'),

  getSessions: (params: { date?: string; from?: string; to?: string }) =>
    api.get<SessionsResponse>('athlete/recovery/sessions', { params }),

  createSession: (body: {
    recoveryProtocolId: number
    scheduledDate: string
  }) => api.post<SingleSessionResponse>('athlete/recovery/sessions', body),

  updateSession: (id: number, body: { status?: string }) =>
    api.patch<SingleSessionResponse>(`athlete/recovery/sessions/${id}`, body),

  deleteSession: (id: number) =>
    api.delete<{ statusCode: number; data: { id: number }; message?: string }>(
      `athlete/recovery/sessions/${id}`
    ),
}
