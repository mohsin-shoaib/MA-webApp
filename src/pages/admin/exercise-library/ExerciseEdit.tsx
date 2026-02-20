import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Spinner } from '@/components/Spinner'
import { Text } from '@/components/Text'
import { exerciseService } from '@/api/exercise.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { Exercise } from '@/types/exercise'
import { AxiosError } from 'axios'
import { ExerciseForm } from './ExerciseForm'

export default function AdminExerciseEditPage() {
  const { id } = useParams<{ id: string }>()
  const { showError } = useSnackbar()
  const [exercise, setExercise] = useState<Exercise | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!id) return
    const numId = Number.parseInt(id, 10)
    if (Number.isNaN(numId)) {
      queueMicrotask(() => setLoading(false))
      return
    }
    exerciseService
      .getById(numId)
      .then(res => {
        if (res.data.statusCode === 200 && res.data.data) {
          setExercise(res.data.data)
        }
      })
      .catch((err: AxiosError<{ message?: string }>) => {
        showError(
          err.response?.data?.message ??
            err.message ??
            'Failed to load exercise.'
        )
      })
      .finally(() => setLoading(false))
  }, [id, showError])

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl flex items-center gap-2 py-8">
        <Spinner size="small" variant="primary" />
        <Text variant="secondary">Loading…</Text>
      </div>
    )
  }

  if (!exercise) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Text variant="secondary">Exercise not found.</Text>
      </div>
    )
  }

  return <ExerciseForm initialData={exercise} isEdit={true} />
}
