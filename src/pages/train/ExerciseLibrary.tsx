import { useState, useEffect, useCallback, useMemo } from 'react'
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
import type { Exercise } from '@/types/exercise'
import type { AxiosError } from 'axios'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'

const CATALOG_PAGE_SIZE = 12

/** Athlete catalog view: exercises from GET /athlete/train/exercise-library */
function ExerciseCatalogView() {
  const [items, setItems] = useState<Exercise[]>([])
  const [meta, setMeta] = useState({
    total: 0,
    page: 1,
    limit: CATALOG_PAGE_SIZE,
    totalPages: 1,
  })
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [q, setQ] = useState('')
  const [muscleGroup, setMuscleGroup] = useState('')
  const [equipment, setEquipment] = useState('')
  const [movementPattern, setMovementPattern] = useState('')

  const fetchCatalog = useCallback(
    (pageOverride?: number) => {
      const p = pageOverride ?? page
      setLoading(true)
      trainService
        .getExerciseLibrary({
          q: q.trim() || undefined,
          page: p,
          limit: CATALOG_PAGE_SIZE,
          muscleGroup: muscleGroup.trim() || undefined,
          equipment: equipment.trim() || undefined,
          movementPattern: movementPattern.trim() || undefined,
        })
        .then(res => {
          if (res.data.statusCode === 200 && res.data.data) {
            setItems(res.data.data.data ?? [])
            setMeta(
              res.data.data.meta ?? {
                total: 0,
                page: p,
                limit: CATALOG_PAGE_SIZE,
                totalPages: 1,
              }
            )
          }
        })
        .catch(() => setItems([]))
        .finally(() => setLoading(false))
    },
    [page, q, muscleGroup, equipment, movementPattern]
  )

  useEffect(() => {
    queueMicrotask(() => fetchCatalog())
  }, [fetchCatalog])

  const onSearch = () => {
    setPage(1)
    fetchCatalog(1)
  }

  const tagsDisplay = (ex: Exercise) => {
    const t = ex.tags
    if (!t) return null
    const parts = [
      ...(t.muscleGroup ?? []),
      ...(t.equipment ?? []),
      ...(t.movementPattern ?? []),
    ]
    return parts.slice(0, 4).join(', ') + (parts.length > 4 ? '…' : '')
  }

  return (
    <div className="space-y-4">
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
            placeholder="Search catalog…"
            value={q}
            onChange={e => setQ(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onSearch()}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#3AB8ED]/30 focus:border-[#3AB8ED] outline-none"
            aria-label="Search catalog"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            placeholder="Muscle"
            value={muscleGroup}
            onChange={e => setMuscleGroup(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28"
          />
          <input
            placeholder="Equipment"
            value={equipment}
            onChange={e => setEquipment(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28"
          />
          <input
            placeholder="Pattern"
            value={movementPattern}
            onChange={e => setMovementPattern(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-28"
          />
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={onSearch}
          >
            Apply
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2">
        <Text
          variant="default"
          className="font-medium text-sm text-gray-500 uppercase tracking-wide"
        >
          Catalog
        </Text>
        {meta.total > 0 && (
          <Text variant="secondary" className="text-sm">
            {meta.total} exercise{meta.total !== 1 ? 's' : ''}
          </Text>
        )}
      </div>
      {loading ? (
        <div className="flex items-center gap-2 py-8">
          <Spinner size="small" variant="primary" />
          <Text variant="secondary">Loading…</Text>
        </div>
      ) : items.length === 0 ? (
        <Card className="p-0">
          <div className="p-6 text-center">
            <Text variant="secondary" className="text-sm">
              No exercises in the catalog. Try different filters.
            </Text>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map(ex => (
            <Card
              key={ex.id}
              className="p-0 border border-gray-200/80 overflow-hidden"
            >
              <div className="p-4">
                <Text
                  variant="default"
                  className="font-semibold text-gray-900 block"
                >
                  {ex.name}
                </Text>
                {ex.description && (
                  <Text
                    variant="secondary"
                    className="text-sm mt-1 line-clamp-2"
                  >
                    {ex.description}
                  </Text>
                )}
                {tagsDisplay(ex) && (
                  <Text variant="secondary" className="text-xs mt-2">
                    {tagsDisplay(ex)}
                  </Text>
                )}
                {ex.videoUrl && (
                  <a
                    href={ex.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#3AB8ED] text-sm mt-2 inline-block hover:underline"
                  >
                    View video
                  </a>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      {meta.totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-2">
          <Button
            type="button"
            variant="secondary"
            size="small"
            disabled={page <= 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
          >
            Previous
          </Button>
          <span className="px-2 flex items-center text-sm text-gray-600">
            {meta.page} / {meta.totalPages}
          </span>
          <Button
            type="button"
            variant="secondary"
            size="small"
            disabled={page >= meta.totalPages}
            onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

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

function NoProgramView({
  onBrowse,
  onBrowseCatalog,
}: Readonly<{ onBrowse: () => void; onBrowseCatalog?: () => void }>) {
  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={onBrowse}>
          ← Back to Train
        </Button>
        <Text variant="primary" className="text-2xl font-semibold">
          Exercise library
        </Text>
        {onBrowseCatalog && (
          <Button type="button" variant="secondary" onClick={onBrowseCatalog}>
            Browse catalog
          </Button>
        )}
      </div>
      <Card className="p-6 border border-gray-200/80">
        <Text
          variant="default"
          className="font-semibold text-gray-900 mb-2 block"
        >
          No program enrolled
        </Text>
        <Text
          variant="secondary"
          className="mb-4 block text-sm leading-relaxed"
        >
          Enroll in a program first to browse days and exercises and log your
          sets.
        </Text>
        <div className="flex gap-2">
          <Button type="button" onClick={onBrowse}>
            Browse programs
          </Button>
          {onBrowseCatalog && (
            <Button type="button" variant="secondary" onClick={onBrowseCatalog}>
              Browse catalog
            </Button>
          )}
        </div>
      </Card>
    </div>
  )
}

/** Format day key (e.g. "day1", "1day1dsa") to a readable "Day N" or keep readable. */
function formatDayLabel(dayKey: string): string {
  const num = dayKey.replaceAll(/\D/g, '')
  if (num) return `Day ${num}`
  return dayKey.replace(/([a-z]+)/i, (_, d) => d + ' ')
}

type DayFilterType = 'all' | 'workout' | 'rest'

function DaysView({
  programName,
  days,
  onDayClick,
  onBack,
  onBrowseCatalog,
}: Readonly<{
  programName: string
  days: DailyExerciseDTO[]
  onDayClick: (day: DailyExerciseDTO) => void
  onBack: () => void
  onBrowseCatalog?: () => void
}>) {
  const [daySearch, setDaySearch] = useState('')
  const [dayFilter, setDayFilter] = useState<DayFilterType>('all')

  const filteredDays = useMemo(() => {
    const q = daySearch.trim().toLowerCase()
    return days.filter(day => {
      const label = formatDayLabel(day.day).toLowerCase()
      const name = (day.exercise_name ?? '').toLowerCase()
      const matchSearch = !q || label.includes(q) || name.includes(q)
      const isRest = day.isRestDay === true
      const matchFilter =
        dayFilter === 'all' ||
        (dayFilter === 'workout' && !isRest) ||
        (dayFilter === 'rest' && isRest)
      return matchSearch && matchFilter
    })
  }, [days, daySearch, dayFilter])

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          ← Back to Train
        </Button>
        <Text variant="primary" className="text-2xl font-semibold">
          Exercise library
        </Text>
        {onBrowseCatalog && (
          <Button type="button" variant="secondary" onClick={onBrowseCatalog}>
            Browse catalog
          </Button>
        )}
      </div>

      <Card className="p-0">
        <div className="p-5 bg-gray-50/50">
          <Text variant="secondary" className="text-sm block mb-1">
            {programName}
          </Text>
          <Text variant="default" className="font-semibold text-gray-900">
            Select a day
          </Text>
        </div>
      </Card>

      <div className="w-full space-y-4">
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
              placeholder="Search days…"
              value={daySearch}
              onChange={e => setDaySearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm placeholder:text-gray-400 focus:ring-2 focus:ring-[#3AB8ED]/30 focus:border-[#3AB8ED] outline-none"
              aria-label="Search days"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <span className="text-sm text-gray-500">Filter:</span>
            {(
              [
                { value: 'all' as const, label: 'All' },
                { value: 'workout' as const, label: 'Workout days' },
                { value: 'rest' as const, label: 'Rest days' },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setDayFilter(value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  dayFilter === value
                    ? 'bg-[#3AB8ED] text-white border-[#3AB8ED]'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <Text
            variant="default"
            className="font-medium text-sm text-gray-500 uppercase tracking-wide"
          >
            Workout days
          </Text>
          {days.length > 0 && (
            <Text variant="secondary" className="text-sm">
              {filteredDays.length < days.length
                ? `${filteredDays.length} of ${days.length}`
                : `${filteredDays.length} ${filteredDays.length === 1 ? 'day' : 'days'}`}
            </Text>
          )}
        </div>
        {filteredDays.length === 0 ? (
          <Card className="p-0">
            <div className="p-6 text-center">
              <Text variant="secondary" className="text-sm">
                No days match your search or filter. Try different terms or
                clear the filter.
              </Text>
              <Button
                type="button"
                variant="secondary"
                size="small"
                className="mt-3"
                onClick={() => {
                  setDaySearch('')
                  setDayFilter('all')
                }}
              >
                Clear search & filter
              </Button>
            </div>
          </Card>
        ) : (
          <div className="flex flex-row gap-3 overflow-x-auto pb-2 w-full">
            {filteredDays.map(day => {
              const originalIndex = days.findIndex(d => d.day === day.day) + 1
              return (
                <Card
                  key={day.day}
                  pressable
                  onPress={() => onDayClick(day)}
                  className="p-0 cursor-pointer group overflow-hidden border border-gray-200/80 hover:border-[#3AB8ED]/30 hover:bg-[#3AB8ED]/5 transition-colors shrink-0 min-w-[280px] flex-1"
                >
                  <div className="flex items-center gap-4 p-4 w-full">
                    <span className="shrink-0 w-8 h-8 rounded-lg bg-[#3AB8ED]/10 text-[#2ea8db] font-semibold text-sm inline-flex items-center justify-center">
                      {originalIndex}
                    </span>
                    <div className="min-w-0 flex-1 py-1">
                      <p className="font-medium text-gray-900 truncate">
                        {formatDayLabel(day.day)}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">
                        {day.isRestDay
                          ? 'Rest day'
                          : day.exercise_name || 'Exercises'}
                      </p>
                    </div>
                    <span className="shrink-0 w-8 h-8 rounded-full bg-gray-100 group-hover:bg-[#3AB8ED]/10 inline-flex items-center justify-center text-gray-400 group-hover:text-[#2ea8db] transition-colors">
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
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </span>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

type ExerciseFilterType = 'all' | 'video' | 'weight'

function DayExercisesView({
  day,
  onBack,
  onExerciseClick,
  exerciseSearch,
  setExerciseSearch,
  exerciseFilter,
  setExerciseFilter,
}: Readonly<{
  day: DailyExerciseDTO
  onBack: () => void
  onExerciseClick: (ex: ExerciseDTO) => void
  exerciseSearch: string
  setExerciseSearch: (v: string) => void
  exerciseFilter: ExerciseFilterType
  setExerciseFilter: (v: ExerciseFilterType) => void
}>) {
  const dayLabel = day.day.replace(/([a-z]+)/i, (_, d) => d + ' ')
  const exercises = day.exercises ?? []
  const q = exerciseSearch.trim().toLowerCase()
  const filtered = exercises.filter(ex => {
    const matchSearch =
      !q ||
      (ex.name?.toLowerCase().includes(q) ?? false) ||
      (typeof ex.description === 'string' &&
        ex.description.toLowerCase().includes(q)) ||
      (ex.alternate_exercise?.name?.toLowerCase().includes(q) ?? false)
    const matchFilter =
      exerciseFilter === 'all' ||
      (exerciseFilter === 'video' && ex.video) ||
      (exerciseFilter === 'weight' && ex.lb != null)
    return matchSearch && matchFilter
  })

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="secondary" onClick={onBack}>
          ← Back to days
        </Button>
        <Text variant="primary" className="text-2xl font-semibold">
          {dayLabel} – {day.exercise_name}
        </Text>
      </div>

      <Card className="p-0">
        <div className="p-5 bg-gray-50/50">
          <Text variant="default" className="font-semibold text-gray-900">
            {dayLabel} – {day.exercise_name}
          </Text>
        </div>
      </Card>

      <div className="w-full space-y-4">
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
                No exercises match your search or filter. Try different terms or
                clear the filter.
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
                onPress={() => onExerciseClick(ex)}
                className="p-0 w-full cursor-pointer hover:bg-[#3AB8ED]/5 hover:border-[#3AB8ED]/30 transition-colors border border-gray-200/80"
              >
                <div className="flex items-center gap-4 w-full">
                  <span className="shrink-0 w-8 h-8 rounded-lg bg-[#3AB8ED]/10 text-[#2ea8db] font-semibold text-sm flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <div className="min-w-0 flex-1 py-4">
                    <Text
                      variant="default"
                      className="font-medium text-gray-900"
                    >
                      {ex.name}
                    </Text>
                    {formatExercisePreset(ex) && (
                      <Text variant="secondary" className="text-sm mt-0.5">
                        {formatExercisePreset(ex)}
                      </Text>
                    )}
                  </div>
                  <span className="text-gray-400 text-sm shrink-0 pr-4">→</span>
                </div>
              </Card>
            ))}
          </div>
        )}
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
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [exerciseFilter, setExerciseFilter] = useState<
    'all' | 'video' | 'weight'
  >('all')
  const [libraryMode, setLibraryMode] = useState<'program' | 'catalog'>(
    'program'
  )

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
    setExerciseSearch('')
    setExerciseFilter('all')
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
        dayKey: scheduled.dayKey ?? scheduled.dayExercise?.day,
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

  if (libraryMode === 'catalog') {
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
          <Text variant="primary" className="text-2xl font-semibold">
            Exercise library
          </Text>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setLibraryMode('program')}
          >
            My program
          </Button>
        </div>
        <ExerciseCatalogView />
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="flex items-center gap-2 py-8">
          <Spinner size="small" variant="primary" />
          <Text variant="secondary">Loading...</Text>
        </div>
      </div>
    )
  }

  if (!userProgram || days.length === 0) {
    return (
      <NoProgramView
        onBrowse={() => navigate('/train')}
        onBrowseCatalog={() => setLibraryMode('catalog')}
      />
    )
  }

  const programName = userProgram.program?.name ?? 'Program'

  if (view === 'days') {
    return (
      <DaysView
        programName={programName}
        days={days}
        onDayClick={handleDayClick}
        onBack={() => navigate('/train')}
        onBrowseCatalog={() => setLibraryMode('catalog')}
      />
    )
  }

  if (view === 'day-exercises' && selectedDay) {
    return (
      <DayExercisesView
        day={selectedDay}
        onBack={handleBackToDays}
        onExerciseClick={handleExerciseClick}
        exerciseSearch={exerciseSearch}
        setExerciseSearch={setExerciseSearch}
        exerciseFilter={exerciseFilter}
        setExerciseFilter={setExerciseFilter}
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
      <div className="space-y-6 max-w-4xl">
        <Button
          type="button"
          variant="secondary"
          onClick={handleBackToDayExercises}
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
              <Text
                variant="secondary"
                className="text-xs mt-2 text-gray-500 block"
              >
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
          <div className="flex gap-2 items-center">
            <Text variant="default" className="text-sm font-medium">
              Exercise:
            </Text>
            <button
              type="button"
              onClick={() => setUseAlternate(false)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                !useAlternate
                  ? 'bg-[#3AB8ED] text-white border-[#3AB8ED]'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Main
            </button>
            <button
              type="button"
              onClick={() => setUseAlternate(true)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                useAlternate
                  ? 'bg-[#3AB8ED] text-white border-[#3AB8ED]'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Alternate
            </button>
          </div>
        )}
        <div className="space-y-3">
          {Array.from({ length: setsCount }, (_, i) => i + 1).map(setIdx => (
            <Card
              key={setIdx}
              className="p-4 flex flex-wrap items-center gap-3 border border-gray-200/80"
            >
              <Text variant="default" className="font-medium shrink-0">
                Set {setIdx}
              </Text>
              <input
                type="number"
                placeholder="Reps"
                className="border border-gray-200 rounded-lg px-3 py-2 w-20 text-sm focus:ring-2 focus:ring-[#3AB8ED]/30 focus:border-[#3AB8ED] outline-none"
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
