/** Coach tab (PRD 11 + 12): announcements; 90 Unchained Curriculum Hub when enrolled */
import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { announcementsService } from '@/api/announcements.service'
import type { AnnouncementItem } from '@/api/announcements.service'
import { curriculumHubService } from '@/api/curriculum-hub.service'
import type { CurriculumItemDto } from '@/api/curriculum-hub.service'

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      dateStyle: 'short',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

function getAnnouncementItemClass(readAt: string | null | undefined): string {
  const base = 'border-b border-gray-100 pb-4 last:border-0'
  return readAt ? `${base} opacity-80` : base
}

/** PRD 12: 90 Unchained Curriculum Hub — only visible when enrolled; lives under Coach tab */
function UnchainedCurriculumCard() {
  const [enrolled, setEnrolled] = useState<boolean | null>(null)
  const [items, setItems] = useState<CurriculumItemDto[]>([])
  const [progress, setProgress] = useState<{
    completed: number
    total: number
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [completingId, setCompletingId] = useState<number | null>(null)

  const fetchItems = useCallback(() => {
    if (!enrolled) return
    curriculumHubService
      .getItems()
      .then(res => {
        if (res.data?.statusCode === 200 && res.data.data) {
          setItems(res.data.data.items ?? [])
          setProgress(res.data.data.progress ?? null)
        }
      })
      .finally(() => setLoading(false))
  }, [enrolled])

  useEffect(() => {
    curriculumHubService
      .getStatus()
      .then(res => {
        if (res.data?.statusCode === 200 && res.data.data) {
          setEnrolled(res.data.data.enrolled)
          if (res.data.data.enrolled) {
            return curriculumHubService.getItems()
          }
        }
        return null
      })
      .then(res => {
        if (res?.data?.statusCode === 200 && res.data.data) {
          setItems(res.data.data.items ?? [])
          setProgress(res.data.data.progress ?? null)
        }
      })
      .catch(() => setEnrolled(false))
      .finally(() => setLoading(false))
  }, [])

  const handleComplete = useCallback(
    (itemId: number) => {
      setCompletingId(itemId)
      curriculumHubService
        .completeItem(itemId)
        .then(() => fetchItems())
        .finally(() => setCompletingId(null))
    },
    [fetchItems]
  )

  const itemsByWeek = items.reduce<Record<number, CurriculumItemDto[]>>(
    (acc, i) => {
      const w = i.weekIndex
      if (!acc[w]) acc[w] = []
      acc[w].push(i)
      return acc
    },
    {}
  )
  const weekNumbers = Object.keys(itemsByWeek)
    .map(Number)
    .sort((a, b) => a - b)

  if (loading) {
    return (
      <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
        <div className="flex items-center gap-2 py-4">
          <Spinner size="small" variant="primary" />
          <Text variant="secondary">Loading...</Text>
        </div>
      </Card>
    )
  }

  return (
    <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
      <div className="flex items-center gap-2 mb-4">
        <Icon name="book" family="solid" size={20} />
        <Text variant="default" className="font-semibold text-gray-800">
          90 Unchained Curriculum
        </Text>
      </div>
      {!enrolled ? (
        <Text variant="secondary" className="text-sm">
          90 Unchained is our most comprehensive 1:1 coaching offering. When you
          enroll, you’ll see weekly lessons, PDFs, videos, and live call links
          here.
        </Text>
      ) : items.length === 0 ? (
        <Text variant="secondary" className="text-sm">
          No curriculum content yet. Check back soon.
        </Text>
      ) : (
        <div className="space-y-6">
          {progress && (
            <Text variant="secondary" className="text-sm">
              Progress: {progress.completed} / {progress.total} completed
            </Text>
          )}
          {weekNumbers.map(week => (
            <div key={week}>
              <Text
                variant="default"
                className="font-medium text-sm text-gray-700 mb-2"
              >
                Week {week}
              </Text>
              <ul className="space-y-2">
                {(itemsByWeek[week] ?? []).map(item => (
                  <li
                    key={item.id}
                    className="flex items-center gap-2 flex-wrap"
                  >
                    <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                      {item.type.replaceAll('_', ' ')}
                    </span>
                    {item.url ? (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline text-sm"
                      >
                        {item.title}
                      </a>
                    ) : (
                      <Text variant="default" className="text-sm">
                        {item.title}
                      </Text>
                    )}
                    {item.description && (
                      <Text
                        variant="muted"
                        className="text-xs truncate max-w-[200px]"
                      >
                        {item.description}
                      </Text>
                    )}
                    {enrolled &&
                      (item.completedAt ? (
                        <span className="text-xs text-green-600 ml-auto">
                          Done
                        </span>
                      ) : (
                        <Button
                          type="button"
                          variant="ghost"
                          size="small"
                          className="ml-auto text-sm"
                          disabled={completingId === item.id}
                          onClick={() => handleComplete(item.id)}
                        >
                          {completingId === item.id ? '...' : 'Mark complete'}
                        </Button>
                      ))}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}

export default function CoachPage() {
  const [loading, setLoading] = useState(true)
  const [announcements, setAnnouncements] = useState<AnnouncementItem[]>([])

  const fetchAnnouncements = useCallback(() => {
    setLoading(true)
    announcementsService
      .list()
      .then(res => {
        if (res.data?.statusCode === 200 && Array.isArray(res.data.data)) {
          setAnnouncements(res.data.data)
        }
      })
      .catch(() => setAnnouncements([]))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    queueMicrotask(() => fetchAnnouncements())
  }, [fetchAnnouncements])

  const handleMarkAsRead = (a: AnnouncementItem) => {
    if (a.readAt) return
    announcementsService
      .markAsRead(a.id)
      .then(() => {
        setAnnouncements(prev =>
          prev.map(x =>
            x.id === a.id ? { ...x, readAt: new Date().toISOString() } : x
          )
        )
      })
      .catch(() => {})
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Text variant="primary" className="text-2xl font-semibold">
        Coach
      </Text>
      <Text variant="secondary" className="block">
        Community and coaching: announcements, group chats, and 1:1 coach access
        when enrolled.
      </Text>

      <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <Icon name="bullhorn" family="solid" size={20} />
          <Text variant="default" className="font-semibold text-gray-800">
            Announcements
          </Text>
        </div>
        {loading ? (
          <div className="flex items-center gap-2 py-4">
            <Spinner size="small" variant="primary" />
            <Text variant="secondary">Loading...</Text>
          </div>
        ) : announcements.length === 0 ? (
          <Text variant="secondary" className="text-sm">
            No announcements right now. Check back later.
          </Text>
        ) : (
          <ul className="space-y-4">
            {announcements.map(a => (
              <li key={a.id} className={getAnnouncementItemClass(a.readAt)}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Text variant="default" className="font-medium">
                        {a.title}
                      </Text>
                      {a.target && (
                        <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                          {a.target}
                        </span>
                      )}
                      {!a.readAt && (
                        <span className="rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                          New
                        </span>
                      )}
                    </div>
                    <Text variant="secondary" className="text-sm mt-1 block">
                      {a.body}
                    </Text>
                    <Text variant="muted" className="text-xs mt-2">
                      {formatDate(a.createdAt)}
                    </Text>
                  </div>
                  {!a.readAt && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={() => handleMarkAsRead(a)}
                    >
                      Mark as read
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <UnchainedCurriculumCard />

      <Card className="p-6 rounded-xl border border-gray-200/80 bg-gray-50/80">
        <div className="flex items-center gap-2 mb-2">
          <Icon name="comments" family="solid" size={20} />
          <Text variant="default" className="font-semibold text-gray-800">
            Group chats
          </Text>
        </div>
        <Text variant="secondary" className="text-sm">
          Global Modern Athlete chat and program-specific chats will appear here
          when available.
        </Text>
      </Card>

      <Card className="p-6 rounded-xl border border-gray-200/80 bg-gray-50/80">
        <Text variant="default" className="font-semibold text-gray-800 mb-2">
          1:1 Coaching
        </Text>
        <Text variant="secondary" className="text-sm">
          If enrolled in 1:1 coaching, you'll see DMs with your coach, video
          uploads, feedback library, and live calls here.
        </Text>
      </Card>
    </div>
  )
}
