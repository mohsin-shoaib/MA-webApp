/** PRD 17.1 — Athlete analytics: compliance, streak, PRs, tests, progress, volume, cycle history, goal countdown, bodyweight */
import React, { useState, useEffect } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import { analyticsService } from '@/api/analytics.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { AxiosError } from 'axios'

function toReactNode(value: unknown): React.ReactNode {
  return String(value)
}

export default function AnalyticsPage() {
  const { showError } = useSnackbar()
  const [loading, setLoading] = useState(true)
  const [compliance, setCompliance] = useState<Record<string, unknown> | null>(
    null
  )
  const [goalCountdown, setGoalCountdown] = useState<Record<
    string,
    unknown
  > | null>(null)
  const [cycleHistory, setCycleHistory] = useState<{
    history?: Array<Record<string, unknown>>
  } | null>(null)
  const [volume, setVolume] = useState<{
    byWeek?: Array<{
      weekStart: string
      tonnageKg: number
      rollingAvgKg?: number
    }>
  } | null>(null)
  const [bodyweight, setBodyweight] = useState<{
    entries?: Array<{ date: string; valueKg: number }>
  } | null>(null)
  const [sessionDuration, setSessionDuration] = useState<Record<
    string,
    unknown
  > | null>(null)

  useEffect(() => {
    Promise.all([
      analyticsService
        .getCompliance(30)
        .then(r => r.data?.data)
        .catch(() => null),
      analyticsService
        .getGoalCountdown()
        .then(r => r.data?.data)
        .catch(() => null),
      analyticsService
        .getCycleHistory()
        .then(r => r.data?.data)
        .catch(() => null),
      analyticsService
        .getVolume({ rollingWeeks: 4 })
        .then(r => r.data?.data)
        .catch(() => null),
      analyticsService
        .getBodyweightTrend(90)
        .then(r => r.data?.data)
        .catch(() => null),
      analyticsService
        .getSessionDuration()
        .then(r => r.data?.data)
        .catch(() => null),
    ])
      .then(([c, g, ch, v, bw, sd]) => {
        setCompliance(c ?? null)
        setGoalCountdown(g ?? null)
        setCycleHistory(ch ?? null)
        setVolume(v ?? null)
        setBodyweight(bw ?? null)
        setSessionDuration(sd ?? null)
      })
      .catch((err: AxiosError) =>
        showError(err.message || 'Failed to load analytics')
      )
      .finally(() => setLoading(false))
  }, [showError])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8">
        <Spinner size="small" variant="primary" />
        <Text variant="secondary">Loading analytics...</Text>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Text variant="primary" className="text-2xl font-semibold">
        Analytics
      </Text>

      {compliance && (
        <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-2 block"
          >
            Compliance
          </Text>
          <Text variant="secondary" className="text-sm">
            {(compliance.rollingDays as number) ?? 30} days ·{' '}
            {(compliance.completedCount as number) ?? 0} /{' '}
            {(compliance.scheduledCount as number) ?? 0} completed
            {(compliance.compliancePercent as number) != null &&
              ` · ${Math.round(compliance.compliancePercent as number)}%`}
          </Text>
          {(compliance.currentStreak as number) > 0 && (
            <Text variant="primary" className="font-medium mt-2">
              Streak: {String(compliance.currentStreak)} days
            </Text>
          )}
        </Card>
      )}

      {goalCountdown &&
      (goalCountdown.daysToEvent != null || goalCountdown.eventDate) ? (
        <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-2 block"
          >
            Goal countdown
          </Text>
          <div className="flex flex-wrap gap-4">
            {goalCountdown.daysToEvent != null && (
              <div>
                <Text variant="secondary" className="text-xs uppercase">
                  Days to event
                </Text>
                <Text variant="primary" className="font-semibold">
                  {toReactNode(goalCountdown.daysToEvent)}
                </Text>
              </div>
            )}
            {goalCountdown.eventDate ? (
              <div>
                <Text variant="secondary" className="text-xs uppercase">
                  Event date
                </Text>
                <Text variant="default">
                  {toReactNode(goalCountdown.eventDate)}
                </Text>
              </div>
            ) : null}
            {goalCountdown.readiness ? (
              <div>
                <Text variant="secondary" className="text-xs uppercase">
                  Readiness
                </Text>
                <Text variant="default">
                  {toReactNode(goalCountdown.readiness)}
                </Text>
              </div>
            ) : null}
          </div>
        </Card>
      ) : null}

      {sessionDuration && sessionDuration.averageMinutes != null && (
        <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-2 block"
          >
            Session duration
          </Text>
          <Text variant="secondary" className="text-sm">
            Rolling 30 days · {String(sessionDuration.sessionCount)} sessions ·
            avg {String(sessionDuration.averageMinutes)} min
          </Text>
        </Card>
      )}

      {volume?.byWeek && volume.byWeek.length > 0 && (
        <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-2 block"
          >
            Volume (tonnage) by week
          </Text>
          <ul className="space-y-1 text-sm">
            {volume.byWeek.slice(-8).map((w, i) => (
              <li key={i}>
                {w.weekStart}: {w.tonnageKg} kg
                {w.rollingAvgKg != null && ` (4-wk avg: ${w.rollingAvgKg} kg)`}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {cycleHistory?.history && cycleHistory.history.length > 0 && (
        <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-2 block"
          >
            Cycle history
          </Text>
          <ul className="space-y-1 text-sm">
            {cycleHistory.history.slice(0, 10).map((t, i) => (
              <li key={i}>
                {String(t.fromCycle ?? '—')} → {String(t.toCycle)} ·{' '}
                {String(t.requestedAt).slice(0, 10)}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {bodyweight?.entries && bodyweight.entries.length > 0 && (
        <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-2 block"
          >
            Bodyweight trend
          </Text>
          <ul className="space-y-1 text-sm">
            {bodyweight.entries.slice(-14).map((e, i) => (
              <li key={i}>
                {e.date}: {e.valueKg} kg
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!compliance &&
        !goalCountdown?.eventDate &&
        !volume?.byWeek?.length &&
        !cycleHistory?.history?.length &&
        !bodyweight?.entries?.length && (
          <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
            <Text variant="secondary">
              Complete workouts and log data to see analytics here.
            </Text>
          </Card>
        )}
    </div>
  )
}
