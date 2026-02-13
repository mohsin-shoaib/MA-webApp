import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stepper, type StepperStep } from '@/components/Stepper'
import OnboardingForm from './OnboardingForm'
import RecommendationStep from './Readiness'
import ConfirmationStep from './confirmation'
import RoadmapStep from './Roadmap'

import type { OnboardingProps } from '@/types/onboarding'
import type { ConfirmProps, ReadinessRecommendation } from '@/types/readiness'
import type { RoadmapProps } from '@/types/roadmap'
import type {
  CycleTransitionResponse,
  CycleTransition,
} from '@/types/cycle-transition'

type StepIndex = 1 | 2 | 3 | 4

const STEPS: StepperStep[] = [
  { id: '1', label: 'Onboard' },
  { id: '2', label: 'Program' },
  { id: '3', label: 'Confirm' },
  { id: '4', label: 'Roadmap' },
]

export default function OnboardingFlow() {
  const navigate = useNavigate()
  const [currentStep, setCurrentStep] = useState<StepIndex>(1)

  const [onboardData, setOnboardData] = useState<OnboardingProps | null>(null)

  const [recommendedCycle, setRecommendedCycle] = useState<string | null>(null)
  const [recommendation, setRecommendation] =
    useState<ReadinessRecommendation | null>(null)

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

  // Store recommendation data from Readiness component
  // This is called when Readiness component fetches recommendation
  // We'll need to update Readiness component to pass this data

  // ------------------------------
  // Step 3 → Confirm
  // ------------------------------
  const handleStep3Confirm = (
    didConfirm: boolean,
    responseData: CycleTransitionResponse['data']
  ) => {
    setConfirmed(didConfirm)

    // Handle new API response (CycleTransition)
    if (Array.isArray(responseData)) {
      // If array, take first transition
      const transition = responseData[0]
      if (transition?.toCycleId) {
        const payload: RoadmapProps = {
          currentCycleId: transition.toCycleId,
          primaryGoalStart: transition.requestedAt,
          primaryGoalEnd: transition.requestedAt,
          sustainmentStart: transition.requestedAt,
          timeline: {},
          dailyExercise: {},
        }
        setRoadmapPayload(payload)
        setError(null)
        setCurrentStep(4)
        return
      }
    } else if (
      responseData &&
      typeof responseData === 'object' &&
      'toCycleId' in responseData
    ) {
      // Single CycleTransition object
      const transition = responseData as CycleTransition
      const payload: RoadmapProps = {
        currentCycleId: transition.toCycleId,
        primaryGoalStart: transition.requestedAt || new Date().toISOString(),
        primaryGoalEnd: transition.requestedAt || new Date().toISOString(),
        sustainmentStart: transition.requestedAt || new Date().toISOString(),
        timeline: {},
        dailyExercise: {},
      }
      setRoadmapPayload(payload)
      setError(null)
      setCurrentStep(4)
      return
    }

    // If we reach here, the response format is unexpected
    console.error('Unexpected response format:', responseData)
    setError('Invalid response format. Please try again.')
  }

  // ------------------------------
  // Step 4 → Complete
  // ------------------------------
  const handleComplete = () => {
    // Navigate to profile after onboarding completion
    // Dashboard route can be added later if needed
    navigate('/profile')
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
            onRecommendationFetched={setRecommendation}
            loading={loading}
            setLoading={setLoading}
            setError={setError}
          />
        )}

        {/* Step 3 */}
        {currentStep === 3 && recommendedCycle && (
          <ConfirmationStep
            recommendedCycle={recommendedCycle}
            recommendation={recommendation || undefined}
            onComplete={(data: CycleTransitionResponse['data']) =>
              handleStep3Confirm(true, data)
            }
            loading={loading}
            setLoading={setLoading}
            setError={setError}
          />
        )}

        {/* Step 4 */}
        {currentStep === 4 && (
          <RoadmapStep
            payload={roadmapPayload || undefined}
            confirmed={confirmed}
            loading={loading}
            setLoading={setLoading}
            setError={setError}
            onComplete={handleComplete}
          />
        )}
      </div>
    </div>
  )
}
