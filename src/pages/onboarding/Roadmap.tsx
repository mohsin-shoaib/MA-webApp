// RoadmapStep.tsx
import { useEffect, useState } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { Accordion } from '@/components/Accordion'
import { roadmapService } from '@/api/roadmap.service'
import type {
  RoadmapProps,
  RoadmapResponse,
  Roadmap,
  RoadmapDayExercise,
  RoadmapExerciseItem,
} from '@/types/roadmap'
import { isRealTimelineWeek } from '@/types/roadmap'
import type { AxiosError } from 'axios'

const CYCLE_COLORS: Record<string, string> = {
  Red: 'border-l-4 border-l-red-500 bg-red-50/50',
  Amber: 'border-l-4 border-l-amber-500 bg-amber-50/50',
  Green: 'border-l-4 border-l-green-600 bg-green-50/50',
}

/** Roadmap summary: name, short description, duration only (no sets/reps/video) */
function renderExerciseItem(exercise: RoadmapExerciseItem, idx: number) {
  const desc = exercise.description?.trim()
  const descShort = desc && desc.length > 80 ? `${desc.slice(0, 80)}…` : desc

  return (
    <li
      key={exercise.exercise_id ?? idx}
      className="py-2 border-b border-gray-100 last:border-0 text-sm"
    >
      <span className="font-medium text-gray-900 block">{exercise.name}</span>
      {descShort && (
        <span className="text-gray-600 text-xs block mt-0.5">{descShort}</span>
      )}
    </li>
  )
}

function renderDayContent(day: RoadmapDayExercise) {
  const exercises = day.exercises ?? []
  const dayLabel = day.exercise_name || day.day
  const duration = [day.workout_timer, day.exercise_time, day.rest_timer]
    .filter(Boolean)
    .join(' • ')

  return (
    <div className="rounded-lg bg-white border border-gray-100 p-3 shadow-sm">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0 mb-2">
        <p className="text-sm font-semibold text-gray-800">{dayLabel}</p>
        {duration && <span className="text-xs text-gray-500">{duration}</span>}
      </div>
      <ul className="list-none ml-0 space-y-0">
        {exercises.map((ex, idx) => renderExerciseItem(ex, idx))}
      </ul>
    </div>
  )
}

interface RoadmapStepProps {
  readonly payload?: RoadmapProps
  readonly confirmed: boolean | null
  readonly loading: boolean
  readonly setLoading: (value: boolean) => void
  readonly setError: (value: string | null) => void
  readonly onComplete?: () => void
}

