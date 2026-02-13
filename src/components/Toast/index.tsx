import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import type { IconFamily } from '@/components/Icon'
import { IconButton } from '@/components/IconButton'
import { Text } from '@/components/Text'
import React, { useEffect, useState, useCallback } from 'react'
import { cn } from '@/utils/cn'

export interface ToastProps {
  /**
   * Whether toast is visible
   */
  visible: boolean
  /**
   * Toast message/content
   */
  message: string
  /**
   * Toast title (optional)
   */
  title?: string
  /**
   * Toast variant
   * @default 'default'
   */
  variant?: 'default' | 'success' | 'warning' | 'error' | 'info'
  /**
   * Toast position
   * @default 'top'
   */
  position?: 'top' | 'bottom' | 'center'
  /**
   * Duration in milliseconds before auto-dismiss (0 = no auto-dismiss)
   * @default 3000
   */
  duration?: number
  /**
   * Callback when toast is dismissed
   */
  onDismiss?: () => void
  /**
   * Action button label
   */
  actionLabel?: string
  /**
   * Action button callback
   */
  onAction?: () => void
  /**
   * Custom icon name
   */
  icon?: string
  /**
   * Icon family (if icon is provided)
   * @default 'solid'
   */
  iconFamily?: IconFamily
  /**
   * Whether to show close button
   * @default false
   */
  showCloseButton?: boolean
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
 * Toast/Notification component with theme support
 *
 * Displays temporary notification messages with auto-dismiss functionality.
 * Perfect for success messages, errors, warnings, and general notifications.
 *
 * @example
 * ```tsx
 * <Toast
 *   visible={showToast}
 *   message="Operation successful"
 *   variant="success"
 *   onDismiss={() => setShowToast(false)}
 * />
 *
 * <Toast
 *   visible={showError}
 *   message="Something went wrong"
 *   variant="error"
 *   actionLabel="Retry"
 *   onAction={handleRetry}
 * />
 * ```
 */
export function Toast({
  visible,
  message,
  title,
  variant = 'default',
  position = 'top',
  duration = 3000,
  onDismiss,
  actionLabel,
  onAction,
  icon,
  iconFamily,
  showCloseButton = false,
  className,
  style,
}: Readonly<ToastProps>) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [shouldRender, setShouldRender] = useState(visible)

  const handleDismiss = useCallback(() => {
    setIsAnimating(true)
    // Wait for animation to complete before calling onDismiss
    setTimeout(() => {
      setShouldRender(false)
      onDismiss?.()
    }, 200)
  }, [onDismiss])

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      // Use requestAnimationFrame to avoid setState in effect
      requestAnimationFrame(() => {
        setShouldRender(true)
        // Trigger animation after render
        setTimeout(() => setIsAnimating(true), 10)
      })

