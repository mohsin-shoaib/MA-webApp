import React, { useEffect, useState, useCallback } from 'react'
import { Icon } from '@/components/Icon'
import type { IconFamily } from '@/components/Icon'
import { Text } from '@/components/Text'
import { useThemeColor } from '@/hooks/use-theme-color'
import { cn } from '@/utils/cn'

export interface SnackbarProps {
  /**
   * Whether snackbar is visible
   */
  visible: boolean
  /**
   * Snackbar message/content
   */
  message: string
  /**
   * Snackbar variant
   * @default 'default'
   */
  variant?: 'success' | 'error' | 'info' | 'warning'
  /**
   * Snackbar position
   * @default 'bottom'
   */
  position?: 'top' | 'bottom'
  /**
   * Duration in milliseconds before auto-dismiss (0 = no auto-dismiss)
   * @default 4000
   */
  duration?: number
  /**
   * Callback when snackbar is dismissed
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
   * @default true
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
 * Snackbar component with theme support
 *
 * Displays temporary notification messages at the bottom (or top) of the screen.
 * Perfect for API success and error messages.
 *
 * @example
 * ```tsx
 * <Snackbar
 *   visible={showSnackbar}
 *   message="Operation successful"
 *   variant="success"
 *   onDismiss={() => setShowSnackbar(false)}
 * />
 *
 * <Snackbar
 *   visible={showError}
 *   message="Something went wrong"
 *   variant="error"
 *   actionLabel="Retry"
 *   onAction={handleRetry}
 * />
 * ```
 */
export function Snackbar({
  visible,
  message,
  variant = 'info',
  position = 'bottom',
  duration = 4000,
  onDismiss,
  actionLabel,
  onAction,
  icon,
  iconFamily,
  showCloseButton = true,
  className,
  style,
}: Readonly<SnackbarProps>) {
  const [isAnimating, setIsAnimating] = useState(false)
  const [shouldRender, setShouldRender] = useState(visible)

  // Get theme colors
  const themeSuccess = useThemeColor({}, 'success')
  const themeWarning = useThemeColor({}, 'warning')
  const themeError = useThemeColor({}, 'error')
  const themePrimary = useThemeColor({}, 'primary')

  const handleDismiss = useCallback(() => {
    setIsAnimating(false)
    // Wait for animation to complete before calling onDismiss
    setTimeout(() => {
      setShouldRender(false)
      onDismiss?.()
    }, 300)
  }, [onDismiss])

  // Handle visibility changes
  useEffect(() => {
    if (visible) {
      // Use requestAnimationFrame to avoid setState in effect
      const rafId = requestAnimationFrame(() => {
        setShouldRender(true)
        // Trigger animation after render
        setTimeout(() => setIsAnimating(true), 10)
      })

      // Auto-dismiss
      let timer: ReturnType<typeof setTimeout> | undefined
      if (duration > 0) {
        timer = setTimeout(() => {
          handleDismiss()
        }, duration)
      }

      return () => {
        cancelAnimationFrame(rafId)
        if (timer) {
          clearTimeout(timer)
        }
      }
    } else {
      // Use requestAnimationFrame to avoid setState in effect
      const rafId = requestAnimationFrame(() => {
        setIsAnimating(false)
      })
      // Wait for animation before unmounting
      const timer = setTimeout(() => {
        setShouldRender(false)
      }, 300)
      return () => {
        cancelAnimationFrame(rafId)
        clearTimeout(timer)
      }
    }
  }, [visible, duration, handleDismiss])

  const handleAction = () => {
    onAction?.()
    handleDismiss()
  }

  if (!shouldRender) {
    return null
  }

  const containerClasses = getContainerClasses()
  const iconName = icon ?? getDefaultIcon(variant)
  const animationClasses = getAnimationClasses(position, isAnimating)
  const backgroundColor = getBackgroundColor(variant, {
    success: themeSuccess,
    warning: themeWarning,
    error: themeError,
    info: themePrimary,
  })

  return (
    <div
      className={cn(
        'fixed left-0 right-0 z-50',
        position === 'top' ? 'top-0' : 'bottom-0',
        'flex items-center justify-center',
        'pointer-events-none',
        'px-4 py-3'
      )}
    >
      <div
        className={cn(
          containerClasses,
          animationClasses,
          'pointer-events-auto',
          'max-w-md w-full',
          className
        )}
        style={{
          backgroundColor,
          ...style,
        }}
        role="alert"
        aria-live="polite"
      >
        <div className="flex flex-row items-center gap-3">
          {/* Icon */}
          {iconName && (
            <Icon
              name={iconName}
              family={iconFamily ?? 'solid'}
              size={20}
              variant="white"
              className="shrink-0"
            />
          )}

          {/* Message */}
          <Text variant="white" className="text-sm flex-1 min-w-0">
            {message}
          </Text>

          {/* Action Button */}
          {actionLabel && (
            <button
              onClick={handleAction}
              className={cn(
                'ml-2 px-3 py-1.5',
                'text-white text-sm font-semibold',
                'bg-white/20 hover:bg-white/30',
                'rounded-md',
                'transition-colors duration-200',
                'shrink-0'
              )}
            >
              {actionLabel}
            </button>
          )}

          {/* Close Button */}
          {showCloseButton && (
            <button
              onClick={handleDismiss}
              className={cn(
                'shrink-0 w-8 h-8',
                'flex items-center justify-center',
                'rounded-md',
                'hover:bg-white/20',
                'transition-colors duration-200',
                'focus:outline-none focus:ring-2 focus:ring-white/50'
              )}
              aria-label="Close"
            >
              <Icon name="xmark" family="solid" size={16} variant="white" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

/**
 * Get container classes
 */
function getContainerClasses(): string {
  return cn(
    'rounded-lg shadow-lg px-4 py-3',
    'transition-all duration-300 ease-in-out',
    'flex items-center'
  )
}

/**
 * Get animation classes based on position and animation state
 */
function getAnimationClasses(
  position: NonNullable<SnackbarProps['position']>,
  isAnimating: boolean
): string {
  if (!isAnimating) {
    // Initial state (hidden)
    if (position === 'top') {
      return 'opacity-0 -translate-y-full'
    }
    return 'opacity-0 translate-y-full'
  }

  // Animated state (visible)
  return 'opacity-100 translate-y-0'
}

/**
 * Get default icon for variant
 */
function getDefaultIcon(
  variant: NonNullable<SnackbarProps['variant']>
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
    default:
      return undefined
  }
}

/**
 * Get background color for variant
 */
function getBackgroundColor(
  variant: NonNullable<SnackbarProps['variant']>,
  colors: {
    success: string
    warning: string
    error: string
    info: string
  }
): string {
  switch (variant) {
    case 'success':
      return colors.success
    case 'warning':
      return colors.warning
    case 'error':
      return colors.error
    case 'info':
      return colors.info
    default:
      return colors.info
  }
}
