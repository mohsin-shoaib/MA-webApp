/** PRD 17.2 — Coach analytics: roster by status, compliance aggregate, upcoming events */
import { useState, useEffect } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import { coachAnalyticsService } from '@/api/coach-analytics.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { AxiosError } from 'axios'

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

export default function CoachAnalyticsPage() {
  const { showError } = useSnackbar()
  const [loading, setLoading] = useState(true)
  const [roster, setRoster] = useState<RosterItem[]>([])
  const [compliance, setCompliance] = useState<Record<string, unknown> | null>(
    null
  )
  const [events, setEvents] = useState<Array<Record<string, unknown>>>([])

  useEffect(() => {
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

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8">
        <Spinner size="small" variant="primary" />
        <Text variant="secondary">Loading analytics...</Text>
      </div>
    )
  }

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
                    {[a.firstName, a.lastName].filter(Boolean).join(' ') ||
                      a.email}
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
    </div>
  )
}
