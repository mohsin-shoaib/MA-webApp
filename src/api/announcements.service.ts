import api from './axios'

export interface AnnouncementItem {
  id: number
  type: string
  title: string
  body: string
  createdAt: string
  target?: string
  readAt?: string | null
}

export const announcementsService = {
  list: () =>
    api.get<{ statusCode: number; data: AnnouncementItem[] }>(
      'athlete/announcements'
    ),
  markAsRead: (announcementId: number) =>
    api.post<{ statusCode: number; data?: { ok: boolean } }>(
      `athlete/announcements/${announcementId}/read`
    ),
}
