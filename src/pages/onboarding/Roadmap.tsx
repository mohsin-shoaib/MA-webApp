// RoadmapStep.tsx
import { useEffect, useState } from 'react'
import { Text } from '@/components/Text'
import { roadmapService } from '@/api/roadmap.service'
import type { RoadmapProps, RoadmapResponse } from '@/types/roadmap'
import type { AxiosError } from 'axios'

interface RoadmapStepProps {
  payload: RoadmapProps
  confirmed: boolean | null
  loading: boolean
  setLoading: (value: boolean) => void
  setError: (value: string | null) => void
}

export default function RoadmapStep({
  payload,
  confirmed,
  loading,
  setLoading,
  setError,
}: RoadmapStepProps) {
  const [roadmap, setRoadmap] = useState<RoadmapResponse | null>(null)
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    if (!payload || fetched) return

    const fetchRoadmap = async () => {
      setError(null)
      setLoading(true)

      try {
        const response = await roadmapService.generateRoadmap(payload)

        setRoadmap(response.data)
      } catch (error) {
        const axiosError = error as AxiosError<{ message: string }>
        const errorMessage =
          axiosError.response?.data?.message || 'Failed to generate roadmap.'
        setError(errorMessage)
        console.error(errorMessage)
        setError(errorMessage)

        // Optional fallback mock
      } finally {
        setLoading(false)
        setFetched(true)
      }
    }

    fetchRoadmap()
  }, [payload, fetched, setError, setLoading])

  if (!payload?.currentCycleId) {
    return (
      <div className="border rounded p-6 text-center">
        <Text variant="secondary">
          No cycle selected. Please complete confirmation step.
        </Text>
      </div>
    )
  }

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

      {loading && !roadmap && (
        <Text variant="secondary">Generating your roadmap...</Text>
      )}

      {roadmap && (
        <>
          {/* Timeline Section */}
          <div>
            <Text variant="default" className="font-semibold">
              Weekly Timeline
            </Text>

            <ul className="space-y-2 mt-2">
              {Object.entries(roadmap.timeline).map(
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
              {Object.entries(roadmap.dailyExercise).map(([day, exercises]) => (
                <li key={day} className="border rounded p-3">
                  <Text className="capitalize font-medium">{day}</Text>

                  <ul className="list-disc ml-6">
                    {exercises.map((exercise, i) => (
                      <li key={i}>{exercise}</li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          </div>

          {/* Debug Raw Response */}
          <details className="mt-4">
            <summary className="cursor-pointer text-sm">Raw Response</summary>
            <pre className="text-xs mt-2 bg-gray-100 p-3 rounded overflow-auto">
              {JSON.stringify(roadmap, null, 2)}
            </pre>
          </details>
        </>
      )}
    </div>
  )
}
