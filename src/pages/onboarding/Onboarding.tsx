import { useState } from 'react'
import { Stepper, type Step } from '@/components/stepper'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState<number>(1)

  const steps: Step[] = [
    {
      id: 1,
      icon: (
        <svg
          className="w-5 h-5 text-fg-brand"
          aria-hidden="true"
          xmlns="http://www.w3.org/2000/svg"
          width="24"
          height="24"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 11.917 9.724 16.5 19 7.5"
          />
        </svg>
      ),
    },
    {
      id: 2,
      icon: (
        <svg
          className="w-5 h-5 text-body"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 9h3m-3 3h3m-3 3h3m-6 1c-.306-.613-.933-1-1.618-1H7.618c-.685 0-1.312.387-1.618 1M4 5h16a1 1 0 011 1v12a1 1 0 01-1 1H4a1 1 0 01-1-1V6a1 1 0 011-1Zm7 5a2 2 0 114 0 2 2 0 01-4 0Z"
          />
        </svg>
      ),
    },
    {
      id: 3,
      icon: (
        <svg
          className="w-5 h-5 text-body"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 10h18M6 14h2m3 0h5M3 7v10a1 1 0 001 1h16a1 1 0 001-1V7a1 1 0 00-1-1H4a1 1 0 00-1 1Z"
          />
        </svg>
      ),
    },
  ]
  const [expValue, setExpValue] = useState<string>('')
  const [value, setValue] = useState<string>('')
  const [equipment, setEquipment] = useState<string>('')

  const genderOptions = [
    { label: 'FEMALE', value: 'FEMALE' },
    { label: 'MALE', value: 'MALE' },
  ]

  const trainingExpOptions = [
    { label: 'BEGINNER', value: 'BEGINNER' },
    { label: 'INTERMEDIATE', value: 'INTERMEDIATE' },
    { label: 'ADVANCE', value: 'ADVANCE' },
  ]
  const equipmentOptions = [
    { label: 'No Equipment (Bodyweight)', value: 'BODYWEIGHT' },
    { label: 'Dumbbells', value: 'DUMBBELLS' },
    { label: 'Barbell', value: 'BARBELL' },
    { label: 'Kettle Bells', value: 'KETTLEBELLS' },
    { label: 'Resistance Bands', value: 'RESISTANCE_BANDS' },
    { label: 'Pull-up Bar', value: 'PULL_UP_BAR' },
    { label: 'Bench', value: 'BENCH' },
    { label: 'Squat Rack', value: 'SQUAT_RACK' },
    { label: 'Cardio Machine', value: 'CARDIO_MACHINE' },
  ]

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-3">
            <Input
              label="Height"
              type="text"
              required
              placeholder="Enter you height in inches"
            />
            <Input
              label="Weight"
              type="text"
              required
              placeholder="Enter you weight in Kg"
            />
            <Input
              label="Age"
              type="number"
              required
              placeholder="Enter you age"
            />
            <Dropdown
              label="Gender"
              placeholder="Select your gender"
              value={value}
              onValueChange={val => setValue(val as string)}
              options={genderOptions}
              required
              fullWidth
            />
            <Dropdown
              label="Training Experience"
              placeholder="Select your experience"
              value={expValue}
              onValueChange={val => setExpValue(val as string)}
              options={trainingExpOptions}
              required
              fullWidth
            />
            <Input
              label="Primary Goal"
              required
              placeholder="Enter you Primary Goal"
            />
            <Input
              label="Secondary Goal"
              required
              placeholder="Enter you Secondary Goal"
            />
            <Input label="Test Date" placeholder="Enter you TestDate" />
            <Dropdown
              label="Equipments"
              placeholder="Select available equipments"
              multiple
              value={equipment}
              onValueChange={val => setEquipment(val as string)}
              options={equipmentOptions}
              required
              fullWidth
            />
          </div>
        )
      case 2:
        return (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Company Name"
              className="border p-2 w-full rounded"
            />
            <input
              type="text"
              placeholder="Job Title"
              className="border p-2 w-full rounded"
            />
          </div>
        )
      case 3:
        return (
          <div className="space-y-3">
            <input
              type="text"
              placeholder="Card Number"
              className="border p-2 w-full rounded"
            />
            <input
              type="text"
              placeholder="Expiration Date"
              className="border p-2 w-full rounded"
            />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-md mx-auto p-4 space-y-6">
      {/* Stepper */}
      <Stepper steps={steps} currentStep={currentStep} />

      {/* Form content */}
      <div className="mt-4">{renderStepContent()}</div>

      {/* Navigation */}
      <div className="flex justify-between mt-4">
        <button
          disabled={currentStep === 1}
          onClick={() => setCurrentStep(prev => prev - 1)}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Previous
        </button>

        <button
          disabled={currentStep === steps.length}
          onClick={() => setCurrentStep(prev => prev + 1)}
          className="px-4 py-2 border rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default Onboarding
