import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { Modal } from '@/components/Modal'
import { dashboardService } from '@/api/dashboard.service'
import { trainService } from '@/api/train.service'
import type {
  DashboardSummary,
  TodayWorkoutSummary,
  CalendarDayEvent,
  ComplianceSummary,
} from '@/types/dashboard'
import type { AxiosError } from 'axios'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'

const CYCLE_COLORS: Record<string, string> = {
  Red: 'bg-red-100 text-red-800 border-red-200',
  Amber: 'bg-amber-100 text-amber-800 border-amber-200',
  Green: 'bg-green-100 text-green-800 border-green-200',
  Sustainment: 'bg-slate-100 text-slate-800 border-slate-200',
  C1: 'bg-red-100 text-red-800 border-red-200',
  C2: 'bg-amber-100 text-amber-800 border-amber-200',
  C3: 'bg-green-100 text-green-800 border-green-200',
  C4: 'bg-slate-100 text-slate-800 border-slate-200',
}

function cycleBadgeClass(name: string): string {
  return CYCLE_COLORS[name] ?? 'bg-gray-100 text-gray-800 border-gray-200'
}

function formatWeekStart(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  return d
}

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00Z')
  return d.toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
}

function isToday(dateStr: string): boolean {
  const today = new Date()
  const todayStr = today.toISOString().slice(0, 10)
  return dateStr === todayStr
}

function getWeekDayIndicatorClass(ev: CalendarDayEvent): string {
  const base = 'mt-1 w-2 h-2 rounded-full'
  if (!ev.hasWorkout) return `${base} bg-gray-200`
  return ev.sessionStatus === 'completed'
    ? `${base} bg-green-500`
    : `${base} bg-blue-500`
}

