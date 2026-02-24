import api from './axios'
import type {
  ListMarketplaceResponse,
  CatalogMarketplaceResponse,
} from '@/types/marketplace'

/** Athlete: my assigned items (PRD 13.4.1). Response: data.data.items */
export const marketplaceService = {
  list: () => api.get<ListMarketplaceResponse>('athlete/marketplace'),

  /** Published catalog for browse. Response: data.data.items */
  catalog: () =>
    api.get<CatalogMarketplaceResponse>('athlete/marketplace/catalog'),
}

export type {
  MarketplaceItemAssigned,
  MarketplaceItemBase,
} from '@/types/marketplace'
