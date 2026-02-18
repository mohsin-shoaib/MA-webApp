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

type TodayWorkoutData = {
  date: string
  phase: string
  weekIndex: number
  dayIndex?: number
  dayKey: string
  dayExercise: {
    day?: string
    exercise_name?: string
    exercises: ExerciseDTO[]
    isRestDay?: boolean
  }
  programId?: number
  programName?: string
  sessionId?: number
  status?: string
}

/** True when backend returned no workout for this date (Amber date not set or empty) */
function isNoWorkoutSet(
  dayExercise: TodayWorkoutData['dayExercise'] | null | undefined
): boolean {
  if (!dayExercise || typeof dayExercise !== 'object') return true
  const ext = dayExercise as { notSet?: boolean }
  if (ext.notSet === true) return true
  const exercises = (dayExercise as { exercises?: unknown[] }).exercises
  const hasExercises = Array.isArray(exercises) && exercises.length > 0
  const hasName = !!(dayExercise as { exercise_name?: string }).exercise_name
  return !hasExercises && !hasName
}

/** Normalize scheduled-workout API response (sessionStatus, optional dayKey) to TodayWorkoutData */
function normalizeScheduledWorkout(
  raw: Record<string, unknown>
): TodayWorkoutData {
  const dayExercise = raw.dayExercise as TodayWorkoutData['dayExercise']
  const dayKey =
    (raw.dayKey as string) ?? dayExercise?.day ?? (raw.date as string)
  const sessionStatus = (raw.sessionStatus as string) ?? (raw.status as string)
  const status =
    typeof sessionStatus === 'string' ? sessionStatus.toLowerCase() : undefined
  return {
    date: raw.date as string,
    phase: raw.phase as string,
    weekIndex: raw.weekIndex as number,
    dayIndex: raw.dayIndex as number | undefined,
    dayKey,
    dayExercise: dayExercise ?? {},
    programId: raw.programId as number | undefined,
    programName: raw.programName as string | undefined,
    sessionId: raw.sessionId as number | undefined,
    status,
  }
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
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [exerciseFilter, setExerciseFilter] = useState<
    'all' | 'video' | 'weight'
  >('all')

  useEffect(() => {
    const load = dateParam
      ? trainService.getScheduledWorkout(dateParam)
      : trainService.getTodayWorkout()
    load
      .then(res => {
        if (res.data.statusCode === 200 && res.data.data) {
          const data = res.data.data as Record<string, unknown>
          setWorkout(normalizeScheduledWorkout(data))
          if (data.sessionId) {
            setSessionId(data.sessionId as number)
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
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-2 py-8">
          <Spinner size="small" variant="primary" />
          <Text variant="secondary">Loading your session…</Text>
        </div>
      </div>
    )
  }

  const backTo = dateParam ? '/dashboard' : '/train'

  if (!workout) {
    return (
      <div className="space-y-6 max-w-4xl">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate(backTo)}
          className="shrink-0"
        >
          ← Back to {dateParam ? 'Dashboard' : 'Train'}
        </Button>
        <Card className="p-0">
          <div className="p-8 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <span className="text-xl text-gray-500" aria-hidden>
                📅
              </span>
            </div>
            <Text variant="default" className="font-semibold text-lg mb-2">
              No workout for this date
            </Text>
            <Text variant="secondary" className="text-sm max-w-sm mx-auto mb-6">
              Check your roadmap or program. You can browse the Exercise library
              from the Train page.
            </Text>
            <Button
              type="button"
              variant="primary"
              onClick={() => navigate(backTo)}
            >
              Back to {dateParam ? 'Dashboard' : 'Train'}
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  const dayExercise = workout.dayExercise
  const exercises = dayExercise?.exercises ?? []
  const isRestDay = (dayExercise as { isRestDay?: boolean })?.isRestDay === true
  const noWorkoutSet = isNoWorkoutSet(dayExercise)
  const sessionTitle = dateParam
    ? `Session for ${workout.date}`
    : "Today's session"

  const sessionLabel = isRestDay
    ? 'Rest day'
    : noWorkoutSet
      ? 'No workout set'
      : typeof (dayExercise as { exercise_name?: string })?.exercise_name ===
          'string'
        ? (dayExercise as { exercise_name: string }).exercise_name
        : typeof workout.dayKey === 'string'
          ? workout.dayKey
          : String(workout.dayKey ?? '')

  if (view === 'exercises') {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate(backTo)}
            className="shrink-0"
          >
            ← Back to {dateParam ? 'Dashboard' : 'Train'}
          </Button>
          <Text variant="primary" className="text-2xl font-semibold">
            {sessionTitle}
          </Text>
        </div>

        <Card className="p-0">
          <div className="p-5 bg-gray-50/50">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {workout.phase && (
                <span className="px-2.5 py-1 bg-white rounded-lg text-sm font-medium text-gray-700 border border-gray-200/80">
                  {typeof workout.phase === 'string'
                    ? workout.phase
                    : String(workout.phase)}{' '}
                  · Week {workout.weekIndex} ·{' '}
                  {typeof workout.dayKey === 'string'
                    ? workout.dayKey
                    : String(workout.dayKey ?? '')}
                </span>
              )}
              {workout.programName && (
                <span className="px-2.5 py-1 bg-white rounded-lg text-sm text-gray-600 border border-gray-200/80">
                  {typeof workout.programName === 'string'
                    ? workout.programName
                    : String(workout.programName)}
                </span>
              )}
              {workout.status === 'completed' && (
                <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-lg text-sm font-medium">
                  Completed
                </span>
              )}
            </div>
            <Text variant="default" className="font-semibold text-gray-900">
              {sessionLabel}
            </Text>
          </div>
        </Card>

        {isRestDay ? (
          <Card className="p-0">
            <div className="p-8 text-center">
              <Text variant="secondary" className="text-sm">
                Rest day – no workout scheduled. Enjoy the recovery.
              </Text>
            </div>
          </Card>
        ) : noWorkoutSet ? (
          <Card className="p-0">
            <div className="p-8 text-center">
              <Text variant="secondary" className="text-sm">
                No workout set for this date. Check back later.
              </Text>
            </div>
          </Card>
        ) : exercises.length === 0 ? (
          <Card className="p-0">
            <div className="p-8 text-center">
              <Text variant="secondary" className="text-sm">
                No exercises for this session.
              </Text>
            </div>
          </Card>
        ) : (
          <div className="w-full space-y-4">
            {(() => {
              const q = exerciseSearch.trim().toLowerCase()
              const filtered = exercises.filter(ex => {
                const matchSearch =
                  !q ||
                  (ex.name?.toLowerCase().includes(q) ?? false) ||
                  (typeof ex.description === 'string' &&
                    ex.description.toLowerCase().includes(q))
                const matchFilter =
                  exerciseFilter === 'all' ||
                  (exerciseFilter === 'video' && ex.video) ||
                  (exerciseFilter === 'weight' && ex.lb != null)
                return matchSearch && matchFilter
              })
              return (
                <>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative flex-1 min-w-0">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                          aria-hidden
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                          />
                        </svg>
                      </span>
                      <input
                        type="search"
                        placeholder="Search exercises…"
                        value={exerciseSearch}
                        onChange={e => setExerciseSearch(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#3AB8ED]/30 focus:border-[#3AB8ED] outline-none"
                        aria-label="Search exercises"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <span className="text-sm text-gray-500">Filter:</span>
                      {(
                        [
                          { value: 'all' as const, label: 'All' },
                          { value: 'video' as const, label: 'With video' },
                          { value: 'weight' as const, label: 'With weight' },
                        ] as const
                      ).map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setExerciseFilter(value)}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                            exerciseFilter === value
                              ? 'bg-[#3AB8ED] text-white border-[#3AB8ED]'
                              : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <Text
                    variant="default"
                    className="font-medium text-sm text-gray-500 uppercase tracking-wide block"
                  >
                    Exercises{' '}
                    {filtered.length < exercises.length &&
                      `(${filtered.length} of ${exercises.length})`}
                  </Text>
                  {filtered.length === 0 ? (
                    <Card className="p-0">
                      <div className="p-6 text-center">
                        <Text variant="secondary" className="text-sm">
                          No exercises match your search or filter. Try
                          different terms or clear the filter.
                        </Text>
                        <Button
                          type="button"
                          variant="secondary"
                          size="small"
                          className="mt-3"
                          onClick={() => {
                            setExerciseSearch('')
                            setExerciseFilter('all')
                          }}
                        >
                          Clear search & filter
                        </Button>
                      </div>
                    </Card>
                  ) : (
                    <div className="space-y-1">
                      {filtered.map((ex, idx) => (
                        <Card
                          key={ex.exercise_id}
                          pressable
                          onPress={() => handleExerciseClick(ex)}
                          className="p-0 w-full cursor-pointer hover:bg-[#3AB8ED]/5 hover:border-[#3AB8ED]/30 transition-colors"
                        >
                          <div className="flex items-center gap-4 w-full">
                            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#3AB8ED]/10 text-[#2ea8db] font-semibold text-sm flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1 py-4">
                              <Text
                                variant="default"
                                className="font-medium text-gray-900"
                              >
                                {ex.name}
                              </Text>
                            </div>
                            <span className="text-gray-400 text-sm shrink-0 pr-4">
                              →
                            </span>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}
                </>
              )
            })()}
          </div>
        )}
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
      <div className="space-y-6 max-w-4xl">
        <Button
          type="button"
          variant="secondary"
          onClick={handleBackToExercises}
          className="shrink-0"
        >
          ← Back to exercises
        </Button>

        <Card className="p-0">
          <div className="p-5">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">
              {display?.name ?? selectedExercise.name}
            </h1>
            {display?.description && (
              <Text variant="secondary" className="text-sm mt-2 block">
                {display.description}
              </Text>
            )}
            {(presetReps != null || presetLb != null) && (
              <Text variant="secondary" className="text-xs mt-2 text-gray-500">
                Target: {setsCount} sets
                {presetReps != null && ` × ${presetReps} reps`}
                {presetLb != null && ` @ ${presetLb} lb`}
              </Text>
            )}
          </div>
        </Card>

        {display?.video && (
          <div className="rounded-lg overflow-hidden bg-black">
            <video
              src={display.video}
              controls
              className="w-full max-h-72"
              preload="metadata"
              aria-label={`Video for ${display?.name ?? selectedExercise.name}`}
            >
              <track kind="captions" src="" srcLang="en" label="English" />
            </video>
          </div>
        )}

        {hasAlternate && (
          <div className="flex flex-wrap items-center gap-2">
            <Text variant="secondary" className="text-sm">
              Version:
            </Text>
            <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5">
              <button
                type="button"
                onClick={() => setUseAlternate(false)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${useAlternate ? 'text-gray-600 hover:text-gray-900' : 'bg-white text-gray-900 shadow-sm'}`}
              >
                Main
              </button>
              <button
                type="button"
                onClick={() => setUseAlternate(true)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${useAlternate ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
              >
                Alternate
              </button>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <Text
            variant="default"
            className="font-medium text-sm text-gray-500 uppercase tracking-wide block"
          >
            Log sets
          </Text>
          {Array.from({ length: setsCount }, (_, i) => i + 1).map(setIdx => (
            <Card key={setIdx} className="p-0 w-full">
              <div className="flex flex-wrap items-center gap-4 p-4">
                <span className="flex-shrink-0 w-9 h-9 rounded-lg bg-gray-100 text-gray-700 font-semibold text-sm flex items-center justify-center">
                  {setIdx}
                </span>
                <div className="flex flex-wrap items-center gap-3 flex-1 min-w-0">
                  <label className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-10">Reps</span>
                    <input
                      type="number"
                      placeholder="—"
                      min={0}
                      className="border border-gray-200 rounded-lg px-3 py-2 w-20 text-sm focus:ring-2 focus:ring-[#3AB8ED]/30 focus:border-[#3AB8ED] outline-none"
                      value={setInputs[setIdx]?.reps ?? ''}
                      onChange={e =>
                        setSetInputs(prev => ({
                          ...prev,
                          [setIdx]: {
                            ...prev[setIdx],
                            reps: e.target.value
                              ? Number(e.target.value)
                              : undefined,
                          },
                        }))
                      }
                    />
                  </label>
                  <label className="flex items-center gap-2">
                    <span className="text-sm text-gray-600 w-14">
                      Weight (lb)
                    </span>
                    <input
                      type="number"
                      placeholder="—"
                      min={0}
                      className="border border-gray-200 rounded-lg px-3 py-2 w-24 text-sm focus:ring-2 focus:ring-[#3AB8ED]/30 focus:border-[#3AB8ED] outline-none"
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
                  </label>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="small"
                  disabled={logLoading || sessionLoading}
                  onClick={() => handleLogSet(setIdx)}
                  className="shrink-0"
                >
                  {sessionLoading || logLoading ? 'Logging…' : 'Log set'}
                </Button>
              </div>
            </Card>
          ))}
        </div>

        {calendarDate && (
          <div className="pt-2 border-t border-gray-100">
            <Button
              type="button"
              variant="primary"
              disabled={completeLoading || sessionLoading}
              onClick={handleCompleteWorkout}
              className="w-full py-3 font-semibold"
            >
              {completeLoading || sessionLoading
                ? 'Please wait…'
                : 'Complete workout for this day'}
            </Button>
          </div>
        )}
      </div>
    )
  }

  return null
}
