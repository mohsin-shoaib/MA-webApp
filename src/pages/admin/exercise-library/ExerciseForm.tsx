import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Checkbox } from '@/components/Checkbox'
import { useFileUpload } from '@/hooks/useFileUpload'
import { FileType } from '@/constants/fileTypes'
import { exerciseService } from '@/api/exercise.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type {
  Exercise,
  ExerciseTags,
  AdminExerciseCreateUpdatePayload,
} from '@/types/exercise'
import type { AxiosError } from 'axios'

function tagsFromStrings(
  muscle: string,
  equipment: string,
  pattern: string
): ExerciseTags {
  const split = (s: string) =>
    s
      .split(',')
      .map(t => t.trim())
      .filter(Boolean)
  return {
    muscleGroup: split(muscle).length ? split(muscle) : undefined,
    equipment: split(equipment).length ? split(equipment) : undefined,
    movementPattern: split(pattern).length ? split(pattern) : undefined,
  }
}

function stringsFromTags(tags?: ExerciseTags | null): {
  muscle: string
  equipment: string
  pattern: string
} {
  if (!tags) return { muscle: '', equipment: '', pattern: '' }
  return {
    muscle: (tags.muscleGroup ?? []).join(', '),
    equipment: (tags.equipment ?? []).join(', '),
    pattern: (tags.movementPattern ?? []).join(', '),
  }
}

interface ExerciseFormProps {
  readonly initialData?: Exercise | null
  readonly isEdit: boolean
}

