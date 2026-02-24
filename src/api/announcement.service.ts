import api from './axios'

export type AnnouncementType = 'GLOBAL' | 'PROGRAM' | 'CYCLE' | 'COACH_GROUP'

export interface AdminAnnouncement {
  id: number
  targetType: AnnouncementType
  title: string
  message: string
  programId: number | null
  cycleId: number | null
  coachId: number | null
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
  targetType: AnnouncementType
  title: string
  message: string
  programId?: number | null
  cycleId?: number | null
  coachId?: number | null
}

export interface UpdateAnnouncementPayload {
  targetType?: AnnouncementType
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
      `find-by-id/${id}`
    ),
  create: (payload: CreateAnnouncementPayload) =>
    api.post<{ statusCode: number; data: AdminAnnouncement }>(
      'announcements/create',
      payload
    ),
  update: (id: number, payload: UpdateAnnouncementPayload) =>
    api.put<{ statusCode: number; data: AdminAnnouncement }>(
      `update-by-id/${id}`,
      payload
    ),
  delete: (id: number) =>
    api.delete<{ statusCode: number; data?: { id: number } }>(
      `admin/announcements/${id}`
    ),
}
