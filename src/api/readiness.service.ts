import type {
  ConfirmProps,
  ConfirmResponse,
  ReadinessProps,
  ReadinessResponse,
  SelectionProps,
} from '@/types/readiness'
import api from './axios'

export const readinessService = {
  readinessRecommendation: (payload: ReadinessProps) =>
    api.post<ReadinessResponse>('cycle/readiness/recommendation', payload),

  confirmation: (payload: ConfirmProps) =>
    api.post<ConfirmResponse>('cycle/confirm', payload),

  readinessSelection: (payload: SelectionProps) =>
    api.post<ConfirmResponse>('cycle/readiness/selection', payload),
}
