import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { trainService } from '@/api/train.service'
import type { DailyExerciseDTO, ExerciseDTO } from '@/types/program'
import type { AxiosError } from 'axios'

export default function WorkoutPlayer() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionIdParam = searchParams.get('sessionId')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dayExercise, setDayExercise] = useState<DailyExerciseDTO | null>(null)
  const [phase, setPhase] = useState<string>('')
  const [weekIndex, setWeekIndex] = useState<number>(0)
  const [dayKey, setDayKey] = useState<string>('')
  const [sessionId, setSessionId] = useState<number | null>(
    sessionIdParam ? Number(sessionIdParam) : null
  )
  const [status, setStatus] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)

  useEffect(() => {
    const cancelled = { current: false }
    queueMicrotask(() => {
      if (cancelled.current) return
      setLoading(true)
      setError(null)
      trainService
        .getTodayWorkout()
        .then(res => {
          if (cancelled.current) return
          const apiRes = res.data
          if (apiRes.statusCode === 200 && apiRes.data) {
            const d = apiRes.data
            setDayExercise(d.dayExercise)
            setPhase(d.phase)
            setWeekIndex(d.weekIndex)
            setDayKey(d.dayKey ?? d.dayExercise?.day ?? d.date ?? '')
            if (d.sessionId) setSessionId(d.sessionId)
            setStatus(d.status ?? null)
          } else {
            setError(apiRes.message || 'No workout for today.')
          }
        })
        .catch((err: AxiosError<{ message?: string }>) => {
          if (cancelled.current) return
          setError(
            err.response?.data?.message ||
              err.message ||
              'Failed to load workout.'
          )
        })
        .finally(() => {
          if (!cancelled.current) setLoading(false)
        })
    })
    return () => {
      cancelled.current = true
    }
  }, [])

  const handleMarkComplete = () => {
    if (!sessionId) {
      setError('Start a session first.')
      return
    }
    setCompleting(true)
    setError(null)
    trainService
      .updateSession(sessionId, {
        status: 'completed',
        complianceType: 'quick_toggle',
      })
      .then(() => {
        setStatus('completed')
        navigate('/train')
      })
      .catch((err: AxiosError<{ message?: string }>) => {
        setError(
          err.response?.data?.message || err.message || 'Failed to complete.'
        )
      })
      .finally(() => setCompleting(false))
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8">
        <Spinner size="medium" variant="primary" />
        <Text variant="secondary">Loading workout...</Text>
      </div>
    )
  }

  if (error && !dayExercise) {
    return (
      <div className="space-y-4">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/train')}
        >
          Back to Train
        </Button>
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded">
          <Text variant="default">{error}</Text>
        </div>
      </div>
    )
  }

  const exercises: ExerciseDTO[] = dayExercise?.exercises ?? []

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="ghost"
          onClick={() => navigate('/train')}
        >
          ← Back to Train
        </Button>
      </div>

      <Card className="p-6">
        <Text variant="primary" className="text-xl font-semibold mb-1">
          {dayExercise?.exercise_name || dayKey}
        </Text>
        <Text variant="secondary" className="text-sm">
          {phase} • Week {weekIndex} • {dayKey}
        </Text>
      </Card>

      <div className="space-y-4">
        <Text variant="default" className="font-semibold">
          Exercises
        </Text>
        {exercises.length === 0 ? (
          <Text variant="secondary">No exercises for this day.</Text>
        ) : (
          exercises.map((ex, idx) => (
            <Card key={ex.exercise_id ?? idx} className="p-4">
              <Text variant="default" className="font-medium">
                {ex.name}
              </Text>
              {ex.description && (
                <Text variant="secondary" className="text-sm mt-1">
                  {ex.description}
                </Text>
              )}
              {(ex.sets != null || ex.total_reps != null || ex.lb != null) && (
                <Text variant="secondary" className="text-sm mt-1">
                  {[
                    ex.sets != null && `${ex.sets} sets`,
                    ex.total_reps != null && `${ex.total_reps} reps`,
                    ex.lb != null && `${ex.lb} lb`,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </Text>
              )}
              {ex.video && (
                <a
                  href={ex.video}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline mt-2 inline-block"
                >
                  Watch video
                </a>
              )}
            </Card>
          ))
        )}
      </div>

      {status !== 'completed' && (
        <Card className="p-6">
          <Button
            type="button"
            onClick={handleMarkComplete}
            loading={completing}
            disabled={completing}
            className="w-full"
          >
            {completing ? 'Completing...' : 'Mark workout complete'}
          </Button>
        </Card>
      )}
    </div>
  )
}
