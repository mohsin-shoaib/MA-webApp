import { useState } from 'react'
import { Stepper, type StepperStep } from '@/components/Stepper/index'
import { Input } from '@/components/Input'
import OnboardingForm from './OnboardingForm'

const Onboarding = () => {
  const [activeStep, setActiveStep] = useState(0)

  const steps: StepperStep[] = [
    {
      id: 'basic-info',
      label: 'Basic Info',
      description: 'Personal & training details',
      icon: 'user',
      content: <OnboardingForm />,
    },
    {
      id: 'Readiness Recommendation',
      label: 'Readiness Recommendation',
      description:
        'We recommend Cycle and Program for you according to your primary Goal, test date, and training experience',
      icon: 'briefcase',
      content: (
        <div className="space-y-3 mt-4">
          <Input label="Company Name" />
          <Input label="Job Title" />
        </div>
      ),
    },
    {
      id: 'payment',
      label: 'Payment',
      description: 'Billing details',
      icon: 'credit-card',
      content: (
        <div className="space-y-3 mt-4">
          <Input label="Card Number" />
          <Input label="Expiration Date" />
        </div>
      ),
    },
  ]

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      {/* Stepper */}
      <Stepper
        steps={steps}
        activeStep={activeStep}
        clickable
        onStepClick={setActiveStep}
      />

      {/* Step content */}
      <div>{steps[activeStep].content}</div>

      {/* Navigation */}
      <div className="flex justify-between pt-4">
        <button
          disabled={activeStep === 0}
          onClick={() => setActiveStep(s => s - 1)}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Previous
        </button>

        <button
          disabled={activeStep === steps.length - 1}
          onClick={() => setActiveStep(s => s + 1)}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default Onboarding
