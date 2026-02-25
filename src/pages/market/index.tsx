/**
 * Market tab (PRD 7.5, 13.4.1) — Static content: PDFs, masterclasses, videos.
 * Shows assigned + catalog; View/Download use presigned URLs.
 */
import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { Dropdown } from '@/components/Dropdown'
import { marketplaceService } from '@/api/marketplace.service'
import type {
  MarketplaceItemAssigned,
  MarketplaceItemBase,
} from '@/api/marketplace.service'
import { athleteCoachService } from '@/api/athlete-coach.service'
import { curriculumHubService } from '@/api/curriculum-hub.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { AxiosError } from 'axios'

const TYPE_LABELS: Record<string, string> = {
  PDF: 'PDF',
  VIDEO: 'Video',
  GUIDE: 'Guide',
  MASTERCLASS: 'Masterclass',
}

const TYPE_OPTIONS = [
  { value: '', label: 'All types' },
  { value: 'PDF', label: 'PDF' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'GUIDE', label: 'Guide' },
  { value: 'MASTERCLASS', label: 'Masterclass' },
]

const TYPE_ICON: Record<string, string> = {
  PDF: 'file-pdf',
  VIDEO: 'video',
  GUIDE: 'book',
  MASTERCLASS: 'graduation-cap',
}

type MarketItem = (MarketplaceItemAssigned | MarketplaceItemBase) & {
  assigned?: boolean
}

