import api from './axios'

export interface Announcement {
  id: number
  title: string
  body: string
  type: string
  programId?: number | null
  cycleId?: number | null
  createdById?: number | null
  createdAt?: string
}

export interface AnnouncementListParams {
  page?: number
  limit?: number
  type?: string
}

export interface AnnouncementListResponse {
  statusCode: number
  data: {
    rows: Announcement[]
    meta?: { total: number; page: number; limit: number; pages: number }
  }
}

export const announcementService = {
  /** Admin/Coach: list announcements */
  list: (params?: AnnouncementListParams) =>
    api.get<AnnouncementListResponse>('admin/announcements', { params }),

  /** Admin/Coach: create */
  create: (body: {
    title: string
    body: string
    type: string
    programId?: number
    cycleId?: number
  }) =>
    api.post<{ statusCode: number; data: Announcement }>(
      'admin/announcements',
      body
    ),

  /** Admin/Coach: update */
  update: (
    id: number,
    body: { title?: string; body?: string; type?: string }
  ) =>
    api.put<{ statusCode: number; data: Announcement }>(
      `admin/announcements/${id}`,
      body
    ),

  /** Admin/Coach: delete */
  delete: (id: number) =>
    api.delete<{ statusCode: number }>(`admin/announcements/${id}`),
}

export const athleteAnnouncementService = {
  /** Athlete: list (filter by type, programId, cycleId) */
  list: (params?: {
    type?: string
    programId?: number
    cycleId?: number
    page?: number
    limit?: number
  }) => api.get<AnnouncementListResponse>('athlete/announcements', { params }),
}
