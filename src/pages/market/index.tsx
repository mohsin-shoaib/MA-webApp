/**
 * Market tab (PRD 7.5, 13.4.1) — Static content: PDFs, masterclasses, videos.
 * Shows assigned items and published catalog; download/view when filePath exists.
 */
import { useState, useEffect } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import { Icon } from '@/components/Icon'
import { marketplaceService } from '@/api/marketplace.service'
import type {
  MarketplaceItemAssigned,
  MarketplaceItemBase,
} from '@/api/marketplace.service'

const TYPE_LABELS: Record<string, string> = {
  PDF: 'PDF',
  VIDEO: 'Video',
  GUIDE: 'Guide',
  MASTERCLASS: 'Masterclass',
}

export default function MarketPage() {
  const [loading, setLoading] = useState(true)
  const [assigned, setAssigned] = useState<MarketplaceItemAssigned[]>([])
  const [catalog, setCatalog] = useState<MarketplaceItemBase[]>([])

  useEffect(() => {
    Promise.all([marketplaceService.list(), marketplaceService.catalog()])
      .then(([listRes, catalogRes]) => {
        if (listRes.data?.statusCode === 200 && listRes.data?.data?.items) {
          setAssigned(
            (listRes.data.data.items as MarketplaceItemAssigned[]) ?? []
          )
        }
        if (
          catalogRes.data?.statusCode === 200 &&
          catalogRes.data?.data?.items
        ) {
          setCatalog(catalogRes.data.data.items ?? [])
        }
      })
      .catch(() => {
        setAssigned([])
        setCatalog([])
      })
      .finally(() => setLoading(false))
  }, [])

  const assignedIds = new Set(assigned.map(i => i.id))
  const catalogOnly = catalog.filter(i => !assignedIds.has(i.id))

  const isEmpty = !loading && assigned.length === 0 && catalogOnly.length === 0
  const showList = !loading && !isEmpty

  return (
    <div className="space-y-6 max-w-4xl">
      <Text variant="primary" className="text-2xl font-semibold">
        Market
      </Text>
      <Text variant="secondary" className="block">
        Guides, masterclasses, and tools assigned by your coach or available in
        the catalog. Programs are in Train → Program browser.
      </Text>

      <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="store" family="solid" size={20} />
          <Text variant="default" className="font-semibold text-gray-800">
            My items
          </Text>
        </div>
        {loading && (
          <div className="flex items-center gap-2 py-4">
            <Spinner size="small" variant="primary" />
            <Text variant="secondary">Loading...</Text>
          </div>
        )}
        {isEmpty && (
          <div className="space-y-3">
            <Text variant="secondary" className="text-sm">
              No marketplace items yet. Your coach or admin can assign items to
              you; featured guides and masterclasses will also appear here.
            </Text>
          </div>
        )}
        {showList && (
          <ul className="space-y-3">
            {assigned.map(item => (
              <li
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50"
              >
                <div>
                  <Text variant="default" className="font-medium">
                    {item.title}
                  </Text>
                  <Text variant="secondary" className="text-sm">
                    {TYPE_LABELS[item.type] ?? item.type}
                    {item.description && ` · ${item.description}`}
                  </Text>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                    Assigned
                  </span>
                  {item.filePath && (
                    <a
                      href={item.filePath}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                    >
                      {item.type === 'VIDEO' ? 'Watch' : 'Open'}
                    </a>
                  )}
                </div>
              </li>
            ))}
            {catalogOnly.map(item => (
              <li
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50"
              >
                <div>
                  <Text variant="default" className="font-medium">
                    {item.title}
                  </Text>
                  <Text variant="secondary" className="text-sm">
                    {TYPE_LABELS[item.type] ?? item.type}
                    {item.description && ` · ${item.description}`}
                  </Text>
                </div>
                {item.filePath ? (
                  <a
                    href={item.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                  >
                    View
                  </a>
                ) : (
                  <Text variant="muted" className="text-xs">
                    In catalog
                  </Text>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
