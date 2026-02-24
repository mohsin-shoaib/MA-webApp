/** Marketplace item types (PRD 7.5: PDFs, masterclasses, videos, guides). */
export type MarketplaceItemType = 'PDF' | 'VIDEO' | 'GUIDE' | 'MASTERCLASS'

export interface MarketplaceItemBase {
  id: number
  title: string
  description?: string | null
  type: MarketplaceItemType
  filePath?: string | null
  isPublished?: boolean
  createdAt?: string
  updatedAt?: string
}

export interface MarketplaceItemWithCreator extends MarketplaceItemBase {
  createdBy?: {
    id: number
    firstName?: string | null
    lastName?: string | null
  } | null
}

/** Athlete view: assigned items include assignedAt and assigned flag. */
export interface MarketplaceItemAssigned extends MarketplaceItemBase {
  assignedAt?: string
  assigned?: boolean
}

export interface ListMarketplaceResponse {
  statusCode: number
  status: string
  data: { items: MarketplaceItemWithCreator[] | MarketplaceItemAssigned[] }
  message: string
}

export interface CatalogMarketplaceResponse {
  statusCode: number
  status: string
  data: { items: MarketplaceItemBase[] }
  message: string
}

export interface AssignMarketplacePayload {
  userIds: number[]
}
