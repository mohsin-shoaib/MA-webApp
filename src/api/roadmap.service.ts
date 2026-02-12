import type { RoadmapProps, RoadmapResponse } from '@/types/roadmap'
import api from './axios'

export const roadmapService = {
  generateRoadmap: (payload: RoadmapProps) =>
    api.post<RoadmapResponse>('athlete/roadmap/generate', payload),
}
