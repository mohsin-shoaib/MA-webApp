import api from './axios'

export interface Test {
  id: number
  name: string
  description?: string | null
  audienceTag?: string | null
  eventCount?: number
  scoringMethod?: string | null
  ageGenderAdjusted?: boolean
  rules?: string | null
  createdAt?: string
}

export interface TestEvent {
  id: number
  testId: number
  name: string
  scoreType?: string | null
  unit?: string | null
  standards?: Record<string, unknown> | null
  order?: number
}

export interface TestLog {
  id: number
  userId: number
  testId: number
  loggedAt: string
  eventScores?: Record<string, number> | null
}

export const adminTestService = {
  list: (params?: { page?: number; limit?: number }) =>
    api.get<{
      statusCode: number
      data: {
        rows: Test[]
        meta?: { total: number; page: number; limit: number; pages: number }
      }
    }>('admin/tests', { params }),

  getById: (id: number) =>
    api.get<{ statusCode: number; data: Test }>(`admin/tests/${id}`),

  create: (body: Partial<Test>) =>
    api.post<{ statusCode: number; data: Test }>('admin/tests', body),

  update: (id: number, body: Partial<Test>) =>
    api.put<{ statusCode: number; data: Test }>(`admin/tests/${id}`, body),

  delete: (id: number) =>
    api.delete<{ statusCode: number }>(`admin/tests/${id}`),

  listEvents: (testId: number) =>
    api.get<{ statusCode: number; data: TestEvent[] }>(
      `admin/tests/${testId}/events`
    ),

  createEvent: (testId: number, body: Partial<TestEvent>) =>
    api.post<{ statusCode: number; data: TestEvent }>(
      `admin/tests/${testId}/events`,
      body
    ),

  updateEvent: (testId: number, eventId: number, body: Partial<TestEvent>) =>
    api.put<{ statusCode: number; data: TestEvent }>(
      `admin/tests/${testId}/events/${eventId}`,
      body
    ),

  deleteEvent: (testId: number, eventId: number) =>
    api.delete<{ statusCode: number }>(
      `admin/tests/${testId}/events/${eventId}`
    ),
}

export const athleteTestService = {
  list: () => api.get<{ statusCode: number; data: Test[] }>('athlete/tests'),

  log: (body: { testId: number; eventScores: Record<string, number> }) =>
    api.post<{ statusCode: number; data: TestLog }>('athlete/tests/log', body),

  history: (params: { testId: number; page?: number; limit?: number }) =>
    api.get<{
      statusCode: number
      data: {
        rows: TestLog[]
        meta?: { total: number; page: number; limit: number; pages: number }
      }
    }>('athlete/tests/history', { params }),
}
