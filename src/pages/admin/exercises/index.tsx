import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
import { DataTable, type Column } from '@/components/DataTable'
import { Pagination } from '@/components/Pagination'
import { exerciseService } from '@/api/exercise.service'
import { useFileUpload } from '@/hooks/useFileUpload'
import { FileType } from '@/constants/fileTypes'
import type { Exercise, CreateExercisePayload } from '@/types/exercise'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { AxiosError } from 'axios'

const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Quadriceps',
  'Hamstrings',
  'Glutes',
  'Calves',
  'Biceps',
  'Triceps',
  'Core',
  'Full body',
  'Other',
]

const EQUIPMENT = [
  'Barbell',
  'Dumbbell',
  'Kettlebell',
  'Bodyweight',
  'Bands',
  'Cable',
  'Machine',
  'Medicine ball',
  'TRX',
  'Other',
]

const MOVEMENT_PATTERNS = [
  'Squat',
  'Hinge',
  'Push',
  'Pull',
  'Lunge',
  'Carry',
  'Core',
  'Other',
]

const FILTER_MUSCLE_OPTIONS = [
  { value: '', label: 'All' },
  ...MUSCLE_GROUPS.map(g => ({ value: g, label: g })),
]
const FILTER_EQUIPMENT_OPTIONS = [
  { value: '', label: 'All' },
  ...EQUIPMENT.map(g => ({ value: g, label: g })),
]
const FILTER_MOVEMENT_OPTIONS = [
  { value: '', label: 'All' },
  ...MOVEMENT_PATTERNS.map(g => ({ value: g, label: g })),
]
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
  const [filterMuscleGroup, setFilterMuscleGroup] = useState('')
  const [filterEquipment, setFilterEquipment] = useState('')
  const [filterMovementPattern, setFilterMovementPattern] = useState('')
  const [filterActive, setFilterActive] = useState<
    'all' | 'active' | 'inactive'
  >('all')
  const [page, setPage] = useState(1)
  const limit = 10
  const [substitutionOptions, setSubstitutionOptions] = useState<Exercise[]>([])
  const [form, setForm] = useState<CreateExercisePayload & { tagsStr: string }>(
    {
      name: '',
      description: '',
      videoUrl: '',
      muscleGroup: '',
      equipment: '',
      movementPattern: '',
      tagsStr: '',
      substitutionIds: [],
      isActive: true,
    }
  )
  const { showError, showSuccess } = useSnackbar()

  const { upload: uploadVideo, uploading: uploadingVideo } = useFileUpload({
    fileType: FileType.PROGRAM_VIDEO,
    onError: err => showError(err.message),
  })

  const handleVideoUpload = useCallback(
    async (file: File) => {
      if (uploadingVideo) {
        showError('Please wait for the current upload to complete')
        return
      }
      try {
        const videoUrl = await uploadVideo(file)
        if (!videoUrl) throw new Error('No video URL returned')
        setForm(prev => ({ ...prev, videoUrl }))
        showSuccess('Video uploaded successfully')
      } catch {
        // onError already called by useFileUpload
      }
    },
    [uploadVideo, uploadingVideo, showError, showSuccess]
  )

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      const query: Parameters<typeof exerciseService.getAll>[0] = {
        page,
        limit,
        ...(searchApplied.trim() && { q: searchApplied.trim() }),
        ...(filterMuscleGroup && { muscleGroup: filterMuscleGroup }),
        ...(filterEquipment && { equipment: filterEquipment }),
        ...(filterMovementPattern && {
          movementPattern: filterMovementPattern,
        }),
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
  }, [
    showError,
    page,
    searchApplied,
    filterMuscleGroup,
    filterEquipment,
    filterMovementPattern,
    filterActive,
  ])

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
  }, [
    searchApplied,
    filterMuscleGroup,
    filterEquipment,
    filterMovementPattern,
    filterActive,
  ])

  const clearFilters = () => {
    setSearchQ('')
    setSearchApplied('')
    setFilterMuscleGroup('')
    setFilterEquipment('')
    setFilterMovementPattern('')
    setFilterActive('all')
    setPage(1)
  }

  const hasActiveFilters =
    searchQ.trim() !== '' ||
    filterMuscleGroup !== '' ||
    filterEquipment !== '' ||
    filterMovementPattern !== '' ||
    filterActive !== 'all'

  const totalPages = Math.max(1, Math.ceil(total / limit))
  const resultCountLabel = loading
    ? 'Loading...'
    : total === 1
      ? '1 exercise'
      : `${total} exercises`

  const fetchSubstitutionOptions = useCallback(async () => {
    try {
      const res = await exerciseService.getAll({ limit: 500 })
      const rows = res.data?.data?.rows ?? []
      setSubstitutionOptions(rows)
    } catch {
      setSubstitutionOptions([])
    }
  }, [])

  const openCreate = () => {
    setForm({
      name: '',
      description: '',
      videoUrl: '',
      muscleGroup: '',
      equipment: '',
      movementPattern: '',
      tagsStr: '',
      substitutionIds: [],
      isActive: true,
    })
    setCreateOpen(true)
    void fetchSubstitutionOptions()
  }

  const openEdit = (ex: Exercise) => {
    setEditing(ex)
    setForm({
      name: ex.name,
      description: ex.description ?? '',
      videoUrl: ex.videoUrl ?? '',
      muscleGroup: ex.muscleGroup ?? '',
      equipment: ex.equipment ?? '',
      movementPattern: ex.movementPattern ?? '',
      tagsStr: Array.isArray(ex.tags) ? ex.tags.join(', ') : '',
      substitutionIds: ex.substitutionIds ?? [],
      isActive: ex.isActive,
    })
    setEditOpen(true)
    void fetchSubstitutionOptions()
  }

  const handleCreate = async () => {
    const name = form.name.trim()
    const description = form.description?.trim()
    const videoUrl = form.videoUrl?.trim()
    const muscleGroup = form.muscleGroup?.trim()
    const equipment = form.equipment?.trim()
    const movementPattern = form.movementPattern?.trim()
    const tags = form.tagsStr
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)

    if (!name) {
      showError('Name is required')
      return
    }
    if (!description) {
      showError('Description is required')
      return
    }
    if (!videoUrl) {
      showError('Video is required. Please upload a video.')
      return
    }
    if (!muscleGroup) {
      showError('Muscle group is required')
      return
    }
    if (!equipment) {
      showError('Equipment is required')
      return
    }
    if (!movementPattern) {
      showError('Movement pattern is required')
      return
    }
    if (tags.length === 0) {
      showError('At least one tag is required')
      return
    }

    setSaving(true)
    try {
      await exerciseService.create({
        name,
        description,
        videoUrl,
        muscleGroup,
        equipment,
        movementPattern,
        tags,
        substitutionIds: form.substitutionIds?.length
          ? form.substitutionIds
          : undefined,
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
    if (!editing || !form.name.trim()) {
      showError('Name is required')
      return
    }
    setSaving(true)
    try {
      const tags = form.tagsStr
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
      await exerciseService.update(editing.id, {
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        videoUrl: form.videoUrl || undefined,
        muscleGroup: form.muscleGroup || undefined,
        equipment: form.equipment || undefined,
        movementPattern: form.movementPattern || undefined,
        tags: tags.length ? tags : undefined,
        substitutionIds: form.substitutionIds,
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

  const isCreateFormValid =
    form.name.trim() !== '' &&
    (form.description?.trim() ?? '') !== '' &&
    (form.videoUrl?.trim() ?? '') !== '' &&
    (form.muscleGroup?.trim() ?? '') !== '' &&
    (form.equipment?.trim() ?? '') !== '' &&
    (form.movementPattern?.trim() ?? '') !== '' &&
    form.tagsStr.split(',').some(t => t.trim() !== '')

  const toggleSubstitution = (id: number) => {
    const ids = form.substitutionIds ?? []
    if (ids.includes(id)) {
      setForm({ ...form, substitutionIds: ids.filter(x => x !== id) })
    } else {
      setForm({ ...form, substitutionIds: [...ids, id] })
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
      key: 'muscleGroup',
      label: 'Muscle group',
      sortable: true,
      render: value => (
        <Text variant="secondary" className="text-sm">
          {(value as string) || '—'}
        </Text>
      ),
    },
    {
      key: 'equipment',
      label: 'Equipment',
      sortable: true,
      render: value => (
        <Text variant="secondary" className="text-sm">
          {(value as string) || '—'}
        </Text>
      ),
    },
    {
      key: 'movementPattern',
      label: 'Movement',
      sortable: true,
      render: value => (
        <Text variant="secondary" className="text-sm">
          {(value as string) || '—'}
        </Text>
      ),
    },
    {
      key: 'isApproved',
      label: 'Status',
      sortable: true,
      render: value => (
        <Text
          variant="secondary"
          className={`text-sm ${value ? 'text-green-600' : 'text-amber-600'}`}
        >
          {value ? 'Approved' : 'Pending'}
        </Text>
      ),
    },
    {
      key: 'id',
      label: 'Actions',
      sortable: false,
      width: isCoach ? '100px' : '140px',
      render: (_value, row) => (
        <div className="flex items-center gap-2">
          {!isCoach && !row.isApproved && (
            <Button
              type="button"
              variant="primary"
              size="small"
              onClick={async () => {
                try {
                  await exerciseService.approve(row.id)
                  showSuccess('Exercise approved')
                  fetchList()
                } catch (e) {
                  const err = e as AxiosError<{ message?: string }>
                  showError(err.response?.data?.message || 'Failed to approve')
                }
              }}
            >
              Approve
            </Button>
          )}
          {(!isCoach || !row.isApproved) && (
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => openEdit(row)}
            >
              Edit
            </Button>
          )}
        </div>
      ),
    },
  ]

  const formFields = (
    <>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Name *
        </Text>
        <Input
          value={form.name}
          onChange={e => setForm({ ...form, name: e.target.value })}
          placeholder="e.g. Barbell Back Squat"
        />
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Description *
        </Text>
        <textarea
          className="w-full min-h-[60px] rounded border border-gray-300 px-3 py-2 text-sm"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Instructions or notes"
        />
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Video Upload *
        </Text>
        <input
          type="file"
          accept="video/*"
          onChange={e => {
            const file = e.target.files?.[0]
            if (file) {
              handleVideoUpload(file)
            }
          }}
          className="w-full p-2 border border-mid-gray rounded-lg text-sm"
          disabled={uploadingVideo}
        />
        {form.videoUrl && (
          <a
            href={form.videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary text-xs mt-1 block"
          >
            View Video
          </a>
        )}
        {uploadingVideo && (
          <Text variant="muted" className="text-xs mt-1">
            Uploading...
          </Text>
        )}
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Muscle group *
        </Text>
        <select
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          value={form.muscleGroup}
          onChange={e => setForm({ ...form, muscleGroup: e.target.value })}
        >
          <option value="">— Select —</option>
          {MUSCLE_GROUPS.map(g => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Equipment *
        </Text>
        <select
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          value={form.equipment}
          onChange={e => setForm({ ...form, equipment: e.target.value })}
        >
          <option value="">— Select —</option>
          {EQUIPMENT.map(g => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Movement pattern *
        </Text>
        <select
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          value={form.movementPattern}
          onChange={e => setForm({ ...form, movementPattern: e.target.value })}
        >
          <option value="">— Select —</option>
          {MOVEMENT_PATTERNS.map(g => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Tags (comma-separated) *
        </Text>
        <Input
          value={form.tagsStr}
          onChange={e => setForm({ ...form, tagsStr: e.target.value })}
          placeholder="e.g. compound, lower body"
        />
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Substitutions
        </Text>
        <p className="text-xs text-gray-500 mb-1">
          Select alternative exercises from the library.
        </p>
        <div className="max-h-32 overflow-y-auto border border-gray-200 rounded p-2 space-y-1">
          {substitutionOptions
            .filter(ex => ex.id !== editing?.id)
            .map(ex => (
              <label
                key={ex.id}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={form.substitutionIds?.includes(ex.id) ?? false}
                  onChange={() => toggleSubstitution(ex.id)}
                />
                <span className="text-sm">{ex.name}</span>
              </label>
            ))}
          {substitutionOptions.filter(ex => ex.id !== editing?.id).length ===
            0 && (
            <Text variant="muted" className="text-xs">
              No other exercises in library yet.
            </Text>
          )}
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
              ? 'Add exercises for programs. New exercises need admin approval before they appear in the program builder.'
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
        <div className="w-40">
          <Dropdown
            label="Muscle group"
            placeholder="All"
            options={FILTER_MUSCLE_OPTIONS}
            value={filterMuscleGroup}
            onValueChange={v => setFilterMuscleGroup((v as string) ?? '')}
            size="small"
            fullWidth
          />
        </div>
        <div className="w-40">
          <Dropdown
            label="Equipment"
            placeholder="All"
            options={FILTER_EQUIPMENT_OPTIONS}
            value={filterEquipment}
            onValueChange={v => setFilterEquipment((v as string) ?? '')}
            size="small"
            fullWidth
          />
        </div>
        <div className="w-40">
          <Dropdown
            label="Movement"
            placeholder="All"
            options={FILTER_MOVEMENT_OPTIONS}
            value={filterMovementPattern}
            onValueChange={v => setFilterMovementPattern((v as string) ?? '')}
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
        <Modal
          visible={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Create exercise"
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          primaryAction={{
            label: 'Create',
            onPress: () => {
              void handleCreate()
            },
            disabled: saving || uploadingVideo || !isCreateFormValid,
          }}
          secondaryAction={{
            label: 'Cancel',
            onPress: () => setCreateOpen(false),
          }}
        >
          <div className="space-y-4">{formFields}</div>
        </Modal>
      )}

      {editOpen && editing && (
        <Modal
          visible={editOpen}
          onClose={() => {
            setEditOpen(false)
            setEditing(null)
          }}
          title="Edit exercise"
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          primaryAction={{
            label: 'Save',
            onPress: () => {
              void handleUpdate()
            },
            disabled: saving || uploadingVideo,
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
        </Modal>
      )}
    </div>
  )
}
