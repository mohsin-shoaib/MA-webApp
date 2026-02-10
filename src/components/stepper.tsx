import React from 'react'

export type Step = {
  id: number
  icon: React.ReactNode // the SVG for pending steps
}

type StepperProps = {
  steps: Step[]
  currentStep: number
}

export const Stepper: React.FC<StepperProps> = ({ steps, currentStep }) => {
  return (
    <ol className="flex items-center w-full space-x-4">
      {steps.map((step, index) => {
        const isCompleted = step.id < currentStep
        const isActive = step.id === currentStep

        return (
          <li
            key={step.id}
            className={`flex w-full items-center ${
              index !== steps.length - 1
                ? "after:content-[''] after:w-full after:h-1 after:inline-block after:ms-4 after:rounded-full " +
                  (isCompleted
                    ? 'after:border-b after:border-brand-subtle after:border-4'
                    : 'after:border-b after:border-default after:border-4')
                : ''
            }`}
          >
            <span
              className={`flex items-center justify-center w-10 h-10 rounded-full shrink-0 lg:h-12 lg:w-12 ${
                isCompleted
                  ? 'bg-brand-softer'
                  : isActive
                    ? 'bg-fg-brand text-blue-400'
                    : 'bg-neutral-tertiary'
              }`}
            >
              {isCompleted ? (
                <svg
                  className="w-5 h-5 text-fg-brand"
                  aria-hidden="true"
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <path
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 11.917 9.724 16.5 19 7.5"
                  />
                </svg>
              ) : (
                step.icon
              )}
            </span>
          </li>
        )
      })}
    </ol>
  )
}
