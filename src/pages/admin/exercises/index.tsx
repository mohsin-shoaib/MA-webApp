import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Drawer } from '@/components/Drawer'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
import { Chip } from '@/components/Chip'
import { Icon } from '@/components/Icon'
import { Tooltip } from '@/components/Tooltip'
import { DataTable, type Column } from '@/components/DataTable'
import { Pagination } from '@/components/Pagination'
import { exerciseService } from '@/api/exercise.service'
import type { Exercise, CreateExercisePayload } from '@/types/exercise'
import {
  DEFAULT_PARAMETER_OPTIONS,
  PARAMETER_2_OPTIONS,
} from '@/types/exercise'
import { RichTextEditor } from '@/components/RichTextEditor'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { AxiosError } from 'axios'

const POINTS_OF_PERFORMANCE_MAX_LENGTH = 10_000

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
  const [filterTags, setFilterTags] = useState<string[]>([])
  const [filterActive, setFilterActive] = useState<
    'all' | 'active' | 'inactive'
  >('all')
  const [page, setPage] = useState(1)
  const limit = 10
  const [exerciseOptions, setExerciseOptions] = useState<Exercise[]>([])
  const [form, setForm] = useState<CreateExercisePayload & { tags: string[] }>({
    name: '',
    videoUrl: '',
    defaultParameter1: 'Reps',
    defaultParameter2: '-',
    pointsOfPerformance: '',
    referenceMaxExerciseId: undefined,
    trackAsExerciseId: undefined,
    tags: [],
    isActive: true,
  })
  const [tagInputValue, setTagInputValue] = useState('')
  const [tagsDropdownOpen, setTagsDropdownOpen] = useState(false)
  const tagsBoxRef = useRef<HTMLDivElement>(null)
  const tagsListRef = useRef<HTMLDivElement>(null)
  const { showError, showSuccess } = useSnackbar()

  const filterTagsArray = filterTags

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
  }, [searchApplied, filterTags, filterActive])

  const clearFilters = () => {
    setSearchQ('')
    setSearchApplied('')
    setFilterTags([])
    setFilterActive('all')
    setPage(1)
  }

  const hasActiveFilters =
    searchQ.trim() !== '' || filterTags.length > 0 || filterActive !== 'all'

  const totalPages = Math.max(1, Math.ceil(total / limit))

  const isFormValid =
    (form.name?.trim() ?? '').length > 0 &&
    (form.defaultParameter1?.trim() ?? '').length > 0

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

  // Load exercise options (for Tags filter dropdown and form dropdowns) on mount
  useEffect(() => {
    void fetchExerciseOptions()
  }, [fetchExerciseOptions])

  const addCustomTag = useCallback((tag: string) => {
    const next = tag.trim()
    if (!next) return
    setForm(prev =>
      prev.tags.includes(next) ? prev : { ...prev, tags: [...prev.tags, next] }
    )
  }, [])

  const existingTagOptions = useMemo(() => {
    const set = new Set<string>()
    exerciseOptions.forEach(ex => {
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
  }, [exerciseOptions])

  useEffect(() => {
    if (!tagsDropdownOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        tagsBoxRef.current?.contains(target) ||
        tagsListRef.current?.contains(target)
      )
        return
      setTagsDropdownOpen(false)
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [tagsDropdownOpen])

  const openCreate = () => {
    setForm({
      name: '',
      videoUrl: '',
      defaultParameter1: 'Reps',
      defaultParameter2: '-',
      pointsOfPerformance: '',
      referenceMaxExerciseId: undefined,
      trackAsExerciseId: undefined,
      tags: [],
      isActive: true,
    })
    setTagInputValue('')
    setCreateOpen(true)
    void fetchExerciseOptions()
  }

  const openEdit = (ex: Exercise) => {
    setEditing(ex)
    const tagsRaw = ex.tags
    const tagsArray = Array.isArray(tagsRaw)
      ? tagsRaw
      : typeof tagsRaw === 'string'
        ? (() => {
            try {
              const parsed = JSON.parse(tagsRaw) as unknown
              return Array.isArray(parsed) ? (parsed as string[]) : []
            } catch {
              return []
            }
          })()
        : []
    setForm({
      name: ex.name,
      videoUrl: ex.videoUrl ?? '',
      defaultParameter1: ex.defaultParameter1 ?? 'Reps',
      defaultParameter2: ex.defaultParameter2 ?? '-',
      pointsOfPerformance: ex.pointsOfPerformance ?? '',
      referenceMaxExerciseId: ex.referenceMaxExerciseId ?? undefined,
      trackAsExerciseId: ex.trackAsExerciseId ?? undefined,
      tags: [...tagsArray],
      isActive: ex.isActive,
    })
    setTagInputValue('')
    setEditOpen(true)
    void fetchExerciseOptions()
  }

  const handleCreate = async () => {
    if (!form.name?.trim()) {
      showError('Title is required')
      return
    }
    if (!form.defaultParameter1?.trim()) {
      showError('Default Parameter 1 is required')
      return
    }
    const tags = form.tags.filter(Boolean)

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
        tags,
        isActive: form.isActive,
      })
      showSuccess('Exercise created')
      setCreateOpen(false)
      fetchList()
      fetchExerciseOptions()
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
    if (!form.name?.trim()) {
      showError('Title is required')
      return
    }
    if (!form.defaultParameter1?.trim()) {
      showError('Default Parameter 1 is required')
      return
    }
    setSaving(true)
    try {
      const tags = form.tags.filter(Boolean)
      await exerciseService.update(editing.id, {
        name: form.name?.trim() || undefined,
        videoUrl: form.videoUrl || undefined,
        defaultParameter1: form.defaultParameter1?.trim() || undefined,
        defaultParameter2: form.defaultParameter2?.trim() || undefined,
        pointsOfPerformance: form.pointsOfPerformance?.trim() || undefined,
        referenceMaxExerciseId: form.referenceMaxExerciseId,
        trackAsExerciseId: form.trackAsExerciseId,
        tags,
        isActive: form.isActive,
      })
      showSuccess('Exercise updated')
      setEditOpen(false)
      setEditing(null)
      fetchList()
      fetchExerciseOptions()
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
  ]

  const formFields = (
    <>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Title{' '}
          <span className="text-red-500" aria-hidden="true">
            *
          </span>
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
            Default Parameter 1{' '}
            <span className="text-red-500" aria-hidden="true">
              *
            </span>
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
        <div className="flex items-center gap-1.5 mb-1.5">
          <Text variant="default" className="text-sm font-medium">
            Video
          </Text>
          <Tooltip
            content="YouTube or Vimeo URL. Paste a link to show a demo video to athletes."
            position="top"
          >
            <span
              className="inline-flex text-gray-500 cursor-help"
              aria-label="Video help"
            >
              <Icon name="circle-info" family="solid" size={12} />
            </span>
          </Tooltip>
        </div>
        <Input
          value={form.videoUrl}
          onChange={e => setForm({ ...form, videoUrl: e.target.value })}
          placeholder="https://www.youtube.com/watch?v=... or https://vimeo.com/..."
          className="mb-2"
          size="small"
        />
        {form.videoUrl && form.videoUrl.trim() && (
          <div className="mt-2">
            <Text
              variant="secondary"
              className="text-xs font-medium mb-1 block"
            >
              Video preview
            </Text>
            {(() => {
              const url = form.videoUrl.trim()
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
                  <div className="rounded-lg overflow-hidden bg-black aspect-video max-w-md">
                    <iframe
                      title="Video preview"
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
                  <div className="rounded-lg overflow-hidden bg-black aspect-video max-w-md">
                    <iframe
                      title="Video preview"
                      src={`https://player.vimeo.com/video/${vimeoId}`}
                      className="w-full h-full min-h-[200px]"
                      allow="fullscreen; picture-in-picture"
                      allowFullScreen
                    />
                  </div>
                )
              }
              return (
                <>
                  <Text variant="muted" className="text-xs mb-1 block">
                    Preview available for YouTube and Vimeo URLs only.
                  </Text>
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary text-sm hover:underline"
                  >
                    Open link in new tab
                  </a>
                </>
              )
            })()}
          </div>
        )}
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Text variant="default" className="text-sm font-medium">
            Points of Performance
          </Text>
          <Tooltip
            content="Written coaching instructions, movement cues, tips. Shown to athletes when they view the exercise. Bold, lists, and links supported."
            position="top"
          >
            <span
              className="inline-flex text-gray-500 cursor-help"
              aria-label="Points of Performance help"
            >
              <Icon name="circle-info" family="solid" size={12} />
            </span>
          </Tooltip>
        </div>
        <RichTextEditor
          id="exercise-points-of-performance"
          value={form.pointsOfPerformance ?? ''}
          onChange={html => setForm({ ...form, pointsOfPerformance: html })}
          placeholder="e.g. Stand with feet shoulder-width apart, bar on upper traps. Descend by breaking at hips and knees. Drive through full foot. Maintain braced midline."
          minHeight="180px"
          maxLength={POINTS_OF_PERFORMANCE_MAX_LENGTH}
          onMaxLengthExceeded={() =>
            showError(
              `Points of Performance is limited to ${POINTS_OF_PERFORMANCE_MAX_LENGTH.toLocaleString()} characters.`
            )
          }
        />
      </div>
      <div>
        <div className="flex items-center gap-1.5 mb-1.5">
          <Text variant="default" className="text-sm font-medium">
            Tags
          </Text>
          <Tooltip
            content="Open the dropdown to select existing tags, or type your own in the box and press Enter or click Add. Tags are saved with the exercise."
            position="top"
          >
            <span
              className="inline-flex text-gray-500 cursor-help"
              aria-label="Tags help"
            >
              <Icon name="circle-info" family="solid" size={12} />
            </span>
          </Tooltip>
        </div>
        <div
          ref={tagsBoxRef}
          role="combobox"
          aria-expanded={tagsDropdownOpen}
          aria-haspopup="listbox"
          tabIndex={0}
          className="flex flex-wrap items-center gap-2 min-h-[38px] px-3 py-2 rounded-lg border border-gray-300 bg-white cursor-text"
          onClick={() => setTagsDropdownOpen(true)}
          onKeyDown={e => {
            if (e.key === 'ArrowDown' || e.key === 'F4') {
              e.preventDefault()
              setTagsDropdownOpen(true)
            }
          }}
        >
          {form.tags.map(tag => (
            <span
              key={tag}
              role="group"
              onClick={e => e.stopPropagation()}
              onKeyDown={e => e.stopPropagation()}
            >
              <Chip
                label={tag}
                size="small"
                variant="secondary"
                removable
                onRemove={() =>
                  setForm(prev => ({
                    ...prev,
                    tags: prev.tags.filter(t => t !== tag),
                  }))
                }
              />
            </span>
          ))}
          <input
            type="text"
            value={tagInputValue}
            onChange={e => setTagInputValue(e.target.value)}
            onKeyDown={e => {
              e.stopPropagation()
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addCustomTag(tagInputValue.trim())
                setTagInputValue('')
              }
              if (e.key === 'Escape') setTagsDropdownOpen(false)
            }}
            onFocus={() => setTagsDropdownOpen(true)}
            placeholder="Select tags or type your own"
            className="flex-1 min-w-[120px] outline-none text-sm py-0.5 border-0 bg-transparent placeholder:text-gray-400"
          />
          <Button
            type="button"
            variant="ghost"
            size="small"
            className="shrink-0"
            onClick={e => {
              e.stopPropagation()
              addCustomTag(tagInputValue.trim())
              setTagInputValue('')
            }}
          >
            Add
          </Button>
          <Icon
            name={tagsDropdownOpen ? 'chevron-up' : 'chevron-down'}
            family="solid"
            size={14}
            className="shrink-0 text-gray-500 pointer-events-none"
          />
        </div>
        {tagsDropdownOpen &&
          tagsBoxRef.current &&
          createPortal(
            <div
              ref={tagsListRef}
              role="listbox"
              className="fixed z-50 max-h-60 overflow-auto rounded-lg border border-gray-300 bg-white shadow-lg py-1 min-w-[200px]"
              style={{
                top: tagsBoxRef.current.getBoundingClientRect().bottom + 4,
                left: tagsBoxRef.current.getBoundingClientRect().left,
                width: Math.max(
                  tagsBoxRef.current.getBoundingClientRect().width,
                  220
                ),
              }}
              onMouseDown={e => e.preventDefault()}
            >
              {existingTagOptions.length === 0 ? (
                <div className="px-3 py-4 text-center">
                  <Text variant="muted" className="text-sm">
                    No tags in library yet. Type above and press Enter to add.
                  </Text>
                </div>
              ) : (
                existingTagOptions.map(opt => {
                  const selected = form.tags.includes(opt.value)
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                      onClick={e => {
                        e.preventDefault()
                        setForm(prev => ({
                          ...prev,
                          tags: selected
                            ? prev.tags.filter(t => t !== opt.value)
                            : [...prev.tags, opt.value],
                        }))
                      }}
                    >
                      <span
                        className={[
                          'shrink-0 w-4 h-4 rounded border-2 flex items-center justify-center',
                          selected
                            ? 'bg-[#3AB8ED] border-[#3AB8ED]'
                            : 'border-gray-300 bg-white',
                        ].join(' ')}
                      >
                        {selected && (
                          <Icon
                            name="check"
                            family="solid"
                            size={10}
                            className="text-white"
                          />
                        )}
                      </span>
                      <span>{opt.label}</span>
                    </button>
                  )
                })
              )}
            </div>,
            document.body
          )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <Text variant="default" className="text-sm font-medium">
              Reference Max
            </Text>
            <Tooltip
              content={`Which exercise's working max to use when percentages are prescribed. e.g. "Pause Back Squat" can reference "Back Squat" so 75% uses the athlete's Back Squat max.`}
              position="top"
            >
              <span
                className="inline-flex text-gray-500 cursor-help"
                aria-label="Reference Max help"
              >
                <Icon name="circle-info" family="solid" size={12} />
              </span>
            </Tooltip>
          </div>
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
          <div className="flex items-center gap-1.5 mb-1.5">
            <Text variant="default" className="text-sm font-medium">
              Track As
            </Text>
            <Tooltip
              content={`Link this exercise's logged data to another for history, PRs, and working max. e.g. "Low Bar Back Squat" can track as "Back Squat" so all squat variations feed one history.`}
              position="top"
            >
              <span
                className="inline-flex text-gray-500 cursor-help"
                aria-label="Track As help"
              >
                <Icon name="circle-info" family="solid" size={12} />
              </span>
            </Tooltip>
          </div>
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
          <Dropdown
            label="Tags"
            placeholder="All tags"
            options={existingTagOptions}
            value={filterTags}
            onValueChange={v =>
              setFilterTags(Array.isArray(v) ? v : v != null ? [v] : [])
            }
            multiple
            size="small"
            fullWidth
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
            disabled: saving || !isFormValid,
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
            disabled: saving || !isFormValid,
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
