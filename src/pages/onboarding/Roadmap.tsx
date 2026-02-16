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
import { isRealTimelineWeek, isRealDailyExerciseByPhase } from '@/types/roadmap'
import type { AxiosError } from 'axios'

const PHASES = ['Red', 'Amber', 'Green'] as const

function renderExerciseItem(exercise: RoadmapExerciseItem, idx: number) {
  const hasVideo = exercise.video && exercise.video.trim().length > 0
  return (
    <li key={exercise.exercise_id ?? idx} className="text-sm space-y-1 py-1">
      <span className="font-medium">{exercise.name}</span>
      {exercise.description && (
        <p className="text-gray-600 text-xs">{exercise.description}</p>
      )}
      {(exercise.total_reps != null ||
        exercise.sets != null ||
        exercise.lb != null) && (
        <span className="text-xs text-gray-500">
          {[
            exercise.sets != null && `${exercise.sets} sets`,
            exercise.total_reps != null && `${exercise.total_reps} reps`,
            exercise.lb != null && `${exercise.lb} lb`,
          ]
            .filter(Boolean)
            .join(' • ')}
        </span>
      )}
      {hasVideo ? (
        <a
          href={exercise.video}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-600 hover:underline"
        >
          Watch video
        </a>
      ) : (
        exercise.video !== undefined && (
          <span className="text-xs text-amber-600">Video unavailable</span>
        )
      )}
      {exercise.alternate_exercise && (
        <div className="ml-3 mt-1 text-xs border-l-2 border-gray-200 pl-2">
          <span className="font-medium">Alternate: </span>
          {exercise.alternate_exercise.name}
          {exercise.alternate_exercise.description && (
            <span className="text-gray-500">
              {' '}
              – {exercise.alternate_exercise.description}
            </span>
          )}
        </div>
      )}
    </li>
  )
}

