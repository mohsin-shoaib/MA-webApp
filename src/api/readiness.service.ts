import type { ReadinessProps, ReadinessResponse } from '@/types/readiness'
import api from './axios'

export const readinessService = {
  readinessRecommendation: (payload: ReadinessProps) =>
    api.post<ReadinessResponse>('cycle/readiness/recommendation', payload),
}
