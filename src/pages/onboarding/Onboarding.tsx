import { useState } from 'react'
import { Stepper, type StepperStep } from '@/components/Stepper'
import OnboardingForm from './OnboardingForm'
import RecommendationStep from './Readiness'
import ConfirmationStep from './confirmation'
import RoadmapStep from './Roadmap'

import type { OnboardingProps } from '@/types/onboarding'
import type { ConfirmationResponse, ConfirmProps } from '@/types/readiness'
import type { RoadmapProps } from '@/types/roadmap'

type StepIndex = 1 | 2 | 3 | 4

const STEPS: StepperStep[] = [
  { id: '1', label: 'Onboard' },
  { id: '2', label: 'Program' },
  { id: '3', label: 'Confirm' },
  { id: '4', label: 'Roadmap' },
]

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState<StepIndex>(1)

  const [onboardData, setOnboardData] = useState<OnboardingProps | null>(null)

  const [recommendedCycle, setRecommendedCycle] = useState<string | null>(null)

  const [confirmed, setConfirmed] = useState<boolean | null>(null)

  const [roadmapPayload, setRoadmapPayload] = useState<RoadmapProps | null>(
    null
  )

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ------------------------------
  // Step 1 → Next
  // ------------------------------
  const handleStep1Next = (
    formData: OnboardingProps
    // apiResponse: OnboardingResponse
  ) => {
    setOnboardData(formData)
    setError(null)
    setCurrentStep(2)
  }

  // ------------------------------
  // Step 2 → Next
  // ------------------------------
  const handleStep2Next = (selected: ConfirmProps) => {
    setRecommendedCycle(selected.cycle)
    setError(null)
    setCurrentStep(3)
  }

  // ------------------------------
  // Step 3 → Confirm
  // ------------------------------
  const handleStep3Confirm = (
    didConfirm: boolean,
    responseData: ConfirmationResponse
  ) => {
    setConfirmed(didConfirm)

    /**
     * Build roadmap payload from confirmation response
     * Adjust mapping based on your backend response
     */
    const payload: RoadmapProps = {
      // goalId: responseData.goalId,
      currentCycleId: responseData.cycle_details.id,

      primaryGoalStart: responseData.start_date,
      primaryGoalEnd: responseData.start_date,
      sustainmentStart: responseData.start_date,

      timeline: {},
      dailyExercise: {},
    }

    setRoadmapPayload(payload)
    setError(null)
    setCurrentStep(4)
  }

  // ------------------------------
  // Step Navigation
  // ------------------------------
  const goToStep = (stepIndex: number) => {
    // Stepper passes 0-based index, convert to 1-based
    const step = (stepIndex + 1) as StepIndex
    if (step >= 1 && step <= currentStep) {
      setCurrentStep(step)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <Stepper
        steps={STEPS}
        activeStep={currentStep - 1}
        onStepClick={goToStep}
        clickable
      />

      <div className="mt-6">
        {error && (
          <div className="bg-red-100 text-red-600 p-3 rounded mb-4">
            {error}
          </div>
        )}

        {/* Step 1 */}
        {currentStep === 1 && (
          <OnboardingForm
            onNext={handleStep1Next}
            loading={loading}
            setLoading={setLoading}
            setError={setError}
          />
        )}

        {/* Step 2 */}
        {currentStep === 2 && onboardData && (
          <RecommendationStep
            onboardingData={onboardData}
            onConfirm={handleStep2Next}
            loading={loading}
            setLoading={setLoading}
            setError={setError}
          />
        )}

        {/* Step 3 */}
        {currentStep === 3 && recommendedCycle && (
          <ConfirmationStep
            recommendedCycle={recommendedCycle}
            primaryGoal={onboardData?.primaryGoal ?? ''}
            onComplete={(data: ConfirmationResponse) =>
              handleStep3Confirm(true, data)
            }
            loading={loading}
            setLoading={setLoading}
            setError={setError}
          />
        )}

        {/* Step 4 */}
        {currentStep === 4 && roadmapPayload && (
          <RoadmapStep
            payload={roadmapPayload}
            confirmed={confirmed}
            loading={loading}
            setLoading={setLoading}
            setError={setError}
          />
        )}
      </div>
    </div>
  )
}
