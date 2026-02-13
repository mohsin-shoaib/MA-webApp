// RecommendationStep.tsx
import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import type { ConfirmProps, RecommendationData } from '@/types/readiness'
import type { OnboardingProps } from '@/types/onboarding'
import { readinessService } from '@/api/readiness.service'
import type { AxiosError } from 'axios'

interface RecommendationStepProps {
  onboardingData?: OnboardingProps
  onConfirm: (selected: ConfirmProps) => void
  loading: boolean
  setLoading: (value: boolean) => void
  setError: (value: string | null) => void
}

export default function RecommendationStep({
  onboardingData,
  onConfirm,
  loading,
  setLoading,
  setError,
}: RecommendationStepProps) {
  const [selected, setSelected] = useState<ConfirmProps | null>(null)
  const [recommendedCycle, setRecommendedCycle] = useState<string | null>(null)
  const [fetched, setFetched] = useState(false)
  const [responseData, setResponseData] = useState<RecommendationData | null>(
    null
  )

  useEffect(() => {
    if (!onboardingData || fetched) return

    const fetchRecommendation = async () => {
      setError(null)
      setLoading(true)

      try {
        const response = await readinessService.readinessRecommendation({
          trainingExperience: onboardingData.trainingExperience,
          primaryGoal: onboardingData.primaryGoal,
          eventDate: onboardingData.testDate,
        })

        const { data } = response.data
        setResponseData(data)

        console.log('recommendation data', data)

        const cycleName = data.recommended_cycle

        setRecommendedCycle(cycleName)

        setSelected({
          cycle: cycleName,
          confirmed: true,
        })

        setFetched(true)
      } catch (error) {
        const axiosError = error as AxiosError<{ message: string }>
        const errorMessage =
          axiosError.response?.data?.message ||
          'Failed to fetch recommendation.'

        // Optional fallback like your Step2
        setRecommendedCycle(errorMessage)
        setSelected({
          cycle: 'No cycle',
          confirmed: false,
        })
        setFetched(true)
      } finally {
        setLoading(false)
      }
    }

    fetchRecommendation()
  }, [onboardingData, fetched, setLoading, setError])

  if (!onboardingData) {
    return (
      <div>
        <Text variant="secondary">No onboarding data found.</Text>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Text variant="primary" className="font-semibold text-lg">
        Recommended Cycle
      </Text>

      {loading && !recommendedCycle && (
        <Text variant="secondary">Loading...</Text>
      )}

      {recommendedCycle && (
        <div className="border rounded p-4">
          <Text variant="default" className="font-semibold">
            {recommendedCycle}
          </Text>
        </div>
      )}

      {responseData && (
        <div className="border rounded p-4 space-y-2">
          <Text variant="default" className="font-semibold">
            Cycle Description:{' '}
            <Text as="span" variant="muted">
              {responseData.cycle_details?.description}{' '}
            </Text>
          </Text>

          <Text as="p" variant="default" className="font-semibold">
            Program:{' '}
            <Text as="span" variant="muted">
              {responseData.recommended_program_family}
            </Text>
          </Text>

          <Text as="p" variant="default" className="font-semibold">
            Confidence:{' '}
            <Text as="span" variant="muted">
              {responseData.confidence}
            </Text>
          </Text>
          <Text as="p" variant="default" className="font-semibold">
            Reason:{' '}
            <Text as="span" variant="muted">
              {responseData.reason}{' '}
            </Text>
          </Text>
          <Text as="p" variant="default" className="font-semibold">
            Weeks to Start:{' '}
            <Text as="span" variant="muted">
              {responseData.weeks_to_event}-week{' '}
            </Text>
          </Text>
        </div>
      )}

      <Button
        onClick={() => selected && onConfirm(selected)}
        disabled={!selected || loading}
        loading={loading}
      >
        {loading ? 'Loading' : 'Confirm Recommendation'}
      </Button>
    </div>
  )
}
