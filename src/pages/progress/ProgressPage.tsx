/** Progress tab (PRD 7.3) */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { roadmapService } from '@/api/roadmap.service'
import { dashboardService } from '@/api/dashboard.service'
import type { Roadmap } from '@/types/roadmap'
import type { DashboardSummary } from '@/types/dashboard'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { AxiosError } from 'axios'

const CYCLE_COLORS: Record<string, string> = {
  Red: 'bg-red-100 text-red-800 border-red-200',
  Amber: 'bg-amber-100 text-amber-800 border-amber-200',
  Green: 'bg-green-100 text-green-800 border-green-200',
  Sustainment: 'bg-slate-100 text-slate-800 border-slate-200',
}

function cycleBadgeClass(name: string): string {
  return CYCLE_COLORS[name] ?? 'bg-gray-100 text-gray-800 border-gray-200'
}

export default function ProgressPage() {
  const navigate = useNavigate()
  const { showSuccess, showError } = useSnackbar()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [dashboard, setDashboard] = useState<DashboardSummary | null>(null)
  const [expandedTimeline, setExpandedTimeline] = useState(false)
  const [regenerating, setRegenerating] = useState(false)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    Promise.all([
      roadmapService.getRoadmap(),
      dashboardService.getDashboard().catch(() => null),
    ])
      .then(([roadmapRes, dash]) => {
        const data =
          roadmapRes.data?.statusCode === 200 ? roadmapRes.data.data : null
        setRoadmap(data ?? null)
        setDashboard(dash ?? null)
        if (!data && roadmapRes.data?.statusCode !== 200)
          setError('No roadmap found. Complete onboarding first.')
      })
      .catch((err: AxiosError<{ message?: string }>) => {
        setRoadmap(null)
        setError(
          err.response?.data?.message ||
            err.message ||
            'Failed to load progress.'
        )
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const handleRegenerateRoadmap = async () => {
    setRegenerating(true)
    try {
      const res = await roadmapService.regenerateRoadmap()
      if (res.data?.statusCode === 200 && res.data?.data) {
        setRoadmap(res.data.data)
        showSuccess('Roadmap updated.')
      } else {
        showError(res.data?.message || 'Failed to update roadmap.')
      }
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(
        ax.response?.data?.message || ax.message || 'Failed to update roadmap.'
      )
    } finally {
      setRegenerating(false)
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

  if (error && !roadmap) {
    return (
      <div className="space-y-4 max-w-4xl">
        <Text variant="primary" className="text-2xl font-semibold">
          Progress
        </Text>
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          <Text variant="default">{error}</Text>
        </div>
      </div>
    )
  }

  const currentCycle = roadmap?.currentCycle ?? dashboard?.cycle?.name ?? null
  const nextBlock = roadmap?.nextBlockName ?? null
  const countdownWeeks = roadmap?.countdownWeeks ?? null
  const compliance = dashboard?.compliance ?? null
  const streak = dashboard?.streak ?? 0

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text variant="primary" className="text-2xl font-semibold">
          Progress
        </Text>
        {currentCycle && (
          <span
            className={[
              'px-3 py-1.5 rounded-lg border text-sm font-medium',
              cycleBadgeClass(currentCycle),
            ].join(' ')}
          >
            {currentCycle}
          </span>
        )}
      </div>

      <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
        <Text
          variant="default"
          className="font-semibold text-gray-800 mb-3 block"
        >
          Your cycle
        </Text>
        <div className="flex flex-wrap gap-4">
          {currentCycle && (
            <div>
              <Text
                variant="secondary"
                className="text-xs uppercase tracking-wide"
              >
                Current
              </Text>
              <Text variant="default" className="font-medium">
                {currentCycle}
              </Text>
            </div>
          )}
          {nextBlock && (
            <div>
              <Text
                variant="secondary"
                className="text-xs uppercase tracking-wide"
              >
                Next block
              </Text>
              <Text variant="default" className="font-medium">
                {nextBlock}
              </Text>
            </div>
          )}
          {countdownWeeks != null && (
            <div>
              <Text
                variant="secondary"
                className="text-xs uppercase tracking-wide"
              >
                Weeks to next
              </Text>
              <Text variant="default" className="font-medium">
                {countdownWeeks}
              </Text>
            </div>
          )}
        </div>
        {roadmap?.sustainmentNote && (
          <Text variant="secondary" className="text-sm mt-3 block">
            {roadmap.sustainmentNote}
          </Text>
        )}
      </Card>

      {roadmap && (
        <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
          <div className="flex items-center justify-between mb-4">
            <Text variant="default" className="font-semibold text-gray-800">
              Roadmap
            </Text>
            <Button
              type="button"
              variant="outline"
              size="small"
              onClick={() => setExpandedTimeline(!expandedTimeline)}
            >
              {expandedTimeline ? 'Collapse' : 'Expand timeline'}
            </Button>
          </div>
          {roadmap.primaryGoal && (
            <Text variant="secondary" className="text-sm mb-2">
              Primary goal: {roadmap.primaryGoal}
              {roadmap.eventDate && ` · Event: ${roadmap.eventDate}`}
            </Text>
          )}
          {expandedTimeline && roadmap.cycles && roadmap.cycles.length > 0 && (
            <ul className="mt-4 space-y-2 border-t border-gray-100 pt-4">
              {roadmap.cycles.map((c, i) => (
                <li
                  key={i}
                  className={[
                    'px-3 py-2 rounded-lg border text-sm',
                    cycleBadgeClass(c.cycleName),
                  ].join(' ')}
                >
                  {c.cycleName} · {c.startDate} – {c.endDate}
                  {c.isActive && ' (current)'}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
        <Text
          variant="default"
          className="font-semibold text-gray-800 mb-4 block"
        >
          Performance & compliance
        </Text>
        <div className="space-y-4">
          {streak > 0 && (
            <div>
              <Text variant="secondary" className="text-sm">
                Streak
              </Text>
              <Text variant="primary" className="font-semibold">
                {streak} day{streak === 1 ? '' : 's'}
              </Text>
            </div>
          )}
          {compliance && (
            <div>
              <Text variant="secondary" className="text-sm">
                Compliance ({compliance.rollingDays} days)
              </Text>
              <Text variant="default" className="font-medium">
                {compliance.completedCount} / {compliance.scheduledCount}
                {compliance.compliancePercent != null &&
                  ` · ${Math.round(compliance.compliancePercent)}%`}
              </Text>
            </div>
          )}
          {roadmap?.prList && roadmap.prList.length > 0 && (
            <div>
              <Text variant="secondary" className="text-sm block mb-2">
                Recent PRs
              </Text>
              <ul className="list-none space-y-1">
                {roadmap.prList.slice(0, 5).map((pr, i) => (
                  <li key={i} className="text-sm text-gray-800">
                    {pr.exerciseName}: {pr.weight} {pr.unit}
                    {pr.date && ` (${pr.date})`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {roadmap?.testResults && roadmap.testResults.length > 0 && (
            <div>
              <Text variant="secondary" className="text-sm block mb-2">
                Test results
              </Text>
              <ul className="list-none space-y-1">
                {roadmap.testResults.map((t, i) => (
                  <li key={t.id ?? i} className="text-sm text-gray-800">
                    {t.name}: {t.result} ({t.date})
                  </li>
                ))}
              </ul>
            </div>
          )}
          {!roadmap?.prList?.length &&
            !roadmap?.testResults?.length &&
            !compliance &&
            streak === 0 && (
              <Text variant="secondary" className="text-sm">
                Complete workouts to see PRs and compliance here.
              </Text>
            )}
        </div>
      </Card>

      <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <Text variant="default" className="font-semibold text-gray-800">
            Tests
          </Text>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => navigate('/progress/analytics')}
            >
              Analytics
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="small"
              onClick={() => navigate('/progress/tests')}
            >
              Log & history
            </Button>
          </div>
        </div>
        <Text variant="secondary" className="text-sm block">
          Log test scores and view history. Rules shown as reference only.
        </Text>
      </Card>

      <Card className="p-6 rounded-xl border border-gray-200/80 bg-white">
        <Text
          variant="default"
          className="font-semibold text-gray-800 mb-2 block"
        >
          Update roadmap
        </Text>
        <Text variant="secondary" className="text-sm mb-4 block">
          If you change goals or event date, update your roadmap to recalculate
          your plan.
        </Text>
        <Button
          type="button"
          variant="secondary"
          onClick={handleRegenerateRoadmap}
          loading={regenerating}
        >
          Update roadmap
        </Button>
      </Card>
    </div>
  )
}
