import { useState } from 'react'
import { Stepper, type StepperStep } from '@/components/Stepper'
import OnboardingForm from './OnboardingForm'
import RecommendationStep from './Readiness'
import ConfirmationStep from './confirmation'
import { onboardingService } from '@/api/onboarding.service'
import type { OnboardingProps } from '@/types/onboarding'
import { Button } from '@/components/Button'
import axios from 'axios'
import { readinessService } from '@/api/readiness.service'
import type { ConfirmProps } from '@/types/readiness'

type StepIndex = 0 | 1 | 2

export default function OnboardingFlow() {
  const [activeStep, setActiveStep] = useState<StepIndex>(0)
  const [onboardingData, setOnboardingData] = useState<OnboardingProps>()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const steps: StepperStep[] = [
    { id: 'onboarding', label: 'Onboarding' },
    { id: 'recommendation', label: 'Recommendations' },
    { id: 'confirmation', label: 'Confirmation' },
  ]

  // ------------------------------
  // Step 1: Submit onboarding
  // ------------------------------
  const handleOnboardingSubmit = async (data: OnboardingProps) => {
    try {
      setLoading(true)
      setError(null)
      const response = await onboardingService.createOnboarding(data)
      setOnboardingData(response.data.data.onboarding) // save data

      setActiveStep(1)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'API Error')
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Something went wrong')
      }
    }
  }

  // ------------------------------
  // Step 2: Confirm recommendation
  // ------------------------------
  const handleConfirmRecommendation = async (
    selectedRecommendation: ConfirmProps
  ) => {
    if (!onboardingData) return
    try {
      setLoading(true)
      setError(null)
      await readinessService.confirmation(selectedRecommendation)
      setActiveStep(2)
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        setError(err.response?.data?.message ?? 'API Error')
      } else if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Something went wrong')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto p-4">
      <Stepper steps={steps} activeStep={activeStep} />

      <div className="mt-6">
        {error && <p className="text-red-500 mb-4">{error}</p>}

        {activeStep === 0 && (
          <OnboardingForm
            initialValues={onboardingData || {}}
            onSubmit={handleOnboardingSubmit}
            loading={loading}
          />
        )}

        {activeStep === 1 && onboardingData && (
          <RecommendationStep
            onboardingData={onboardingData}
            onConfirm={handleConfirmRecommendation}
            loading={loading}
          />
        )}

        {activeStep === 2 && <ConfirmationStep />}
      </div>

      <div className="mt-6">
        {/* Navigation Buttons */}
        <div className="flex justify-between mt-6">
          <Button
            type="button"
            onClick={() =>
              setActiveStep(prev => Math.max(prev - 1, 0) as StepIndex)
            }
            disabled={activeStep === 0 || loading}
            className="px-4 py-2 border rounded bg-gray-100 disabled:opacity-50"
          >
            Prev
          </Button>

          {activeStep < 2 && (
            <Button
              type="button"
              onClick={() =>
                setActiveStep(prev => Math.min(prev + 1, 2) as StepIndex)
              }
              disabled={loading}
              className="px-4 py-2 border rounded bg-blue-500 text-white disabled:opacity-50"
            >
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