export default function RoadmapStep({
  payload,
  confirmed,
  loading,
  setLoading,
  setError,
  onComplete,
}: RoadmapStepProps) {
  const [roadmap, setRoadmap] = useState<Roadmap | null>(null)
  const [legacyRoadmap, setLegacyRoadmap] = useState<RoadmapResponse | null>(
    null
  )
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    if (fetched) return

    const fetchRoadmap = async () => {
      setError(null)
      setLoading(true)

      try {
        // Try new API first
        const response = await roadmapService.getRoadmap()
        // Axios wraps the response, so data is in response.data
        const apiResponse = response.data
        if (apiResponse.statusCode === 200 && apiResponse.data) {
          setRoadmap(apiResponse.data)
          setFetched(true)
          setLoading(false)
          return
        } else {
          throw new Error(apiResponse.message || 'Invalid response format')
        }
      } catch (error) {
        // Fallback to legacy API if new one fails
        if (payload) {
          try {
            const legacyResponse = await roadmapService.generateRoadmap(payload)
            // Axios wraps the response, so data is in response.data
            const legacyApiResponse = legacyResponse.data
            // RoadmapResponse is the data itself, not wrapped in a data property
            setLegacyRoadmap(legacyApiResponse)
            setFetched(true)
            setLoading(false)
            return
          } catch (legacyError) {
            const axiosError = legacyError as AxiosError<{ message: string }>
            const errorMessage =
              axiosError.response?.data?.message ||
              'Failed to generate roadmap.'
            setError(errorMessage)
            console.error(errorMessage)
          }
        } else {
          const axiosError = error as AxiosError<{ message: string }>
          const errorMessage =
            axiosError.response?.data?.message ||
            axiosError.message ||
            'Failed to fetch roadmap.'
          setError(errorMessage)
          console.error('Roadmap fetch error:', errorMessage, error)
        }
      } finally {
        setLoading(false)
        setFetched(true)
      }
    }

    fetchRoadmap()
  }, [payload, fetched, setError, setLoading])

  if (loading && !fetched) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="medium" variant="primary" />
        <Text variant="secondary" className="ml-4">
          Loading roadmap...
        </Text>
      </div>
    )
  }

  if (!roadmap && !legacyRoadmap) {
    return (
      <Card className="p-6">
        <Text variant="secondary">
          No roadmap found. Please complete confirmation step.
        </Text>
      </Card>
    )
  }

  // Display new roadmap format
  if (roadmap) {
    return (
      <div className="space-y-6">
        {/* Summary card — aligned with other onboarding steps */}
        <Card className="p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/80 bg-white">
          <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-1">
            Your Training Roadmap
          </h2>
          <Text variant="secondary" className="text-sm mb-6">
            Overview of your plan and current phase.
          </Text>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
            {roadmap.primaryGoal && (
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Primary goal
                </dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {roadmap.primaryGoal}
                </dd>
              </div>
            )}
            {roadmap.eventDate && (
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Event date
                </dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {new Date(roadmap.eventDate).toLocaleDateString()}
                </dd>
              </div>
            )}
            {roadmap.totalWeeks != null && (
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Total weeks
                </dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {roadmap.totalWeeks}
                </dd>
              </div>
            )}
            {roadmap.currentCycle && (
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Current cycle
                </dt>
                <dd className="mt-0.5 font-medium text-gray-900">
                  {roadmap.currentCycle}
                </dd>
              </div>
            )}
          </dl>
        </Card>

        {roadmap.cycles && roadmap.cycles.length > 0 && (
          <div className="space-y-5">
            {roadmap.cycles.map((cycle, index) => {
              const timelineData = (
                roadmap.timeline as Record<string, Record<string, unknown>>
              )[cycle.cycleType]
              const accordionItems =
                timelineData && typeof timelineData === 'object'
                  ? Object.entries(timelineData).map(([week, exercises]) => ({
                      id: `${cycle.cycleType}-${week}`,
                      title: week,
                      content: (
                        <div className="rounded-lg bg-white border border-gray-100 p-4 space-y-4">
                          {isRealTimelineWeek(exercises)
                            ? exercises.map((day, dayIdx) => (
                                <div key={dayIdx}>{renderDayContent(day)}</div>
                              ))
                            : Array.isArray(exercises) && (
                                <ul className="list-none space-y-2">
                                  {exercises.map(
                                    (exercise: string, idx: number) => (
                                      <li
                                        key={idx}
                                        className="text-sm text-gray-700 py-2 px-3 rounded-md bg-gray-50 border border-gray-100"
                                      >
                                        {exercise}
                                      </li>
                                    )
                                  )}
                                </ul>
                              )}
                        </div>
                      ),
                    }))
                  : []

              const cycleStyle =
                CYCLE_COLORS[cycle.cycleName] ??
                'border-l-gray-400 bg-gray-50/50'

              return (
                <Card
                  key={index}
                  className={`p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/80 overflow-hidden ${cycleStyle}`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {cycle.cycleName} Cycle
                      </h3>
                      <Text variant="secondary" className="text-sm mt-0.5">
                        {cycle.startDate} – {cycle.endDate}
                      </Text>
                    </div>
                    <div className="flex gap-2">
                      {cycle.isActive && (
                        <span className="px-2.5 py-1 bg-green-100 text-green-800 rounded-lg text-xs font-medium">
                          Active
                        </span>
                      )}
                      {cycle.isCompleted && (
                        <span className="px-2.5 py-1 bg-gray-200 text-gray-700 rounded-lg text-xs font-medium">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>

                  {(cycle.programName || cycle.durationWeeks != null) && (
                    <div className="flex flex-wrap gap-4 mb-4 text-sm">
                      {cycle.programName && (
                        <div>
                          <span className="text-gray-500">Program: </span>
                          <span className="font-medium text-gray-800">
                            {cycle.programName}
                          </span>
                        </div>
                      )}
                      {cycle.durationWeeks != null && (
                        <div>
                          <span className="text-gray-500">Duration: </span>
                          <span className="font-medium text-gray-800">
                            {cycle.durationWeeks} weeks
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {accordionItems.length > 0 && (
                    <div className="mt-5">
                      <Text
                        variant="default"
                        className="font-semibold text-gray-800 mb-3 block"
                      >
                        Weekly timeline
                      </Text>
                      <Accordion
                        items={accordionItems}
                        allowMultiple
                        variant="outlined"
                        contentClassName="py-4 bg-gray-50/80"
                      />
                    </div>
                  )}
                </Card>
              )
            })}
          </div>
        )}

        {/* Display timeline if cycles not available but timeline exists */}
        {(!roadmap.cycles || roadmap.cycles.length === 0) &&
          roadmap.timeline &&
          typeof roadmap.timeline === 'object' && (
            <Card className="p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/80">
              <Text
                variant="default"
                className="font-semibold text-gray-800 mb-4"
              >
                Weekly timeline
              </Text>
              <div className="space-y-5">
                {Object.entries(
                  roadmap.timeline as Record<
                    string,
                    Record<string, string[] | RoadmapDayExercise[]>
                  >
                ).map(([cycleType, weeks]) => {
                  const cycleStyle =
                    CYCLE_COLORS[cycleType] ??
                    'border-l-4 border-l-gray-400 bg-gray-50/50'
                  return (
                    <div
                      key={cycleType}
                      className={`rounded-lg border border-gray-200 p-4 ${cycleStyle}`}
                    >
                      <Text
                        variant="primary"
                        className="font-semibold mb-3 block"
                      >
                        {cycleType} Cycle
                      </Text>
                      {Object.keys(weeks).length === 0 ? (
                        <Text variant="secondary" className="text-sm">
                          No program assigned for this phase.
                        </Text>
                      ) : (
                        <Accordion
                          items={Object.entries(weeks).map(
                            ([week, exercises]) => ({
                              id: `${cycleType}-${week}`,
                              title: week,
                              content: (
                                <div className="rounded-lg bg-white border border-gray-100 p-4 space-y-4">
                                  {isRealTimelineWeek(exercises)
                                    ? exercises.map((day, dayIdx) => (
                                        <div key={dayIdx}>
                                          {renderDayContent(day)}
                                        </div>
                                      ))
                                    : Array.isArray(exercises) && (
                                        <ul className="list-none space-y-2">
                                          {exercises.map(
                                            (exercise: string, idx: number) => (
                                              <li
                                                key={idx}
                                                className="text-sm text-gray-700 py-2 px-3 rounded-md bg-gray-50 border border-gray-100"
                                              >
                                                {exercise}
                                              </li>
                                            )
                                          )}
                                        </ul>
                                      )}
                                </div>
                              ),
                            })
                          )}
                          allowMultiple
                          variant="outlined"
                          contentClassName="py-4 bg-gray-50/80"
                        />
                      )}
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

        {onComplete && (
          <Card className="p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/80">
            <Text variant="secondary" className="text-sm mb-4 block">
              You’re all set. Go to your dashboard to start training.
            </Text>
            <Button
              onClick={onComplete}
              className="w-full bg-[#3AB8ED] hover:bg-[#2ea8db] text-white font-bold rounded-lg py-3"
            >
              Go to dashboard
            </Button>
          </Card>
        )}
      </div>
    )
  }

  // Legacy roadmap display
  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/80 bg-white">
        <h2 className="text-xl font-semibold text-gray-800 mb-1">
          Your roadmap
        </h2>
        {confirmed !== null && (
          <Text variant="secondary" className="text-sm mb-4">
            {confirmed
              ? 'You confirmed the recommended cycle.'
              : 'You selected a custom cycle.'}
          </Text>
        )}

        {legacyRoadmap && (
          <>
            <Text
              variant="default"
              className="font-semibold text-gray-800 mb-3 block"
            >
              Weekly timeline
            </Text>
            <ul className="space-y-3">
              {Object.entries(legacyRoadmap.timeline).map(
                ([week, exercises], index) => (
                  <li
                    key={week}
                    className="rounded-lg border border-gray-200 bg-gray-50/50 p-4"
                  >
                    <Text className="font-medium text-gray-900 mb-2 block">
                      Week {index + 1}
                    </Text>
                    <ul className="list-none space-y-1">
                      {exercises.map((exercise, i) => (
                        <li key={i} className="text-sm text-gray-700">
                          {exercise}
                        </li>
                      ))}
                    </ul>
                  </li>
                )
              )}
            </ul>
          </>
        )}
      </Card>
    </div>
  )
}
