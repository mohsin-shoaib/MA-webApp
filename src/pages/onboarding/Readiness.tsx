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
    const weeks = displayRecommendation.weeksToEvent ?? 0
    const weeksLabel =
      weeks === 1 ? '1 week to event' : `${weeks} weeks to event`

    const cycleName = displayRecommendation.recommendedCycle
    const cycleLabel = cycleName ? `${cycleName} Cycle` : '—'

    return (
      <div className="space-y-6">
        <Card className="p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/80 bg-white">
          {/* Recommended cycle heading — two-tone: label then cycle name */}
          <div className="mb-6 pb-5 border-b border-gray-100">
            <h2 className="text-xl sm:text-2xl mb-3">
              <span className="font-medium text-[#0066b3]">Recommended: </span>
              <span className="font-bold text-[#2196F3]">{cycleLabel}</span>
            </h2>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-600">
              <span className="font-medium">
                Confidence:{' '}
                {Math.round((displayRecommendation.confidence ?? 0) * 100)}%
              </span>
              <span className="text-gray-400" aria-hidden>
                •
              </span>
              <span>{weeksLabel}</span>
            </div>
          </div>

          {/* Reason */}
          <div className="mb-6">
            <Text variant="default" className="font-semibold mb-1.5 block">
              Reason
            </Text>
            <Text variant="secondary" className="text-[15px] leading-relaxed">
              {displayRecommendation.reason ?? '—'}
            </Text>
          </div>

          {/* Reason codes */}
          {displayRecommendation.reasonCodes &&
            displayRecommendation.reasonCodes.length > 0 && (
              <div className="mb-6">
                <Text variant="default" className="font-semibold mb-2 block">
                  Reason Codes
                </Text>
                <div className="flex flex-wrap gap-2">
                  {displayRecommendation.reasonCodes.map((code, index) => (
                    <span
                      key={index}
                      className={
                        index === 0
                          ? 'px-3 py-1.5 rounded-lg text-sm font-medium bg-primary/15 text-primary'
                          : 'px-3 py-1.5 rounded-lg text-sm font-medium bg-gray-100 text-gray-700'
                      }
                    >
                      {code}
                    </span>
                  ))}
                </div>
              </div>
            )}

          {/* Optional: recommended program */}
          {displayRecommendation.recommendedProgram && (
            <div className="mb-6">
              <Text variant="default" className="font-semibold mb-1.5 block">
                Recommended Program
              </Text>
              <Text variant="secondary">
                {displayRecommendation.recommendedProgram.name}
              </Text>
            </div>
          )}

          {/* Optional: goal program */}
          {displayRecommendation.goalProgram && (
            <div className="mb-6">
              <Text variant="default" className="font-semibold mb-1.5 block">
                Goal Program
              </Text>
              <Text variant="secondary">
                {displayRecommendation.goalProgram.name}
              </Text>
            </div>
          )}

          {/* Optional: transition note */}
          {displayRecommendation.transitionNote && (
            <div className="mb-6 p-4 rounded-lg bg-amber-50 border border-amber-200">
              <Text variant="default" className="font-semibold mb-1.5 block">
                Transition Note
              </Text>
              <Text variant="secondary">
                {displayRecommendation.transitionNote}
              </Text>
            </div>
          )}

          {/* Actions */}
          <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
            <Button
              onClick={() => displaySelected && onConfirm(displaySelected)}
              disabled={!displaySelected || loading}
              loading={loading}
              variant="primary"
              className="flex-1 min-w-0 bg-[#3AB8ED] hover:bg-[#2ea8db] text-white font-bold rounded-lg"
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
              className="flex-1 min-w-0 bg-[#2196F3] hover:bg-[#1976D2] text-white font-bold rounded-lg border-0"
            >
              No, Choose Another
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
