import React from 'react'
import { useThemeColor } from '@/hooks/use-theme-color'
import { BrandColors } from '@/constants/theme'
import { Text } from '@/components/Text'
import { Icon } from '@/components/Icon'
import type { IconFamily } from '@/components/Icon'
import { cn } from '@/utils/cn'

export type StepperOrientation = 'horizontal' | 'vertical'
export type StepperSize = 'small' | 'medium' | 'large'

export interface StepperStep {
  /**
   * Unique identifier for the step
   */
  id: string
  /**
   * Step label/title
   */
  label: string
  /**
   * Optional step description
   */
  description?: string
  /**
   * Optional icon name (from icon family)
   */
  icon?: string
  /**
   * Icon family (if icon is provided)
   * @default 'solid'
   */
  iconFamily?: IconFamily
  /**
   * Whether step is disabled
   * @default false
   */
  disabled?: boolean
  /**
   * Optional error message for this step
   */
  error?: string
  /**
   * Optional custom content to display in the step
   */
  content?: React.ReactNode
}

export interface StepperProps {
  /**
   * Array of step items
   */
  steps: StepperStep[]
  /**
   * Current active step index (0-based)
   */
  activeStep: number
  /**
   * Orientation of the stepper
   * @default 'horizontal'
   */
  orientation?: StepperOrientation
  /**
   * Stepper size
   * @default 'medium'
   */
  size?: StepperSize
  /**
   * Whether to show step numbers
   * @default true
   */
  showNumbers?: boolean
  /**
   * Whether steps are clickable
   * @default false
   */
  clickable?: boolean
  /**
   * Callback when a step is clicked
   */
  onStepClick?: (stepIndex: number) => void
  /**
   * Additional className for container
   */
  className?: string
  /**
   * Additional style for container
   */
  style?: React.CSSProperties
}

/**
 * Stepper component with theme support
 *
 * Displays a multi-step progress indicator with labels, descriptions, and icons.
 * Fully integrated with the theme system and supports horizontal and vertical orientations.
 *
 * @example
 * ```tsx
 * <Stepper
 *   steps={[
 *     { id: '1', label: 'Step 1', description: 'First step' },
 *     { id: '2', label: 'Step 2', description: 'Second step' },
 *     { id: '3', label: 'Step 3', description: 'Third step' },
 *   ]}
 *   activeStep={1}
 * />
 *
 * <Stepper
 *   orientation="vertical"
 *   steps={[
 *     { id: '1', label: 'Step 1', icon: 'check' },
 *     { id: '2', label: 'Step 2', icon: 'user' },
 *   ]}
 *   activeStep={0}
 *   clickable
 *   onStepClick={(index) => console.log('Clicked step', index)}
 * />
 * ```
 */
