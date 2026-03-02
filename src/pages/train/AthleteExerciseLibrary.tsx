import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { Pagination } from '@/components/Pagination'
import { Modal } from '@/components/Modal'
import { SetWorkingMaxModal } from '@/components/SetWorkingMaxModal'
import { athleteExerciseService } from '@/api/athlete-exercise.service'
import { trainService } from '@/api/train.service'
import type { Exercise } from '@/types/exercise'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { AxiosError } from 'axios'

export default function AthleteExerciseLibrary() {
  const [list, setList] = useState<Exercise[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [searchQ, setSearchQ] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [filterTagsStr, setFilterTagsStr] = useState('')
  const [page, setPage] = useState(1)
  const limit = 12
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
  const { showError } = useSnackbar()

  const filterTagsArray = filterTagsStr
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      const query = {
        page,
        limit,
        ...(searchApplied.trim() && { q: searchApplied.trim() }),
        ...(filterTagsArray.length > 0 && { tags: filterTagsArray }),
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
  }, [showError, page, searchApplied, filterTagsArray])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    const t = setTimeout(() => setSearchApplied(searchQ), 400)
    return () => clearTimeout(t)
  }, [searchQ])

  useEffect(() => {
    setPage(1)
  }, [searchApplied, filterTagsStr])

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

  function formatParams(ex: Exercise): string {
    const parts = [ex.defaultParameter1, ex.defaultParameter2].filter(Boolean)
    if (parts.length === 0) return '—'
    return parts.join(', ')
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Text as="h1" variant="primary" className="text-2xl font-bold mb-1">
        Exercise Library
      </Text>
      <Text variant="secondary" className="text-sm mb-6 block">
        Browse exercises. Read-only. Search and filter by tags.
      </Text>

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px]">
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
        <div className="min-w-[200px]">
          <label
            htmlFor="athlete-ex-tags"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Tags (comma-separated)
          </label>
          <Input
            id="athlete-ex-tags"
            value={filterTagsStr}
            onChange={e => setFilterTagsStr(e.target.value)}
            placeholder="e.g. compound, lower body"
            size="small"
            className="w-full"
          />
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-8">
          <Spinner size="medium" variant="primary" />
          <Text variant="secondary">Loading exercises...</Text>
        </div>
      )}
      {!loading && list.length === 0 && (
        <Card className="p-8 text-center">
          <Text variant="secondary">
            No exercises match your search or filters.
          </Text>
        </Card>
      )}
      {!loading && list.length > 0 && (
        <>
          <div className="mb-2 text-sm text-gray-600">
            {total} exercise{total === 1 ? '' : 's'}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map(ex => (
              <Card
                key={ex.id}
                className="p-4 cursor-pointer hover:border-[#3AB8ED]/50 transition-colors"
                pressable
                onPress={() => setDetailExercise(ex)}
              >
                <Text variant="default" className="font-medium text-sm">
                  {ex.name}
                </Text>
                <Text variant="secondary" className="text-xs mt-1">
                  {formatParams(ex)}
                </Text>
                {Array.isArray(ex.tags) && ex.tags.length > 0 && (
                  <Text variant="muted" className="text-xs mt-1">
                    {ex.tags.join(', ')}
                  </Text>
                )}
                {ex.videoUrl && (
                  <span className="inline-block mt-2 text-xs text-[#3AB8ED]">
                    Has video
                  </span>
                )}
              </Card>
            ))}
          </div>
          {totalPages > 1 && (
            <div className="mt-6 flex justify-center">
              <Pagination
                currentPage={page}
                totalPages={totalPages}
                onPageChange={setPage}
                size="small"
              />
            </div>
          )}
        </>
      )}

      {detailExercise && (
        <Modal
          visible={true}
          onClose={() => setDetailExercise(null)}
          title={detailExercise.name}
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          secondaryAction={{
            label: 'Close',
            onPress: () => setDetailExercise(null),
          }}
        >
          <div className="space-y-4 max-h-[70vh] overflow-y-auto">
            {detailExercise.description && (
              <div>
                <Text variant="default" className="text-sm font-medium mb-1">
                  Description
                </Text>
                <Text
                  variant="secondary"
                  className="text-sm whitespace-pre-wrap"
                >
                  {detailExercise.description}
                </Text>
              </div>
            )}
            {(detailExercise.defaultParameter1 ||
              detailExercise.defaultParameter2) && (
              <div>
                <Text variant="default" className="text-sm font-medium mb-1">
                  Parameters
                </Text>
                <Text variant="secondary" className="text-sm">
                  {formatParams(detailExercise)}
                </Text>
              </div>
            )}
            {detailExercise.pointsOfPerformance && (
              <div>
                <Text variant="default" className="text-sm font-medium mb-1">
                  Points of Performance
                </Text>
                <Text
                  variant="secondary"
                  className="text-sm whitespace-pre-wrap"
                >
                  {detailExercise.pointsOfPerformance}
                </Text>
              </div>
            )}
            {Array.isArray(detailExercise.tags) &&
              detailExercise.tags.length > 0 && (
                <div>
                  <Text variant="default" className="text-sm font-medium mb-1">
                    Tags
                  </Text>
                  <Text variant="secondary" className="text-sm">
                    {detailExercise.tags.join(', ')}
                  </Text>
                </div>
              )}
            {detailExercise.videoUrl && (
              <div>
                <Text variant="default" className="text-sm font-medium mb-1">
                  Video
                </Text>
                <a
                  href={detailExercise.videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3AB8ED] text-sm hover:underline"
                >
                  Watch demo
                </a>
              </div>
            )}
            <div className="border-t border-gray-200 pt-4 mt-4">
              <Text
                variant="default"
                className="text-sm font-medium mb-2 block"
              >
                Your working max
              </Text>
              {workingMaxData === null && (
                <Text variant="secondary" className="text-sm">
                  Loading…
                </Text>
              )}
              {workingMaxData &&
                !workingMaxData.workingMax &&
                !workingMaxData.lastLogged && (
                  <Text variant="secondary" className="text-sm">
                    No working max or history yet. Set one or log sets in a
                    workout to auto-calculate.
                  </Text>
                )}
              {workingMaxData &&
                (workingMaxData.workingMax != null ||
                  workingMaxData.lastLogged != null) && (
                  <div className="space-y-1 text-sm text-gray-600">
                    {workingMaxData.workingMax != null && (
                      <Text variant="secondary">
                        Working max: {workingMaxData.workingMax.value}{' '}
                        {workingMaxData.workingMax.unit}
                        {workingMaxData.workingMax.source &&
                          ` (${workingMaxData.workingMax.source})`}
                      </Text>
                    )}
                    {workingMaxData.lastLogged != null &&
                      (workingMaxData.lastLogged.weightLb != null ||
                        workingMaxData.lastLogged.weightKg != null) && (
                        <Text variant="secondary">
                          Last:{' '}
                          {workingMaxData.lastLogged.weightLb ??
                            workingMaxData.lastLogged.weightKg}{' '}
                          {workingMaxData.lastLogged.weightLb != null
                            ? 'lb'
                            : 'kg'}
                          {workingMaxData.lastLogged.reps != null &&
                            ` × ${workingMaxData.lastLogged.reps}`}
                        </Text>
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
        </Modal>
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
