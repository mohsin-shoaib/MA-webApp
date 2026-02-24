import api from './axios'
import type { Test, TestLog } from '@/types/tests'

interface ListTestsResponse {
  statusCode: number
  data: Test[]
  message?: string
}

interface TestResponse {
  statusCode: number
  data: Test
  message?: string
}

interface LogResponse {
  statusCode: number
  data: TestLog
  message?: string
}

interface HistoryResponse {
  statusCode: number
  data: TestLog[]
  message?: string
}

export const testsService = {
  listTests: () => api.get<ListTestsResponse>('athlete/tests'),

  getTest: (testId: number) => api.get<TestResponse>(`athlete/tests/${testId}`),

  logScore: (body: {
    testId: number
    eventScores: Record<string, number | string>
    totalScore?: number
    passed?: boolean
  }) => api.post<LogResponse>('athlete/tests/log', body),

  getMyHistory: (testId?: number) =>
    api.get<HistoryResponse>('athlete/tests/my/history', {
      params: testId != null ? { testId } : {},
    }),
}
