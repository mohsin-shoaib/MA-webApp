/** MASS Phase 8 — Coach analytics: compliance, roster, missed sessions, communication, curriculum, upcoming events */
import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import { coachAnalyticsService } from '@/api/coach-analytics.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { AxiosError } from 'axios'

type TabId =
  | 'overview'
  | 'missed'
  | 'communication'
  | 'curriculum'
  | 'lift'
  | 'readiness'
  | 'training'

type RosterItem = {
  userId: number
  firstName: string | null
  lastName: string | null
  email: string
  status: string
  lastWorkoutDate: string | null
  compliancePercent: number | null
  missedIn14Days?: number
}

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'missed', label: 'Missed sessions' },
  { id: 'communication', label: 'Communication' },
  { id: 'curriculum', label: 'Curriculum progress' },
  { id: 'lift', label: 'Lift progress' },
  { id: 'readiness', label: 'Readiness trends' },
  { id: 'training', label: 'Training summary' },
]

export default function CoachAnalyticsPage() {
  const { showError } = useSnackbar()
  const [tab, setTab] = useState<TabId>('overview')
  const [loading, setLoading] = useState(true)
  const [roster, setRoster] = useState<RosterItem[]>([])
  const [compliance, setCompliance] = useState<Record<string, unknown> | null>(
    null
  )
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([])
  const [missedData, setMissedData] = useState<Record<string, unknown> | null>(
    null
  )
  const [missedLoading, setMissedLoading] = useState(false)
  const [commData, setCommData] = useState<Array<
    Record<string, unknown>
  > | null>(null)
  const [commLoading, setCommLoading] = useState(false)
  const [currData, setCurrData] = useState<Array<
    Record<string, unknown>
  > | null>(null)
  const [currLoading, setCurrLoading] = useState(false)
  const [liftData, setLiftData] = useState<Array<
    Record<string, unknown>
  > | null>(null)
  const [liftLoading, setLiftLoading] = useState(false)
  const [readinessData, setReadinessData] = useState<Array<
    Record<string, unknown>
  > | null>(null)
  const [readinessLoading, setReadinessLoading] = useState(false)
  const [trainingData, setTrainingData] = useState<Array<
    Record<string, unknown>
  > | null>(null)
  const [trainingLoading, setTrainingLoading] = useState(false)

  const loadOverview = useCallback(() => {
    setLoading(true)
    Promise.all([
      coachAnalyticsService.getRoster().then(r => r.data?.data?.roster ?? []),
      coachAnalyticsService
        .getComplianceAggregate()
        .then(r => r.data?.data ?? null),
      coachAnalyticsService
        .getUpcomingEvents(90)
        .then(r => r.data?.data?.events ?? []),
    ])
      .then(([r, c, e]) => {
        setRoster(Array.isArray(r) ? r : [])
        setCompliance(c ?? null)
        setEvents(Array.isArray(e) ? e : [])
      })
      .catch((err: AxiosError) =>
        showError(err.message || 'Failed to load analytics')
      )
      .finally(() => setLoading(false))
  }, [showError])

  useEffect(() => {
    queueMicrotask(() => loadOverview())
  }, [loadOverview])

  useEffect(() => {
    if (tab === 'missed' && missedData === null && !missedLoading) {
      queueMicrotask(() => setMissedLoading(true))
      coachAnalyticsService
        .getMissedSessions({ rollingDays: 30 })
        .then(r => {
          setMissedData(r.data?.data ?? null)
        })
        .catch((err: AxiosError) =>
          showError(err.message || 'Failed to load missed sessions')
        )
        .finally(() => setMissedLoading(false))
    }
  }, [tab, missedData, missedLoading, showError])

  useEffect(() => {
    if (tab === 'communication' && commData === null && !commLoading) {
      queueMicrotask(() => setCommLoading(true))
      coachAnalyticsService
        .getCommunicationActivity()
        .then(r => {
          const d = r.data?.data
          setCommData(Array.isArray(d?.athletes) ? d.athletes : [])
        })
        .catch((err: AxiosError) =>
          showError(err.message || 'Failed to load communication')
        )
        .finally(() => setCommLoading(false))
    }
  }, [tab, commData, commLoading, showError])

  useEffect(() => {
    if (tab === 'curriculum' && currData === null && !currLoading) {
      queueMicrotask(() => setCurrLoading(true))
      coachAnalyticsService
        .getCurriculumProgress()
        .then(r => {
          const d = r.data?.data
          setCurrData(Array.isArray(d?.progress) ? d.progress : [])
        })
        .catch((err: AxiosError) =>
          showError(err.message || 'Failed to load curriculum progress')
        )
        .finally(() => setCurrLoading(false))
    }
  }, [tab, currData, currLoading, showError])

  useEffect(() => {
    if (tab === 'lift' && liftData === null && !liftLoading) {
      queueMicrotask(() => setLiftLoading(true))
      coachAnalyticsService
        .getLiftProgress()
        .then(r => {
          const d = r.data?.data
          setLiftData(Array.isArray(d?.athletes) ? d.athletes : [])
        })
        .catch((err: AxiosError) =>
          showError(err.message || 'Failed to load lift progress')
        )
        .finally(() => setLiftLoading(false))
    }
  }, [tab, liftData, liftLoading, showError])

  useEffect(() => {
    if (tab === 'readiness' && readinessData === null && !readinessLoading) {
      queueMicrotask(() => setReadinessLoading(true))
      coachAnalyticsService
        .getReadinessTrends({ days: 30 })
        .then(r => {
          const d = r.data?.data
          setReadinessData(Array.isArray(d?.athletes) ? d.athletes : [])
        })
        .catch((err: AxiosError) =>
          showError(err.message || 'Failed to load readiness trends')
        )
        .finally(() => setReadinessLoading(false))
    }
  }, [tab, readinessData, readinessLoading, showError])

  useEffect(() => {
    if (tab === 'training' && trainingData === null && !trainingLoading) {
      queueMicrotask(() => setTrainingLoading(true))
      coachAnalyticsService
        .getTrainingSummary({ rollingDays: 30 })
        .then(r => {
          const d = r.data?.data
          setTrainingData(Array.isArray(d?.athletes) ? d.athletes : [])
        })
        .catch((err: AxiosError) =>
          showError(err.message || 'Failed to load training summary')
        )
        .finally(() => setTrainingLoading(false))
    }
  }, [tab, trainingData, trainingLoading, showError])

  const statusClass = (s: string) => {
    if (s === 'active') return 'bg-green-100 text-green-800'
    if (s === 'at_risk') return 'bg-amber-100 text-amber-800'
    return 'bg-gray-100 text-gray-800'
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Text variant="primary" className="text-2xl font-semibold">
        Coach Analytics
      </Text>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === id
                ? 'bg-[#3AB8ED] text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <>
          {loading ? (
            <div className="flex items-center gap-2 py-8">
              <Spinner size="small" variant="primary" />
              <Text variant="secondary">Loading...</Text>
            </div>
          ) : (
            <>
              {compliance && (
                <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
                  <Text
                    variant="default"
                    className="font-semibold text-gray-800 mb-2 block"
                  >
                    Compliance aggregate
                  </Text>
                  <Text variant="secondary" className="text-sm">
                    {Number(compliance.athleteCount ?? 0)} athletes ·{' '}
                    {(compliance.rollingDays as number) ?? 30} days
                    {(compliance.aggregatePercent as number) != null &&
                      ` · ${compliance.aggregatePercent}% avg`}
                  </Text>
                </Card>
              )}
              <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
                <Text
                  variant="default"
                  className="font-semibold text-gray-800 mb-3 block"
                >
                  Athlete roster by status
                </Text>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="text-left py-2">Name</th>
                        <th className="text-left py-2">Status</th>
                        <th className="text-left py-2">Last workout</th>
                        <th className="text-left py-2">Compliance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {roster.map(a => (
                        <tr key={a.userId} className="border-b border-gray-100">
                          <td className="py-2">
                            {[a.firstName, a.lastName]
                              .filter(Boolean)
                              .join(' ') || a.email}
                          </td>
                          <td className="py-2">
                            <span
                              className={[
                                'px-2 py-0.5 rounded text-xs font-medium',
                                statusClass(a.status),
                              ].join(' ')}
                            >
                              {a.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="py-2">{a.lastWorkoutDate ?? '—'}</td>
                          <td className="py-2">
                            {a.compliancePercent != null
                              ? `${a.compliancePercent}%`
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {roster.length === 0 && (
                  <Text variant="secondary" className="text-sm">
                    No athletes found.
                  </Text>
                )}
              </Card>
              {events.length > 0 && (
                <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
                  <Text
                    variant="default"
                    className="font-semibold text-gray-800 mb-2 block"
                  >
                    Upcoming events
                  </Text>
                  <ul className="space-y-2 text-sm">
                    {events.slice(0, 15).map((e, i) => (
                      <li key={i}>
                        {String(e.athleteName)} · {String(e.eventName)} ·{' '}
                        {String(e.eventDate)} ({String(e.daysOut)} days)
                      </li>
                    ))}
                  </ul>
                </Card>
              )}
            </>
          )}
        </>
      )}

      {tab === 'missed' && (
        <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-2 block"
          >
            Missed sessions (rolling 30 days)
          </Text>
          {missedLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Spinner size="small" variant="primary" />
              <Text variant="secondary">Loading...</Text>
            </div>
          ) : missedData ? (
            <div className="space-y-2 text-sm">
              {missedData.aggregate != null && (
                <p className="text-gray-600">
                  Aggregate missed:{' '}
                  {typeof (missedData.aggregate as Record<string, unknown>)
                    ?.total === 'number'
                    ? (missedData.aggregate as Record<string, number>).total
                    : '—'}
                </p>
              )}
              {Array.isArray(missedData.perAthlete) &&
              (missedData.perAthlete as Record<string, unknown>[]).length >
                0 ? (
                <ul className="space-y-1">
                  {(missedData.perAthlete as Record<string, unknown>[]).map(
                    (a, i) => (
                      <li key={i} className="flex flex-wrap gap-2">
                        <span className="font-medium">
                          {typeof a.name === 'string'
                            ? a.name
                            : String(a.userId ?? i)}
                        </span>
                        <span className="text-gray-600">
                          Missed:{' '}
                          {typeof a.missedCount === 'number'
                            ? a.missedCount
                            : 0}
                        </span>
                      </li>
                    )
                  )}
                </ul>
              ) : (
                <Text variant="secondary">
                  No missed-session data for this period.
                </Text>
              )}
            </div>
          ) : (
            <Text variant="secondary">No data.</Text>
          )}
        </Card>
      )}

      {tab === 'communication' && (
        <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-2 block"
          >
            Communication activity (1:1 athletes)
          </Text>
          <Text variant="secondary" className="text-sm mb-3 block">
            Last interaction; flag when no contact 14+ days.
          </Text>
          {commLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Spinner size="small" variant="primary" />
              <Text variant="secondary">Loading...</Text>
            </div>
          ) : commData && commData.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {commData.map((a, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center gap-2 py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium">
                    {typeof a.athleteName === 'string'
                      ? a.athleteName
                      : String(a.userId ?? i)}
                  </span>
                  <span className="text-gray-600">
                    Last:{' '}
                    {typeof a.lastInteraction === 'string'
                      ? a.lastInteraction
                      : '—'}
                  </span>
                  {(a as { noContact14Days?: boolean }).noContact14Days && (
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                      No contact 14+ days
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Text variant="secondary">No 1:1 athletes or no data.</Text>
          )}
        </Card>
      )}

      {tab === 'curriculum' && (
        <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-2 block"
          >
            90 Unchained curriculum progress
          </Text>
          {currLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Spinner size="small" variant="primary" />
              <Text variant="secondary">Loading...</Text>
            </div>
          ) : currData && currData.length > 0 ? (
            <ul className="space-y-2 text-sm">
              {currData.map((a, i) => (
                <li
                  key={i}
                  className="flex flex-wrap items-center gap-2 py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium">
                    {typeof a.name === 'string'
                      ? a.name
                      : String(a.userId ?? i)}
                  </span>
                  <span className="text-gray-600">
                    {typeof a.completed === 'number' ? a.completed : 0} /{' '}
                    {typeof a.total === 'number' ? a.total : 0} completed
                  </span>
                  {a.lastActivityAt != null &&
                    typeof a.lastActivityAt === 'string' && (
                      <span className="text-gray-500">
                        Last activity:{' '}
                        {new Date(a.lastActivityAt).toLocaleDateString()}
                      </span>
                    )}
                </li>
              ))}
            </ul>
          ) : (
            <Text variant="secondary">No curriculum progress data.</Text>
          )}
        </Card>
      )}

      {tab === 'lift' && (
        <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-2 block"
          >
            Lift progress (working maxes)
          </Text>
          <Text variant="secondary" className="text-sm mb-3 block">
            Current working max per exercise for assigned athletes.
          </Text>
          {liftLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Spinner size="small" variant="primary" />
              <Text variant="secondary">Loading...</Text>
            </div>
          ) : liftData && liftData.length > 0 ? (
            <ul className="space-y-4 text-sm">
              {liftData.map((a, i) => (
                <li
                  key={i}
                  className="py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium block mb-1">
                    {String(
                      (a as { athleteName?: string }).athleteName ??
                        a.athleteId ??
                        i
                    )}
                  </span>
                  {Array.isArray(
                    (a as { workingMaxes?: unknown[] }).workingMaxes
                  ) &&
                  (a as { workingMaxes: unknown[] }).workingMaxes.length > 0 ? (
                    <ul className="ml-4 space-y-1 text-gray-600">
                      {(
                        a as {
                          workingMaxes: Array<{
                            exerciseName: string
                            value: number
                            unit: string
                            updatedAt?: string
                          }>
                        }
                      ).workingMaxes.map((wm, j) => (
                        <li key={j}>
                          {wm.exerciseName}: {wm.value} {wm.unit}
                          {wm.updatedAt &&
                            ` (updated ${new Date(wm.updatedAt).toLocaleDateString()})`}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-gray-500 ml-4">
                      No working max data
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Text variant="secondary">No lift progress data.</Text>
          )}
        </Card>
      )}

      {tab === 'readiness' && (
        <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-2 block"
          >
            Readiness trends (last 30 days)
          </Text>
          <Text variant="secondary" className="text-sm mb-3 block">
            Pre-session survey (1–5): Sleep, Stress, Energy, Soreness, Mood.
          </Text>
          {readinessLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Spinner size="small" variant="primary" />
              <Text variant="secondary">Loading...</Text>
            </div>
          ) : readinessData && readinessData.length > 0 ? (
            <ul className="space-y-4 text-sm">
              {readinessData.map((a, i) => (
                <li
                  key={i}
                  className="py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="font-medium block mb-1">
                    {String(
                      (a as { athleteName?: string }).athleteName ??
                        a.athleteId ??
                        i
                    )}
                  </span>
                  {Array.isArray((a as { readings?: unknown[] }).readings) &&
                  (
                    a as {
                      readings: Array<{
                        sessionDate: string
                        average: number
                        sleep: number
                        stress: number
                        energy: number
                        soreness: number
                        mood: number
                      }>
                    }
                  ).readings.length > 0 ? (
                    <ul className="ml-4 space-y-1 text-gray-600">
                      {(
                        a as {
                          readings: Array<{
                            sessionDate: string
                            average: number
                          }>
                        }
                      ).readings
                        .slice(0, 10)
                        .map((r, j) => (
                          <li key={j}>
                            {r.sessionDate}: avg {r.average}
                          </li>
                        ))}
                    </ul>
                  ) : (
                    <span className="text-gray-500 ml-4">
                      No readiness readings
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <Text variant="secondary">No readiness data.</Text>
          )}
        </Card>
      )}

      {tab === 'training' && (
        <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-2 block"
          >
            Training summary (rolling 30 days)
          </Text>
          <Text variant="secondary" className="text-sm mb-3 block">
            Session count, total volume (kg), average session duration.
          </Text>
          {trainingLoading ? (
            <div className="flex items-center gap-2 py-4">
              <Spinner size="small" variant="primary" />
              <Text variant="secondary">Loading...</Text>
            </div>
          ) : trainingData && trainingData.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2">Athlete</th>
                    <th className="text-left py-2">Sessions</th>
                    <th className="text-left py-2">Volume (kg)</th>
                    <th className="text-left py-2">Avg duration</th>
                  </tr>
                </thead>
                <tbody>
                  {trainingData.map((a, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="py-2 font-medium">
                        {String(
                          (a as { athleteName?: string }).athleteName ??
                            (a as { athleteId?: number }).athleteId ??
                            ''
                        )}
                      </td>
                      <td className="py-2">
                        {(a as { sessionCount?: number }).sessionCount ?? 0}
                      </td>
                      <td className="py-2">
                        {(a as { totalVolumeKg?: number }).totalVolumeKg ?? '—'}
                      </td>
                      <td className="py-2">
                        {(a as { averageDurationMinutes?: number | null })
                          .averageDurationMinutes != null
                          ? `${(a as { averageDurationMinutes: number }).averageDurationMinutes} min`
                          : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Text variant="secondary">No training summary data.</Text>
          )}
        </Card>
      )}
    </div>
  )
}
