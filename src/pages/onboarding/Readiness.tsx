// RecommendationStep.tsx
import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import type { ReadinessRecommendation } from '@/types/readiness'
import type { CreateOnboardingDTO, OnboardingProps } from '@/types/onboarding'

/** Step 1 form data: CreateOnboardingDTO (defer-save) or legacy OnboardingProps */
type OnboardingDataProp = CreateOnboardingDTO | OnboardingProps

interface RecommendationStepProps {
  readonly onboardingData?: OnboardingDataProp
  /** Defer-save: recommendation from Step 1 evaluate; when set, do not call GET */
  readonly recommendationFromParent?: ReadinessRecommendation | null
  readonly onConfirm: (selected: { cycle: string; confirmed: boolean }) => void
  readonly loading: boolean
  readonly setLoading: (value: boolean) => void
  readonly setError: (value: string | null) => void
}

export default function RecommendationStep({
  onboardingData,
  recommendationFromParent,
  onConfirm,
  loading,
}: RecommendationStepProps) {
  // Derive from props when parent provides recommendation (defer-save).
  const displayRecommendation = recommendationFromParent ?? null
  const displaySelected = recommendationFromParent
    ? {
        cycle: recommendationFromParent.recommendedCycle,
        confirmed: true,
      }
    : null

  // Show loading only while waiting for parent to pass recommendation (no setState in effect).
  if (loading && !recommendationFromParent) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner size="medium" variant="primary" />
        <Text variant="secondary" className="ml-4">
          Loading recommendation...
        </Text>
      </div>
    )
  }

  if (!onboardingData && !displayRecommendation) {
    return (
      <Card className="p-6">
        <Text variant="secondary">
          No onboarding data found. Please complete onboarding first.
        </Text>
      </Card>
    )
  }

  // On step 2 with data but no recommendation yet (e.g. complete Step 1 first).
  if (onboardingData && !recommendationFromParent) {
    return (
      <Card className="p-6">
        <Text variant="secondary">
          No recommendation available. Please complete Step 1 first.
        </Text>
      </Card>
    )
  }

  // Use recommendation from parent
  if (displayRecommendation) {
    return (
      <div className="space-y-6">
        <Card className="p-6">
          <div className="mb-4">
            <Text variant="primary" className="font-semibold text-xl mb-2">
              Recommended Cycle: {displayRecommendation.recommendedCycle}
            </Text>
            <div className="flex items-center gap-2 mt-2">
              <Text variant="secondary" className="text-sm">
                Confidence: {Math.round(displayRecommendation.confidence * 100)}
                %
              </Text>
              <Text variant="secondary" className="text-sm">
                • {displayRecommendation.weeksToEvent} weeks to event
              </Text>
            </div>
          </div>

          <div className="mb-4">
            <Text variant="default" className="font-semibold mb-2">
              Reason
            </Text>
            <Text variant="secondary">{displayRecommendation.reason}</Text>
          </div>

          {displayRecommendation.reasonCodes &&
            displayRecommendation.reasonCodes.length > 0 && (
              <div className="mb-4">
                <Text variant="default" className="font-semibold mb-2">
                  Reason Codes
                </Text>
                <div className="flex flex-wrap gap-2">
                  {displayRecommendation.reasonCodes.map((code, index) => (
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

          {displayRecommendation.recommendedProgram && (
            <div className="mb-4">
              <Text variant="default" className="font-semibold mb-2">
                Recommended Program
              </Text>
              <Text variant="secondary">
                {displayRecommendation.recommendedProgram.name}
              </Text>
            </div>
          )}

          {displayRecommendation.goalProgram && (
            <div className="mb-4">
              <Text variant="default" className="font-semibold mb-2">
                Goal Program
              </Text>
              <Text variant="secondary">
                {displayRecommendation.goalProgram.name}
              </Text>
            </div>
          )}

          {displayRecommendation.transitionNote && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
              <Text variant="default" className="font-semibold mb-2">
                Transition Note
              </Text>
              <Text variant="secondary">
                {displayRecommendation.transitionNote}
              </Text>
            </div>
          )}

          <div className="mt-6 flex gap-4">
            <Button
              onClick={() => displaySelected && onConfirm(displaySelected)}
              disabled={!displaySelected || loading}
              loading={loading}
              className="flex-1"
            >
              Confirm Cycle
            </Button>
            <Button
              onClick={() => {
                onConfirm({
                  cycle: displayRecommendation.recommendedCycle,
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
