import type {
  EvaluateReadinessDTO,
  ReadinessRecommendationResponse,
} from '@/types/readiness'
import api from './axios'

export const readinessService = {
  // New methods for recommendation flow
  /**
   * Get current readiness recommendation for authenticated athlete
   */
  getReadinessRecommendation: () =>
    api.get<ReadinessRecommendationResponse>(
      'athlete/readiness/recommendation'
    ),

  /**
   * Evaluate readiness with custom inputs (preview mode)
   */
  evaluateReadiness: (data: EvaluateReadinessDTO) =>
    api.post<ReadinessRecommendationResponse>(
      'athlete/readiness/evaluate',
      data
    ),
}
