import React from 'react'
import { Text } from '@/components/Text'
import { cn } from '@/utils/cn'

export interface CardProps extends Omit<
  React.HTMLAttributes<HTMLDivElement>,
  'style'
> {
  /**
   * Card content
   */
  children: React.ReactNode
  /**
   * Card title
   */
  title?: string
  /**
   * Card subtitle/description
   */
  subtitle?: string
  /**
   * Card header action (e.g., menu button)
   */
  headerAction?: React.ReactElement
  /**
   * Card footer content
   */
  footer?: React.ReactNode
  /**
   * Whether card is pressable
   * @default false
   */
  pressable?: boolean
  /**
   * Callback when card is pressed (requires pressable=true)
   */
  onPress?: () => void
  /**
   * Card variant
   * @default 'default'
   */
  variant?: 'default' | 'outlined' | 'elevated'
  /**
   * Whether to show border
   * @default true (for default variant)
   */
  showBorder?: boolean
  /**
   * Additional className for styling
   */
  className?: string
  /**
   * Additional style prop
   */
  style?: React.CSSProperties
  /**
   * Content padding
   * @default 'medium'
   */
  padding?: 'none' | 'small' | 'medium' | 'large'
}

/**
 * Card component with theme support
 *
 * Displays content in a card container with optional header, body, and footer.
 * Perfect for content grouping, lists, and information display.
 *
 * @example
 * ```tsx
 * <Card title="Card Title" subtitle="Card subtitle">
 *   <Text>Card content goes here</Text>
 * </Card>
 *
 * <Card
 *   title="Pressable Card"
 *   pressable
 *   onPress={handlePress}
 * >
 *   <Text>Tap to open</Text>
 * </Card>
 * ```
 */
export function Card({
  children,
  title,
  subtitle,
  headerAction,
  footer,
  pressable = false,
  onPress,
  variant = 'default',
  showBorder,
  className,
  style,
  padding = 'medium',
  onClick,
  onKeyDown,
  ...props
}: Readonly<CardProps>) {
  const containerClasses = getContainerClasses(variant, showBorder, pressable)
  const paddingClasses = getPaddingClasses(padding)

  const handleButtonClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (onPress) {
      onPress()
    }
    onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>)
  }

  const handleButtonKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onPress?.()
    }
    onKeyDown?.(e as unknown as React.KeyboardEvent<HTMLDivElement>)
  }

  const content = (
    <>
      {/* Header */}
      {(title || subtitle || headerAction) && (
        <div
          className={cn(
            'flex items-center border-b border-light-gray',
            paddingClasses.header
          )}
        >
          <div className="flex-1">
            {title && (
              <Text
                variant="default"
                className={cn('text-lg font-semibold', subtitle && 'mb-1')}
              >
                {title}
              </Text>
            )}
            {subtitle && (
              <Text variant="secondary" className="text-sm">
                {subtitle}
              </Text>
            )}
          </div>
          {headerAction && <div className="ml-3">{headerAction}</div>}
        </div>
      )}

      {/* Body */}
      <div className={paddingClasses.body}>{children}</div>

      {/* Footer */}
      {footer && (
        <div
          className={cn('border-t border-light-gray', paddingClasses.footer)}
        >
          {footer}
        </div>
      )}
    </>
  )

  if (pressable) {
    return (
      <button
        type="button"
        className={cn(containerClasses, 'text-left', className)}
        style={style}
        onClick={handleButtonClick}
        onKeyDown={handleButtonKeyDown}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={cn(containerClasses, className)} style={style} {...props}>
      {content}
    </div>
  )
}

/**
 * Get container Tailwind classes based on variant
 */
function getContainerClasses(
  variant: NonNullable<CardProps['variant']>,
  showBorder: boolean | undefined,
  pressable: boolean
): string {
  const baseClasses = 'bg-white rounded-xl'
  const defaultShowBorder = variant === 'default' || variant === 'outlined'
  const shouldShowBorder = showBorder ?? defaultShowBorder

  let variantClasses = ''
  switch (variant) {
    case 'default':
      variantClasses = shouldShowBorder ? 'border border-light-gray' : ''
      break
    case 'outlined':
      variantClasses = shouldShowBorder ? 'border-[1.5px] border-mid-gray' : ''
      break
    case 'elevated':
      variantClasses = 'shadow-md'
      break
  }

  const interactiveClasses = pressable
    ? 'transition-all duration-200 cursor-pointer hover:shadow-lg active:opacity-90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2'
    : ''

  return cn(baseClasses, variantClasses, interactiveClasses)
}

/**
 * Get padding Tailwind classes based on padding prop
 */
function getPaddingClasses(padding: NonNullable<CardProps['padding']>): {
  header: string
  body: string
  footer: string
} {
  switch (padding) {
    case 'none':
      return {
        header: '',
        body: '',
        footer: '',
      }
    case 'small':
      return {
        header: 'px-3 py-3',
        body: 'px-3 py-3',
        footer: 'px-3 py-3',
      }
    case 'medium':
      return {
        header: 'px-4 py-4',
        body: 'px-4 py-4',
        footer: 'px-4 py-4',
      }
    case 'large':
      return {
        header: 'px-5 py-5',
        body: 'px-5 py-5',
        footer: 'px-5 py-5',
      }
  }
}
