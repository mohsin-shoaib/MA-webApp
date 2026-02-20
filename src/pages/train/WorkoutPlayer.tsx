import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { trainService } from '@/api/train.service'
import type {
  DailyExerciseDTO,
  ExerciseDTO,
  SectionDTO,
  SectionType,
} from '@/types/program'
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
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-2 py-8">
          <Spinner size="medium" variant="primary" />
          <Text variant="secondary">Loading workout...</Text>
        </div>
      </div>
    )
  }

  const noWorkoutSet =
    !dayExercise ||
    (dayExercise as { notSet?: boolean }).notSet === true ||
    (!dayExercise.exercises?.length && !dayExercise.exercise_name)

  if (error && !dayExercise) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/train')}
          >
            ← Back to Train
          </Button>
        </div>
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
          <Text variant="default">{error}</Text>
        </div>
      </div>
    )
  }

  const dayWithSections = dayExercise as DailyExerciseDTO & {
    sections?: SectionDTO[]
  }
  const sections =
    dayWithSections?.sections?.filter(s => s.exercises?.length) ?? []
  const hasSections = sections.length > 0
  const exercises: ExerciseDTO[] = hasSections
    ? sections.flatMap(s => s.exercises ?? [])
    : (dayExercise?.exercises ?? [])

  const sectionTypeLabel = (t?: SectionType) => {
    if (!t || t === 'default') return null
    const labels: Record<string, string> = {
      superset: 'Superset',
      circuit: 'Circuit',
      amrap: 'AMRAP',
      emom: 'EMOM',
    }
    return labels[t] ?? t
  }

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
          {noWorkoutSet
            ? 'No workout set'
            : typeof (dayExercise as { exercise_name?: string })
                  ?.exercise_name === 'string'
              ? (dayExercise as { exercise_name: string }).exercise_name
              : String(dayKey ?? '')}
        </Text>
        <Text variant="secondary" className="text-sm">
          {String(phase ?? '')} • Week {weekIndex} •{' '}
          {typeof dayKey === 'string' ? dayKey : String(dayKey ?? '')}
        </Text>
        {noWorkoutSet && (
          <Text variant="secondary" className="text-sm mt-2 block">
            No workout set for today. Check back later.
          </Text>
        )}
      </Card>

      <div className="space-y-4">
        <Text variant="default" className="font-semibold">
          Exercises
        </Text>
        {noWorkoutSet || exercises.length === 0 ? (
          <Text variant="secondary">
            {noWorkoutSet
              ? 'No workout set for this day.'
              : 'No exercises for this day.'}
          </Text>
        ) : hasSections ? (
          sections.map((section, sIdx) => (
            <div key={sIdx} className="space-y-2">
              {sectionTypeLabel(section.sectionType) && (
                <div
                  className="text-sm font-semibold uppercase tracking-wide px-2 py-1 rounded"
                  style={{ backgroundColor: '#3AB8ED22', color: '#0e7490' }}
                >
                  {sectionTypeLabel(section.sectionType)}
                  {section.sectionConfig?.minutes != null &&
                    ` • ${section.sectionConfig.minutes} min`}
                  {section.sectionConfig?.durationMinutes != null &&
                    ` • ${section.sectionConfig.durationMinutes} min`}
                </div>
              )}
              <div className="space-y-2">
                {(section.exercises ?? []).map((ex, idx) => (
                  <Card
                    key={ex.exercise_id ?? `${sIdx}-${idx}`}
                    className="p-4"
                  >
                    <Text variant="default" className="font-medium">
                      {ex.name}
                    </Text>
                    {ex.description && (
                      <Text variant="secondary" className="text-sm mt-1">
                        {ex.description}
                      </Text>
                    )}
                    {(ex.sets != null ||
                      ex.total_reps != null ||
                      ex.lb != null) && (
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
                ))}
              </div>
            </div>
          ))
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
