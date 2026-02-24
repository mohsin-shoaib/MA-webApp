import type { ReactNode } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
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

export default function AdminExercises() {
  const [list, setList] = useState<Exercise[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<Exercise | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
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
      const res = await exerciseService.getAll({ page: 1, limit: 500 })
      if (res.data?.statusCode === 200 && res.data.data?.rows) {
        setList(res.data.data.rows)
      } else {
        setList([])
      }
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to load exercises')
      setList([])
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    fetchList()
  }, [fetchList])

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
  }

  const handleCreate = async () => {
    if (!form.name.trim()) {
      showError('Name is required')
      return
    }
    setSaving(true)
    try {
      const tags = form.tagsStr
        .split(',')
        .map(t => t.trim())
        .filter(Boolean)
      await exerciseService.create({
        name: form.name.trim(),
        description: form.description?.trim() || undefined,
        videoUrl: form.videoUrl || undefined,
        muscleGroup: form.muscleGroup || undefined,
        equipment: form.equipment || undefined,
        movementPattern: form.movementPattern || undefined,
        tags: tags.length ? tags : undefined,
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

  const handleDelete = async () => {
    if (deleteId == null) return
    setSaving(true)
    try {
      await exerciseService.delete(deleteId)
      showSuccess('Exercise deleted')
      setDeleteId(null)
      fetchList()
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  const toggleSubstitution = (id: number) => {
    const ids = form.substitutionIds ?? []
    if (ids.includes(id)) {
      setForm({ ...form, substitutionIds: ids.filter(x => x !== id) })
    } else {
      setForm({ ...form, substitutionIds: [...ids, id] })
    }
  }

  let cardContent: ReactNode
  if (loading) {
    cardContent = (
      <div className="flex items-center gap-2 py-8">
        <Spinner size="small" variant="primary" />
        <Text variant="secondary">Loading...</Text>
      </div>
    )
  } else if (list.length === 0) {
    cardContent = (
      <Text variant="secondary">
        No exercises yet. Create exercises here; then select them when building
        programs.
      </Text>
    )
  } else {
    const sorted = [...list].sort((a, b) => a.name.localeCompare(b.name))
    cardContent = (
      <ul className="space-y-3">
        {sorted.map(ex => (
          <li
            key={ex.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 last:border-0"
          >
            <div>
              <Text variant="default" className="font-medium text-sm">
                {ex.name}
              </Text>
              <div className="flex flex-wrap gap-2 mt-1">
                {ex.muscleGroup && (
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {ex.muscleGroup}
                  </span>
                )}
                {ex.equipment && (
                  <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                    {ex.equipment}
                  </span>
                )}
                {Array.isArray(ex.tags) && ex.tags.length > 0 && (
                  <span className="text-xs text-gray-500">
                    {ex.tags.join(', ')}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => openEdit(ex)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => setDeleteId(ex.id)}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    )
  }

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
          Description
        </Text>
        <textarea
          className="w-full min-h-[60px] rounded border border-gray-300 px-3 py-2 text-sm"
          value={form.description}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Instructions or notes"
        />
      </div>
      <div>
        <Text variant="secondary" className="text-sm font-medium mb-1 block">
          Video Upload
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
          Muscle group
        </Text>
        <select
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          value={form.muscleGroup}
          onChange={e => setForm({ ...form, muscleGroup: e.target.value })}
        >
          <option value="">—</option>
          {MUSCLE_GROUPS.map(g => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Equipment
        </Text>
        <select
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          value={form.equipment}
          onChange={e => setForm({ ...form, equipment: e.target.value })}
        >
          <option value="">—</option>
          {EQUIPMENT.map(g => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Movement pattern
        </Text>
        <select
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          value={form.movementPattern}
          onChange={e => setForm({ ...form, movementPattern: e.target.value })}
        >
          <option value="">—</option>
          {MOVEMENT_PATTERNS.map(g => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Tags (comma-separated)
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
          {list
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
          {list.filter(ex => ex.id !== editing?.id).length === 0 && (
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
            Create and manage exercises. Use them when building programs.
          </Text>
        </div>
        <Button type="button" onClick={openCreate}>
          Create exercise
        </Button>
      </div>

      <Card className="p-6">{cardContent}</Card>

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
            disabled: saving || uploadingVideo,
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

      {deleteId != null && (
        <Modal
          visible={deleteId != null}
          onClose={() => setDeleteId(null)}
          title="Delete exercise?"
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          primaryAction={{
            label: 'Delete',
            onPress: () => {
              void handleDelete()
            },
            disabled: saving || uploadingVideo,
          }}
          secondaryAction={{
            label: 'Cancel',
            onPress: () => setDeleteId(null),
          }}
        >
          <Text variant="secondary">
            This will remove the exercise from the library. Programs that use it
            may need to be updated.
          </Text>
        </Modal>
      )}
    </div>
  )
}
