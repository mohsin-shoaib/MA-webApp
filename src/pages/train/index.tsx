import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { Icon } from '@/components/Icon'
import { Tooltip } from '@/components/Tooltip'
import { trainService } from '@/api/train.service'
import type { AxiosError } from 'axios'

export default function TrainPage() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [todayWorkout, setTodayWorkout] = useState<{
    date: string
    phase: string
    weekIndex: number
    dayKey: string
    dayExercise: { exercise_name: string; exercises: unknown[] }
    currentCycle?: string
    programName?: string
    completed?: boolean
    sessionId?: number
    status?: string
  } | null>(null)

  useEffect(() => {
    const cancelled = { current: false }
    queueMicrotask(() => {
      if (cancelled.current) return
      setLoading(true)
      setError(null)
      trainService
        .getTodayWorkout()
        .then(res => {
          if (cancelled.current) return
          const apiRes = res.data
          if (apiRes.statusCode === 200 && apiRes.data) {
            const d = apiRes.data
            setTodayWorkout({
              ...d,
              dayKey: d.dayKey ?? d.dayExercise?.day ?? d.date,
            })
          } else {
            setTodayWorkout(null)
            setError(apiRes.message || 'No workout scheduled for today.')
          }
        })
        .catch((err: AxiosError<{ message?: string }>) => {
          if (cancelled.current) return
          const status = err.response?.status
          const message =
            err.response?.data?.message ||
            err.message ||
            'Failed to load today’s workout.'
          setError(message)
          setTodayWorkout(null)
          if (status === 404) {
            setError('No roadmap or workout found. Complete onboarding first.')
          }
        })
        .finally(() => {
          if (!cancelled.current) setLoading(false)
        })
    })
    return () => {
      cancelled.current = true
    }
  }, [])

  const cycleName = todayWorkout?.currentCycle ?? null

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text variant="primary" className="text-2xl font-semibold">
          Train
        </Text>
        {cycleName && (
          <span className="px-3 py-1.5 rounded-lg border text-sm font-medium bg-gray-100 text-gray-800 border-gray-200">
            {cycleName}
          </span>
        )}
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg">
          <Text variant="default">{error}</Text>
          <Button
            type="button"
            variant="secondary"
            className="mt-2"
            onClick={() => navigate('/onboarding')}
          >
            Go to Onboarding
          </Button>
        </div>
      )}

      {loading && (
        <div className="flex items-center gap-2 py-8">
          <Spinner size="small" variant="primary" />
          <Text variant="secondary">Loading...</Text>
        </div>
      )}

      {loading === false && (
        <>
          {/* Today's session */}
          <Card className="p-0">
            <Text variant="default" className="font-semibold mb-4">
              Today's session
            </Text>
            {todayWorkout ? (
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <Text
                    variant="muted"
                    className="text-xs uppercase tracking-wide shrink-0"
                  >
                    Program
                  </Text>
                  <Text
                    variant="default"
                    className="font-medium wrap-break-word text-right"
                  >
                    {todayWorkout.programName ?? '—'}
                  </Text>
                </div>
                <div className="flex flex-wrap gap-2">
                  {todayWorkout.currentCycle && (
                    <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                      {todayWorkout.currentCycle}
                    </span>
                  )}
                  <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                    {todayWorkout.phase}
                  </span>
                  <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                    Week {todayWorkout.weekIndex} • {todayWorkout.dayKey}
                  </span>
                </div>
                <div className="space-x-2 ">
                  <Text
                    variant="muted"
                    className="text-xs uppercase tracking-wide"
                  >
                    Session:
                  </Text>
                  <Text variant="secondary" className="wrap-break-word">
                    {todayWorkout.dayExercise?.exercise_name ||
                      todayWorkout.dayKey}
                  </Text>
                </div>
                <div className="flex flex-wrap gap-2 pt-2">
                  {todayWorkout.status === 'completed' && (
                    <span className="px-3 py-2 bg-green-100 text-green-800 rounded font-medium">
                      Completed
                    </span>
                  )}
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => navigate('/train/today')}
                  >
                    View session
                  </Button>
                </div>
              </div>
            ) : (
              <Text variant="secondary">
                No workout scheduled for today. Check your roadmap or program.
              </Text>
            )}
          </Card>

          {/* Program browser */}
          <Card className="p-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Text variant="default" className="font-semibold">
                  Program browser
                </Text>
                <Tooltip
                  content="Browse programs by Readiness Cycle (Red, Amber, Green) and enroll."
                  position="top"
                >
                  <span
                    className="inline-flex text-gray-500 cursor-help"
                    aria-label="More info"
                  >
                    <Icon name="circle-info" family="solid" size={16} />
                  </span>
                </Tooltip>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => navigate('/train/programs')}
              >
                Browse programs
              </Button>
            </div>
          </Card>

          {/* Exercise library */}
          <Card className="p-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Text variant="default" className="font-semibold">
                  Exercise library
                </Text>
                <Tooltip
                  content="Browse all days and exercises of your current program; log sets and complete workouts."
                  position="top"
                >
                  <span
                    className="inline-flex text-gray-500 cursor-help"
                    aria-label="More info"
                  >
                    <Icon name="circle-info" family="solid" size={16} />
                  </span>
                </Tooltip>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => navigate('/train/library')}
              >
                Open library
              </Button>
            </div>
          </Card>

          {/* Nutrition Hub */}
          <Card className="p-0">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Text variant="default" className="font-semibold">
                  Nutrition Hub
                </Text>
                <Tooltip
                  content="Macro calculator, meal logging, and hydration tracking."
                  position="top"
                >
                  <span
                    className="inline-flex text-gray-500 cursor-help"
                    aria-label="More info"
                  >
                    <Icon name="circle-info" family="solid" size={16} />
                  </span>
                </Tooltip>
              </div>
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => navigate('/train/nutrition')}
              >
                Open Nutrition Hub
              </Button>
            </div>
          </Card>

          {/* Recovery – placeholder */}
          <Card className="p-0">
            <div className="flex items-center gap-2">
              <Text variant="default" className="font-semibold">
                Recovery protocols
              </Text>
              <Tooltip
                content="Mobility, stretching, and soft tissue routines. Phase 2."
                position="top"
              >
                <span
                  className="inline-flex text-gray-500 cursor-help"
                  aria-label="More info"
                >
                  <Icon name="circle-info" family="solid" size={16} />
                </span>
              </Tooltip>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
