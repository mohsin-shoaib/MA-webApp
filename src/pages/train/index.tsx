import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
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

  return (
    <div className="space-y-6 max-w-4xl">
      <Text variant="primary" className="text-2xl font-semibold">
        Train
      </Text>

      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded">
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

      {/* Today's session – opens detail page like Exercise Library */}
      <Card
        className={`p-6 ${todayWorkout ? 'cursor-pointer hover:bg-gray-50 transition' : ''}`}
        pressable={!!todayWorkout}
        onPress={() => todayWorkout && navigate('/train/today')}
      >
        <Text variant="default" className="font-semibold mb-4">
          Today’s session
        </Text>
        {loading && (
          <div className="flex items-center gap-2 py-4">
            <Spinner size="small" variant="primary" />
            <Text variant="secondary">Loading...</Text>
          </div>
        )}
        {!loading && todayWorkout && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {todayWorkout.currentCycle && (
                <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                  {todayWorkout.currentCycle}
                </span>
              )}
              <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                {todayWorkout.phase} • Week {todayWorkout.weekIndex} •{' '}
                {todayWorkout.dayKey}
              </span>
              {todayWorkout.programName && (
                <span className="px-2 py-1 bg-gray-100 rounded text-sm">
                  {todayWorkout.programName}
                </span>
              )}
            </div>
            <Text variant="secondary">
              {todayWorkout.dayExercise?.exercise_name || todayWorkout.dayKey}
            </Text>
            <div className="flex flex-wrap gap-2 mt-4">
              {todayWorkout.status === 'completed' && (
                <span className="px-3 py-2 bg-green-100 text-green-800 rounded font-medium">
                  Completed
                </span>
              )}
              <Button
                type="button"
                variant="secondary"
                onClick={e => {
                  e.stopPropagation()
                  navigate('/train/today')
                }}
                disabled={loading}
              >
                View session
              </Button>
            </div>
          </div>
        )}
        {!loading && !todayWorkout && !error && (
          <Text variant="secondary">
            No workout scheduled for today. Check your roadmap or program.
          </Text>
        )}
      </Card>

      {/* Program browser – opens on separate page */}
      <Card
        className="p-6 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => navigate('/train/programs')}
      >
        <Text variant="default" className="font-semibold mb-2">
          Program browser
        </Text>
        <Text variant="secondary" className="text-sm">
          Browse programs by Readiness Cycle (Red, Amber, Green) and enroll.
        </Text>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          onClick={e => {
            e.stopPropagation()
            navigate('/train/programs')
          }}
        >
          Browse programs
        </Button>
      </Card>

      {/* Exercise library */}
      <Card
        className="p-6 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => navigate('/train/library')}
      >
        <Text variant="default" className="font-semibold mb-2">
          Exercise library
        </Text>
        <Text variant="secondary" className="text-sm">
          Browse all days and exercises of your current program; log sets and
          complete workouts.
        </Text>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          onClick={e => {
            e.stopPropagation()
            navigate('/train/library')
          }}
        >
          Open library
        </Button>
      </Card>

      {/* Nutrition Hub */}
      <Card
        className="p-6 cursor-pointer hover:bg-gray-50 transition"
        onClick={() => navigate('/train/nutrition')}
      >
        <Text variant="default" className="font-semibold mb-2">
          Nutrition Hub
        </Text>
        <Text variant="secondary" className="text-sm">
          Macro calculator, meal logging, and hydration tracking.
        </Text>
        <Button
          type="button"
          variant="secondary"
          className="mt-3"
          onClick={e => {
            e.stopPropagation()
            navigate('/train/nutrition')
          }}
        >
          Open Nutrition Hub
        </Button>
      </Card>

      {/* Recovery – placeholder */}
      <Card className="p-6">
        <Text variant="default" className="font-semibold mb-2">
          Recovery protocols
        </Text>
        <Text variant="secondary" className="text-sm">
          Mobility, stretching, and soft tissue routines. Phase 2.
        </Text>
      </Card>
    </div>
  )
}