function renderDayContent(day: RoadmapDayExercise) {
  const exercises = day.exercises ?? []
  return (
    <div className="space-y-2 mb-3">
      <Text variant="default" className="font-medium">
        {day.exercise_name || day.day}
      </Text>
      {day.exercise_description && (
        <p className="text-xs text-gray-600">{day.exercise_description}</p>
      )}
      <ul className="list-disc ml-6 space-y-1">
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
        <Card className="p-6">
          <Text variant="primary" className="text-2xl font-semibold mb-4">
            Your Training Roadmap
          </Text>
          <div className="mb-4 space-y-2">
            {roadmap.primaryGoal && (
              <Text variant="secondary" className="block">
                Primary Goal: {roadmap.primaryGoal}
              </Text>
            )}
            {roadmap.eventDate && (
              <Text variant="secondary" className="block">
                Event Date: {new Date(roadmap.eventDate).toLocaleDateString()}
              </Text>
            )}
            {roadmap.totalWeeks && (
              <Text variant="secondary" className="block">
                Total Weeks: {roadmap.totalWeeks}
              </Text>
            )}
            {roadmap.currentCycle && (
              <Text variant="secondary" className="block">
                Current Cycle: {roadmap.currentCycle}
              </Text>
            )}
          </div>
        </Card>

        {roadmap.cycles && roadmap.cycles.length > 0 && (
          <div className="space-y-4">
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
                        <div className="space-y-2">
                          {isRealTimelineWeek(exercises)
                            ? exercises.map((day, dayIdx) => (
                                <div key={dayIdx}>{renderDayContent(day)}</div>
                              ))
                            : Array.isArray(exercises) && (
                                <ul className="list-disc ml-6">
                                  {exercises.map(
                                    (exercise: string, idx: number) => (
                                      <li key={idx} className="text-sm">
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

              return (
                <Card key={index} className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <Text variant="primary" className="text-xl font-semibold">
                        {cycle.cycleName}
                      </Text>
                      <Text variant="secondary" className="text-sm">
                        {cycle.startDate} - {cycle.endDate}
                      </Text>
                    </div>
                    <div className="flex gap-2">
                      {cycle.isActive && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-sm">
                          Active
                        </span>
                      )}
                      {cycle.isCompleted && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                          Completed
                        </span>
                      )}
                    </div>
                  </div>

                  {cycle.programName && (
                    <div className="mb-4">
                      <Text variant="default" className="font-semibold mb-2">
                        Program
                      </Text>
                      <Text variant="secondary">{cycle.programName}</Text>
                    </div>
                  )}

                  <div className="mb-4">
                    <Text variant="secondary" className="text-sm">
                      Duration: {cycle.durationWeeks} weeks
                    </Text>
                  </div>

                  {accordionItems.length > 0 && (
                    <div className="mt-4">
                      <Text variant="default" className="font-semibold mb-2">
                        Weekly Timeline
                      </Text>
                      <Accordion items={accordionItems} allowMultiple />
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
            <Card className="p-6">
              <Text variant="default" className="font-semibold mb-4">
                Weekly Timeline
              </Text>
              <div className="space-y-4">
                {Object.entries(
                  roadmap.timeline as Record<
                    string,
                    Record<string, string[] | RoadmapDayExercise[]>
                  >
                ).map(([cycleType, weeks]) => (
                  <div key={cycleType} className="mb-4">
                    <Text variant="primary" className="font-semibold mb-2">
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
                              <div className="space-y-2">
                                {isRealTimelineWeek(exercises)
                                  ? exercises.map((day, dayIdx) => (
                                      <div key={dayIdx}>
                                        {renderDayContent(day)}
                                      </div>
                                    ))
                                  : Array.isArray(exercises) && (
                                      <ul className="list-disc ml-6">
                                        {exercises.map(
                                          (exercise: string, idx: number) => (
                                            <li key={idx} className="text-sm">
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
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>
          )}

        {/* Daily Exercises: real (by phase and day) or legacy (flat day -> string[]) */}
        {roadmap.dailyExercise &&
          Object.keys(roadmap.dailyExercise).length > 0 && (
            <Card className="p-6">
              <Text variant="default" className="font-semibold mb-4">
                Daily Exercises
              </Text>
              <div className="space-y-4">
                {(() => {
                  const daily = roadmap.dailyExercise
                  if (isRealDailyExerciseByPhase(daily)) {
                    const phasesWithData = PHASES.filter(phase => daily[phase])
                    if (phasesWithData.length === 0) {
                      return (
                        <Text variant="secondary">No daily exercises.</Text>
                      )
                    }
                    return phasesWithData.map(phase => {
                      const days = daily[phase]!
                      return (
                        <div key={phase}>
                          <Text
                            variant="primary"
                            className="font-semibold mb-2"
                          >
                            {phase} Cycle
                          </Text>
                          <div className="space-y-2">
                            {Object.entries(days).map(([dayKey, dayData]) => (
                              <div
                                key={`${phase}-${dayKey}`}
                                className="border rounded p-3"
                              >
                                {typeof dayData === 'object' &&
                                dayData !== null &&
                                'exercise_name' in dayData ? (
                                  renderDayContent(dayData)
                                ) : (
                                  <Text className="capitalize font-medium">
                                    {dayKey}
                                  </Text>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )
                    })
                  }
                  return Object.entries(daily).map(([day, exercises]) => (
                    <div key={day} className="border rounded p-3">
                      <Text className="capitalize font-medium mb-2">{day}</Text>
                      {Array.isArray(exercises) && (
                        <ul className="list-disc ml-6">
                          {exercises.map((exercise: string, idx: number) => (
                            <li key={idx} className="text-sm">
                              {exercise}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))
                })()}
              </div>
            </Card>
          )}

        {onComplete && (
          <Card className="p-6">
            <Button onClick={onComplete} className="w-full">
              Complete Onboarding
            </Button>
          </Card>
        )}
      </div>
    )
  }

  // Legacy roadmap display
  return (
    <div className="border rounded p-6 space-y-6">
      <Text variant="primary" className="text-xl font-semibold">
        Your Roadmap
      </Text>

      {confirmed !== null && (
        <Text variant="secondary">
          {confirmed
            ? 'You confirmed the recommended cycle.'
            : 'You selected a custom cycle.'}
        </Text>
      )}

      {legacyRoadmap && (
        <>
          {/* Timeline Section */}
          <div>
            <Text variant="default" className="font-semibold">
              Weekly Timeline
            </Text>

            <ul className="space-y-2 mt-2">
              {Object.entries(legacyRoadmap.timeline).map(
                ([week, exercises], index) => (
                  <li key={week} className="border rounded p-3">
                    <Text className="font-medium">Week {index + 1}</Text>

                    <ul className="list-disc ml-6">
                      {exercises.map((exercise, i) => (
                        <li key={i}>{exercise}</li>
                      ))}
                    </ul>
                  </li>
                )
              )}
            </ul>
          </div>

          {/* Daily Exercise Section */}
          <div>
            <Text variant="default" className="font-semibold">
              Daily Exercises
            </Text>

            <ul className="space-y-2 mt-2">
              {Object.entries(legacyRoadmap.dailyExercise).map(
                ([day, exercises]) => (
                  <li key={day} className="border rounded p-3">
                    <Text className="capitalize font-medium">{day}</Text>

                    <ul className="list-disc ml-6">
                      {exercises.map((exercise, i) => (
                        <li key={i}>{exercise}</li>
                      ))}
                    </ul>
                  </li>
                )
              )}
            </ul>
          </div>
        </>
      )}
    </div>
  )
}
