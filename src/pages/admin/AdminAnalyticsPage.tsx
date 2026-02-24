/** PRD 17.3 — Admin analytics: time to first workout, program popularity, cycle distribution, retention */
import { useState, useEffect } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import { adminAnalyticsService } from '@/api/admin-analytics.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { AxiosError } from 'axios'

export default function AdminAnalyticsPage() {
  const { showError } = useSnackbar()
  const [loading, setLoading] = useState(true)
  const [timeToWorkout, setTimeToWorkout] = useState<Record<
    string,
    unknown
  > | null>(null)
  const [programPopularity, setProgramPopularity] = useState<{
    programs?: Array<Record<string, unknown>>
  } | null>(null)
  const [cycleDist, setCycleDist] = useState<{
    total?: number
    distribution?: Array<{ cycle: string; count: number; percent: number }>
  } | null>(null)
  const [retention, setRetention] = useState<{
    retention?: Array<Record<string, unknown>>
  } | null>(null)

  useEffect(() => {
    Promise.all([
      adminAnalyticsService
        .getTimeToFirstWorkout()
        .then(r => r.data?.data ?? null),
      adminAnalyticsService
        .getProgramPopularity()
        .then(r => r.data?.data ?? null),
      adminAnalyticsService
        .getCycleDistribution()
        .then(r => r.data?.data ?? null),
      adminAnalyticsService.getRetention().then(r => r.data?.data ?? null),
    ])
      .then(([t, p, c, ret]) => {
        setTimeToWorkout(t ?? null)
        setProgramPopularity(p ?? null)
        setCycleDist(c ?? null)
        setRetention(ret ?? null)
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
        Admin Analytics
      </Text>

      {timeToWorkout && (
        <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-2 block"
          >
            Time to first workout
          </Text>
          <div className="flex flex-wrap gap-4 text-sm">
            <span>Athletes: {String(timeToWorkout.athleteCount ?? 0)}</span>
            <span>
              With first workout: {String(timeToWorkout.withFirstWorkout ?? 0)}
            </span>
            {(timeToWorkout.averageHoursToFirstWorkout as number) != null && (
              <span>
                Avg hours to first workout:{' '}
                {String(timeToWorkout.averageHoursToFirstWorkout)}
              </span>
            )}
            {(timeToWorkout.over48HoursCount as number) != null && (
              <span className="text-amber-700">
                Over 48h: {String(timeToWorkout.over48HoursCount)}
              </span>
            )}
          </div>
        </Card>
      )}

      {programPopularity?.programs && programPopularity.programs.length > 0 && (
        <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-2 block"
          >
            Program popularity
          </Text>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2">Program</th>
                  <th className="text-left py-2">Cycle</th>
                  <th className="text-left py-2">Enrollments</th>
                  <th className="text-left py-2">Completions</th>
                </tr>
              </thead>
              <tbody>
                {programPopularity.programs.map((p, i) => (
                  <tr key={i} className="border-b border-gray-100">
                    <td className="py-2">{String(p.programName)}</td>
                    <td className="py-2">{String(p.cycleName ?? '—')}</td>
                    <td className="py-2">{String(p.enrollments ?? 0)}</td>
                    <td className="py-2">{String(p.completions ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {cycleDist && (cycleDist.distribution?.length ?? 0) > 0 && (
        <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-2 block"
          >
            Cycle distribution
          </Text>
          <Text variant="secondary" className="text-sm mb-2">
            Total athletes: {cycleDist.total ?? 0}
          </Text>
          <ul className="space-y-1 text-sm">
            {(cycleDist.distribution ?? []).map((d, i) => (
              <li key={i}>
                {d.cycle}: {d.count} ({d.percent}%)
              </li>
            ))}
          </ul>
        </Card>
      )}

      {retention?.retention && retention.retention.length > 0 && (
        <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
          <Text
            variant="default"
            className="font-semibold text-gray-800 mb-2 block"
          >
            Retention (engagement)
          </Text>
          <ul className="space-y-1 text-sm">
            {retention.retention.map((r, i) => (
              <li key={i}>
                {String(r.period)}: {String(r.createdInPeriod)} created ·{' '}
                {String(r.withWorkout)} with workout
                {(r.retentionPercent as number) != null &&
                  ` · ${r.retentionPercent}%`}
              </li>
            ))}
          </ul>
        </Card>
      )}

      {!timeToWorkout &&
        !programPopularity?.programs?.length &&
        !cycleDist?.distribution?.length &&
        !retention?.retention?.length && (
          <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
            <Text variant="secondary">No analytics data yet.</Text>
          </Card>
        )}
    </div>
  )
}
