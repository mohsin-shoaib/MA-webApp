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

  /**
   * Get presigned URL for an item's file (view or download).
   * Use for View (open in new tab) or Download (attachment).
   */
  getFileUrl: (itemId: number, download?: boolean) =>
    api.get<{ statusCode: number; data: { url: string } }>(
      `athlete/marketplace/items/${itemId}/file-url`,
      { params: download ? { download: 'true' } : {} }
    ),
}

export type {
  MarketplaceItemAssigned,
  MarketplaceItemBase,
} from '@/types/marketplace'