      // Auto-dismiss
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleDismiss()
        }, duration)

        return () => clearTimeout(timer)
      }
    } else {
      // Use requestAnimationFrame to avoid setState in effect
      requestAnimationFrame(() => {
        setIsAnimating(false)
      })
      // Wait for animation before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [visible, duration, handleDismiss])

  const handleAction = () => {
    onAction?.()
    handleDismiss()
  }

  if (!shouldRender) {
    return null
  }

  const containerClasses = getContainerClasses(variant, position)
  const iconName = icon ?? getDefaultIcon(variant)
  const iconVariant = getIconVariant(variant)
  const animationClasses = getAnimationClasses(position, isAnimating)

  return (
    <div
      className={cn(
        'fixed inset-0 z-50',
        'flex items-center justify-center',
        'pointer-events-none'
      )}
    >
      <div
        className={cn(
          containerClasses,
          animationClasses,
          'pointer-events-auto',
          className
        )}
        style={style}
        role="alert"
        aria-live="polite"
      >
        <div className="flex flex-row items-start">
          {/* Icon */}
          {iconName && (
            <Icon
              name={iconName}
              family={iconFamily ?? 'solid'}
              size={24}
              variant={iconVariant}
              className="mr-3 mt-0.5 shrink-0"
            />
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {title && (
              <Text
                variant={getTextVariant()}
                className="text-base font-semibold mb-1"
              >
                {title}
              </Text>
            )}
            <Text variant={getTextVariant()} className="text-sm">
              {message}
            </Text>

            {/* Action Button */}
            {actionLabel && (
              <div className="mt-3">
                <Button
                  variant={getActionVariant(variant)}
                  size="small"
                  onClick={handleAction}
                >
                  {actionLabel}
                </Button>
              </div>
            )}
          </div>

          {/* Close Button */}
          {showCloseButton && (
            <IconButton
              icon="xmark"
              variant="ghost"
              size="small"
              onClick={handleDismiss}
              className="ml-3 shrink-0"
              aria-label="Close"
            />
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Get container classes based on variant and position
 */
function getContainerClasses(
  variant: NonNullable<ToastProps['variant']>,
  position: NonNullable<ToastProps['position']>
): string {
  const baseClasses = cn(
    'bg-white rounded-lg shadow-lg px-4 py-3 mx-4 max-w-md',
    'transition-all duration-300 ease-in-out'
  )
  const variantClasses = getVariantClasses(variant)
  const positionClasses = getPositionClasses(position)

  return cn(baseClasses, variantClasses, positionClasses)
}

/**
 * Get variant-specific classes
 */
function getVariantClasses(
  variant: NonNullable<ToastProps['variant']>
): string {
  switch (variant) {
    case 'success':
      return 'border-l-4 border-success'
    case 'warning':
      return 'border-l-4 border-warning'
    case 'error':
      return 'border-l-4 border-error'
    case 'info':
      return 'border-l-4 border-primary-light'
    case 'default':
    default:
      return ''
  }
}

/**
 * Get position classes
 */
function getPositionClasses(
  position: NonNullable<ToastProps['position']>
): string {
  switch (position) {
    case 'top':
      return 'mt-12'
    case 'bottom':
      return 'mb-12'
    case 'center':
      return ''
    default:
      return ''
  }
}

/**
 * Get animation classes based on position and animation state
 */
function getAnimationClasses(
  position: NonNullable<ToastProps['position']>,
  isAnimating: boolean
): string {
  if (!isAnimating) {
    // Initial state (hidden)
    switch (position) {
      case 'top':
        return 'opacity-0 -translate-y-full'
      case 'bottom':
        return 'opacity-0 translate-y-full'
      case 'center':
        return 'opacity-0 scale-95'
      default:
        return 'opacity-0'
    }
  }

  // Animated state (visible)
  switch (position) {
    case 'top':
    case 'bottom':
      return 'opacity-100 translate-y-0'
    case 'center':
      return 'opacity-100 scale-100'
    default:
      return 'opacity-100'
  }
}

/**
 * Get default icon for variant
 */
function getDefaultIcon(
  variant: NonNullable<ToastProps['variant']>
): string | undefined {
  switch (variant) {
    case 'success':
      return 'circle-check'
    case 'warning':
      return 'triangle-exclamation'
    case 'error':
      return 'circle-xmark'
    case 'info':
      return 'circle-info'
    case 'default':
    default:
      return undefined
  }
}

/**
 * Get icon variant based on toast variant
 */
function getIconVariant(
  variant: NonNullable<ToastProps['variant']>
): 'default' | 'primary' | 'success' | 'warning' | 'error' {
  switch (variant) {
    case 'success':
      return 'success'
    case 'warning':
      return 'warning'
    case 'error':
      return 'error'
    case 'info':
      return 'primary'
    case 'default':
    default:
      return 'default'
  }
}

/**
 * Get text variant based on toast variant
 */
function getTextVariant(): 'default' | 'primary' | 'secondary' {
  return 'default'
}

/**
 * Get action button variant based on toast variant
 */
function getActionVariant(
  variant: NonNullable<ToastProps['variant']>
): 'primary' | 'outline' {
  switch (variant) {
    case 'success':
    case 'info':
      return 'primary'
    case 'warning':
    case 'error':
    case 'default':
    default:
      return 'outline'
  }
}
