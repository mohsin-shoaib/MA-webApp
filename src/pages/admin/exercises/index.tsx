import { useState, useEffect, useCallback, useMemo } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Drawer } from '@/components/Drawer'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
import { DataTable, type Column } from '@/components/DataTable'
import { Pagination } from '@/components/Pagination'
import { exerciseService } from '@/api/exercise.service'
import type { Exercise, CreateExercisePayload } from '@/types/exercise'
import {
  DEFAULT_PARAMETER_OPTIONS,
  PARAMETER_2_OPTIONS,
} from '@/types/exercise'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { AxiosError } from 'axios'

type FilterStatusValue = 'all' | 'active' | 'inactive'
const FILTER_STATUS_OPTIONS: { value: FilterStatusValue; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
]

export interface ExercisesPageProps {
  /** When 'coach', title/subtitle and no Approve button */
  role?: 'admin' | 'coach'
}

export default function AdminExercises({
  role = 'admin',
}: Readonly<ExercisesPageProps>) {
  const isCoach = role === 'coach'
  const [list, setList] = useState<Exercise[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [saving, setSaving] = useState(false)
  const [searchQ, setSearchQ] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [filterTagsStr, setFilterTagsStr] = useState('')
  const [filterActive, setFilterActive] = useState<
    'all' | 'active' | 'inactive'
  >('all')
  const [page, setPage] = useState(1)
  const limit = 10
  const [exerciseOptions, setExerciseOptions] = useState<Exercise[]>([])
  const [form, setForm] = useState<CreateExercisePayload & { tagsStr: string }>(
    {
      name: '',
      videoUrl: '',
      defaultParameter1: 'Reps',
      defaultParameter2: '-',
      pointsOfPerformance: '',
      referenceMaxExerciseId: undefined,
      trackAsExerciseId: undefined,
      tagsStr: '',
      isActive: true,
    }
  )
  const { showError, showSuccess } = useSnackbar()

  const filterTagsArray = useMemo(
    () =>
      filterTagsStr
        .split(',')
        .map(t => t.trim())
        .filter(Boolean),
    [filterTagsStr]
  )

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      const query: Parameters<typeof exerciseService.getAll>[0] = {
        page,
        limit,
        ...(searchApplied.trim() && { q: searchApplied.trim() }),
        ...(filterTagsArray.length > 0 && { tags: filterTagsArray }),
        ...(filterActive !== 'all' && { isActive: filterActive === 'active' }),
      }
      const res = await exerciseService.getAll(query)
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
  }, [showError, page, searchApplied, filterTagsArray, filterActive])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  // Debounced search: apply searchQ to API after user stops typing
  useEffect(() => {
    const t = setTimeout(() => setSearchApplied(searchQ), 400)
    return () => clearTimeout(t)
  }, [searchQ])

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1)
  }, [searchApplied, filterTagsStr, filterActive])

  const clearFilters = () => {
    setSearchQ('')
    setSearchApplied('')
    setFilterTagsStr('')
    setFilterActive('all')
    setPage(1)
  }

  const hasActiveFilters =
    searchQ.trim() !== '' ||
    filterTagsStr.trim() !== '' ||
    filterActive !== 'all'

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const resultCountLabel = loading
    ? 'Loading...'
    : total === 1
      ? '1 exercise'
      : `${total} exercises`

  const fetchExerciseOptions = useCallback(async () => {
    try {
      const res = await exerciseService.getAll({ limit: 500 })
      const rows = res.data?.data?.rows ?? []
      setExerciseOptions(rows)
    } catch {
      setExerciseOptions([])
    }
  }, [])

  const openCreate = () => {
    setForm({
      name: '',
      videoUrl: '',
      defaultParameter1: 'Reps',
      defaultParameter2: '-',
      pointsOfPerformance: '',
      referenceMaxExerciseId: undefined,
      trackAsExerciseId: undefined,
      tagsStr: '',
      isActive: true,
    })
    setCreateOpen(true)
    void fetchExerciseOptions()
  }

  const openEdit = (ex: Exercise) => {
    setEditing(ex)
    setForm({
      name: ex.name,
      videoUrl: ex.videoUrl ?? '',
      defaultParameter1: ex.defaultParameter1 ?? 'Reps',
      defaultParameter2: ex.defaultParameter2 ?? '-',
      pointsOfPerformance: ex.pointsOfPerformance ?? '',
      referenceMaxExerciseId: ex.referenceMaxExerciseId ?? undefined,
      trackAsExerciseId: ex.trackAsExerciseId ?? undefined,
      tagsStr: Array.isArray(ex.tags) ? ex.tags.join(', ') : '',
      isActive: ex.isActive,
    })
    setEditOpen(true)
    void fetchExerciseOptions()
  }

  const handleCreate = async () => {
    const tags = form.tagsStr
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    setSaving(true)
    try {
      await exerciseService.create({
        name: form.name?.trim() || undefined,
        videoUrl: form.videoUrl?.trim() || undefined,
        defaultParameter1: form.defaultParameter1?.trim() || undefined,
        defaultParameter2: form.defaultParameter2?.trim() || undefined,
        pointsOfPerformance: form.pointsOfPerformance?.trim() || undefined,
        referenceMaxExerciseId: form.referenceMaxExerciseId,
        trackAsExerciseId: form.trackAsExerciseId,
        tags: tags.length ? tags : undefined,
        isActive: form.isActive,
      })
      showSuccess('Exercise created')
      setCreateOpen(false)
      fetchList()
    } catch (e) {
      const err = e as AxiosError<{
        message?: string
        data?: { message?: string }
      }>
      showError(
        err.response?.data?.message ||
          err.response?.data?.data?.message ||
          'Failed to create'
      )
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editing) return
    setSaving(true)
    try {
      const tags = form.tagsStr
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
      await exerciseService.update(editing.id, {
        name: form.name?.trim() || undefined,
        videoUrl: form.videoUrl || undefined,
        defaultParameter1: form.defaultParameter1?.trim() || undefined,
        defaultParameter2: form.defaultParameter2?.trim() || undefined,
        pointsOfPerformance: form.pointsOfPerformance?.trim() || undefined,
        referenceMaxExerciseId: form.referenceMaxExerciseId,
        trackAsExerciseId: form.trackAsExerciseId,
        tags: tags.length ? tags : undefined,
        isActive: form.isActive,
      })
      showSuccess('Exercise updated')
      setEditOpen(false)
      setEditing(null)
      fetchList()
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const columns: Column<Exercise>[] = [
    {
      key: 'name',
      label: 'Name',
      sortable: true,
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
            .join(', ') || '—'}
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
  ]

  const formFields = (
    <>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Title (required)
        </Text>
        <Input
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Barbell Back Squat"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Text variant="default" className="text-sm font-medium mb-1 block">
            Default Parameter 1 (required)
          </Text>
          <Dropdown
            placeholder="— Select —"
            options={DEFAULT_PARAMETER_OPTIONS.map(o => ({
              value: o.value,
              label: o.label,
            }))}
            value={form.defaultParameter1 || undefined}
            onValueChange={v =>
              setForm({ ...form, defaultParameter1: (v as string) ?? '' })
            }
            fullWidth
            size="small"
          />
        </div>
        <div>
          <Text variant="default" className="text-sm font-medium mb-1 block">
            Default Parameter 2
          </Text>
          <Dropdown
            placeholder="— or dash for single —"
            options={PARAMETER_2_OPTIONS.map(o => ({
              value: o.value,
              label: o.label,
            }))}
            value={form.defaultParameter2 || undefined}
            onValueChange={v =>
              setForm({ ...form, defaultParameter2: (v as string) ?? '' })
            }
            fullWidth
            size="small"
          />
        </div>
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Video (optional) — YouTube or Vimeo URL
        </Text>
        <Input
          value={form.videoUrl}
          onChange={e => setForm({ ...form, videoUrl: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=... or Vimeo URL"
          className="mb-2"
          size="small"
        />
        {form.videoUrl && (
          <div className="mt-2">
            {(() => {
              const url = form.videoUrl.trim()
              let youtubeId: string | null = null
              let vimeoId: string | null = null
              if (url.includes('youtu.be/')) {
                youtubeId = url.split('youtu.be/')[1]?.split('?')[0] ?? null
              } else if (url.includes('youtube.com')) {
                try {
                  youtubeId = new URL(url).searchParams.get('v')
                } catch {
                  youtubeId = null
                }
              }
              if (url.includes('vimeo.com/')) {
                const m = url.match(/vimeo\.com\/(?:video\/)?(\d+)/)
                vimeoId = m ? m[1] : null
              }
              if (youtubeId) {
                return (
                  <div className="rounded-lg overflow-hidden bg-black aspect-video max-w-md">
                    <iframe
                      title="Video"
                      src={`https://www.youtube.com/embed/${youtubeId}`}
                      className="w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )
              }
              if (vimeoId) {
                return (
                  <div className="rounded-lg overflow-hidden bg-black aspect-video max-w-md">
                    <iframe
                      title="Video"
                      src={`https://player.vimeo.com/video/${vimeoId}`}
                      className="w-full h-full"
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
                  className="text-primary text-xs"
                >
                  View video
                </a>
              )
            })()}
          </div>
        )}
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Points of Performance (optional, rich text, max 10,000 chars)
        </Text>
        <textarea
          className="w-full min-h-[80px] rounded border border-gray-300 px-3 py-2 text-sm"
          value={form.pointsOfPerformance ?? ''}
          onChange={e =>
            setForm({
              ...form,
              pointsOfPerformance: e.target.value.slice(0, 10000),
            })
          }
          placeholder="Coaching cues, movement instructions. Shown to athletes."
          maxLength={10000}
        />
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Tags (optional) — select existing or type your own
        </Text>
        <Input
          value={form.tagsStr}
          onChange={e => setForm({ ...form, tagsStr: e.target.value })}
          placeholder="e.g. compound, lower body, bilateral"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Text variant="default" className="text-sm font-medium mb-1 block">
            Reference Max (optional, advanced)
          </Text>
          <Dropdown
            placeholder="— None —"
            options={[
              { value: '', label: '— None —' },
              ...exerciseOptions
                .filter(ex => ex.id !== editing?.id)
                .map(ex => ({ value: String(ex.id), label: ex.name })),
            ]}
            value={
              form.referenceMaxExerciseId != null
                ? String(form.referenceMaxExerciseId)
                : ''
            }
            onValueChange={v =>
              setForm({
                ...form,
                referenceMaxExerciseId: v ? Number(v) : undefined,
              })
            }
            fullWidth
            size="small"
          />
        </div>
        <div>
          <Text variant="default" className="text-sm font-medium mb-1 block">
            Track As (optional, advanced)
          </Text>
          <Dropdown
            placeholder="— None —"
            options={[
              { value: '', label: '— None —' },
              ...exerciseOptions
                .filter(ex => ex.id !== editing?.id)
                .map(ex => ({ value: String(ex.id), label: ex.name })),
            ]}
            value={
              form.trackAsExerciseId != null
                ? String(form.trackAsExerciseId)
                : ''
            }
            onValueChange={v =>
              setForm({
                ...form,
                trackAsExerciseId: v ? Number(v) : undefined,
              })
            }
            fullWidth
            size="small"
          />
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="ex-active"
          checked={form.isActive}
          onChange={e => setForm({ ...form, isActive: e.target.checked })}
        />
        <label htmlFor="ex-active" className="text-sm">
          Active (show in program builder)
        </label>
      </div>
    </>
  )

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <Text as="h1" variant="primary" className="text-2xl font-bold">
            Exercise Library
          </Text>
          <Text variant="secondary" className="text-sm mt-1">
            {isCoach
              ? 'Create and manage exercises. Use them when building programs.'
              : 'Create and manage exercises. Use them when building programs.'}
          </Text>
        </div>
        <Button type="button" onClick={openCreate}>
          Create exercise
        </Button>
      </div>

      {/* Search and filters */}
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <div className="w-40">
          <label
            htmlFor="ex-search"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Search
          </label>
          <Input
            id="ex-search"
            type="search"
            value={searchQ}
            onChange={e => setSearchQ(e.target.value)}
            placeholder="Name or description..."
            className="w-full"
            size="small"
          />
        </div>
        <div className="w-48">
          <label className="mb-1 block text-sm font-medium text-gray-700">
            Tags (comma-separated)
          </label>
          <Input
            value={filterTagsStr}
            onChange={e => setFilterTagsStr(e.target.value)}
            placeholder="e.g. compound, lower body"
            size="small"
            className="w-full"
          />
        </div>
        <div className="w-32">
          <Dropdown
            label="Status"
            placeholder="All"
            options={FILTER_STATUS_OPTIONS}
            value={filterActive}
            onValueChange={v =>
              setFilterActive((v as FilterStatusValue) ?? 'all')
            }
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
          onRowClick={row => openEdit(row)}
          emptyMessage="No exercises yet. Create exercises here; then select them when building programs."
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

      {createOpen && (
        <Drawer
          visible={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Create exercise"
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          width="lg"
          primaryAction={{
            label: 'Create',
            onPress: () => {
              void handleCreate()
            },
            disabled: saving,
          }}
          secondaryAction={{
            label: 'Cancel',
            onPress: () => setCreateOpen(false),
          }}
        >
          <div className="space-y-4">{formFields}</div>
        </Drawer>
      )}

      {editOpen && editing && (
        <Drawer
          visible={editOpen}
          onClose={() => {
            setEditOpen(false)
            setEditing(null)
          }}
          title="Edit exercise"
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          width="lg"
          primaryAction={{
            label: 'Save',
            onPress: () => {
              void handleUpdate()
            },
            disabled: saving,
          }}
          secondaryAction={{
            label: 'Cancel',
            onPress: () => {
              setEditOpen(false)
              setEditing(null)
            },
          }}
        >
          <div className="space-y-4">{formFields}</div>
        </Drawer>
      )}
    </div>
  )
}
