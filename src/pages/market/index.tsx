/**
 * Market tab (PRD 7.5) — Items for purchase/download: guides, masterclasses, tools.
 * Programs are in Program System; Market = static content (PDFs, videos).
 */
import { useState, useEffect } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { marketplaceService } from '@/api/marketplace.service'
import type { MarketplaceItem } from '@/api/marketplace.service'

export default function MarketPage() {
  const [loading, setLoading] = useState(true)
  const [items, setItems] = useState<MarketplaceItem[]>([])

  useEffect(() => {
    marketplaceService
      .list()
      .then(res => {
        if (res.data?.statusCode === 200 && Array.isArray(res.data.data)) {
          setItems(res.data.data)
        }
      })
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="space-y-6 max-w-4xl">
      <Text variant="primary" className="text-2xl font-semibold">
        Market
      </Text>
      <Text variant="secondary" className="block">
        Guides, masterclasses, and tools available for purchase or assigned by
        your coach. Programs are in Train → Program browser.
      </Text>

      <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="store" family="solid" size={20} />
          <Text variant="default" className="font-semibold text-gray-800">
            Available items
          </Text>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 py-4">
            <Spinner size="small" variant="primary" />
            <Text variant="secondary">Loading...</Text>
          </div>
        ) : items.length === 0 ? (
          <div className="space-y-3">
            <Text variant="secondary" className="text-sm">
              No marketplace items yet. Featured guides, nutrition guides,
              masterclasses, and additional tools will appear here. Coach/Admin
              can also assign items to you at no cost.
            </Text>
            <Text variant="muted" className="text-xs">
              Apply for 1:1 coaching from the Market when that option is
              available.
            </Text>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map(item => (
              <li
                key={item.id}
                className="flex items-center justify-between p-3 rounded-lg border border-gray-200 bg-gray-50/50"
              >
                <div>
                  <Text variant="default" className="font-medium">
                    {item.title}
                  </Text>
                  {item.description && (
                    <Text variant="secondary" className="text-sm">
                      {item.description}
                    </Text>
                  )}
                </div>
                {item.assigned ? (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-medium">
                    Assigned
                  </span>
                ) : (
                  <Button type="button" variant="secondary" size="small">
                    Get
                  </Button>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
