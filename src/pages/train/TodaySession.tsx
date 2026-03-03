import { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { trainService } from '@/api/train.service'
import type { ExerciseDTO, AlternateExerciseDTO } from '@/types/program'
import type { ExerciseSwapItem, SetLog, SessionSummary } from '@/types/train'
import type { AxiosError } from 'axios'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { WorkoutTimer } from '@/components/WorkoutTimer'
import { ConditioningTimer } from '@/components/ConditioningTimer'
import { SetWorkingMaxModal } from '@/components/SetWorkingMaxModal'

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
  /** MASS Phase 7 */
  sessionNotes?: string
  dayStructure?: Record<string, unknown>
  exerciseSwaps?: ExerciseSwapItem[]
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
    sessionNotes: raw.sessionNotes as string | undefined,
    dayStructure: raw.dayStructure as Record<string, unknown> | undefined,
    exerciseSwaps: raw.exerciseSwaps as ExerciseSwapItem[] | undefined,
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
  const [workingMaxModalOpen, setWorkingMaxModalOpen] = useState(false)
  // MASS Phase 7: optional readiness (1-5)
  const [readinessOpen, setReadinessOpen] = useState(false)
  const [readinessValues, setReadinessValues] = useState({
    sleep: 3,
    stress: 3,
    energy: 3,
    soreness: 3,
    mood: 3,
  })
  const [readinessSubmitting, setReadinessSubmitting] = useState(false)
  // MASS Phase 7: complete session modal (intensity + comments)
  const [completeModalOpen, setCompleteModalOpen] = useState(false)
  const [completeIntensity, setCompleteIntensity] = useState(5)
  const [completeComments, setCompleteComments] = useState('')
  /** After complete: show session summary (sets, volume, PRs) before navigating */
  const [completeSuccessSummary, setCompleteSuccessSummary] =
    useState<SessionSummary | null>(null)
  // MASS Phase 7: swap exercise modal
  const [swapModalOpen, setSwapModalOpen] = useState(false)
  const [swapForExercise, setSwapForExercise] = useState<ExerciseDTO | null>(
    null
  )
  const [swapLibrarySearch, setSwapLibrarySearch] = useState('')
  const [swapLibraryList, setSwapLibraryList] = useState<
    Array<{ id: number; name: string; description?: string }>
  >([])
  const [swapSubstitutions, setSwapSubstitutions] = useState<
    Array<{ id: number; name: string; description?: string }>
  >([])
  const [swapSubmitting, setSwapSubmitting] = useState(false)
  // MASS Phase 7: reschedule modal
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState(false)
  const [rescheduleTargetDate, setRescheduleTargetDate] = useState('')
  const [rescheduleSubmitting, setRescheduleSubmitting] = useState(false)
  // MASS Phase 7: set logs for current session (prescribed vs actual, modified highlight)
  const [setLogs, setSetLogs] = useState<SetLog[]>([])
  // MASS Phase 7: rest timer after logging a set (countdown from prescribed rest)
  const [restTimerSeconds, setRestTimerSeconds] = useState<number | null>(null)
  const [restTimerActive, setRestTimerActive] = useState(false)
  const [restTimerPaused, setRestTimerPaused] = useState(false)

  useEffect(() => {
    if (!restTimerActive || restTimerPaused) return
    const t = setInterval(() => {
      setRestTimerSeconds(prev => {
        if (prev == null || prev <= 1) {
          setRestTimerActive(false)
          return null
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(t)
  }, [restTimerActive, restTimerPaused])

  const refreshWorkout = useCallback(() => {
    const load = dateParam
      ? trainService.getScheduledWorkout(dateParam)
      : trainService.getTodayWorkout()
    load
      .then(res => {
        if (res.data.statusCode === 200 && res.data.data) {
          const data = res.data.data as Record<string, unknown>
          setWorkout(normalizeScheduledWorkout(data))
          if (data.sessionId) setSessionId(data.sessionId as number)
        }
      })
      .catch(() => {})
  }, [dateParam])

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

  // MASS Phase 7: fetch set logs when we have a session (for prescribed vs actual, modified highlight)
  const effectiveSessionId = sessionId ?? workout?.sessionId
  useEffect(() => {
    if (!effectiveSessionId) {
      setSetLogs([])
      return
    }
    trainService
      .getSession(effectiveSessionId)
      .then(res => {
        if (res.data?.statusCode === 200 && res.data?.data) {
          const session = res.data.data as { setLogs?: SetLog[] }
          setSetLogs(session.setLogs ?? [])
        }
      })
      .catch(() => setSetLogs([]))
  }, [effectiveSessionId])

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

  /** Parse rest string (e.g. "90", "90s", "1:30") to seconds for rest timer */
  const parseRestSeconds = (rest: string | undefined): number => {
    if (!rest || typeof rest !== 'string') return 90
    const s = rest.trim()
    const match = /^(\d+)(?:s|sec)?$/i.exec(s)
    if (match) return Math.min(600, Math.max(0, Number(match[1])))
    const mmss = /^(\d+):(\d+)$/.exec(s)
    if (mmss)
      return Math.min(600, Math.max(0, Number(mmss[1]) * 60 + Number(mmss[2])))
    const n = Number.parseInt(s, 10)
    return Number.isFinite(n) ? Math.min(600, Math.max(0, n)) : 90
  }

  const handleLogSet = async (setIndex: number) => {
    const exercise = currentDisplayExercise()
    if (!selectedExercise || !exercise) return
    const sid = sessionId ?? (await ensureSession())
    if (!sid) return
    const input = setInputs[setIndex] ?? {}
    const disp = currentDisplayExercise()
    const prescribedReps = disp?.total_reps ?? selectedExercise.total_reps
    const prescribedLb =
      selectedExercise.prescribed_weight_lb ?? disp?.lb ?? selectedExercise.lb
    const isModified =
      (input.reps != null &&
        prescribedReps != null &&
        input.reps !== prescribedReps) ||
      (input.weightLb != null &&
        prescribedLb != null &&
        Math.abs(input.weightLb - prescribedLb) > 0.5)
    setLogLoading(true)
    try {
      await trainService.logSet(sid, {
        exerciseKey: String(selectedExercise.exercise_id),
        exerciseName:
          'name' in exercise ? exercise.name : selectedExercise.name,
        exerciseSource: useAlternate ? 'alternate' : 'main',
        setIndex,
        reps: input.reps,
        weightLb: input.weightLb,
        sectionExerciseId: (selectedExercise as { sectionExerciseId?: number })
          .sectionExerciseId,
        isModified: isModified || undefined,
      })
      showSuccess(`Set ${setIndex} logged.`)
      setSetInputs(prev => ({ ...prev, [setIndex]: input }))
      const restSec = parseRestSeconds(
        ((disp ?? selectedExercise) as { rest?: string }).rest
      )
      setRestTimerSeconds(restSec)
      setRestTimerActive(restSec > 0)
      const res = await trainService.getSession(sid)
      if (
        res.data?.statusCode === 200 &&
        (res.data.data as { setLogs?: SetLog[] })?.setLogs
      )
        setSetLogs((res.data.data as { setLogs: SetLog[] }).setLogs)
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
    setCompleteModalOpen(true)
  }

  const handleConfirmComplete = async () => {
    const sid = sessionId ?? (await ensureSession())
    if (!sid) return
    setCompleteLoading(true)
    try {
      await trainService.updateSession(sid, {
        status: 'COMPLETED',
        complianceType: 'FULL_LOG',
        intensityRating: completeIntensity,
        sessionComments: completeComments.trim() || undefined,
      })
      setCompleteModalOpen(false)
      setCompleteComments('')
      try {
        const res = await trainService.getSession(sid)
        if (res.data?.statusCode === 200 && res.data?.data?.sessionSummary) {
          setCompleteSuccessSummary(
            res.data.data.sessionSummary as SessionSummary
          )
          setView('exercises')
          return
        }
      } catch {
        // ignore
      }
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

  const handleDoneAfterSummary = () => {
    setCompleteSuccessSummary(null)
    showSuccess('Workout marked complete.')
    navigate(backTo)
  }

  const exercises = useMemo(
    () => workout?.dayExercise?.exercises ?? [],
    [workout?.dayExercise?.exercises]
  )

  // MASS Phase 7: apply exercise swaps for display (show new exercise in place of original)
  const getDisplayExercises = useCallback(() => {
    const list = exercises
    const swaps = workout?.exerciseSwaps ?? []
    if (swaps.length === 0) return list
    return list.map(ex => {
      const exId = Number(ex.exercise_id)
      const swap = swaps.find(s => s.originalExerciseId === exId)
      if (!swap?.newExercise) return ex
      return {
        ...ex,
        name: swap.newExercise.name,
        exercise_id: String(swap.newExerciseId),
        _swappedFromId: exId,
      } as ExerciseDTO & { _swappedFromId?: number }
    })
  }, [exercises, workout?.exerciseSwaps])

  const displayExercises = getDisplayExercises()

  /** Map original exerciseId -> display exercise (for block view) */
  const byOriginalExerciseId = useMemo(() => {
    const m: Record<number, ExerciseDTO & { _swappedFromId?: number }> = {}
    displayExercises.forEach(ex => {
      const key =
        (ex as ExerciseDTO & { _swappedFromId?: number })._swappedFromId ??
        Number(ex.exercise_id)
      m[key] = ex as ExerciseDTO & { _swappedFromId?: number }
    })
    return m
  }, [displayExercises])

  /** Sections from dayStructure with display exercise data; empty if no dayStructure */
  const sectionsWithDisplay = useMemo(() => {
    const sections = (
      workout?.dayStructure as {
        sections?: Array<{
          blockType?: string
          name?: string
          instructions?: string
          resultTrackingType?: string
          videoUrls?: unknown
          conditioningFormat?: string
          restBetweenRounds?: string
          restBetweenExercises?: string
          exercises: Array<{
            sectionExerciseId?: number
            exerciseId: number
            exercise: { id: number; name: string }
            sets?: number
            reps?: number
            rest?: string
            coachingNotes?: string
            setsRows?: unknown[]
          }>
        }>
      }
    )?.sections
    if (!sections?.length) return []
    return sections.map(section => ({
      ...section,
      exercises: section.exercises.map(se => ({
        ...se,
        display: byOriginalExerciseId[se.exerciseId],
      })),
    }))
  }, [workout?.dayStructure, byOriginalExerciseId])

  const useBlockView = sectionsWithDisplay.length > 0

  const handleSwapClick = (ex: ExerciseDTO) => {
    setSwapForExercise(ex)
    setSwapModalOpen(true)
    setSwapLibrarySearch('')
    setSwapSubstitutions([])
    const origId = Number(ex.exercise_id) || 0
    trainService
      .getExerciseSubstitutions(origId)
      .then(res => {
        if (res.data?.statusCode === 200 && res.data?.data?.substitutions) {
          setSwapSubstitutions(
            (
              res.data.data.substitutions as Array<{
                id: number
                name: string
                description?: string
              }>
            ).map(e => ({
              id: e.id,
              name: e.name,
              description: (e as { pointsOfPerformance?: string })
                .pointsOfPerformance,
            }))
          )
        }
      })
      .catch(() => setSwapSubstitutions([]))
    trainService.getExerciseLibrary({}).then(res => {
      if (res.data?.statusCode === 200 && Array.isArray(res.data?.data)) {
        setSwapLibraryList(
          (res.data.data as Array<{ name: string; exercise_id?: string }>).map(
            e => ({
              id: Number(e.exercise_id) || 0,
              name: e.name,
            })
          )
        )
      } else {
        setSwapLibraryList([])
      }
    })
  }

  const handleSwapSelect = async (newExerciseId: number) => {
    if (!swapForExercise || !effectiveSessionId) return
    setSwapSubmitting(true)
    try {
      await trainService.swapExercise(effectiveSessionId, {
        originalExerciseId: Number(swapForExercise.exercise_id) || 0,
        newExerciseId,
      })
      showSuccess('Exercise swapped for this session.')
      setSwapModalOpen(false)
      setSwapForExercise(null)
      refreshWorkout()
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || ax.message || 'Swap failed.')
    } finally {
      setSwapSubmitting(false)
    }
  }

  const handleRescheduleOpen = () => {
    setRescheduleTargetDate(workout?.date ?? '')
    setRescheduleModalOpen(true)
  }

  const handleRescheduleConfirm = async () => {
    if (!effectiveSessionId || !rescheduleTargetDate.trim()) return
    setRescheduleSubmitting(true)
    try {
      await trainService.rescheduleSession(
        effectiveSessionId,
        rescheduleTargetDate.trim()
      )
      showSuccess('Session moved to new date.')
      setRescheduleModalOpen(false)
      if (dateParam) {
        navigate(`/train/today?date=${rescheduleTargetDate.trim()}`, {
          replace: true,
        })
      } else {
        navigate(`/train/today?date=${rescheduleTargetDate.trim()}`)
      }
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(
        ax.response?.data?.message || ax.message || 'Reschedule failed.'
      )
    } finally {
      setRescheduleSubmitting(false)
    }
  }

  const handleReadinessSubmit = async () => {
    if (!calendarDate) return
    setReadinessSubmitting(true)
    try {
      await trainService.submitReadiness({
        sessionDate: calendarDate,
        workoutSessionId: effectiveSessionId ?? undefined,
        ...readinessValues,
      })
      showSuccess('Readiness saved.')
      setReadinessOpen(false)
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || ax.message || 'Failed to save.')
    } finally {
      setReadinessSubmitting(false)
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
            {workout.sessionNotes && (
              <div className="mt-3 pt-3 border-t border-gray-200/80">
                <Text
                  variant="secondary"
                  className="text-sm whitespace-pre-wrap"
                >
                  {workout.sessionNotes}
                </Text>
              </div>
            )}
            <div className="mt-3 pt-3 border-t border-gray-200/80 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setReadinessOpen(true)}
                className="text-sm text-[#3AB8ED] hover:underline font-medium"
              >
                How are you feeling? (optional)
              </button>
              {effectiveSessionId && workout.status !== 'completed' && (
                <>
                  <button
                    type="button"
                    onClick={handleRescheduleOpen}
                    className="text-sm text-gray-600 hover:text-gray-900 font-medium"
                  >
                    Move to date
                  </button>
                  <button
                    type="button"
                    onClick={handleCompleteWorkout}
                    className="text-sm font-medium text-green-700 hover:text-green-800"
                  >
                    Complete session
                  </button>
                </>
              )}
            </div>
          </div>
        </Card>

        <WorkoutTimer />

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
        ) : useBlockView ? (
          /* MASS Phase 7: Block view by dayStructure.sections (EXERCISE | CIRCUIT | SUPERSET) */
          <div className="w-full space-y-6">
            {sectionsWithDisplay.map((section, sectionIdx) => (
              <div key={sectionIdx} className="space-y-3">
                {section.conditioningFormat && (
                  <ConditioningTimer
                    format={section.conditioningFormat}
                    durationSeconds={
                      section.conditioningFormat?.toUpperCase() === 'AMRAP'
                        ? 600
                        : undefined
                    }
                  />
                )}
                {section.blockType === 'CIRCUIT' ||
                section.blockType === 'circuit' ? (
                  <Card className="p-0">
                    <div className="p-5">
                      {section.name && (
                        <Text
                          variant="default"
                          className="font-semibold text-gray-900 mb-2 block"
                        >
                          {section.name}
                        </Text>
                      )}
                      {section.instructions && (
                        <Text
                          variant="secondary"
                          className="text-sm whitespace-pre-wrap mb-3"
                        >
                          {section.instructions}
                        </Text>
                      )}
                      {Array.isArray(section.videoUrls) &&
                        section.videoUrls.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-3">
                            {(section.videoUrls as string[])
                              .filter(Boolean)
                              .map((url, i) => (
                                <a
                                  key={i}
                                  href={url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-sm text-[#3AB8ED] hover:underline"
                                >
                                  Video {i + 1}
                                </a>
                              ))}
                          </div>
                        )}
                      {section.resultTrackingType && (
                        <div className="mt-3 pt-3 border-t border-gray-200">
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Result
                          </label>
                          <input
                            type="text"
                            placeholder="e.g. rounds, time, score"
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                            readOnly
                            aria-label="Circuit result"
                          />
                        </div>
                      )}
                      <div className="mt-3 text-sm text-gray-500">
                        Complete the circuit as prescribed.
                      </div>
                    </div>
                  </Card>
                ) : section.blockType === 'SUPERSET' ||
                  section.blockType === 'superset' ? (
                  <Card className="p-0">
                    <div className="p-4 border-b border-gray-100 bg-gray-50/50">
                      <Text
                        variant="default"
                        className="font-semibold text-gray-900"
                      >
                        Superset{section.name ? `: ${section.name}` : ''}
                      </Text>
                      {section.restBetweenRounds && (
                        <Text
                          variant="secondary"
                          className="text-xs mt-1 block"
                        >
                          Rest between rounds: {section.restBetweenRounds}
                        </Text>
                      )}
                    </div>
                    <div className="divide-y divide-gray-100">
                      {section.exercises.map((se, exIdx) => {
                        const display = se.display
                        return (
                          <div
                            key={se.sectionExerciseId ?? exIdx}
                            className="p-4"
                          >
                            {display ? (
                              <button
                                type="button"
                                className="w-full flex items-center gap-4 cursor-pointer hover:bg-[#3AB8ED]/5 rounded-lg -m-2 p-2 transition-colors text-left"
                                onClick={() => handleExerciseClick(display)}
                              >
                                <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#3AB8ED]/10 text-[#2ea8db] font-semibold text-sm flex items-center justify-center">
                                  {exIdx + 1}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <Text
                                    variant="default"
                                    className="font-medium text-gray-900"
                                  >
                                    {display.name}
                                  </Text>
                                  {(se.sets != null || se.reps != null) && (
                                    <Text
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {se.sets != null && `${se.sets} sets`}
                                      {se.sets != null &&
                                        se.reps != null &&
                                        ' × '}
                                      {se.reps != null && `${se.reps} reps`}
                                    </Text>
                                  )}
                                </div>
                                {effectiveSessionId &&
                                  workout.status !== 'completed' && (
                                    <button
                                      type="button"
                                      onClick={e => {
                                        e.stopPropagation()
                                        handleSwapClick(display)
                                      }}
                                      className="shrink-0 p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                      aria-label="Swap exercise"
                                    >
                                      <svg
                                        className="w-5 h-5"
                                        fill="currentColor"
                                        viewBox="0 0 24 24"
                                        aria-hidden
                                      >
                                        <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9 2 2 2 .9 2 2 2z" />
                                      </svg>
                                    </button>
                                  )}
                                <span className="text-gray-400 text-sm">→</span>
                              </button>
                            ) : (
                              <Text variant="secondary" className="text-sm">
                                {se.exercise?.name ?? `Exercise ${exIdx + 1}`}
                              </Text>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </Card>
                ) : (
                  /* EXERCISE block or default: one card per exercise */
                  section.exercises.map((se, exIdx) => {
                    const display = se.display
                    if (!display) return null
                    return (
                      <Card
                        key={se.sectionExerciseId ?? display.exercise_id}
                        pressable
                        onPress={() => handleExerciseClick(display)}
                        className="p-0 w-full cursor-pointer hover:bg-[#3AB8ED]/5 hover:border-[#3AB8ED]/30 transition-colors"
                      >
                        <div className="flex items-center gap-4 w-full">
                          <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-[#3AB8ED]/10 text-[#2ea8db] font-semibold text-sm flex items-center justify-center">
                            {sectionIdx * 100 + exIdx + 1}
                          </span>
                          <div className="min-w-0 flex-1 py-4">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Text
                                variant="default"
                                className="font-medium text-gray-900"
                              >
                                {display.name}
                              </Text>
                              {display.video && (
                                <a
                                  href={display.video}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-[#3AB8ED] hover:underline"
                                  onClick={e => e.stopPropagation()}
                                >
                                  Video
                                </a>
                              )}
                            </div>
                            {se.coachingNotes && (
                              <Text
                                variant="secondary"
                                className="text-xs mt-1 block italic text-gray-600"
                              >
                                {se.coachingNotes}
                              </Text>
                            )}
                            {(display.working_max != null ||
                              display.last_logged != null ||
                              display.prescribed_weight_lb != null ||
                              display.prescribed_weight_kg != null) && (
                              <Text
                                variant="secondary"
                                className="text-xs mt-1 block"
                              >
                                {[
                                  display.working_max != null &&
                                    `${display.working_max.value} ${display.working_max.unit} 1RM`,
                                  display.last_logged != null &&
                                  (display.last_logged.weightLb != null ||
                                    display.last_logged.weightKg != null) &&
                                  display.last_logged.reps != null
                                    ? `Last: ${display.last_logged.weightLb ?? display.last_logged.weightKg} ${display.last_logged.weightLb != null ? 'lb' : 'kg'} × ${display.last_logged.reps}`
                                    : null,
                                  (display.prescribed_weight_lb != null ||
                                    display.prescribed_weight_kg != null) &&
                                  display.weight_percent != null
                                    ? `→ ${display.prescribed_weight_lb ?? display.prescribed_weight_kg} ${display.prescribed_weight_lb != null ? 'lb' : 'kg'} (${display.weight_percent}%)`
                                    : null,
                                ]
                                  .filter(Boolean)
                                  .join(' · ')}
                              </Text>
                            )}
                          </div>
                          {effectiveSessionId &&
                            workout.status !== 'completed' && (
                              <button
                                type="button"
                                onClick={e => {
                                  e.stopPropagation()
                                  handleSwapClick(display)
                                }}
                                className="shrink-0 p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                aria-label="Swap exercise"
                              >
                                <svg
                                  className="w-5 h-5"
                                  fill="currentColor"
                                  viewBox="0 0 24 24"
                                  aria-hidden
                                >
                                  <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9 2 2 2 .9 2 2 2z" />
                                </svg>
                              </button>
                            )}
                          <span className="text-gray-400 text-sm shrink-0 pr-4">
                            →
                          </span>
                        </div>
                      </Card>
                    )
                  })
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="w-full space-y-4">
            {(() => {
              const q = exerciseSearch.trim().toLowerCase()
              const filtered = displayExercises.filter(ex => {
                const matchSearch =
                  !q ||
                  (ex.name?.toLowerCase().includes(q) ?? false) ||
                  (typeof ex.pointsOfPerformance === 'string' &&
                    ex.pointsOfPerformance.toLowerCase().includes(q)) ||
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
                    {filtered.length < displayExercises.length &&
                      `(${filtered.length} of ${displayExercises.length})`}
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
                              {(ex.working_max != null ||
                                ex.last_logged != null ||
                                ex.prescribed_weight_lb != null ||
                                ex.prescribed_weight_kg != null) && (
                                <Text
                                  variant="secondary"
                                  className="text-xs mt-1 block"
                                >
                                  {[
                                    ex.working_max != null &&
                                      `${ex.working_max.value} ${ex.working_max.unit} 1RM`,
                                    ex.last_logged != null &&
                                    (ex.last_logged.weightLb != null ||
                                      ex.last_logged.weightKg != null) &&
                                    ex.last_logged.reps != null
                                      ? `Last: ${ex.last_logged.weightLb ?? ex.last_logged.weightKg} ${ex.last_logged.weightLb != null ? 'lb' : 'kg'} × ${ex.last_logged.reps}`
                                      : ex.last_logged != null &&
                                          (ex.last_logged.weightLb != null ||
                                            ex.last_logged.weightKg != null)
                                        ? `Last: ${ex.last_logged.weightLb ?? ex.last_logged.weightKg} ${ex.last_logged.weightLb != null ? 'lb' : 'kg'}`
                                        : null,
                                    (ex.prescribed_weight_lb != null ||
                                      ex.prescribed_weight_kg != null) &&
                                    ex.weight_percent != null
                                      ? `→ ${ex.prescribed_weight_lb ?? ex.prescribed_weight_kg} ${ex.prescribed_weight_lb != null ? 'lb' : 'kg'} (${ex.weight_percent}%)`
                                      : null,
                                  ]
                                    .filter(Boolean)
                                    .join(' · ')}
                                </Text>
                              )}
                            </div>
                            {effectiveSessionId &&
                              workout.status !== 'completed' && (
                                <button
                                  type="button"
                                  onClick={e => {
                                    e.stopPropagation()
                                    handleSwapClick(ex)
                                  }}
                                  className="shrink-0 p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                                  aria-label="Swap exercise"
                                >
                                  <svg
                                    className="w-5 h-5"
                                    fill="currentColor"
                                    viewBox="0 0 24 24"
                                    aria-hidden
                                  >
                                    <path d="M12 8c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm0 2c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2zm0 6c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9 2 2 2z" />
                                  </svg>
                                </button>
                              )}
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

        {/* MASS Phase 7: Readiness survey modal */}
        {readinessOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <Card className="w-full max-w-md p-6">
              <Text variant="default" className="font-semibold text-lg mb-4">
                How are you feeling? (1–5)
              </Text>
              <div className="space-y-3">
                {(
                  [
                    { key: 'sleep', label: 'Sleep' },
                    { key: 'stress', label: 'Stress' },
                    { key: 'energy', label: 'Energy' },
                    { key: 'soreness', label: 'Soreness' },
                    { key: 'mood', label: 'Mood' },
                  ] as const
                ).map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-4"
                  >
                    <span className="text-sm text-gray-700">{label}</span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={readinessValues[key]}
                      onChange={e =>
                        setReadinessValues(prev => ({
                          ...prev,
                          [key]: Number(e.target.value),
                        }))
                      }
                      className="w-32"
                    />
                    <span className="text-sm font-medium w-6">
                      {readinessValues[key]}
                    </span>
                  </div>
                ))}
              </div>
              <div className="flex gap-2 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setReadinessOpen(false)}
                >
                  Skip
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={readinessSubmitting}
                  onClick={handleReadinessSubmit}
                >
                  {readinessSubmitting ? 'Saving…' : 'Save'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* MASS Phase 7: Reschedule modal */}
        {rescheduleModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <Card className="w-full max-w-md p-6">
              <Text variant="default" className="font-semibold text-lg mb-4">
                Move session to date
              </Text>
              <input
                type="date"
                value={rescheduleTargetDate}
                onChange={e => setRescheduleTargetDate(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-4"
              />
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setRescheduleModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={
                    rescheduleSubmitting || !rescheduleTargetDate.trim()
                  }
                  onClick={handleRescheduleConfirm}
                >
                  {rescheduleSubmitting ? 'Moving…' : 'Move'}
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* MASS Phase 7: Session complete summary (PRs, volume, duration) */}
        {completeSuccessSummary && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <Card className="w-full max-w-md p-6">
              <Text variant="default" className="font-semibold text-lg mb-4">
                Session complete
              </Text>
              <div className="space-y-2 text-sm text-gray-700">
                <p>
                  {completeSuccessSummary.totalSets} set
                  {completeSuccessSummary.totalSets !== 1 ? 's' : ''} logged
                  {completeSuccessSummary.volumeKg > 0 &&
                    ` · ${completeSuccessSummary.volumeKg} kg volume`}
                  {completeSuccessSummary.durationMinutes != null &&
                    ` · ${completeSuccessSummary.durationMinutes} min`}
                </p>
                {completeSuccessSummary.prs &&
                  completeSuccessSummary.prs.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <Text
                        variant="default"
                        className="font-medium text-gray-800 mb-2 block"
                      >
                        PRs
                      </Text>
                      <ul className="list-disc list-inside space-y-1 text-gray-600">
                        {completeSuccessSummary.prs.map((pr, i) => (
                          <li key={i}>
                            {pr.exerciseName ?? pr.exerciseKey}:{' '}
                            {pr.previousValue} → {pr.newValue} {pr.unit} (
                            {pr.type === 'estimated_1rm' ? 'est. 1RM' : pr.type}
                            )
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
              <Button
                type="button"
                variant="primary"
                className="mt-6 w-full"
                onClick={handleDoneAfterSummary}
              >
                Done
              </Button>
            </Card>
          </div>
        )}

        {/* Swap exercise: full library only (no substitution field per MASS spec) */}
        {swapModalOpen && swapForExercise && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <Card className="w-full max-w-md max-h-[80vh] flex flex-col p-4">
              <Text variant="default" className="font-semibold text-lg mb-2">
                Swap &quot;{swapForExercise.name}&quot;
              </Text>
              <input
                type="search"
                placeholder="Search exercises…"
                value={swapLibrarySearch}
                onChange={e => setSwapLibrarySearch(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm mb-3"
              />
              <div className="flex-1 overflow-auto space-y-3 min-h-0">
                {swapSubstitutions.length > 0 && (
                  <div>
                    <Text
                      variant="default"
                      className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1"
                    >
                      Linked substitutions
                    </Text>
                    {swapSubstitutions
                      .filter(
                        e =>
                          e.id !== Number(swapForExercise.exercise_id) &&
                          (!swapLibrarySearch.trim() ||
                            e.name
                              .toLowerCase()
                              .includes(swapLibrarySearch.trim().toLowerCase()))
                      )
                      .map(ex => (
                        <button
                          key={ex.id}
                          type="button"
                          onClick={() => handleSwapSelect(ex.id)}
                          disabled={swapSubmitting}
                          className="w-full text-left px-3 py-2 rounded-lg hover:bg-[#3AB8ED]/10 bg-[#3AB8ED]/5 border border-[#3AB8ED]/20 text-sm mb-1"
                        >
                          {ex.name}
                        </button>
                      ))}
                  </div>
                )}
                <div>
                  <Text
                    variant="default"
                    className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1"
                  >
                    All exercises
                  </Text>
                  {swapLibraryList
                    .filter(
                      e =>
                        e.id !== Number(swapForExercise.exercise_id) &&
                        !swapSubstitutions.some(s => s.id === e.id) &&
                        (!swapLibrarySearch.trim() ||
                          e.name
                            .toLowerCase()
                            .includes(swapLibrarySearch.trim().toLowerCase()))
                    )
                    .slice(0, 50)
                    .map(ex => (
                      <button
                        key={ex.id}
                        type="button"
                        onClick={() => handleSwapSelect(ex.id)}
                        disabled={swapSubmitting}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-100 text-sm"
                      >
                        {ex.name}
                      </button>
                    ))}
                </div>
              </div>
              <Button
                type="button"
                variant="secondary"
                className="mt-3"
                onClick={() => {
                  setSwapModalOpen(false)
                  setSwapForExercise(null)
                }}
              >
                Cancel
              </Button>
            </Card>
          </div>
        )}

        {/* Complete session modal (exercises list view) */}
        {completeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <Card className="w-full max-w-md p-6">
              <Text variant="default" className="font-semibold text-lg mb-4">
                Complete session
              </Text>
              {setLogs.length > 0 && (
                <p className="text-sm text-gray-600 mb-4">
                  You logged {setLogs.length} set
                  {setLogs.length !== 1 ? 's' : ''}.
                </p>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Intensity (1–10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={completeIntensity}
                    onChange={e =>
                      setCompleteIntensity(
                        Math.min(10, Math.max(1, Number(e.target.value) || 1))
                      )
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comments (optional)
                  </label>
                  <textarea
                    value={completeComments}
                    onChange={e => setCompleteComments(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="How did it go?"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCompleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={completeLoading}
                  onClick={handleConfirmComplete}
                >
                  {completeLoading ? 'Completing…' : 'Complete session'}
                </Button>
              </div>
            </Card>
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
            {(display?.pointsOfPerformance ?? display?.description) &&
              (() => {
                const content =
                  display?.pointsOfPerformance ?? display?.description ?? ''
                return content.trim().startsWith('<') ? (
                  <div
                    className="text-sm text-gray-600 mt-2 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:list-decimal [&_ol]:pl-6 [&_p]:mb-2 [&_a]:text-[#3AB8ED] [&_a]:underline"
                    dangerouslySetInnerHTML={{ __html: content }}
                  />
                ) : (
                  <Text
                    variant="secondary"
                    className="text-sm mt-2 block whitespace-pre-wrap"
                  >
                    {content}
                  </Text>
                )
              })()}
            {(presetReps != null ||
              presetLb != null ||
              selectedExercise.prescribed_weight_lb != null ||
              selectedExercise.prescribed_weight_kg != null) && (
              <Text variant="secondary" className="text-xs mt-2 text-gray-500">
                Target: {setsCount} sets
                {presetReps != null && ` × ${presetReps} reps`}
                {presetLb != null && ` @ ${presetLb} lb`}
                {selectedExercise.prescribed_weight_lb != null &&
                  ` @ ${selectedExercise.prescribed_weight_lb} lb (${selectedExercise.weight_percent ?? '?'}% 1RM)`}
                {selectedExercise.prescribed_weight_kg != null &&
                  selectedExercise.prescribed_weight_lb == null &&
                  ` @ ${selectedExercise.prescribed_weight_kg} kg (${selectedExercise.weight_percent ?? '?'}% 1RM)`}
              </Text>
            )}
            {(selectedExercise.working_max != null ||
              selectedExercise.last_logged != null) && (
              <Text variant="secondary" className="text-xs mt-1 text-gray-500">
                {selectedExercise.working_max != null && (
                  <span>
                    Working max: {selectedExercise.working_max.value}{' '}
                    {selectedExercise.working_max.unit}
                  </span>
                )}
                {selectedExercise.working_max != null &&
                  selectedExercise.last_logged != null &&
                  ' · '}
                {selectedExercise.last_logged != null &&
                  (selectedExercise.last_logged.weightLb != null ||
                    selectedExercise.last_logged.weightKg != null) && (
                    <span>
                      Last:{' '}
                      {selectedExercise.last_logged.weightLb ??
                        selectedExercise.last_logged.weightKg}{' '}
                      {selectedExercise.last_logged.weightLb != null
                        ? 'lb'
                        : 'kg'}
                      {selectedExercise.last_logged.reps != null &&
                        ` × ${selectedExercise.last_logged.reps}`}
                    </span>
                  )}
              </Text>
            )}
            <div className="mt-3">
              <Button
                type="button"
                variant="outline"
                size="small"
                onClick={() => setWorkingMaxModalOpen(true)}
              >
                Set working max
              </Button>
            </div>
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

        {(() => {
          const exKey = String(selectedExercise.exercise_id)
          const loggedForExercise = setLogs.filter(
            log => (log.exerciseKey ?? log.exerciseId) === exKey
          )
          if (loggedForExercise.length === 0) return null
          return (
            <div className="space-y-2">
              <Text
                variant="default"
                className="font-medium text-sm text-gray-500 uppercase tracking-wide block"
              >
                Logged sets
              </Text>
              <div className="space-y-1">
                {loggedForExercise
                  .sort((a, b) => a.setIndex - b.setIndex)
                  .map(log => (
                    <div
                      key={log.id}
                      className={`flex flex-wrap items-center gap-3 px-3 py-2 rounded-lg text-sm ${
                        log.isModified
                          ? 'bg-amber-50 border border-amber-200'
                          : 'bg-gray-50'
                      }`}
                    >
                      <span className="font-medium text-gray-700">
                        Set {log.setIndex}
                      </span>
                      {log.reps != null && (
                        <span className="text-gray-600">{log.reps} reps</span>
                      )}
                      {(log.weightLb != null || log.weightKg != null) && (
                        <span className="text-gray-600">
                          {log.weightLb ?? log.weightKg}{' '}
                          {log.weightLb != null ? 'lb' : 'kg'}
                        </span>
                      )}
                      {log.rpe != null && (
                        <span className="text-gray-500">RPE {log.rpe}</span>
                      )}
                      {log.isModified && (
                        <span className="text-amber-700 text-xs font-medium">
                          Modified
                        </span>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )
        })()}

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

        {/* MASS Phase 7: Rest timer after logging a set — dismiss / pause / adjust */}
        {restTimerSeconds != null && restTimerSeconds > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-[#3AB8ED]/10 border border-[#3AB8ED]/30">
            <Text
              variant="default"
              className="font-medium text-gray-800 tabular-nums"
            >
              Rest: {Math.floor(restTimerSeconds / 60)}:
              {String(restTimerSeconds % 60).padStart(2, '0')}
            </Text>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => setRestTimerPaused(p => !p)}
              >
                {restTimerPaused ? 'Resume' : 'Pause'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() =>
                  setRestTimerSeconds(s =>
                    s != null ? Math.min(30 * 60, s + 30) : 30
                  )
                }
              >
                +30s
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() =>
                  setRestTimerSeconds(s =>
                    s != null ? Math.min(30 * 60, s + 60) : 60
                  )
                }
              >
                +1:00
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => {
                  setRestTimerSeconds(null)
                  setRestTimerActive(false)
                  setRestTimerPaused(false)
                }}
              >
                Dismiss
              </Button>
            </div>
          </div>
        )}

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

        <SetWorkingMaxModal
          visible={workingMaxModalOpen}
          onClose={() => setWorkingMaxModalOpen(false)}
          onSuccess={refreshWorkout}
          exerciseId={Number(selectedExercise.exercise_id) || 0}
          exerciseName={selectedExercise.name}
          currentValue={selectedExercise.working_max?.value}
          currentUnit={selectedExercise.working_max?.unit}
        />

        {/* MASS Phase 7: Complete session modal (summary + intensity + comments) */}
        {completeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
            <Card className="w-full max-w-md p-6">
              <Text variant="default" className="font-semibold text-lg mb-4">
                Complete session
              </Text>
              {setLogs.length > 0 && (
                <p className="text-sm text-gray-600 mb-4">
                  You logged {setLogs.length} set
                  {setLogs.length !== 1 ? 's' : ''}.
                </p>
              )}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Intensity (1–10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={completeIntensity}
                    onChange={e =>
                      setCompleteIntensity(
                        Math.min(10, Math.max(1, Number(e.target.value) || 1))
                      )
                    }
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Comments (optional)
                  </label>
                  <textarea
                    value={completeComments}
                    onChange={e => setCompleteComments(e.target.value)}
                    rows={3}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm"
                    placeholder="How did it go?"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-6">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setCompleteModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  disabled={completeLoading}
                  onClick={handleConfirmComplete}
                >
                  {completeLoading ? 'Completing…' : 'Complete session'}
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    )
  }

  return null
}