export default function MarketPage() {
  const [loading, setLoading] = useState(true)
  const [assigned, setAssigned] = useState<MarketplaceItemAssigned[]>([])
  const [catalog, setCatalog] = useState<MarketplaceItemBase[]>([])
  const [filterType, setFilterType] = useState<string>('')
  const [loadingFileId, setLoadingFileId] = useState<number | null>(null)
  const [requestingCoach, setRequestingCoach] = useState(false)
  const [coachRequested, setCoachRequested] = useState(false)
  const [unchainedEnrolled, setUnchainedEnrolled] = useState<boolean | null>(
    null
  )
  const [requestingUnchained, setRequestingUnchained] = useState(false)
  const [unchainedRequested, setUnchainedRequested] = useState(false)
  const { showError, showSuccess } = useSnackbar()

  const fetchData = useCallback(async () => {
    try {
      setLoading(true)
      const [listRes, catalogRes] = await Promise.all([
        marketplaceService.list(),
        marketplaceService.catalog(),
      ])
      if (listRes.data?.statusCode === 200 && listRes.data?.data?.items) {
        setAssigned(
          (listRes.data.data.items as MarketplaceItemAssigned[]) ?? []
        )
      } else {
        setAssigned([])
      }
      if (catalogRes.data?.statusCode === 200 && catalogRes.data?.data?.items) {
        setCatalog(catalogRes.data.data.items ?? [])
      } else {
        setCatalog([])
      }
    } catch {
      setAssigned([])
      setCatalog([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  useEffect(() => {
    curriculumHubService
      .getStatus()
      .then(res => {
        if (res.data?.statusCode === 200 && res.data.data) {
          setUnchainedEnrolled(res.data.data.enrolled)
        }
      })
      .catch(() => setUnchainedEnrolled(false))
  }, [])

  const assignedIds = new Set(assigned.map(i => i.id))
  const catalogOnly = catalog.filter(i => !assignedIds.has(i.id))
  const allItems: MarketItem[] = [
    ...assigned.map(i => ({ ...i, assigned: true })),
    ...catalogOnly.map(i => ({ ...i, assigned: false })),
  ]
  const filteredItems =
    filterType === '' ? allItems : allItems.filter(i => i.type === filterType)

  const handleView = async (itemId: number) => {
    if (loadingFileId !== null) return
    setLoadingFileId(itemId)
    try {
      const res = await marketplaceService.getFileUrl(itemId, false)
      const url = res.data?.data?.url
      if (url) {
        window.open(url, '_blank', 'noopener,noreferrer')
      } else {
        showError('Could not open file')
      }
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message ?? 'Could not load file')
    } finally {
      setLoadingFileId(null)
    }
  }

  const handleDownload = async (itemId: number, title: string) => {
    if (loadingFileId !== null) return
    setLoadingFileId(itemId)
    try {
      const res = await marketplaceService.getFileUrl(itemId, true)
      const url = res.data?.data?.url
      if (url) {
        const a = document.createElement('a')
        a.href = url
        a.download = title || 'download'
        a.rel = 'noopener noreferrer'
        document.body.appendChild(a)
        a.click()
        a.remove()
        showSuccess('Download started')
      } else {
        showError('Could not download file')
      }
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message ?? 'Could not download file')
    } finally {
      setLoadingFileId(null)
    }
  }

  const handleRequestCoach = async () => {
    if (requestingCoach || coachRequested) return
    setRequestingCoach(true)
    try {
      const res = await athleteCoachService.requestCoach()
      if (res.data?.statusCode === 200) {
        setCoachRequested(true)
        showSuccess(
          res.data.data?.alreadyRequested
            ? 'You already have a pending request. Admin will assign a coach soon.'
            : 'Request sent. Admin will assign a coach to you soon.'
        )
      }
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message ?? 'Could not send request')
    } finally {
      setRequestingCoach(false)
    }
  }

  const handleRequest90Unchained = async () => {
    if (requestingUnchained || unchainedRequested || unchainedEnrolled) return
    setRequestingUnchained(true)
    try {
      const res = await curriculumHubService.request90Unchained()
      if (res.data?.statusCode === 200 && res.data.data) {
        const { alreadyEnrolled, alreadyRequested } = res.data.data
        if (alreadyEnrolled) {
          setUnchainedEnrolled(true)
          showSuccess('You are already enrolled in 90 Unchained.')
        } else {
          setUnchainedRequested(true)
          showSuccess(
            alreadyRequested
              ? 'You already have a pending request. Admin will enroll you soon.'
              : 'Request sent. Admin will add you to 90 Unchained soon.'
          )
        }
      }
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message ?? 'Could not send request')
    } finally {
      setRequestingUnchained(false)
    }
  }

  let requestCoachButtonLabel: string | null = null
  if (!requestingCoach) {
    requestCoachButtonLabel = coachRequested ? 'Request sent' : 'Request coach'
  }

  const requestUnchainedButtonLabel = unchainedRequested
    ? 'Request sent'
    : 'Request 90 Unchained'

  const isEmpty = !loading && filteredItems.length === 0
  const showList = !loading && filteredItems.length > 0
  const emptyMessage = filterType
    ? `No ${TYPE_LABELS[filterType] ?? filterType} items. Try another filter.`
    : 'Featured guides and masterclasses will appear here when published.'

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="rounded-lg bg-gray-100 p-2">
              <Icon name="store" family="solid" size={24} variant="primary" />
            </div>
            <Text variant="primary" className="text-2xl font-semibold">
              Market
            </Text>
          </div>
          <Text variant="secondary" className="text-sm mt-1">
            Guides, masterclasses, and tools. Programs are in Train → Program
            browser.
          </Text>
        </div>
      </div>

      <Card className="p-4 rounded-xl border border-blue-100 bg-blue-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon
                name="user-plus"
                family="solid"
                size={20}
                variant="primary"
              />
              <Text variant="default" className="font-semibold text-gray-800">
                Want a 1:1 coach?
              </Text>
            </div>
            <Text variant="secondary" className="text-sm">
              Request a coach and an admin will assign one to you. You’ll get a
              dedicated coach for programs and support.
            </Text>
          </div>
          <Button
            type="button"
            variant="primary"
            size="medium"
            onClick={handleRequestCoach}
            disabled={requestingCoach || coachRequested}
            className="shrink-0"
          >
            {requestingCoach ? (
              <span className="inline-flex items-center gap-2">
                <Spinner size="small" variant="secondary" />
                Sending...
              </span>
            ) : (
              requestCoachButtonLabel
            )}
          </Button>
        </div>
      </Card>

      <Card className="p-4 rounded-xl border border-violet-100 bg-violet-50/50">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Icon
                name="academic-cap"
                family="solid"
                size={20}
                variant="primary"
              />
              <Text variant="default" className="font-semibold text-gray-800">
                Want 90 Unchained?
              </Text>
            </div>
            <Text variant="secondary" className="text-sm">
              90 Unchained is our comprehensive 1:1 program with weekly lessons,
              PDFs, videos, and live calls. Request access and an admin will
              enroll you.
            </Text>
          </div>
          {unchainedEnrolled ? (
            <span className="text-sm font-medium text-green-700 shrink-0">
              You’re in 90 Unchained
            </span>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="medium"
              onClick={handleRequest90Unchained}
              disabled={requestingUnchained || unchainedRequested}
              className="shrink-0"
            >
              {requestingUnchained ? (
                <span className="inline-flex items-center gap-2">
                  <Spinner size="small" variant="secondary" />
                  Sending...
                </span>
              ) : (
                requestUnchainedButtonLabel
              )}
            </Button>
          )}
        </div>
      </Card>

      <Card className="p-4 rounded-xl border border-gray-200/80">
        <Text
          variant="default"
          className="text-sm font-medium text-gray-700 mb-3"
        >
          Filter by type
        </Text>
        <Dropdown
          placeholder="All types"
          options={TYPE_OPTIONS}
          value={filterType}
          onValueChange={v => setFilterType(typeof v === 'string' ? v : '')}
          fullWidth={false}
          className="min-w-[160px]"
        />
      </Card>

      <Card className="p-0 overflow-hidden rounded-xl border border-gray-200/80 shadow-sm">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <Spinner size="large" variant="primary" />
            <Text variant="secondary" className="mt-3 text-sm">
              Loading marketplace...
            </Text>
          </div>
        )}
        {isEmpty && (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="rounded-full bg-gray-100 p-4 mb-4">
              <Icon name="store" family="solid" size={32} variant="muted" />
            </div>
            <Text variant="default" className="font-semibold text-lg mb-1">
              No items yet
            </Text>
            <Text variant="secondary" className="text-sm max-w-sm">
              {emptyMessage}
            </Text>
          </div>
        )}
        {showList && (
          <ul className="divide-y divide-gray-200">
            {filteredItems.map(item => {
              const viewLabel = item.type === 'VIDEO' ? 'Watch' : 'View'
              return (
                <li
                  key={item.id}
                  className="flex items-center justify-between gap-4 px-5 py-4 hover:bg-gray-50/80 transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  <div className="flex items-center gap-4 min-w-0 flex-1">
                    <div className="shrink-0 w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                      <Icon
                        name={TYPE_ICON[item.type] ?? 'file'}
                        family="solid"
                        size={20}
                        variant="secondary"
                      />
                    </div>
                    <div className="min-w-0">
                      <Text
                        variant="default"
                        className="font-semibold truncate"
                      >
                        {item.title}
                      </Text>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-gray-100 text-gray-700">
                          {TYPE_LABELS[item.type] ?? item.type}
                        </span>
                        {item.assigned && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-green-100 text-green-800">
                            Assigned
                          </span>
                        )}
                        {item.description && (
                          <span className="text-xs text-gray-500 truncate max-w-[200px]">
                            {item.description}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.filePath ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="small"
                          onClick={() => handleView(item.id)}
                          disabled={loadingFileId === item.id}
                          className="text-gray-700"
                        >
                          {loadingFileId === item.id ? (
                            <Spinner size="small" variant="primary" />
                          ) : (
                            viewLabel
                          )}
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="small"
                          onClick={() => handleDownload(item.id, item.title)}
                          disabled={loadingFileId === item.id}
                          className="text-gray-700"
                        >
                          Download
                        </Button>
                      </>
                    ) : (
                      <Text variant="muted" className="text-xs">
                        No file
                      </Text>
                    )}
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </Card>
    </div>
  )
}
