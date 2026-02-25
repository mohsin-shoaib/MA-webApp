import api from './axios'
import type {
  MarketplaceItemWithCreator,
  ListMarketplaceResponse,
  AssignMarketplacePayload,
} from '@/types/marketplace'

export interface AdminMarketplaceCreatePayload {
  title: string
  description?: string
  type: string
  filePath?: string
}

export interface AdminMarketplaceUpdatePayload {
  title?: string
  description?: string
  type?: string
  filePath?: string
}

export const adminMarketplaceService = {
  list: (params?: { type?: string; published?: boolean }) =>
    api.get<ListMarketplaceResponse>('admin/marketplace', {
      params: {
        ...(params?.type && { type: params.type }),
        ...(params?.published !== undefined && { published: params.published }),
      },
    }),

  create: (payload: AdminMarketplaceCreatePayload) =>
    api.post<{ statusCode: number; data: MarketplaceItemWithCreator }>(
      'admin/marketplace',
      payload
    ),

  update: (id: number, payload: AdminMarketplaceUpdatePayload) =>
    api.patch<{ statusCode: number; data: MarketplaceItemWithCreator }>(
      `admin/marketplace/${id}`,
      payload
    ),

  publish: (id: number) =>
    api.patch<{ statusCode: number; data: MarketplaceItemWithCreator }>(
      `admin/marketplace/${id}/publish`
    ),

  unpublish: (id: number) =>
    api.patch<{ statusCode: number; data: MarketplaceItemWithCreator }>(
      `admin/marketplace/${id}/unpublish`
    ),

  assign: (id: number, payload: AssignMarketplacePayload) =>
    api.post<{ statusCode: number; data: { assigned: number } }>(
      `admin/marketplace/${id}/assign`,
      payload
    ),

  delete: (id: number) =>
    api.delete<{ statusCode: number; data: { id: number } }>(
      `admin/marketplace/${id}`
    ),
}