export function Stepper({
  steps,
  activeStep,
  orientation = 'horizontal',
  size = 'medium',
  showNumbers = true,
  clickable = false,
  onStepClick,
  className,
  style,
}: Readonly<StepperProps>) {
  const themeColors = useStepperThemeColors()
  const containerClasses = getContainerClasses(orientation)
  const stepSize = getStepSize(size)

  const handleStepClick = (stepIndex: number) => {
    if (clickable && onStepClick && !steps[stepIndex]?.disabled) {
      onStepClick(stepIndex)
    }
  }

  return (
    <div className={cn(containerClasses, className)} style={style}>
      {steps.map((step, index) => {
        const isActive = index === activeStep
        const isCompleted = index < activeStep
        const isDisabled = step.disabled || false
        const hasError = !!step.error
        const isLast = index === steps.length - 1

        return (
          <React.Fragment key={step.id}>
            <StepperStepComponent
              step={step}
              index={index}
              isActive={isActive}
              isCompleted={isCompleted}
              isDisabled={isDisabled}
              hasError={hasError}
              isLast={isLast}
              orientation={orientation}
              size={size}
              stepSize={stepSize}
              showNumbers={showNumbers}
              clickable={clickable}
              onClick={() => handleStepClick(index)}
              themeColors={themeColors}
            />
            {!isLast && (
              <StepperConnector
                isCompleted={isCompleted}
                hasError={hasError}
                orientation={orientation}
                size={size}
                themeColors={themeColors}
              />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

interface StepperStepComponentProps {
  step: StepperStep
  index: number
  isActive: boolean
  isCompleted: boolean
  isDisabled: boolean
  hasError: boolean
  isLast: boolean
  orientation: StepperOrientation
  size: StepperSize
  stepSize: { circle: number; icon: number; number: number }
  showNumbers: boolean
  clickable: boolean
  onClick: () => void
  themeColors: ReturnType<typeof useStepperThemeColors>
}

function StepperStepComponent({
  step,
  index,
  isActive,
  isCompleted,
  isDisabled,
  hasError,
  orientation,
  size,
  stepSize,
  showNumbers,
  clickable,
  onClick,
  themeColors,
}: Readonly<StepperStepComponentProps>) {
  const stepContainerClasses = getStepContainerClasses(orientation, size)
  const circleClasses = getCircleClasses(
    isActive,
    isCompleted,
    isDisabled,
    hasError
  )
  const circleStyle = getCircleStyle(
    isActive,
    isCompleted,
    isDisabled,
    hasError,
    themeColors,
    stepSize.circle
  )

  const renderStepIndicator = () => {
    if (hasError) {
      return (
        <Icon
          name="exclamation-circle"
          family="solid"
          size={stepSize.icon}
          variant="white"
        />
      )
    }

    if (isCompleted) {
      return (
        <Icon
          name="check"
          family="solid"
          size={stepSize.icon}
          variant="white"
        />
      )
    }

    if (step.icon) {
      return (
        <Icon
          name={step.icon}
          family={step.iconFamily ?? 'solid'}
          size={stepSize.icon}
          variant={isActive ? 'primary' : 'muted'}
        />
      )
    }

    if (showNumbers) {
      return (
        <Text
          variant={getNumberVariant(isActive, isDisabled)}
          className="font-semibold"
          style={{ fontSize: stepSize.number }}
        >
          {index + 1}
        </Text>
      )
    }

    return null
  }

  const stepContent = (
    <div className={stepContainerClasses}>
      <button
        type="button"
        className={cn(
          'flex items-center justify-center',
          'rounded-full border-2 transition-all duration-200',
          'focus:outline-none focus:ring-2 focus:ring-offset-2',
          circleClasses,
          clickable && !isDisabled && 'cursor-pointer hover:scale-105',
          isDisabled && 'cursor-not-allowed',
          !clickable && 'cursor-default'
        )}
        style={circleStyle}
        onClick={clickable ? onClick : undefined}
        disabled={isDisabled || !clickable}
        aria-current={isActive ? 'step' : undefined}
        aria-label={`Step ${index + 1}: ${step.label}`}
      >
        {renderStepIndicator()}
      </button>

      <div className={getLabelContainerClasses(orientation, size)}>
        <Text
          variant={getLabelVariant(hasError, isActive, isCompleted, isDisabled)}
          className={getLabelClasses(size)}
        >
          {step.label}
        </Text>
        {step.description && (
          <Text
            variant={isDisabled ? 'muted' : 'secondary'}
            className={getDescriptionClasses(size)}
          >
            {step.description}
          </Text>
        )}
        {hasError && step.error && (
          <Text variant="error" className={getErrorClasses(size)}>
            {step.error}
          </Text>
        )}
      </div>
    </div>
  )

  return stepContent
}

interface StepperConnectorProps {
  isCompleted: boolean
  hasError: boolean
  orientation: StepperOrientation
  size: StepperSize
  themeColors: ReturnType<typeof useStepperThemeColors>
}

function StepperConnector({
  isCompleted,
  hasError,
  orientation,
  size,
  themeColors,
}: Readonly<StepperConnectorProps>) {
  const connectorClasses = getConnectorClasses(orientation, size)
  const connectorStyle = getConnectorStyle(isCompleted, hasError, themeColors)

  return (
    <div
      className={connectorClasses}
      style={connectorStyle}
      aria-hidden="true"
    />
  )
}

/**
 * Get all theme colors used by stepper
 */
function useStepperThemeColors() {
  const themePrimary = useThemeColor({}, 'primary')
  const themePrimaryDark = useThemeColor({}, 'primaryDark')
  const themeMidGray = useThemeColor({}, 'midGray')
  const themeLightGray = BrandColors.neutral.lightGray
  const themeSuccess = useThemeColor({}, 'success')
  const themeError = useThemeColor({}, 'error')
  const themeWhite = BrandColors.neutral.white

  return {
    primary: themePrimary,
    primaryDark: themePrimaryDark,
    midGray: themeMidGray,
    lightGray: themeLightGray,
    success: themeSuccess,
    error: themeError,
    white: themeWhite,
  }
}

/**
 * Get container classes based on orientation
 */
function getContainerClasses(orientation: StepperOrientation): string {
  if (orientation === 'vertical') {
    return 'flex flex-col'
  }
  return 'flex flex-row items-start'
}

/**
 * Get step container classes
 */
function getStepContainerClasses(
  orientation: StepperOrientation,
  size: StepperSize
): string {
  const baseClasses = 'flex items-start'
  const orientationClasses =
    orientation === 'vertical' ? 'flex-row' : 'flex-col items-center'
  const sizeClasses = getStepContainerSizeClasses(size, orientation)

  return cn(baseClasses, orientationClasses, sizeClasses)
}

/**
 * Get step container size classes
 */
function getStepContainerSizeClasses(
  size: StepperSize,
  orientation: StepperOrientation
): string {
  if (orientation === 'vertical') {
    switch (size) {
      case 'small':
        return 'gap-2'
      case 'medium':
        return 'gap-3'
      case 'large':
        return 'gap-4'
    }
  } else {
    switch (size) {
      case 'small':
        return 'gap-2'
      case 'medium':
        return 'gap-2.5'
      case 'large':
        return 'gap-3'
    }
  }
}

/**
 * Get circle classes for step indicator
 */
function getCircleClasses(
  isActive: boolean,
  isCompleted: boolean,
  isDisabled: boolean,
  hasError: boolean
): string {
  if (hasError) {
    return 'border-error'
  }

  if (isCompleted) {
    return 'border-success bg-success'
  }

  if (isActive) {
    return 'border-primary bg-primary'
  }

  if (isDisabled) {
    return 'border-mid-gray bg-light-gray'
  }

  return 'border-mid-gray bg-white'
}

/**
 * Get circle style
 */
function getCircleStyle(
  isActive: boolean,
  isCompleted: boolean,
  isDisabled: boolean,
  hasError: boolean,
  themeColors: ReturnType<typeof useStepperThemeColors>,
  circleSize: number
): React.CSSProperties {
  const style: React.CSSProperties = {
    width: circleSize,
    height: circleSize,
  }

  if (hasError) {
    style.backgroundColor = themeColors.error
    style.borderColor = themeColors.error
  } else if (isCompleted) {
    style.backgroundColor = themeColors.success
    style.borderColor = themeColors.success
  } else if (isActive) {
    style.backgroundColor = themeColors.primary
    style.borderColor = themeColors.primary
  } else if (isDisabled) {
    style.backgroundColor = themeColors.lightGray
    style.borderColor = themeColors.midGray
  } else {
    style.backgroundColor = themeColors.white
    style.borderColor = themeColors.midGray
  }

  return style
}

/**
 * Get step size values
 */
function getStepSize(size: StepperSize): {
  circle: number
  icon: number
  number: number
} {
  switch (size) {
    case 'small':
      return {
        circle: 32,
        icon: 16,
        number: 14,
      }
    case 'medium':
      return {
        circle: 40,
        icon: 20,
        number: 16,
      }
    case 'large':
      return {
        circle: 48,
        icon: 24,
        number: 18,
      }
  }
}

/**
 * Get label container classes
 */
function getLabelContainerClasses(
  orientation: StepperOrientation,
  size: StepperSize
): string {
  const baseClasses = 'flex flex-col'
  const orientationClasses =
    orientation === 'vertical' ? 'ml-3' : 'text-center mt-2'

  let sizeClasses = ''
  if (orientation === 'vertical') {
    if (size === 'small') {
      sizeClasses = 'gap-0.5'
    } else if (size === 'medium') {
      sizeClasses = 'gap-1'
    } else {
      sizeClasses = 'gap-1.5'
    }
  }

  return cn(baseClasses, orientationClasses, sizeClasses)
}

/**
 * Get label classes
 */
function getLabelClasses(size: StepperSize): string {
  switch (size) {
    case 'small':
      return 'text-sm font-medium'
    case 'medium':
      return 'text-base font-semibold'
    case 'large':
      return 'text-lg font-semibold'
  }
}

/**
 * Get description classes
 */
function getDescriptionClasses(size: StepperSize): string {
  switch (size) {
    case 'small':
      return 'text-xs mt-0.5'
    case 'medium':
      return 'text-sm mt-1'
    case 'large':
      return 'text-base mt-1'
  }
}

/**
 * Get error classes
 */
function getErrorClasses(size: StepperSize): string {
  switch (size) {
    case 'small':
      return 'text-xs mt-0.5'
    case 'medium':
      return 'text-xs mt-1'
    case 'large':
      return 'text-sm mt-1'
  }
}

/**
 * Get connector classes
 */
function getConnectorClasses(
  orientation: StepperOrientation,
  size: StepperSize
): string {
  const baseClasses = 'transition-colors duration-200'
  const orientationClasses =
    orientation === 'vertical' ? 'w-0.5 self-stretch ml-5' : 'h-0.5 flex-1 mt-5'
  let sizeClasses = ''
  if (orientation === 'vertical') {
    if (size === 'small') {
      sizeClasses = 'ml-4'
    } else if (size === 'medium') {
      sizeClasses = 'ml-5'
    } else {
      sizeClasses = 'ml-6'
    }
  } else if (size === 'small') {
    sizeClasses = 'mt-4'
  } else if (size === 'medium') {
    sizeClasses = 'mt-5'
  } else {
    sizeClasses = 'mt-6'
  }

  return cn(baseClasses, orientationClasses, sizeClasses)
}

/**
 * Get connector style
 */
function getConnectorStyle(
  isCompleted: boolean,
  hasError: boolean,
  themeColors: ReturnType<typeof useStepperThemeColors>
): React.CSSProperties {
  const style: React.CSSProperties = {}

  if (hasError) {
    style.backgroundColor = themeColors.error
  } else if (isCompleted) {
    style.backgroundColor = themeColors.success
  } else {
    style.backgroundColor = themeColors.midGray
  }

  return style
}

/**
 * Get number variant for step indicator
 */
function getNumberVariant(
  isActive: boolean,
  isDisabled: boolean
): 'white' | 'muted' | 'default' {
  if (isActive) {
    return 'white'
  }
  if (isDisabled) {
    return 'muted'
  }
  return 'default'
}

/**
 * Get label variant based on step state
 */
function getLabelVariant(
  hasError: boolean,
  isActive: boolean,
  isCompleted: boolean,
  isDisabled: boolean
): 'error' | 'primary' | 'default' | 'muted' | 'secondary' {
  if (hasError) {
    return 'error'
  }
  if (isActive) {
    return 'primary'
  }
  if (isCompleted) {
    return 'default'
  }
  if (isDisabled) {
    return 'muted'
  }
  return 'secondary'
}
