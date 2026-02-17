import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { trainService } from '@/api/train.service'
import type { ExerciseDTO, AlternateExerciseDTO } from '@/types/program'
import type { AxiosError } from 'axios'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'

function formatExercisePreset(ex: ExerciseDTO): string {
  const parts: string[] = []
  if (ex.sets != null && ex.total_reps != null) {
    parts.push(`${ex.sets} × ${ex.total_reps} reps`)
  } else if (ex.sets != null) {
    parts.push(`${ex.sets} sets`)
  }
  if (ex.lb != null) parts.push(`${ex.lb} lb`)
  return parts.join(' • ')
}

type TodayWorkoutData = {
  date: string
  phase: string
  weekIndex: number
  dayIndex?: number
  dayKey: string
  dayExercise: {
    day?: string
    exercise_name: string
    exercises: ExerciseDTO[]
  }
  programId?: number
  programName?: string
  sessionId?: number
  status?: string
}

function toDateOnly(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr
  return dateStr.slice(0, 10)
}

export default function TodaySession() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const dateParam = searchParams.get('date')
  const { showSuccess, showError } = useSnackbar()
  const [loading, setLoading] = useState(true)
  const [workout, setWorkout] = useState<TodayWorkoutData | null>(null)
  const [view, setView] = useState<'exercises' | 'exercise-detail'>('exercises')
  const [selectedExercise, setSelectedExercise] = useState<ExerciseDTO | null>(
    null
  )
  const [useAlternate, setUseAlternate] = useState(false)
  const [sessionId, setSessionId] = useState<number | null>(null)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [logLoading, setLogLoading] = useState(false)
  const [completeLoading, setCompleteLoading] = useState(false)
  const [setInputs, setSetInputs] = useState<
    Record<number, { reps?: number; weightLb?: number }>
  >({})

  useEffect(() => {
    const load = dateParam
      ? trainService.getScheduledWorkout(dateParam)
      : trainService.getTodayWorkout()
    load
      .then(res => {
        if (res.data.statusCode === 200 && res.data.data) {
          setWorkout(res.data.data as TodayWorkoutData)
          if (res.data.data.sessionId) {
            setSessionId(res.data.data.sessionId)
          }
        } else {
          setWorkout(null)
        }
      })
      .catch(() => setWorkout(null))
      .finally(() => setLoading(false))
  }, [dateParam])

  const handleExerciseClick = (ex: ExerciseDTO) => {
    setSelectedExercise(ex)
    setUseAlternate(false)
    setSetInputs({})
    setView('exercise-detail')
  }

  const handleBackToExercises = () => {
    setView('exercises')
    setSelectedExercise(null)
  }

  const currentDisplayExercise = ():
    | ExerciseDTO
    | AlternateExerciseDTO
    | null => {
    if (!selectedExercise) return null
    if (useAlternate && selectedExercise.alternate_exercise) {
      return selectedExercise.alternate_exercise
    }
    return selectedExercise
  }

  const calendarDate = workout ? toDateOnly(workout.date) : null

  const ensureSession = useCallback(async () => {
    if (!workout || !calendarDate) return null
    if (workout.sessionId) {
      setSessionId(workout.sessionId)
      return workout.sessionId
    }
    setSessionLoading(true)
    try {
      const createRes = await trainService.createOrGetSession({
        date: calendarDate,
        phase: workout.phase,
        weekIndex: workout.weekIndex,
        dayIndex: workout.dayIndex,
        dayKey: workout.dayKey,
        programId: workout.programId,
      })
      const session = createRes.data?.data
      if (session?.id) {
        setSessionId(session.id)
        return session.id
      }
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(
        ax.response?.data?.message || ax.message || 'Failed to start session.'
      )
      return null
    } finally {
      setSessionLoading(false)
    }
    return null
  }, [workout, calendarDate, showError])

  const handleLogSet = async (setIndex: number) => {
    const exercise = currentDisplayExercise()
    if (!selectedExercise || !exercise) return
    const sid = sessionId ?? (await ensureSession())
    if (!sid) return
    const input = setInputs[setIndex] ?? {}
    setLogLoading(true)
    try {
      await trainService.logSet(sid, {
        exerciseKey: selectedExercise.exercise_id,
        exerciseName:
          'name' in exercise ? exercise.name : selectedExercise.name,
        exerciseSource: useAlternate ? 'alternate' : 'main',
        setIndex,
        reps: input.reps,
        weightLb: input.weightLb,
      })
      showSuccess(`Set ${setIndex} logged.`)
      setSetInputs(prev => ({ ...prev, [setIndex]: input }))
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(
        ax.response?.data?.message || ax.message || 'Failed to log set.'
      )
    } finally {
      setLogLoading(false)
    }
  }

  const handleCompleteWorkout = async () => {
    const sid = sessionId ?? (await ensureSession())
    if (!sid) return
    setCompleteLoading(true)
    try {
      await trainService.updateSession(sid, {
        status: 'completed',
        complianceType: 'full_log',
      })
      showSuccess('Workout marked complete.')
      navigate(backTo)
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(
        ax.response?.data?.message || ax.message || 'Failed to complete.'
      )
    } finally {
      setCompleteLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8">
        <Spinner size="small" variant="primary" />
        <Text variant="secondary">Loading...</Text>
      </div>
    )
  }

  const backTo = dateParam ? '/dashboard' : '/train'

  if (!workout) {
    return (
      <div className="space-y-4 max-w-2xl">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate(backTo)}
        >
          ← Back to {dateParam ? 'Dashboard' : 'Train'}
        </Button>
        <Card className="p-6">
          <Text variant="default" className="font-medium mb-2">
            No workout for today
          </Text>
          <Text variant="secondary" className="text-sm">
            Check your roadmap or program. You can browse the Exercise library
            from the Train page.
          </Text>
          <Button
            type="button"
            variant="secondary"
            className="mt-3"
            onClick={() => navigate(backTo)}
          >
            Back to {dateParam ? 'Dashboard' : 'Train'}
          </Button>
        </Card>
      </div>
    )
  }

  const dayExercise = workout.dayExercise
  const exercises = dayExercise?.exercises ?? []
  const sessionTitle = dateParam
    ? `Session for ${workout.date}`
    : "Today's session"

  if (view === 'exercises') {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(backTo)}
          >
            ← Back to {dateParam ? 'Dashboard' : 'Train'}
          </Button>
          <Text variant="primary" className="text-2xl font-semibold">
            {sessionTitle}
          </Text>
        </div>
        <div className="flex flex-wrap gap-2">
          {workout.phase && (
            <span className="px-2 py-1 bg-gray-100 rounded text-sm">
              {workout.phase} • Week {workout.weekIndex} • {workout.dayKey}
            </span>
          )}
          {workout.programName && (
            <span className="px-2 py-1 bg-gray-100 rounded text-sm">
              {workout.programName}
            </span>
          )}
          {workout.status === 'completed' && (
            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
              Completed
            </span>
          )}
        </div>
        <Card className="p-6">
          <Text variant="default" className="font-semibold mb-4">
            {dayExercise.exercise_name || workout.dayKey}
          </Text>
          {exercises.length === 0 ? (
            <Text variant="secondary" className="text-sm">
              No exercises for this session.
            </Text>
          ) : (
            <div className="space-y-2">
              {exercises.map(ex => (
                <Card
                  key={ex.exercise_id}
                  pressable
                  onPress={() => handleExerciseClick(ex)}
                  className="p-4 cursor-pointer hover:bg-gray-50 transition"
                >
                  <Text variant="default" className="font-medium">
                    {ex.name}
                  </Text>
                  <Text variant="secondary" className="text-sm">
                    {formatExercisePreset(ex)}
                  </Text>
                </Card>
              ))}
            </div>
          )}
        </Card>
      </div>
    )
  }

  if (view === 'exercise-detail' && selectedExercise) {
    const display = currentDisplayExercise()
    const setsCount = display?.sets ?? selectedExercise.sets ?? 1
    const presetReps = display?.total_reps ?? selectedExercise.total_reps
    const presetLb = display?.lb ?? selectedExercise.lb
    const hasAlternate = !!selectedExercise.alternate_exercise

    return (
      <div className="space-y-4 max-w-2xl">
        <Button
          type="button"
          variant="secondary"
          className="mb-2"
          onClick={handleBackToExercises}
        >
          ← Back to exercises
        </Button>
        <Text variant="primary" className="text-xl font-semibold">
          {display?.name ?? selectedExercise.name}
        </Text>
        {display?.description && (
          <Text variant="secondary" className="text-sm">
            {display.description}
          </Text>
        )}
        {display?.video && (
          <div className="rounded overflow-hidden bg-black">
            <video
              src={display.video}
              controls
              className="w-full max-h-64"
              preload="metadata"
              aria-label={`Video for ${display?.name ?? selectedExercise.name}`}
            >
              <track kind="captions" src="" srcLang="en" label="English" />
            </video>
          </div>
        )}
        {hasAlternate && (
          <div className="flex gap-2 items-center">
            <Text variant="default" className="text-sm font-medium">
              Exercise:
            </Text>
            <button
              type="button"
              onClick={() => setUseAlternate(false)}
              className={`px-3 py-1 rounded text-sm ${useAlternate ? 'bg-gray-100' : 'bg-gray-800 text-white'}`}
            >
              Main
            </button>
            <button
              type="button"
              onClick={() => setUseAlternate(true)}
              className={`px-3 py-1 rounded text-sm ${useAlternate ? 'bg-gray-800 text-white' : 'bg-gray-100'}`}
            >
              Alternate
            </button>
          </div>
        )}
        <Text variant="default" className="font-medium">
          Preset: {setsCount} sets
          {presetReps != null && ` × ${presetReps} reps`}
          {presetLb != null && ` @ ${presetLb} lb`}
        </Text>
        <div className="space-y-3">
          {Array.from({ length: setsCount }, (_, i) => i + 1).map(setIdx => (
            <Card
              key={setIdx}
              className="p-4 flex flex-wrap items-center gap-3"
            >
              <Text variant="default" className="font-medium shrink-0">
                Set {setIdx}
              </Text>
              <input
                type="number"
                placeholder="Reps"
                className="border rounded px-2 py-1 w-20"
                value={setInputs[setIdx]?.reps ?? ''}
                onChange={e =>
                  setSetInputs(prev => ({
                    ...prev,
                    [setIdx]: {
                      ...prev[setIdx],
                      reps: e.target.value ? Number(e.target.value) : undefined,
                    },
                  }))
                }
              />
              <input
                type="number"
                placeholder="Weight (lb)"
                className="border rounded px-2 py-1 w-24"
                value={setInputs[setIdx]?.weightLb ?? ''}
                onChange={e =>
                  setSetInputs(prev => ({
                    ...prev,
                    [setIdx]: {
                      ...prev[setIdx],
                      weightLb: e.target.value
                        ? Number(e.target.value)
                        : undefined,
                    },
                  }))
                }
              />
              <Button
                type="button"
                variant="secondary"
                size="small"
                disabled={logLoading || sessionLoading}
                onClick={() => handleLogSet(setIdx)}
              >
                {sessionLoading || logLoading ? 'Logging...' : 'Log set'}
              </Button>
            </Card>
          ))}
        </div>
        {calendarDate && (
          <div className="flex gap-2 pt-2">
            <Button
              type="button"
              disabled={completeLoading || sessionLoading}
              onClick={handleCompleteWorkout}
            >
              {completeLoading || sessionLoading
                ? 'Please wait...'
                : 'Complete workout for this day'}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return null
}
