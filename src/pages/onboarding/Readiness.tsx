// RecommendationStep.tsx
import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import type { ReadinessRecommendation } from '@/types/readiness'
import type { OnboardingProps } from '@/types/onboarding'
import { readinessService } from '@/api/readiness.service'
import type { AxiosError } from 'axios'

interface RecommendationStepProps {
  onboardingData?: OnboardingProps
  onConfirm: (selected: { cycle: string; confirmed: boolean }) => void
  onRecommendationFetched?: (recommendation: ReadinessRecommendation) => void
  loading: boolean
  setLoading: (value: boolean) => void
  setError: (value: string | null) => void
}

export default function RecommendationStep({
  onboardingData,
  onConfirm,
  onRecommendationFetched,
  loading,
  setLoading,
  setError,
}: RecommendationStepProps) {
  const [selected, setSelected] = useState<{
    cycle: string
    confirmed: boolean
  } | null>(null)
  const [fetched, setFetched] = useState(false)
  const [recommendation, setRecommendation] =
    useState<ReadinessRecommendation | null>(null)

  useEffect(() => {
    // Try new API endpoint first
    const fetchNewRecommendation = async () => {
      setError(null)
      setLoading(true)

      try {
        const response = await readinessService.getReadinessRecommendation()
        // Axios wraps the response, so data is in response.data
        const apiResponse = response.data
        if (apiResponse.statusCode === 200 && apiResponse.data) {
          setRecommendation(apiResponse.data)
          setSelected({
            cycle: apiResponse.data.recommendedCycle,
            confirmed: true,
          })
          // Pass recommendation to parent
          onRecommendationFetched?.(apiResponse.data)
          setFetched(true)
          setLoading(false)
        } else {
          throw new Error(apiResponse.message || 'Invalid response format')
        }
      } catch (error) {
        const axiosError = error as AxiosError<{ message: string }>
        const errorMessage =
          axiosError.response?.data?.message ||
          axiosError.message ||
          'Failed to fetch recommendation.'
        setError(errorMessage)
        setSelected({
          cycle: 'No cycle',
          confirmed: false,
        })
        setFetched(true)
        setLoading(false)
      }
    }

    if (!fetched) {
      fetchNewRecommendation()
    }
  }, [onboardingData, fetched, setLoading, setError, onRecommendationFetched])

  if (loading && !fetched) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="medium" variant="primary" />
        <Text variant="secondary" className="ml-4">
          Loading recommendation...
        </Text>
      </div>
    )
  }

  if (!onboardingData && !recommendation) {
    return (
      <Card className="p-6">
        <Text variant="secondary">
          No onboarding data found. Please complete onboarding first.
        </Text>
      </Card>
    )
  }

  // Use new recommendation data if available
  if (recommendation) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="mb-4">
            <Text variant="primary" className="font-semibold text-xl mb-2">
              Recommended Cycle: {recommendation.recommendedCycle}
            </Text>
            <div className="flex items-center gap-2 mt-2">
              <Text variant="secondary" className="text-sm">
                Confidence: {Math.round(recommendation.confidence * 100)}%
              </Text>
              <Text variant="secondary" className="text-sm">
                • {recommendation.weeksToEvent} weeks to event
              </Text>
            </div>
          </div>

          <div className="mb-4">
            <Text variant="default" className="font-semibold mb-2">
              Reason
            </Text>
            <Text variant="secondary">{recommendation.reason}</Text>
          </div>

          {recommendation.reasonCodes &&
            recommendation.reasonCodes.length > 0 && (
              <div className="mb-4">
                <Text variant="default" className="font-semibold mb-2">
                  Reason Codes
                </Text>
                <div className="flex flex-wrap gap-2">
                  {recommendation.reasonCodes.map((code, index) => (
                    <span
                      key={index}
                      className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm"
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {recommendation.recommendedProgram && (
            <div className="mb-4">
              <Text variant="default" className="font-semibold mb-2">
                Recommended Program
              </Text>
              <Text variant="secondary">
                {recommendation.recommendedProgram.name}
              </Text>
            </div>
          )}

          {recommendation.goalProgram && (
            <div className="mb-4">
              <Text variant="default" className="font-semibold mb-2">
                Goal Program
              </Text>
              <Text variant="secondary">{recommendation.goalProgram.name}</Text>
            </div>
          )}

          {recommendation.transitionNote && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <Text variant="default" className="font-semibold mb-2">
                Transition Note
              </Text>
              <Text variant="secondary">{recommendation.transitionNote}</Text>
            </div>
          )}

          <div className="mt-6 flex gap-4">
            <Button
              onClick={() => selected && onConfirm(selected)}
              disabled={!selected || loading}
              loading={loading}
              className="flex-1"
            >
              Confirm Cycle
            </Button>
            <Button
              onClick={() => {
                // Navigate to selection - handled by parent
                onConfirm({
                  cycle: recommendation.recommendedCycle,
                  confirmed: false,
                })
              }}
              variant="secondary"
              disabled={loading}
              className="flex-1"
            >
              Choose Another
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Should not reach here if recommendation is fetched successfully
  return (
    <Card className="p-6">
      <Text variant="secondary">
        No recommendation available. Please try again.
      </Text>
    </Card>
  )
}
