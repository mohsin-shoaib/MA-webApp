import api from './axios'

export interface MarketplaceItem {
  id: number
  title: string
  description?: string
  type: string
  assigned?: boolean
}

export const marketplaceService = {
  list: () =>
    api.get<{ statusCode: number; data: MarketplaceItem[] }>(
      'athlete/marketplace'
    ),
}
