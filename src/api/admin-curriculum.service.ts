import api from './axios'

export type CurriculumItemType = 'WEEKLY_LESSON' | 'PDF' | 'VIDEO' | 'LIVE_CALL'

export interface CurriculumItem {
  id: number
  curriculumKey: string
  type: CurriculumItemType
  title: string
  description: string | null
  url: string | null
  weekIndex: number
  sortOrder: number
  isActive: boolean
  createdAt: string
  updatedAt: string
}

export interface CreateCurriculumItemPayload {
  curriculumKey: string
  type: CurriculumItemType
  title: string
  description?: string
  url?: string
  weekIndex: number
  sortOrder?: number
  isActive?: boolean
}

export interface UpdateCurriculumItemPayload {
  type?: CurriculumItemType
  title?: string
  description?: string
  url?: string
  weekIndex?: number
  sortOrder?: number
  isActive?: boolean
}

export interface EnrolledUser {
  id: number
  userId: number
  enrolledAt: string
  user: {
    id: number
    email: string
    firstName: string | null
    lastName: string | null
  }
}

export interface EnrollmentRequestItem {
  id: number
  userId: number
  curriculumKey: string
  status: string
  createdAt: string
  user: {
    id: number
    email: string
    firstName: string | null
    lastName: string | null
  }
}

export const adminCurriculumService = {
  listItems: (curriculumKey?: string) =>
    api.get<{ statusCode: number; data: CurriculumItem[] }>(
      'admin/curriculum/items',
      curriculumKey ? { params: { curriculumKey } } : undefined
    ),
  getItemById: (id: number) =>
    api.get<{ statusCode: number; data: CurriculumItem }>(
      `admin/curriculum/items/${id}`
    ),
  createItem: (payload: CreateCurriculumItemPayload) =>
    api.post<{ statusCode: number; data: CurriculumItem }>(
      'admin/curriculum/items',
      payload
    ),
  updateItem: (id: number, payload: UpdateCurriculumItemPayload) =>
    api.put<{ statusCode: number; data: CurriculumItem }>(
      `admin/curriculum/items/${id}`,
      payload
    ),
  deleteItem: (id: number) =>
    api.delete<{ statusCode: number; data?: { id: number } }>(
      `admin/curriculum/items/${id}`
    ),
  enrollUser: (userId: number) =>
    api.post<{ statusCode: number; data: unknown }>('admin/curriculum/enroll', {
      userId,
    }),
  listEnrolled: (curriculumKey?: string) =>
    api.get<{ statusCode: number; data: EnrolledUser[] }>(
      'admin/curriculum/enrolled',
      curriculumKey ? { params: { curriculumKey } } : undefined
    ),
  listEnrollmentRequests: (curriculumKey?: string) =>
    api.get<{
      statusCode: number
      data: { requests: EnrollmentRequestItem[] }
    }>(
      'admin/curriculum/enrollment-requests',
      curriculumKey ? { params: { curriculumKey } } : undefined
    ),
}
