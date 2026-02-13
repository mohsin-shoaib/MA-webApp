import type {
  ConfirmProps,
  ConfirmResponse,
  ReadinessProps,
  RecommendationResponse,
  SelectionProps,
} from '@/types/readiness'
import api from './axios'

export const readinessService = {
  readinessRecommendation: (payload: ReadinessProps) =>
    api.post<RecommendationResponse>('cycle/readiness/recommendation', payload),

  confirmation: (payload: ConfirmProps) =>
    api.post<ConfirmResponse>('cycle/confirm', payload),

  readinessSelection: (payload: SelectionProps) =>
    api.post<ConfirmResponse>('cycle/readiness/selection', payload),
}
