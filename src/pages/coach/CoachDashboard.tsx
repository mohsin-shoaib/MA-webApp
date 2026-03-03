/**
 * MASS Phase 8: Coach dashboard — assigned athletes overview, athletes needing attention, recent activity.
 */
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { coachAnalyticsService } from '@/api/coach-analytics.service'
import { coachService } from '@/api/coach.service'
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
}

type EventItem = {
  athleteName?: string
  eventName?: string
  eventDate?: string
  daysOut?: number
}

export default function CoachDashboard() {
  const navigate = useNavigate()
  const { showError } = useSnackbar()
  const [loading, setLoading] = useState(true)
  const [roster, setRoster] = useState<RosterItem[]>([])
  const [myAthletesCount, setMyAthletesCount] = useState<number | null>(null)
  const [events, setEvents] = useState<EventItem[]>([])

  useEffect(() => {
    Promise.all([
      coachAnalyticsService
        .getRoster({ limit: 200 })
        .then(r => r.data?.data?.roster ?? []),
      coachService
        .getMyAthletes()
        .then(r => (r.data?.data?.athletes?.length ?? 0) as number),
      coachAnalyticsService
        .getUpcomingEvents(30)
        .then(r => r.data?.data?.events ?? []),
    ])
      .then(([r, count, e]) => {
        setRoster(Array.isArray(r) ? r : [])
        setMyAthletesCount(Number(count) || 0)
        setEvents(Array.isArray(e) ? e : [])
      })
      .catch((err: AxiosError) =>
        showError(err.message || 'Failed to load dashboard')
      )
      .finally(() => setLoading(false))
  }, [showError])

  if (loading) {
    return (
      <div className="flex items-center gap-2 py-8">
        <Spinner size="small" variant="primary" />
        <Text variant="secondary">Loading dashboard...</Text>
      </div>
    )
  }

  const atRisk = roster.filter(a => a.status === 'at_risk')
  const activeCount = roster.filter(a => a.status === 'active').length

  return (
    <div className="p-6 max-w-4xl space-y-6">
      <Text as="h1" variant="primary" className="text-2xl font-bold">
        Coach Dashboard
      </Text>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="p-5 rounded-xl border border-gray-200/80 bg-white">
          <Text variant="secondary" className="text-sm uppercase tracking-wide">
            Assigned athletes (1:1)
          </Text>
          <Text variant="default" className="text-2xl font-semibold mt-1">
            {myAthletesCount ?? 0}
          </Text>
          <Button
            type="button"
            variant="secondary"
            size="small"
            className="mt-3"
            onClick={() => navigate('/coach/my-athletes')}
          >
            View my athletes
          </Button>
        </Card>
        <Card className="p-5 rounded-xl border border-gray-200/80 bg-white">
          <Text variant="secondary" className="text-sm uppercase tracking-wide">
            Active athletes
          </Text>
          <Text variant="default" className="text-2xl font-semibold mt-1">
            {activeCount}
          </Text>
          <Button
            type="button"
            variant="secondary"
            size="small"
            className="mt-3"
            onClick={() => navigate('/coach/user-management')}
          >
            View all athletes
          </Button>
        </Card>
        <Card className="p-5 rounded-xl border border-gray-200/80 bg-white">
          <Text variant="secondary" className="text-sm uppercase tracking-wide">
            Needing attention
          </Text>
          <Text
            variant="default"
            className="text-2xl font-semibold mt-1 text-amber-700"
          >
            {atRisk.length}
          </Text>
          <Button
            type="button"
            variant="secondary"
            size="small"
            className="mt-3"
            onClick={() => navigate('/coach/analytics')}
          >
            View analytics
          </Button>
        </Card>
      </div>

      {atRisk.length > 0 ? (
        <Card className="p-5 rounded-xl border border-amber-200/80 bg-amber-50/50">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-3 block"
          >
            Athletes needing attention
          </Text>
          <ul className="space-y-2">
            {atRisk.slice(0, 10).map(a => (
              <li key={a.userId}>
                <button
                  type="button"
                  className="text-left w-full flex items-center justify-between gap-3 py-2 px-3 rounded-lg hover:bg-amber-100/80 transition-colors"
                  onClick={() =>
                    navigate(`/coach/athletes/${a.userId}`, {
                      state: {
                        athlete: {
                          id: a.userId,
                          firstName: a.firstName,
                          lastName: a.lastName,
                          email: a.email,
                        },
                      },
                    })
                  }
                >
                  <span className="font-medium text-gray-900">
                    {[a.firstName, a.lastName].filter(Boolean).join(' ') ||
                      a.email}
                  </span>
                  <span className="text-sm text-gray-600">
                    {a.compliancePercent != null
                      ? `${a.compliancePercent}% compliance`
                      : ''}
                    {a.lastWorkoutDate ? ` · Last: ${a.lastWorkoutDate}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          {atRisk.length > 10 && (
            <Text variant="secondary" className="text-sm mt-2">
              +{atRisk.length - 10} more — see Analytics
            </Text>
          )}
        </Card>
      ) : null}

      {events.length > 0 && (
        <Card className="p-5 rounded-xl border border-gray-200/80 bg-white">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-3 block"
          >
            Upcoming events (next 30 days)
          </Text>
          <ul className="space-y-2 text-sm">
            {events.slice(0, 10).map((e, i) => (
              <li key={i} className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{String(e.athleteName)}</span>
                <span className="text-gray-600">{String(e.eventName)}</span>
                <span className="text-gray-500">{String(e.eventDate)}</span>
                {e.daysOut != null && (
                  <span className="text-gray-400">({e.daysOut} days)</span>
                )}
              </li>
            ))}
          </ul>
          <Button
            type="button"
            variant="secondary"
            size="small"
            className="mt-3"
            onClick={() => navigate('/coach/analytics')}
          >
            View all in Analytics
          </Button>
        </Card>
      )}

      <div className="flex flex-wrap gap-3 pt-2">
        <Button
          type="button"
          variant="primary"
          onClick={() => navigate('/coach/user-management')}
        >
          Athletes
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/coach/analytics')}
        >
          Analytics
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/coach/program-management')}
        >
          Programs
        </Button>
      </div>
    </div>
  )
}
