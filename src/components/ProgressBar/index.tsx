import { Text } from '@/components/Text'
import { cn } from '@/utils/cn'

/**
 * Props for ProgressBar component
 */
export interface ProgressBarProps {
  /**
   * Progress value (0-100)
   */
  progress: number

  /**
   * Show percentage text
   * @default true
   */
  showPercentage?: boolean

  /**
   * Size variant
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'

  /**
   * Color variant
   * @default 'primary'
   */
  variant?: 'primary' | 'success' | 'warning' | 'error'

  /**
   * Additional className
   */
  className?: string

  /**
   * Label text (optional)
   */
  label?: string
}

/**
 * ProgressBar component
 *
 * Displays a progress bar with optional percentage and label.
 * Perfect for file uploads, form completion, and other progress indicators.
 *
 * @example
 * ```tsx
 * <ProgressBar progress={50} />
 * <ProgressBar progress={75} showPercentage={true} label="Uploading..." />
 * <ProgressBar progress={100} variant="success" />
 * ```
 */
export function ProgressBar({
  progress,
  showPercentage = true,
  size = 'medium',
  variant = 'primary',
  className,
  label,
}: Readonly<ProgressBarProps>) {
  // Clamp progress between 0 and 100
  const clampedProgress = Math.min(100, Math.max(0, progress))
  const roundedProgress = Math.round(clampedProgress)

  // Size classes
  const sizeClasses = {
    small: 'h-1',
    medium: 'h-2',
    large: 'h-3',
  }

  // Variant colors
  const variantColors = {
    primary: 'bg-primary',
    success: 'bg-success',
    warning: 'bg-warning',
    error: 'bg-error',
  }

  return (
    <div className={cn('w-full', className)}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <Text variant="secondary" className="text-sm">
            {label}
          </Text>
          {showPercentage && (
            <Text variant="muted" className="text-sm font-medium">
              {roundedProgress}%
            </Text>
          )}
        </div>
      )}

      <div className="w-full bg-lightGray rounded-full overflow-hidden">
        <div
          className={cn(
            'transition-all duration-300 ease-out rounded-full',
            sizeClasses[size],
            variantColors[variant]
          )}
          style={{ width: `${clampedProgress}%` }}
          role="progressbar"
          aria-valuenow={roundedProgress}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={label || `Progress: ${roundedProgress}%`}
        />
      </div>

      {!label && showPercentage && (
        <div className="flex justify-end mt-1">
          <Text variant="muted" className="text-xs">
            {roundedProgress}%
          </Text>
        </div>
      )}
    </div>
  )
}
