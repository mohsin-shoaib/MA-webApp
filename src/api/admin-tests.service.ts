import api from './axios'
import type { Test } from '@/types/tests'

interface ListResponse {
  statusCode: number
  data: Test[]
  message?: string
}

interface SingleResponse {
  statusCode: number
  data: Test
  message?: string
}

const base = 'admin/tests'

export const adminTestsService = {
  list: () => api.get<ListResponse>(base),
  getOne: (id: number) => api.get<SingleResponse>(`${base}/${id}`),
  create: (body: {
    name: string
    description?: string
    audienceTag?: string
    scoringMethod: string
    ageGenderAdjusted?: boolean
    rules?: string
  }) => api.post<SingleResponse>(base, body),
  update: (
    id: number,
    body: {
      name?: string
      description?: string
      audienceTag?: string
      scoringMethod?: string
      ageGenderAdjusted?: boolean
      rules?: string
      isActive?: boolean
    }
  ) => api.patch<SingleResponse>(`${base}/${id}`, body),
  delete: (id: number) =>
    api.delete<{ statusCode: number; data: { id: number }; message?: string }>(
      `${base}/${id}`
    ),
  createEvent: (
    testId: number,
    body: {
      name: string
      scoreType: string
      unit: string
      orderIndex: number
      minValue?: number
      maxValue?: number
      pointScale?: unknown
    }
  ) => api.post<SingleResponse>(`${base}/${testId}/events`, body),
  updateEvent: (
    testId: number,
    eventId: number,
    body: {
      name?: string
      scoreType?: string
      unit?: string
      orderIndex?: number
      minValue?: number
      maxValue?: number
      pointScale?: unknown
    }
  ) => api.patch<SingleResponse>(`${base}/${testId}/events/${eventId}`, body),
  deleteEvent: (testId: number, eventId: number) =>
    api.delete<{ statusCode: number; data: { id: number }; message?: string }>(
      `${base}/${testId}/events/${eventId}`
    ),
  createStandard: (
    testId: number,
    body: {
      name?: string
      minAge?: number
      maxAge?: number
      gender?: string
      criteria?: unknown
    }
  ) => api.post<SingleResponse>(`${base}/${testId}/standards`, body),
  updateStandard: (
    testId: number,
    standardId: number,
    body: {
      name?: string
      minAge?: number
      maxAge?: number
      gender?: string
      criteria?: unknown
    }
  ) =>
    api.patch<SingleResponse>(
      `${base}/${testId}/standards/${standardId}`,
      body
    ),
  deleteStandard: (testId: number, standardId: number) =>
    api.delete<{ statusCode: number; data: { id: number }; message?: string }>(
      `${base}/${testId}/standards/${standardId}`
    ),
}
