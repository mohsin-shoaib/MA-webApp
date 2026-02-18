import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Stepper, type StepperStep } from '@/components/Stepper'
import { Button } from '@/components/Button'
import { useAuth } from '@/contexts/useAuth'
import OnboardingForm from './OnboardingForm'
import RecommendationStep from './Readiness'
import ConfirmationStep from './confirmation'
import RoadmapStep from './Roadmap'
import logoImage from '@/assets/images/logo/logo.svg'

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
    <div className="min-h-screen bg-gray-50">
      {/* Header: logo left, logout right */}
      <header className="sticky top-0 z-10 border-b border-gray-200 bg-white shadow-sm">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <img
            src={logoImage}
            alt="MA App Logo"
            className="h-9 w-auto object-contain"
          />
          <Button
            type="button"
            variant="secondary"
            size="small"
            onClick={() => logout()}
          >
            Log out
          </Button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Stepper
          steps={STEPS}
          activeStep={currentStep - 1}
          onStepClick={goToStep}
          clickable
        />

        <div className="mt-6 sm:mt-8">
          {error && (
            <div
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-800 text-sm mb-6"
              role="alert"
            >
              {error}
            </div>
          )}

          {/* Step 1: pass saved onboardData when user navigates back so form stays filled */}
          {currentStep === 1 && (
            <OnboardingForm
              initialValues={onboardData ?? undefined}
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
    </div>
  )
}
