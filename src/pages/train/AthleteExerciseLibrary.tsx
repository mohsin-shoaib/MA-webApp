import { useState, useEffect, useCallback, useMemo } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Input } from '@/components/Input'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { SetWorkingMaxModal } from '@/components/SetWorkingMaxModal'
import { DataTable, type Column } from '@/components/DataTable'
import { Pagination } from '@/components/Pagination'
import { Dropdown, type DropdownValue } from '@/components/Dropdown'
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
  const { showError } = useSnackbar()

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

  const availableTagOptions = useMemo(() => {
    const tagSet = new Set<string>(selectedTags)
    list.forEach(ex => {
      if (Array.isArray(ex.tags)) ex.tags.forEach(t => tagSet.add(t))
    })
    return Array.from(tagSet)
      .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
      .map(t => ({ value: t, label: t }))
  }, [list, selectedTags])

  const handleTagsChange = useCallback((value: DropdownValue) => {
    if (Array.isArray(value)) setSelectedTags(value)
    else if (value) setSelectedTags([value])
    else setSelectedTags([])
  }, [])

  function formatParams(ex: Exercise): string {
    const parts = [ex.defaultParameter1, ex.defaultParameter2].filter(Boolean)
    if (parts.length === 0) return '—'
    return parts.join(', ')
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
            {formatParams(row)}
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
        render: value => (
          <Text variant="secondary" className="text-sm">
            {value ? 'Yes' : '—'}
          </Text>
        ),
      },
    ],
    []
  )

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Text as="h1" variant="primary" className="text-2xl font-bold mb-1">
        Exercise Library
      </Text>
      <Text variant="secondary" className="text-sm mb-6 block">
        Read-only. Search by name and filter by tags. Click a row to view Points
        of Performance, demo video, and your working max / history.
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
            placeholder="By name..."
            size="small"
            className="w-full"
          />
        </div>
        <div className="min-w-[220px]">
          <Dropdown
            label="Filter by tags (multi-select)"
            placeholder={
              availableTagOptions.length === 0 && list.length === 0
                ? 'Load exercises to see tags'
                : 'All tags'
            }
            options={availableTagOptions}
            value={selectedTags.length > 0 ? selectedTags : undefined}
            onValueChange={handleTagsChange}
            multiple
            size="small"
            fullWidth={true}
          />
        </div>
        {selectedTags.length > 0 && (
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => setSelectedTags([])}
          >
            Clear tags
          </Button>
        )}
      </div>

      <div className="mb-2 text-sm text-gray-600">
        {loading && 'Loading...'}
        {!loading && total === 1 && '1 exercise'}
        {!loading && total !== 1 && `${total} exercises`}
      </div>

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
        {loading === false && total > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between flex-wrap gap-2">
            <Text variant="secondary" className="text-sm">
              Showing {(page - 1) * limit + 1} to{' '}
              {Math.min(page * limit, total)} of {total}
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
                  Demo video
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
                Your working max & history
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
                          {workingMaxData.lastLogged.weightLb == null
                            ? 'kg'
                            : 'lb'}
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
