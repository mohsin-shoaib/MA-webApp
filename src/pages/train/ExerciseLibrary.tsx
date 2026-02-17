import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { programService } from '@/api/program.service'
import { trainService } from '@/api/train.service'
import type {
  UserProgram,
  DailyExerciseDTO,
  ExerciseDTO,
  AlternateExerciseDTO,
} from '@/types/program'
import type { AxiosError } from 'axios'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'

/** Normalise dailyExercise (array or object keyed by day) to ordered array. */
function normalizeDailyExercise(
  raw: DailyExerciseDTO[] | Record<string, DailyExerciseDTO>
): DailyExerciseDTO[] {
  const list = Array.isArray(raw)
    ? raw
    : Object.entries(raw).map(([day, d]) => ({ ...d, day }))
  return list.sort((a, b) => {
    const numA = Number.parseInt(a.day.replaceAll(/\D/g, '') || '0', 10)
    const numB = Number.parseInt(b.day.replaceAll(/\D/g, '') || '0', 10)
    return numA - numB
  })
}

/** Add days to an ISO date string; returns YYYY-MM-DD. */
function addDays(isoDate: string, days: number): string {
  const d = new Date(isoDate)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

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

function NoProgramView({ onBrowse }: Readonly<{ onBrowse: () => void }>) {
  return (
    <div className="space-y-4 max-w-2xl">
      <Text variant="primary" className="text-xl font-semibold">
        Exercise library
      </Text>
      <Card className="p-6">
        <Text variant="default" className="font-medium mb-2">
          No program enrolled
        </Text>
        <Text variant="secondary" className="mb-4">
          Enroll in a program first to browse days and exercises and log your
          sets.
        </Text>
        <Button type="button" onClick={onBrowse}>
          Browse programs
        </Button>
      </Card>
    </div>
  )
}

function DaysView({
  programName,
  days,
  onDayClick,
}: Readonly<{
  programName: string
  days: DailyExerciseDTO[]
  onDayClick: (day: DailyExerciseDTO) => void
}>) {
  return (
    <div className="space-y-4 max-w-4xl">
      <Text variant="primary" className="text-xl font-semibold">
        Exercise library
      </Text>
      <Text variant="secondary">{programName} – select a day</Text>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {days.map(day => (
          <Card
            key={day.day}
            pressable
            onPress={() => onDayClick(day)}
            className="p-4 cursor-pointer hover:bg-gray-50 transition"
          >
            <Text variant="default" className="font-medium">
              {day.day.replace(/([a-z]+)/i, (_, d) => d + ' ')}
            </Text>
            <Text variant="secondary" className="text-sm mt-1">
              {day.exercise_name}
            </Text>
          </Card>
        ))}
      </div>
    </div>
  )
}

function DayExercisesView({
  day,
  onBack,
  onExerciseClick,
}: Readonly<{
  day: DailyExerciseDTO
  onBack: () => void
  onExerciseClick: (ex: ExerciseDTO) => void
}>) {
  const dayLabel = day.day.replace(/([a-z]+)/i, (_, d) => d + ' ')
  return (
    <div className="space-y-4 max-w-4xl">
      <Button
        type="button"
        variant="secondary"
        className="mb-2"
        onClick={onBack}
      >
        ← Back to days
      </Button>
      <Text variant="primary" className="text-xl font-semibold">
        {dayLabel} – {day.exercise_name}
      </Text>
      <div className="space-y-2">
        {day.exercises.map(ex => (
          <Card
            key={ex.exercise_id}
            pressable
            onPress={() => onExerciseClick(ex)}
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
    </div>
  )
}

type View = 'days' | 'day-exercises' | 'exercise-detail'

export default function ExerciseLibrary() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useSnackbar()
  const [loading, setLoading] = useState(true)
  const [userProgram, setUserProgram] = useState<UserProgram | null>(null)
  const [days, setDays] = useState<DailyExerciseDTO[]>([])
  const [view, setView] = useState<View>('days')
  const [selectedDay, setSelectedDay] = useState<DailyExerciseDTO | null>(null)
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

  const onProgramLoaded = useCallback((data: UserProgram) => {
    setUserProgram(data)
    setDays(normalizeDailyExercise(data.program.dailyExercise))
  }, [])

  const clearProgram = useCallback(() => {
    setUserProgram(null)
    setDays([])
  }, [])

  const loadCurrentProgram = useCallback(() => {
    setLoading(true)
    programService
      .getCurrentProgram()
      .then(res => {
        const apiRes = res.data
        if (apiRes.statusCode === 200 && apiRes.data) {
          onProgramLoaded(apiRes.data)
        } else {
          clearProgram()
        }
      })
      .catch(clearProgram)
      .finally(() => setLoading(false))
  }, [onProgramLoaded, clearProgram])

  useEffect(() => {
    loadCurrentProgram()
  }, [loadCurrentProgram])

  const handleDayClick = (day: DailyExerciseDTO) => {
    setSelectedDay(day)
    setView('day-exercises')
  }

  const handleExerciseClick = (exercise: ExerciseDTO) => {
    setSelectedExercise(exercise)
    setUseAlternate(false)
    setSetInputs({})
    setView('exercise-detail')
  }

  const handleBackToDays = () => {
    setView('days')
    setSelectedDay(null)
    setSelectedExercise(null)
  }

  const handleBackToDayExercises = () => {
    setView('day-exercises')
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

  const dayIndex = selectedDay
    ? days.findIndex(d => d.day === selectedDay.day)
    : -1
  const programStartDate = userProgram?.startDate
  const calendarDate =
    programStartDate && dayIndex >= 0
      ? addDays(programStartDate, dayIndex)
      : null

  const ensureSession = useCallback(async () => {
    if (!calendarDate || !userProgram?.program?.id) return null
    const programId = userProgram.program.id
    setSessionLoading(true)
    try {
      const scheduledRes = await trainService.getScheduledWorkout(calendarDate)
      const scheduled = scheduledRes.data?.data
      if (!scheduled?.dayExercise) {
        showError("Can't log for this date – no scheduled workout.")
        return null
      }
      const dayIndexFromApi = scheduled.dayIndex ?? dayIndex
      const createRes = await trainService.createOrGetSession({
        date: calendarDate,
        phase: scheduled.phase,
        weekIndex: scheduled.weekIndex,
        dayIndex: dayIndexFromApi,
        dayKey: scheduled.dayKey,
        programId,
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
  }, [calendarDate, userProgram, dayIndex, showError])

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
      setSessionId(null)
      handleBackToDays()
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

  if (!userProgram || days.length === 0) {
    return <NoProgramView onBrowse={() => navigate('/train')} />
  }

  const programName = userProgram.program?.name ?? 'Program'

  if (view === 'days') {
    return (
      <DaysView
        programName={programName}
        days={days}
        onDayClick={handleDayClick}
      />
    )
  }

  if (view === 'day-exercises' && selectedDay) {
    return (
      <DayExercisesView
        day={selectedDay}
        onBack={handleBackToDays}
        onExerciseClick={handleExerciseClick}
      />
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
          onClick={handleBackToDayExercises}
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
