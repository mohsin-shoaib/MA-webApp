import React from 'react'
import { Text } from '@/components/Text'
import { BrandColors } from '@/constants/theme'
import { cn } from '@/utils/cn'

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Spinner size
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * Spinner variant/color
   * @default 'primary'
   */
  variant?:
    | 'primary'
    | 'secondary'
    | 'default'
    | 'white'
    | 'success'
    | 'warning'
    | 'error'
  /**
   * Custom color (overrides variant)
   */
  color?: string
  /**
   * Whether to show text label below spinner
   */
  label?: string
  /**
   * Additional className for container
   */
  className?: string
  /**
   * Additional className for spinner
   */
  spinnerClassName?: string
}

/**
 * Spinner/Loader component with theme support
 *
 * Displays a loading spinner with customizable size and color.
 * Perfect for loading states, async operations, and progress indicators.
 *
 * @example
 * ```tsx
 * <Spinner />
 * <Spinner size="large" variant="primary" />
 * <Spinner label="Loading..." />
 * <Spinner color="#27B7EE" />
 * ```
 */
export function Spinner({
  size = 'medium',
  variant = 'primary',
  color,
  label,
  className,
  spinnerClassName,
  style,
  ...props
}: Readonly<SpinnerProps>) {
  const spinnerColor = getSpinnerColor(variant, color)
  const spinnerSize = getSpinnerSize(size)

  return (
    <div
      className={cn('flex flex-col items-center justify-center', className)}
      style={style}
      {...props}
    >
      <div
        className={cn(
          'border-solid rounded-full animate-spin',
          spinnerSize,
          spinnerClassName
        )}
        style={{
          borderColor: 'transparent',
          borderTopColor: spinnerColor,
        }}
        aria-label={label || 'Loading'}
        aria-live="polite"
      />
      {label && (
        <Text
          variant={variant === 'white' ? 'white' : 'secondary'}
          className="mt-3 text-sm"
        >
          {label}
        </Text>
      )}
    </div>
  )
}

/**
 * Get spinner color based on variant
 */
function getSpinnerColor(
  variant: NonNullable<SpinnerProps['variant']>,
  customColor?: string
): string {
  if (customColor) {
    return customColor
  }

  switch (variant) {
    case 'primary':
      return BrandColors.primary.light
    case 'secondary':
      return BrandColors.primary.dark
    case 'default':
      return BrandColors.neutral.midGray
    case 'white':
      return BrandColors.neutral.white
    case 'success':
      return BrandColors.system.success
    case 'warning':
      return BrandColors.system.warning
    case 'error':
      return BrandColors.system.error
    default:
      return BrandColors.primary.light
  }
}

/**
 * Get spinner size classes
 */
function getSpinnerSize(size: NonNullable<SpinnerProps['size']>): string {
  switch (size) {
    case 'small':
      return 'w-4 h-4 border-2'
    case 'medium':
      return 'w-6 h-6 border-2'
    case 'large':
      return 'w-8 h-8 border-[3px]'
    default:
      return 'w-6 h-6 border-2'
  }
}
