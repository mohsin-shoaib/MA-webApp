import React from 'react'
import { Icon } from '@/components/Icon'
import type { IconFamily } from '@/components/Icon'
import { Text } from '@/components/Text'
import { cn } from '@/utils/cn'

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Badge content (text or number)
   */
  children: React.ReactNode
  /**
   * Badge variant
   * @default 'default'
   */
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'success'
    | 'warning'
    | 'error'
    | 'outline'
  /**
   * Badge size
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * Icon to display before text
   */
  icon?: string
  /**
   * Icon family (if icon is provided)
   * @default 'solid'
   */
  iconFamily?: IconFamily
  /**
   * Whether badge is a dot (no text, just a dot indicator)
   * @default false
   */
  dot?: boolean
  /**
   * Maximum number to display (shows "99+" if exceeded)
   */
  max?: number
  /**
   * Additional className for styling
   */
  className?: string
}

/**
 * Badge component with theme support
 *
 * Displays a badge indicator with text, numbers, or just a dot.
 * Perfect for notifications, counts, and status indicators.
 *
 * @example
 * ```tsx
 * <Badge>5</Badge>
 * <Badge variant="primary">New</Badge>
 * <Badge dot />
 * <Badge variant="error" max={99}>150</Badge>
 * ```
 */
export function Badge({
  children,
  variant = 'default',
  size = 'medium',
  icon,
  iconFamily = 'solid',
  dot = false,
  max,
  className,
  style,
  ...props
}: Readonly<BadgeProps>) {
  const containerClasses = getContainerClasses(variant, size, dot)
  const textClasses = getTextClasses(size)
  const iconSize = getIconSize(size)

  // Format children if it's a number and max is set
  const displayContent = formatBadgeContent(children, max)

  return (
    <div className={cn(containerClasses, className)} style={style} {...props}>
      {!dot && (
        <>
          {icon && (
            <Icon
              name={icon}
              family={iconFamily}
              size={iconSize}
              variant={getContentVariant(variant)}
              className={displayContent ? 'mr-1' : ''}
            />
          )}
          {displayContent && (
            <Text variant={getContentVariant(variant)} className={textClasses}>
              {displayContent}
            </Text>
          )}
        </>
      )}
    </div>
  )
}

/**
 * Format badge content (handle max value)
 */
function formatBadgeContent(
  children: React.ReactNode,
  max: number | undefined
): React.ReactNode {
  if (max === undefined) {
    return children
  }

  if (typeof children === 'number') {
    return children > max ? `${max}+` : children
  }

  if (typeof children === 'string') {
    const num = Number.parseInt(children, 10)
    if (!Number.isNaN(num)) {
      return num > max ? `${max}+` : children
    }
  }

  return children
}

/**
 * Get container Tailwind classes
 */
function getContainerClasses(
  variant: NonNullable<BadgeProps['variant']>,
  size: NonNullable<BadgeProps['size']>,
  dot: boolean
): string {
  const baseClasses = 'inline-flex items-center justify-center'
  const sizeClasses = getSizeClasses(size, dot)
  const variantClasses = getVariantClasses(variant)

  return cn(baseClasses, sizeClasses, variantClasses)
}

/**
 * Get size classes
 */
function getSizeClasses(
  size: NonNullable<BadgeProps['size']>,
  dot: boolean
): string {
  if (dot) {
    switch (size) {
      case 'small':
        return 'w-2 h-2'
      case 'medium':
        return 'w-2.5 h-2.5'
      case 'large':
        return 'w-3 h-3'
    }
  }

  switch (size) {
    case 'small':
      return 'px-1.5 py-0.5 min-w-[16px]'
    case 'medium':
      return 'px-2 py-1 min-w-[20px]'
    case 'large':
      return 'px-2.5 py-1.5 min-w-[24px]'
  }
}

/**
 * Get variant classes
 */
function getVariantClasses(
  variant: NonNullable<BadgeProps['variant']>
): string {
  const roundedClass = 'rounded-full'

  switch (variant) {
    case 'default':
      return cn(roundedClass, 'bg-mid-gray')
    case 'primary':
      return cn(roundedClass, 'bg-primary')
    case 'secondary':
      return cn(roundedClass, 'bg-primary-dark')
    case 'success':
      return cn(roundedClass, 'bg-success')
    case 'warning':
      return cn(roundedClass, 'bg-warning')
    case 'error':
      return cn(roundedClass, 'bg-error')
    case 'outline':
      return cn(roundedClass, 'border border-mid-gray bg-transparent')
    default:
      return cn(roundedClass, 'bg-mid-gray')
  }
}

/**
 * Get text size classes
 */
function getTextClasses(size: NonNullable<BadgeProps['size']>): string {
  switch (size) {
    case 'small':
      return 'text-xs font-semibold'
    case 'medium':
      return 'text-xs font-semibold'
    case 'large':
      return 'text-sm font-semibold'
  }
}

/**
 * Get icon size based on badge size
 */
function getIconSize(size: NonNullable<BadgeProps['size']>): number {
  switch (size) {
    case 'small':
      return 12
    case 'medium':
      return 14
    case 'large':
      return 16
  }
}

/**
 * Get variant for icon/text based on badge variant
 */
function getContentVariant(
  variant: NonNullable<BadgeProps['variant']>
): 'default' | 'primary' | 'secondary' | 'white' {
  switch (variant) {
    case 'default':
    case 'outline':
      return 'default'
    case 'primary':
    case 'secondary':
    case 'success':
    case 'warning':
    case 'error':
      return 'white'
    default:
      return 'default'
  }
}
