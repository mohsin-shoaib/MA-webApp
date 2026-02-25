import api from './axios'

export type AnnouncementType =
  | 'GLOBAL'
  | 'PROGRAM'
  | 'CYCLE'
  | 'COACH_TO_ATHLETES'

export interface AdminAnnouncement {
  id: number
  type: AnnouncementType
  title: string
  body: string
  programId: number | null
  cycleId: number | null
  createdById: number
  createdAt: string
  updatedAt: string
  program?: { id: number; name: string } | null
  cycle?: { id: number; name: string } | null
  createdBy?: {
    id: number
    email: string
    firstName: string | null
    lastName: string | null
  }
}

export interface CreateAnnouncementPayload {
  type: AnnouncementType
  title: string
  body: string
  programId?: number
  cycleId?: number
}

export interface UpdateAnnouncementPayload {
  type?: AnnouncementType
  title?: string
  body?: string
  programId?: number | null
  cycleId?: number | null
}

export const adminAnnouncementsService = {
  list: () =>
    api.get<{ statusCode: number; data: AdminAnnouncement[] }>(
      'admin/announcements'
    ),
  getById: (id: number) =>
    api.get<{ statusCode: number; data: AdminAnnouncement }>(
      `admin/announcements/${id}`
    ),
  create: (payload: CreateAnnouncementPayload) =>
    api.post<{ statusCode: number; data: AdminAnnouncement }>(
      'admin/announcements/create',
      payload
    ),
  update: (id: number, payload: UpdateAnnouncementPayload) =>
    api.put<{ statusCode: number; data: AdminAnnouncement }>(
      `admin/announcements/${id}`,
      payload
    ),
  delete: (id: number) =>
    api.delete<{ statusCode: number; data?: { id: number } }>(
      `admin/announcements/${id}`
    ),
}
