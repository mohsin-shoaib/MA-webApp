import type {
  RoadmapProps,
  RoadmapResponse,
  GenerateRoadmapDTO,
  RoadmapResponseV2,
} from '@/types/roadmap'
import api from './axios'

export const roadmapService = {
  // Legacy method - kept for backward compatibility
  generateRoadmap: (payload: RoadmapProps) =>
    api.post<RoadmapResponse>('athlete/roadmap/generate', payload),

  // New methods for recommendation flow
  /**
   * Get current roadmap for authenticated athlete
   */
  getRoadmap: () => api.get<RoadmapResponseV2>('athlete/roadmap'),

  /**
   * Generate or regenerate roadmap
   */
  generateRoadmapV2: (data?: GenerateRoadmapDTO) =>
    api.post<RoadmapResponseV2>('athlete/roadmap/generate', data || {}),

  /**
   * Get roadmap by user ID
   */
  getRoadmapByUserId: (userId: number) =>
    api.get<RoadmapResponseV2>(`athlete/roadmap/find-by-id/${userId}`),
}
