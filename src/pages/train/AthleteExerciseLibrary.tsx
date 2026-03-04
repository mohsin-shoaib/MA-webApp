import { useState, useEffect, useCallback, useMemo } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { Drawer } from '@/components/Drawer'
import { SetWorkingMaxModal } from '@/components/SetWorkingMaxModal'
import { DataTable, type Column } from '@/components/DataTable'
import { Pagination } from '@/components/Pagination'
import { Dropdown } from '@/components/Dropdown'
import { Icon } from '@/components/Icon'
import { Tooltip } from '@/components/Tooltip'
import { athleteExerciseService } from '@/api/athlete-exercise.service'
import { trainService } from '@/api/train.service'
import type { Exercise } from '@/types/exercise'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { AxiosError } from 'axios'

/**
 * MASS Phase 2.4: Athlete exercise library (read-only).
 * Same list as Admin/Coach: name, parameter types, tags, video indicator.
 * Search and filter by tags (multi-select); view description and demo video;
 * view Points of Performance, demo video, and own history and working max per exercise.
 */
export default function AthleteExerciseLibrary() {
  const [list, setList] = useState<Exercise[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [page, setPage] = useState(1)
  const limit = 10
  const [detailExercise, setDetailExercise] = useState<Exercise | null>(null)
  const [workingMaxData, setWorkingMaxData] = useState<{
    workingMax?: {
      value: number
      unit: string
      source: string
      updatedAt: string
    }
    lastLogged?: {
      weightLb?: number
      weightKg?: number
      reps?: number
      completedAt: string
    }
  } | null>(null)
  const [workingMaxModalOpen, setWorkingMaxModalOpen] = useState(false)
  const [exerciseOptionsForTags, setExerciseOptionsForTags] = useState<
    Exercise[]
  >([])
  const { showError, showSuccess } = useSnackbar()

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      const query = {
        page,
        limit,
        ...(searchApplied.trim() && { q: searchApplied.trim() }),
        ...(selectedTags.length > 0 && { tags: selectedTags }),
      }
      const res = await athleteExerciseService.getAll(query)
      if (res.data?.statusCode === 200 && res.data.data?.rows) {
        setList(res.data.data.rows)
        setTotal(res.data.data.meta?.total ?? res.data.data.rows.length)
      } else {
        setList([])
        setTotal(0)
      }
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to load exercises')
      setList([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [showError, page, searchApplied, selectedTags])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const fetchTagOptions = useCallback(async () => {
    try {
      const res = await athleteExerciseService.getAll({ limit: 500 })
      const rows = res.data?.data?.rows ?? []
      setExerciseOptionsForTags(rows)
    } catch {
      setExerciseOptionsForTags([])
    }
  }, [])

  useEffect(() => {
    void fetchTagOptions()
  }, [fetchTagOptions])

  useEffect(() => {
    const t = setTimeout(() => setSearchApplied(searchQ), 400)
    return () => clearTimeout(t)
  }, [searchQ])

  useEffect(() => {
    setPage(1)
  }, [searchApplied, selectedTags])

  useEffect(() => {
    if (!detailExercise) {
      setWorkingMaxData(null)
      return
    }
    let cancelled = false
    trainService
      .getWorkingMax(detailExercise.id)
      .then(res => {
        if (cancelled || res.data?.statusCode !== 200 || !res.data.data) return
        const d = res.data.data as {
          workingMax?: {
            value: number
            unit: string
            source: string
            updatedAt: string
          }
          lastLogged?: {
            weightLb?: number
            weightKg?: number
            reps?: number
            completedAt: string
          }
        }
        setWorkingMaxData({
          workingMax: d.workingMax ?? undefined,
          lastLogged: d.lastLogged ?? undefined,
        })
      })
      .catch(() => {
        if (!cancelled) setWorkingMaxData(null)
      })
    return () => {
      cancelled = true
    }
  }, [detailExercise, detailExercise?.id])

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const existingTagOptions = useMemo(() => {
    const set = new Set<string>()
    exerciseOptionsForTags.forEach(ex => {
      const tags = ex.tags
      const arr = Array.isArray(tags)
        ? tags
        : typeof tags === 'string'
          ? (() => {
              try {
                const parsed = JSON.parse(tags) as unknown
                return Array.isArray(parsed) ? parsed : []
              } catch {
                return []
              }
            })()
          : []
      arr.forEach((t: string) => typeof t === 'string' && set.add(t))
    })
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map(t => ({ value: t, label: t }))
  }, [exerciseOptionsForTags])

  const hasActiveFilters = searchQ.trim() !== '' || selectedTags.length > 0
  const clearFilters = useCallback(() => {
    setSearchQ('')
    setSearchApplied('')
    setSelectedTags([])
    setPage(1)
  }, [])

  const resultCountLabel = loading
    ? 'Loading...'
    : total === 1
      ? '1 exercise'
      : `${total} exercises`

  function formatParams(ex: Exercise): string {
    const parts = [ex.defaultParameter1, ex.defaultParameter2].filter(Boolean)
    if (parts.length === 0) return '—'
    return parts.join(' + ')
  }

  const columns: Column<Exercise>[] = useMemo(
    () => [
      {
        key: 'name',
        label: 'Name',
        sortable: false,
        render: value => (
          <Text variant="default" className="font-medium text-sm">
            {value as string}
          </Text>
        ),
      },
      {
        key: 'defaultParameter1',
        label: 'Parameters',
        sortable: false,
        render: (_value, row) => (
          <Text variant="secondary" className="text-sm">
            {[row.defaultParameter1, row.defaultParameter2]
              .filter(Boolean)
              .join(' + ') || '—'}
          </Text>
        ),
      },
      {
        key: 'tags',
        label: 'Tags',
        sortable: false,
        render: value => (
          <Text variant="secondary" className="text-sm">
            {Array.isArray(value) && value.length
              ? (value as string[]).join(', ')
              : '—'}
          </Text>
        ),
      },
      {
        key: 'videoUrl',
        label: 'Video',
        sortable: false,
        render: (_value, row) => {
          const url = row.videoUrl?.trim()
          if (!url) {
            return (
              <Text variant="secondary" className="text-sm">
                —
              </Text>
            )
          }
          const copyLink = (e: React.MouseEvent) => {
            e.stopPropagation()
            void navigator.clipboard.writeText(url).then(() => {
              showSuccess('Link copied to clipboard')
            })
          }
          return (
            <div className="flex items-center gap-1.5">
              <Tooltip content={url} position="top">
                <span className="inline-flex text-gray-600 cursor-default">
                  <Icon name="video" family="solid" size={16} />
                </span>
              </Tooltip>
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex text-gray-500 hover:text-gray-700 p-0.5 rounded focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                aria-label="Copy video link"
              >
                <Icon name="copy" family="solid" size={14} />
              </button>
            </div>
          )
        },
      },
      {
        key: 'createdByUser',
        label: 'Created by',
        sortable: false,
        render: (_value, row) => (
          <Text variant="secondary" className="text-sm">
            {row.createdByUser
              ? [row.createdByUser.firstName, row.createdByUser.lastName]
                  .filter(Boolean)
                  .join(' ') || '—'
              : '—'}
          </Text>
        ),
      },
    ],
    [showSuccess]
  )

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <Text as="h1" variant="primary" className="text-2xl font-bold">
            Exercise Library
          </Text>
          <Text variant="secondary" className="text-sm mt-1">
            Read-only. Search by name and filter by tags. Click a row to view
            Points of Performance, demo video, and your working max / history.
          </Text>
        </div>
      </div>

      {/* Search and filters - same structure as admin */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label
            htmlFor="athlete-ex-search"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Search
          </label>
          <Input
            id="athlete-ex-search"
            type="search"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Name or description..."
            size="small"
            className="w-full"
          />
        </div>
        <div className="w-48">
          <Dropdown
            label="Tags"
            placeholder="All tags"
            options={existingTagOptions}
            value={selectedTags}
            onValueChange={v =>
              setSelectedTags(Array.isArray(v) ? v : v != null ? [v] : [])
            }
            multiple
            size="small"
            fullWidth
          />
        </div>
        {hasActiveFilters && (
          <Button
            type="button"
            variant="outline"
            size="small"
            onClick={clearFilters}
          >
            Clear filters
          </Button>
        )}
      </div>
      <div className="mb-2 text-sm text-gray-600">{resultCountLabel}</div>

      <Card className="overflow-hidden" padding="none">
        <DataTable<Exercise>
          data={list}
          columns={columns}
          loading={loading}
          searchable={false}
          paginated={false}
          rowKey="id"
          rowClickable={true}
          onRowClick={row => setDetailExercise(row)}
          emptyMessage="No exercises match your search or filters."
        />
        {!loading && total > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <Text variant="secondary" className="text-sm">
              Showing {(page - 1) * limit + 1} to{' '}
              {Math.min(page * limit, total)} of {total} results
            </Text>
            <Pagination
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setPage}
              size="small"
            />
          </div>
        )}
      </Card>

      {detailExercise && (
        <Drawer
          visible={true}
          onClose={() => setDetailExercise(null)}
          title={detailExercise.name}
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          width="lg"
          secondaryAction={{
            label: 'Close',
            onPress: () => setDetailExercise(null),
          }}
        >
          <div className="space-y-5">
            {detailExercise.pointsOfPerformance && (
              <div>
                <Text
                  variant="default"
                  className="text-sm font-medium block mb-1.5"
                >
                  Points of Performance
                </Text>
                {detailExercise.pointsOfPerformance.trim().startsWith('<') ? (
                  <div
                    className="text-sm text-gray-600 mt-0 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_a]:text-[#3AB8ED] [&_a]:underline"
                    dangerouslySetInnerHTML={{
                      __html: detailExercise.pointsOfPerformance,
                    }}
                  />
                ) : (
                  <Text
                    variant="secondary"
                    className="text-sm whitespace-pre-wrap block mt-0"
                  >
                    {detailExercise.pointsOfPerformance}
                  </Text>
                )}
              </div>
            )}
            {(detailExercise.defaultParameter1 ||
              detailExercise.defaultParameter2) && (
              <div>
                <Text
                  variant="default"
                  className="text-sm font-medium block mb-1.5"
                >
                  Parameters
                </Text>
                <Text variant="secondary" className="text-sm block mt-0">
                  {formatParams(detailExercise)}
                </Text>
              </div>
            )}
            {Array.isArray(detailExercise.tags) &&
              detailExercise.tags.length > 0 && (
                <div>
                  <Text
                    variant="default"
                    className="text-sm font-medium block mb-1.5"
                  >
                    Tags
                  </Text>
                  <Text variant="secondary" className="text-sm block mt-0">
                    {detailExercise.tags.join(', ')}
                  </Text>
                </div>
              )}
            {detailExercise.videoUrl && detailExercise.videoUrl.trim() && (
              <div>
                <Text
                  variant="default"
                  className="text-sm font-medium block mb-1.5"
                >
                  Demo video
                </Text>
                <div className="mt-0">
                  {(() => {
                    const url = detailExercise.videoUrl.trim()
                    let youtubeId: string | null = null
                    let vimeoId: string | null = null
                    if (url.includes('youtu.be/')) {
                      youtubeId =
                        url.split('youtu.be/')[1]?.split('?')[0]?.trim() ?? null
                    } else if (url.includes('youtube.com')) {
                      try {
                        youtubeId = new URL(url).searchParams.get('v')
                      } catch {
                        youtubeId = null
                      }
                    }
                    if (!youtubeId && url.includes('vimeo.com/')) {
                      const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
                      vimeoId = m ? m[1] : null
                    }
                    if (youtubeId) {
                      return (
                        <div className="rounded-lg overflow-hidden bg-black aspect-video max-w-full">
                          <iframe
                            title="Demo video"
                            src={`https://www.youtube.com/embed/${youtubeId}`}
                            className="w-full h-full min-h-[200px]"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )
                    }
                    if (vimeoId) {
                      return (
                        <div className="rounded-lg overflow-hidden bg-black aspect-video max-w-full">
                          <iframe
                            title="Demo video"
                            src={`https://player.vimeo.com/video/${vimeoId}`}
                            className="w-full h-full min-h-[200px]"
                            allow="fullscreen; picture-in-picture"
                            allowFullScreen
                          />
                        </div>
                      )
                    }
                    return (
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#3AB8ED] text-sm hover:underline"
                      >
                        Open video link
                      </a>
                    )
                  })()}
                </div>
              </div>
            )}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <Text
                variant="default"
                className="text-sm font-medium block mb-2"
              >
                Your working max & history
              </Text>
              {workingMaxData === null && (
                <Text variant="secondary" className="text-sm block mt-0">
                  Loading…
                </Text>
              )}
              {workingMaxData &&
                !workingMaxData.workingMax &&
                !workingMaxData.lastLogged && (
                  <Text variant="secondary" className="text-sm block mt-0">
                    No working max or history yet. Set one or log sets in a
                    workout to auto-calculate.
                  </Text>
                )}
              {workingMaxData &&
                (workingMaxData.workingMax != null ||
                  workingMaxData.lastLogged != null) && (
                  <div className="space-y-3 text-sm">
                    {workingMaxData.workingMax != null && (
                      <div>
                        <Text
                          variant="default"
                          className="text-xs font-medium text-gray-500 block mb-0.5"
                        >
                          Working max
                        </Text>
                        <Text variant="secondary" className="block mt-0">
                          {workingMaxData.workingMax.value}{' '}
                          {workingMaxData.workingMax.unit}
                          {workingMaxData.workingMax.source &&
                            ` (${workingMaxData.workingMax.source})`}
                        </Text>
                      </div>
                    )}
                    {workingMaxData.lastLogged != null &&
                      (workingMaxData.lastLogged.weightLb != null ||
                        workingMaxData.lastLogged.weightKg != null) && (
                        <div>
                          <Text
                            variant="default"
                            className="text-xs font-medium text-gray-500 block mb-0.5"
                          >
                            Last logged
                          </Text>
                          <Text variant="secondary" className="block mt-0">
                            {workingMaxData.lastLogged.weightLb ??
                              workingMaxData.lastLogged.weightKg}{' '}
                            {workingMaxData.lastLogged.weightLb == null
                              ? 'kg'
                              : 'lb'}
                            {workingMaxData.lastLogged.reps != null &&
                              ` × ${workingMaxData.lastLogged.reps}`}
                          </Text>
                        </div>
                      )}
                  </div>
                )}
              <Button
                type="button"
                variant="outline"
                size="small"
                className="mt-2"
                onClick={() => setWorkingMaxModalOpen(true)}
              >
                Set working max
              </Button>
            </div>
          </div>
        </Drawer>
      )}

      {detailExercise && (
        <SetWorkingMaxModal
          visible={workingMaxModalOpen}
          onClose={() => setWorkingMaxModalOpen(false)}
          onSuccess={async () => {
            const res = await trainService.getWorkingMax(detailExercise.id)
            if (res.data?.statusCode === 200 && res.data.data) {
              const d = res.data.data as {
                workingMax?: unknown
                lastLogged?: unknown
              }
              setWorkingMaxData({
                workingMax: d.workingMax as NonNullable<
                  typeof workingMaxData
                >['workingMax'],
                lastLogged: d.lastLogged as NonNullable<
                  typeof workingMaxData
                >['lastLogged'],
              })
            }
          }}
          exerciseId={detailExercise.id}
          exerciseName={detailExercise.name}
          currentValue={workingMaxData?.workingMax?.value}
          currentUnit={
            workingMaxData?.workingMax?.unit as 'lb' | 'kg' | undefined
          }
        />
      )}
    </div>
  )
}