export default function DashboardPage() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useSnackbar()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [weekEvents, setWeekEvents] = useState<CalendarDayEvent[]>([])
  const [weekStart, setWeekStart] = useState<string>(() =>
    formatWeekStart(getWeekStart(new Date()))
  )
  const [selectedEvent, setSelectedEvent] = useState<CalendarDayEvent | null>(
    null
  )
  const [markCompleteLoading, setMarkCompleteLoading] = useState(false)

  const loadDashboard = useCallback(() => {
    dashboardService
      .getDashboard()
      .then(setSummary)
      .catch((err: AxiosError<{ message?: string }>) => {
        setSummary(null)
        setError(
          err.response?.data?.message ||
            err.message ||
            'Failed to load dashboard.'
        )
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    const cancelled = { current: false }
    queueMicrotask(() => {
      if (cancelled.current) return
      setLoading(true)
      setError(null)
      loadDashboard()
    })
    return () => {
      cancelled.current = true
    }
  }, [loadDashboard])

  useEffect(() => {
    let cancelled = false
    dashboardService.getWeekEvents(weekStart).then(events => {
      if (!cancelled) setWeekEvents(events)
    })
    return () => {
      cancelled = true
    }
  }, [weekStart])

  const handleMarkComplete = async () => {
    const today = summary?.today
    if (!today?.date) return
    const sessionId = today.sessionId
    setMarkCompleteLoading(true)
    try {
      if (sessionId) {
        await trainService.updateSession(sessionId, {
          status: 'completed',
          complianceType: 'quick_toggle',
        })
      } else {
        const createRes = await trainService.createOrGetSession({
          date: today.date,
          phase: today.phase,
          weekIndex: today.weekIndex,
          dayIndex: today.dayIndex,
          dayKey: today.dayKey,
          programId: today.programId,
        })
        const session = createRes.data?.data
        if (session?.id) {
          await trainService.updateSession(session.id, {
            status: 'completed',
            complianceType: 'quick_toggle',
          })
        }
      }
      showSuccess('Workout marked complete.')
      loadDashboard()
      dashboardService.getWeekEvents(weekStart).then(setWeekEvents)
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(
        ax.response?.data?.message || ax.message || 'Failed to mark complete.'
      )
    } finally {
      setMarkCompleteLoading(false)
    }
  }

  const handleViewExercises = () => {
    if (selectedEvent?.date) {
      setSelectedEvent(null)
      navigate(`/train/today?date=${selectedEvent.date}`)
    }
  }

  const today = summary?.today
  const cycleName = summary?.cycle?.name ?? null
  const hasWorkoutToday =
    today?.dayExercise?.exercises != null &&
    Array.isArray(today.dayExercise.exercises) &&
    today.dayExercise.exercises.length > 0
  const isCompleted = today?.status === 'completed'

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text variant="primary" className="text-2xl font-semibold">
          Dashboard
        </Text>
        {cycleName && (
          <span
            className={[
              'px-3 py-1.5 rounded-lg border text-sm font-medium',
              cycleBadgeClass(cycleName),
            ].join(' ')}
          >
            {cycleName}
          </span>
        )}
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          <Text variant="default">{error}</Text>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-8">
          <Spinner size="small" variant="primary" />
          <Text variant="secondary">Loading...</Text>
        </div>
      )}

      {loading === false && summary && (
        <>
          <Card className="p-6">
            <Text variant="default" className="font-semibold mb-4">
              Today's Training
            </Text>
            {!hasWorkoutToday && (
              <Text variant="secondary" className="mb-4">
                Rest day – no workout scheduled.
              </Text>
            )}
            {hasWorkoutToday && today && (
              <TodayCard
                today={today}
                isCompleted={!!isCompleted}
                onStart={() => navigate('/train/today')}
                onMarkComplete={handleMarkComplete}
                markCompleteLoading={markCompleteLoading}
              />
            )}
          </Card>

          {(summary.streak > 0 || summary.compliance) && (
            <Card className="p-6">
              <Text variant="default" className="font-semibold mb-3">
                Progress
              </Text>
              <div className="flex flex-wrap gap-6">
                {summary.streak > 0 && (
                  <div>
                    <Text variant="secondary" className="text-sm">
                      Streak
                    </Text>
                    <Text variant="primary" className="text-xl font-semibold">
                      {summary.streak} day{summary.streak === 1 ? '' : 's'}
                    </Text>
                  </div>
                )}
                {summary.compliance && (
                  <ComplianceBlock compliance={summary.compliance} />
                )}
              </div>
            </Card>
          )}

          {summary.alerts.length > 0 && (
            <Card className="p-6">
              <Text variant="default" className="font-semibold mb-3">
                Alerts
              </Text>
              <ul className="space-y-2">
                {summary.alerts.map((a, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-gray-700"
                  >
                    <span className="text-amber-600 font-medium">•</span>
                    <span>{a.message}</span>
                    {a.date && (
                      <span className="text-gray-500">({a.date})</span>
                    )}
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Text variant="default" className="font-semibold">
                This week
              </Text>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={() => {
                    const d = new Date(weekStart + 'T12:00:00Z')
                    d.setDate(d.getDate() - 7)
                    setWeekStart(formatWeekStart(d))
                  }}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={() => {
                    const d = new Date(weekStart + 'T12:00:00Z')
                    d.setDate(d.getDate() + 7)
                    setWeekStart(formatWeekStart(d))
                  }}
                >
                  Next
                </Button>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-2">
              {weekEvents.map(ev => (
                <button
                  key={ev.date}
                  type="button"
                  onClick={() => setSelectedEvent(ev)}
                  className={[
                    'flex flex-col items-center justify-center p-3 rounded-lg border text-sm transition',
                    isToday(ev.date)
                      ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                      : 'border-gray-200 hover:bg-gray-50',
                  ].join(' ')}
                >
                  <span className="text-gray-600 font-medium">
                    {formatDayLabel(ev.date)}
                  </span>
                  <span className={getWeekDayIndicatorClass(ev)} />
                </button>
              ))}
            </div>
          </Card>
        </>
      )}

      <Modal
        visible={selectedEvent !== null}
        onClose={() => setSelectedEvent(null)}
        title={selectedEvent ? formatDayLabel(selectedEvent.date) : ''}
        primaryAction={
          selectedEvent?.hasWorkout
            ? { label: 'View exercises', onPress: handleViewExercises }
            : undefined
        }
        secondaryAction={{
          label: 'Close',
          onPress: () => setSelectedEvent(null),
        }}
      >
        {selectedEvent && (
          <div className="space-y-2">
            {selectedEvent.hasWorkout ? (
              <>
                <Text variant="default" className="font-medium">
                  {selectedEvent.daySummary ?? selectedEvent.dayKey}
                </Text>
                {(selectedEvent.programName || selectedEvent.phase) && (
                  <Text variant="secondary" className="text-sm">
                    {[selectedEvent.programName, selectedEvent.phase]
                      .filter(Boolean)
                      .join(' • ')}
                    {selectedEvent.weekIndex != null &&
                      ` • Week ${selectedEvent.weekIndex}`}
                  </Text>
                )}
                {selectedEvent.sessionStatus === 'completed' && (
                  <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                    Completed
                  </span>
                )}
              </>
            ) : (
              <Text variant="secondary">Rest day – no workout scheduled.</Text>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

interface TodayCardProps {
  readonly today: TodayWorkoutSummary
  readonly isCompleted: boolean
  readonly onStart: () => void
  readonly onMarkComplete: () => void
  readonly markCompleteLoading: boolean
}

function TodayCard({
  today,
  isCompleted,
  onStart,
  onMarkComplete,
  markCompleteLoading,
}: TodayCardProps) {
  let buttonLabel: string
  if (isCompleted) {
    buttonLabel = 'View session'
  } else if (today.status === 'in_progress') {
    buttonLabel = 'Continue'
  } else {
    buttonLabel = 'Start workout'
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {today.currentCycle && (
          <span className="px-2 py-1 bg-gray-100 rounded text-sm">
            {today.currentCycle}
          </span>
        )}
        <span className="px-2 py-1 bg-gray-100 rounded text-sm">
          {today.phase} • Week {today.weekIndex} • {today.dayKey}
        </span>
        {today.programName && (
          <span className="px-2 py-1 bg-gray-100 rounded text-sm">
            {today.programName}
          </span>
        )}
      </div>
      <Text variant="secondary">
        {today.dayExercise?.exercise_name || today.dayKey}
      </Text>
      <div className="flex flex-wrap gap-2 mt-4">
        {isCompleted && (
          <span className="px-3 py-2 bg-green-100 text-green-800 rounded font-medium">
            Completed
          </span>
        )}
        <Button
          type="button"
          variant="primary"
          onClick={onStart}
          disabled={isCompleted}
        >
          {buttonLabel}
        </Button>
        {isCompleted === false && (
          <Button
            type="button"
            variant="secondary"
            onClick={onMarkComplete}
            loading={markCompleteLoading}
          >
            Mark complete
          </Button>
        )}
      </div>
    </div>
  )
}

interface ComplianceBlockProps {
  readonly compliance: ComplianceSummary
}

function ComplianceBlock({ compliance }: ComplianceBlockProps) {
  const pct =
    compliance.compliancePercent == null
      ? null
      : Math.round(compliance.compliancePercent)
  return (
    <div>
      <Text variant="secondary" className="text-sm">
        Compliance ({compliance.rollingDays} days)
      </Text>
      <Text variant="primary" className="text-xl font-semibold">
        {pct === null ? '—' : `${pct}%`}
      </Text>
      {compliance.scheduledCount >= 1 && (
        <Text variant="muted" className="text-xs">
          {compliance.completedCount} / {compliance.scheduledCount} completed
        </Text>
      )}
    </div>
  )
}
