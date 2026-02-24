import api from './axios'
import type {
  ListMarketplaceResponse,
  AssignMarketplacePayload,
} from '@/types/marketplace'

export interface CoachMarketplaceCreatePayload {
  title: string
  description?: string
  type: string
  filePath?: string
}

export const coachMarketplaceService = {
  list: () => api.get<ListMarketplaceResponse>('coach/marketplace'),

  create: (payload: CoachMarketplaceCreatePayload) =>
    api.post<{ statusCode: number; data: Record<string, unknown> }>(
      'coach/marketplace',
      payload
    ),

  assign: (id: number, payload: AssignMarketplacePayload) =>
    api.post<{ statusCode: number; data: { assigned: number } }>(
      `coach/marketplace/${id}/assign`,
      payload
    ),
}
