import api from './axios'

export type CurriculumItemType = 'WEEKLY_LESSON' | 'PDF' | 'VIDEO'

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

export const adminCurriculumService = {
  listItems: (curriculumKey?: string) =>
    api.get<{ statusCode: number; data: CurriculumItem[] }>(
      'admin/curriculum/items/list',
      curriculumKey ? { params: { curriculumKey } } : undefined
    ),
  getItemById: (id: number) =>
    api.get<{ statusCode: number; data: CurriculumItem }>(
      `admin/curriculum/find-by-id/${id}`
    ),
  createItem: (payload: CreateCurriculumItemPayload) =>
    api.post<{ statusCode: number; data: CurriculumItem }>(
      'admin/curriculum/items/create',
      payload
    ),
  updateItem: (id: number, payload: UpdateCurriculumItemPayload) =>
    api.put<{ statusCode: number; data: CurriculumItem }>(
      `admin/curriculum/update-by-id/${id}`,
      payload
    ),
  deleteItem: (id: number) =>
    api.delete<{ statusCode: number; data?: { id: number } }>(
      `admin/curriculum/delete-by-id/${id}`
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
}