export function ExerciseForm({ initialData, isEdit }: ExerciseFormProps) {
  const navigate = useNavigate()
  const { showError, showSuccess } = useSnackbar()
  const [name, setName] = useState(initialData?.name ?? '')
  const [description, setDescription] = useState(initialData?.description ?? '')
  const [videoUrl, setVideoUrl] = useState(initialData?.videoUrl ?? '')
  const [muscleGroupStr, setMuscleGroupStr] = useState(
    stringsFromTags(initialData?.tags).muscle
  )
  const [equipmentStr, setEquipmentStr] = useState(
    stringsFromTags(initialData?.tags).equipment
  )
  const [movementPatternStr, setMovementPatternStr] = useState(
    stringsFromTags(initialData?.tags).pattern
  )
  const [isActive, setIsActive] = useState(initialData?.isActive ?? true)
  const [rpe, setRpe] = useState<number | ''>(initialData?.rpe ?? '')
  const [loadingPercent, setLoadingPercent] = useState<number | ''>(
    initialData?.loadingPercent ?? ''
  )
  const [tempo, setTempo] = useState(initialData?.tempo ?? '')
  const [restSeconds, setRestSeconds] = useState<number | ''>(
    initialData?.restSeconds ?? ''
  )
  const [coachingNotes, setCoachingNotes] = useState(
    initialData?.coachingNotes ?? ''
  )
  const [saving, setSaving] = useState(false)

  const { upload, uploading } = useFileUpload({
    fileType: FileType.PROGRAM_VIDEO,
    onError: err => showError(err.message),
  })

  const handleVideoSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (!file) return
      try {
        const url = await upload(file)
        setVideoUrl(url)
        showSuccess('Video uploaded.')
      } catch {
        // onError already called
      }
    },
    [upload, showSuccess]
  )

  const handleSubmit = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      showError('Name is required.')
      return
    }
    const payload: AdminExerciseCreateUpdatePayload = {
      name: name.trim(),
      description: description.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      tags: tagsFromStrings(muscleGroupStr, equipmentStr, movementPatternStr),
      isActive,
      rpe: typeof rpe === 'number' ? rpe : undefined,
      loadingPercent:
        typeof loadingPercent === 'number' ? loadingPercent : undefined,
      tempo: tempo.trim() || undefined,
      restSeconds: typeof restSeconds === 'number' ? restSeconds : undefined,
      coachingNotes: coachingNotes.trim() || undefined,
    }
    try {
      setSaving(true)
      if (isEdit && initialData?.id) {
        await exerciseService.update(initialData.id, payload)
        showSuccess('Exercise updated.')
      } else {
        await exerciseService.create(payload)
        showSuccess('Exercise created.')
      }
      navigate('/admin/exercises')
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message ?? ax.message ?? 'Failed to save.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/admin/exercises')}
        >
          ← Back to list
        </Button>
        <Text variant="primary" className="text-2xl font-semibold">
          {isEdit ? 'Edit Exercise' : 'Create Exercise'}
        </Text>
      </div>

      <Card className="p-0">
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <Input
            label="Name"
            required
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Barbell Back Squat"
          />
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description (optional)
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#3AB8ED]/30 focus:border-[#3AB8ED] outline-none min-h-[80px]"
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Exercise description"
            />
          </div>
          <div>
            <label
              htmlFor="exercise-video-upload"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Video
            </label>
            <div className="flex flex-wrap items-center gap-2">
              <input
                id="exercise-video-upload"
                type="file"
                accept="video/mp4,video/webm,video/quicktime"
                onChange={handleVideoSelect}
                disabled={uploading}
                className="text-sm"
              />
              {uploading && (
                <Text variant="secondary" className="text-sm">
                  Uploading…
                </Text>
              )}
              {videoUrl && (
                <a
                  href={videoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#3AB8ED] hover:underline text-sm"
                >
                  View current
                </a>
              )}
            </div>
          </div>
          <Input
            label="Muscle group (comma-separated)"
            placeholder="e.g. Quadriceps, Glutes"
            value={muscleGroupStr}
            onChange={e => setMuscleGroupStr(e.target.value)}
          />
          <Input
            label="Equipment (comma-separated)"
            placeholder="e.g. Barbell, Rack"
            value={equipmentStr}
            onChange={e => setEquipmentStr(e.target.value)}
          />
          <Input
            label="Movement pattern (comma-separated)"
            placeholder="e.g. Squat"
            value={movementPatternStr}
            onChange={e => setMovementPatternStr(e.target.value)}
          />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="RPE (1–10)"
              type="number"
              min={1}
              max={10}
              step={0.5}
              placeholder="e.g. 8"
              value={rpe === '' ? '' : String(rpe)}
              onChange={e => {
                const v = e.target.value
                setRpe(v === '' ? '' : Number(v))
              }}
            />
            <Input
              label="Loading %"
              type="number"
              min={0}
              max={100}
              step={5}
              placeholder="e.g. 80"
              value={loadingPercent === '' ? '' : String(loadingPercent)}
              onChange={e => {
                const v = e.target.value
                setLoadingPercent(v === '' ? '' : Number(v))
              }}
            />
            <Input
              label="Tempo (e.g. 3-1-2-0)"
              placeholder="3-1-2-0"
              value={tempo}
              onChange={e => setTempo(e.target.value)}
            />
            <Input
              label="Rest (seconds)"
              type="number"
              min={0}
              placeholder="e.g. 90"
              value={restSeconds === '' ? '' : String(restSeconds)}
              onChange={e => {
                const v = e.target.value
                setRestSeconds(v === '' ? '' : Number(v))
              }}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Coaching notes (optional)
            </label>
            <textarea
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#3AB8ED]/30 focus:border-[#3AB8ED] outline-none min-h-[60px]"
              value={coachingNotes}
              onChange={e => setCoachingNotes(e.target.value)}
              placeholder="Coaching cues, progressions, etc."
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              checked={isActive}
              onValueChange={setIsActive}
              label="Active"
            />
          </div>
          <div className="flex gap-2 pt-2">
            <Button type="submit" disabled={saving}>
              {saving ? 'Saving…' : isEdit ? 'Update' : 'Create'}
            </Button>
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate('/admin/exercises')}
            >
              Cancel
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
