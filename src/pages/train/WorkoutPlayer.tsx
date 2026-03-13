import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { trainService } from '@/api/train.service'
import { cycleTransitionService } from '@/api/cycle-transition.service'
import type { ExerciseDTO } from '@/types/program'
import type { AxiosError } from 'axios'

type WorkoutDay = {
  exercises?: ExerciseDTO[]
  exercise_name?: string
  notSet?: boolean
}

export default function WorkoutPlayer() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const sessionIdParam = searchParams.get('sessionId')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [dayExercise, setDayExercise] = useState<WorkoutDay | null>(null)
  const [phase, setPhase] = useState<string>('')
  const [weekIndex, setWeekIndex] = useState<number>(0)
  const [dayKey, setDayKey] = useState<string>('')
  const [sessionId, setSessionId] = useState<number | null>(
    sessionIdParam ? Number(sessionIdParam) : null
  )
  const [status, setStatus] = useState<string | null>(null)
  const [completing, setCompleting] = useState(false)
  const [redCompleteState, setRedCompleteState] = useState<{
    message: string
    recommendTransitionTo: string
  } | null>(null)
  const [transitionConfirming, setTransitionConfirming] = useState(false)

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
            const d = apiRes.data as Record<string, unknown>
            if (
              d.redProgramComplete === true &&
              typeof d.recommendTransitionTo === 'string'
            ) {
              setRedCompleteState({
                message:
                  (d.message as string) ||
                  'Red program complete. Confirm transition to Amber.',
                recommendTransitionTo: d.recommendTransitionTo as string,
              })
              setDayExercise(null)
            } else {
              setRedCompleteState(null)
              setDayExercise((d.dayStructure as WorkoutDay) ?? null)
              setPhase((d.phase as string) ?? '')
              setWeekIndex((d.weekIndex as number) ?? 0)
              setDayKey(
                (d.dayKey as string) ??
                  (d.dayExercise as { day?: string })?.day ??
                  (d.date as string) ??
                  ''
              )
              if (d.sessionId) setSessionId(d.sessionId as number)
              setStatus((d.status as string) ?? null)
            }
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
        status: 'COMPLETED',
        complianceType: 'QUICK_TOGGLE',
      })
      .then(res => {
        const payload = res.data?.data as
          | {
              redComplete?: boolean
              recommendTransitionTo?: string
              message?: string
            }
          | undefined
        if (
          payload?.redComplete === true &&
          typeof payload?.recommendTransitionTo === 'string'
        ) {
          setRedCompleteState({
            message:
              payload.message ||
              'Red program complete. Confirm transition to Amber.',
            recommendTransitionTo: payload.recommendTransitionTo,
          })
          setStatus('completed')
        } else {
          setStatus('completed')
          navigate('/train')
        }
      })
      .catch((err: AxiosError<{ message?: string }>) => {
        setError(
          err.response?.data?.message || err.message || 'Failed to complete.'
        )
      })
      .finally(() => setCompleting(false))
  }

  const handleConfirmTransition = async () => {
    if (!redCompleteState) return
    setTransitionConfirming(true)
    try {
      await cycleTransitionService.confirmCycleTransition({
        cycleName: redCompleteState.recommendTransitionTo,
      })
      setRedCompleteState(null)
      navigate('/train')
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'response' in err
          ? (err as { response?: { data?: { message?: string } } }).response
              ?.data?.message
          : err instanceof Error
            ? err.message
            : undefined
      setError(message || 'Failed to confirm transition.')
    } finally {
      setTransitionConfirming(false)
    }
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
    dayExercise.notSet === true ||
    (!dayExercise.exercises?.length && !dayExercise.exercise_name)

  if (error && !dayExercise && !redCompleteState) {
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

  if (redCompleteState) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/train')}
          className="shrink-0"
        >
          ← Back to Train
        </Button>
        <Card className="p-0">
          <div className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <span className="text-xl text-amber-700" aria-hidden>
                ✓
              </span>
            </div>
            <Text variant="default" className="font-semibold text-lg mb-2">
              Foundations complete
            </Text>
            <Text variant="secondary" className="text-sm max-w-sm mx-auto mb-6">
              {redCompleteState.message}
            </Text>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button
                type="button"
                variant="primary"
                onClick={handleConfirmTransition}
                disabled={transitionConfirming}
              >
                {transitionConfirming
                  ? 'Confirming…'
                  : `Transition to ${redCompleteState.recommendTransitionTo}`}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => navigate('/train')}
                disabled={transitionConfirming}
              >
                Later
              </Button>
            </div>
          </div>
        </Card>
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
        ) : (
          exercises.map((ex, idx) => (
            <Card key={ex.exercise_id ?? idx} className="p-4">
              <Text variant="default" className="font-medium">
                {ex.name}
              </Text>
              {(ex.pointsOfPerformance ?? ex.description) &&
                (() => {
                  const content = ex.pointsOfPerformance ?? ex.description ?? ''
                  return content.trim().startsWith('<') ? (
                    <div
                      className="text-sm text-gray-600 mt-1 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_a]:text-[#3AB8ED] [&_a]:underline"
                      dangerouslySetInnerHTML={{ __html: content }}
                    />
                  ) : (
                    <Text
                      variant="secondary"
                      className="text-sm mt-1 whitespace-pre-wrap"
                    >
                      {content}
                    </Text>
                  )
                })()}
              {(ex.sets != null ||
                ex.total_reps != null ||
                ex.lb != null ||
                ex.prescribed_weight_lb != null ||
                ex.prescribed_weight_kg != null) && (
                <Text variant="secondary" className="text-sm mt-1">
                  {[
                    ex.sets != null && `${ex.sets} sets`,
                    ex.total_reps != null && `${ex.total_reps} reps`,
                    ex.lb != null && `${ex.lb} lb`,
                    ex.prescribed_weight_lb != null &&
                      `@ ${ex.prescribed_weight_lb} lb (${ex.weight_percent ?? ''}% 1RM)`,
                    ex.prescribed_weight_kg != null &&
                      ex.prescribed_weight_lb == null &&
                      `@ ${ex.prescribed_weight_kg} kg (${ex.weight_percent ?? ''}% 1RM)`,
                  ]
                    .filter(Boolean)
                    .join(' • ')}
                </Text>
              )}
              {(ex.working_max != null || ex.last_logged != null) && (
                <Text
                  variant="secondary"
                  className="text-sm mt-1 text-gray-500"
                >
                  {[
                    ex.working_max != null &&
                      `${ex.working_max.value} ${ex.working_max.unit} 1RM`,
                    ex.last_logged != null &&
                    (ex.last_logged.weightLb != null ||
                      ex.last_logged.weightKg != null) &&
                    ex.last_logged.reps != null
                      ? `Last: ${ex.last_logged.weightLb ?? ex.last_logged.weightKg} ${ex.last_logged.weightLb != null ? 'lb' : 'kg'} × ${ex.last_logged.reps}`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(' · ')}
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
