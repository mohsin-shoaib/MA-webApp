import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stepper, type StepperStep } from '@/components/Stepper'
import { Button } from '@/components/Button'
import { useAuth } from '@/contexts/useAuth'
import OnboardingForm from './OnboardingForm'
import RecommendationStep from './Readiness'
import ConfirmationStep from './confirmation'
import RoadmapStep from './Roadmap'

import type { CreateOnboardingDTO } from '@/types/onboarding'
import type { ConfirmProps, ReadinessRecommendation } from '@/types/readiness'

type StepIndex = 1 | 2 | 3 | 4

const STEPS: StepperStep[] = [
  { id: '1', label: 'Onboard' },
  { id: '2', label: 'Program' },
  { id: '3', label: 'Confirm' },
  { id: '4', label: 'Roadmap' },
]

export default function OnboardingFlow() {
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [currentStep, setCurrentStep] = useState<StepIndex>(1)

  const [onboardData, setOnboardData] = useState<CreateOnboardingDTO | null>(
    null
  )

  const [recommendedCycle, setRecommendedCycle] = useState<string | null>(null)
  const [recommendation, setRecommendation] =
    useState<ReadinessRecommendation | null>(null)

  const [confirmed, setConfirmed] = useState<boolean | null>(null)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // ------------------------------
  // Step 1 → Next (defer-save: store form data + recommendation from evaluate; no DB save)
  // ------------------------------
  const handleStep1Next = (
    formData: CreateOnboardingDTO,
    recommendationFromEvaluate: ReadinessRecommendation
  ) => {
    setOnboardData(formData)
    setRecommendation(recommendationFromEvaluate)
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
  // Step 3 → Confirm (defer-save: confirm endpoint saves onboarding + recommendation + roadmap + transition; Step 4 loads roadmap via GET)
  // ------------------------------
  const handleStep3Confirm = () => {
    setConfirmed(true)
    setError(null)
    setCurrentStep(4)
  }

  // ------------------------------
  // Step 4 → Complete
  // ------------------------------
  const handleComplete = () => {
    navigate('/dashboard')
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
      <div className="flex justify-end mb-4">
        <Button type="button" variant="secondary" onClick={() => logout()}>
          Log out
        </Button>
      </div>
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

        {/* Step 2: use recommendation from state (from Step 1 evaluate); no GET */}
        {currentStep === 2 && onboardData && (
          <RecommendationStep
            onboardingData={{
              ...onboardData,
              equipment: onboardData.equipment ?? [],
            }}
            recommendationFromParent={recommendation}
            onConfirm={handleStep2Next}
            loading={loading}
            setLoading={setLoading}
            setError={setError}
          />
        )}

        {/* Step 3: confirm onboarding with full payload (defer-save) */}
        {currentStep === 3 && recommendedCycle && onboardData && (
          <ConfirmationStep
            recommendedCycle={recommendedCycle}
            recommendation={recommendation ?? undefined}
            onboardData={onboardData}
            onComplete={handleStep3Confirm}
            onAlreadyOnboarded={() => {
              setError('You have already completed onboarding.')
              navigate('/dashboard')
            }}
            loading={loading}
            setLoading={setLoading}
            setError={setError}
          />
        )}

        {/* Step 4 */}
        {currentStep === 4 && (
          <RoadmapStep
            payload={undefined}
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
