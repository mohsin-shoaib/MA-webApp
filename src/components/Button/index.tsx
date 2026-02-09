import React from 'react'
import { Text } from '@/components/Text'
import { Spinner } from '@/components/Spinner'
import { BrandColors } from '@/constants/theme'
import { useThemeColor } from '@/hooks/use-theme-color'
import { cn } from '@/utils/cn'

export interface ButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'style' | 'children'
> {
  /**
   * Button variant
   * @default 'primary'
   */
  variant?:
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'ghost'
    | 'success'
    | 'warning'
    | 'error'
  /**
   * Button size
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * Button text content
   */
  children: React.ReactNode
  /**
   * Whether button is in loading state
   * @default false
   */
  loading?: boolean
  /**
   * Whether button is disabled
   * @default false
   */
  disabled?: boolean
  /**
   * Whether button should take full width
   * @default false
   */
  fullWidth?: boolean
  /**
   * Icon to display before text (React element)
   */
  leftIcon?: React.ReactElement
  /**
   * Icon to display after text (React element)
   */
  rightIcon?: React.ReactElement
  /**
   * Additional className for styling
   */
  className?: string
  /**
   * Text className for button text
   */
  textClassName?: string
}

/**
 * Button component with theme support and touch feedback
 *
 * Supports multiple variants, sizes, and states with proper theme integration.
 *
 * @example
 * ```tsx
 * <Button variant="primary" onClick={handleClick}>
 *   Click Me
 * </Button>
 *
 * <Button variant="outline" size="large" loading={isLoading}>
 *   Submit
 * </Button>
 *
 * <Button variant="ghost" leftIcon={<Icon name="arrow-left" />}>
 *   Back
 * </Button>
 * ```
 */

/**
 * Get all theme colors used by buttons
 */
function useButtonThemeColors() {
  const themePrimary = useThemeColor({}, 'primary')
  const themePrimaryDark = useThemeColor({}, 'primaryDark')
  const themeMidGray = useThemeColor({}, 'midGray')
  const themeSuccess = useThemeColor({}, 'success')
  const themeWarning = useThemeColor({}, 'warning')
  const themeError = useThemeColor({}, 'error')

  return {
    primary: themePrimary,
    primaryDark: themePrimaryDark,
    midGray: themeMidGray,
    success: themeSuccess,
    warning: themeWarning,
    error: themeError,
    white: BrandColors.neutral.white,
    nearBlack: BrandColors.neutral.nearBlack,
    charcoal: BrandColors.neutral.charcoal,
    lightGray: BrandColors.neutral.lightGray,
  }
}

/**
 * Get icon size based on button size
 */
function getIconSize(size: NonNullable<ButtonProps['size']>): number {
  if (size === 'small') return 16
  if (size === 'large') return 24
  return 20
}

/**
 * Render icon with proper color and size
 */
function renderIcon(
  icon: React.ReactElement | undefined,
  textColor: string,
  size: NonNullable<ButtonProps['size']>
): React.ReactElement | null {
  if (!icon) return null

  if (!React.isValidElement(icon)) return icon as React.ReactElement

  const iconSize = getIconSize(size)
  const iconProps = icon.props as { color?: string; size?: number }

  return React.cloneElement(
    icon as React.ReactElement<{ color?: string; size?: number }>,
    {
      color: iconProps.color ?? textColor,
      size: iconProps.size ?? iconSize,
    }
  )
}

interface ButtonContentProps {
  loading: boolean
  children: React.ReactNode
  leftIcon?: React.ReactElement
  rightIcon?: React.ReactElement
  textColor: string
  textVariant: 'default' | 'primary' | 'white'
  size: NonNullable<ButtonProps['size']>
  textClassName?: string
}

/**
 * Render button content (text, icons, or loading indicator)
 */
function renderButtonContent(props: ButtonContentProps) {
  const {
    loading,
    children,
    leftIcon,
    rightIcon,
    textColor,
    textVariant,
    size,
    textClassName,
  } = props

  if (loading) {
    return (
      <Spinner size="small" color={textColor} spinnerClassName="border-2" />
    )
  }

  const leftIconElement = renderIcon(leftIcon, textColor, size)
  const rightIconElement = renderIcon(rightIcon, textColor, size)
  const isStringChildren = typeof children === 'string'

  return (
    <div className="flex items-center gap-2">
      {leftIconElement && <div>{leftIconElement}</div>}
      {isStringChildren ? (
        <Text
          variant={textVariant}
          color={textColor}
          className={cn('font-semibold', textClassName)}
        >
          {children}
        </Text>
      ) : (
        children
      )}
      {rightIconElement && <div>{rightIconElement}</div>}
    </div>
  )
}

export function Button({
  variant = 'primary',
  size = 'medium',
  children,
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  className,
  textClassName,
  onClick,
  ...props
}: Readonly<ButtonProps>) {
  const themeColors = useButtonThemeColors()
  const isDisabled = disabled || loading
  const buttonStyles = getButtonStyles(variant, themeColors)
  const sizeClasses = getSizeClasses(size)
  const textVariant = getTextVariant(variant)

  const baseClasses = cn(
    'inline-flex items-center justify-center',
    'font-semibold',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:cursor-not-allowed',
    fullWidth && 'w-full',
    sizeClasses,
    buttonStyles.classes,
    isDisabled && 'opacity-60',
    className
  )

  const buttonStyle: React.CSSProperties = {
    ...buttonStyles.style,
  }

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (!isDisabled && onClick) {
      onClick(event)
    }
  }

  return (
    <button
      className={baseClasses}
      style={buttonStyle}
      onClick={handleClick}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      {...props}
    >
      {renderButtonContent({
        loading,
        children,
        leftIcon,
        rightIcon,
        textColor: buttonStyles.textColor,
        textVariant,
        size,
        textClassName,
      })}
    </button>
  )
}

/**
 * Get button styles based on variant
 */
function getButtonStyles(
  variant: NonNullable<ButtonProps['variant']>,
  colors: {
    primary: string
    primaryDark: string
    midGray: string
    success: string
    warning: string
    error: string
    white: string
    nearBlack: string
    charcoal: string
    lightGray: string
  }
): {
  classes: string
  style: React.CSSProperties
  textColor: string
} {
  switch (variant) {
    case 'primary':
      return {
        classes: cn(
          'bg-primary text-white',
          'hover:opacity-90',
          'active:opacity-90',
          'focus:ring-primary'
        ),
        style: {
          backgroundColor: colors.primary,
        },
        textColor: colors.white,
      }
    case 'secondary':
      return {
        classes: cn(
          'text-white',
          'hover:opacity-90',
          'active:opacity-90',
          'focus:ring-primary-dark'
        ),
        style: {
          backgroundColor: colors.primaryDark,
        },
        textColor: colors.white,
      }
    case 'outline':
      return {
        classes: cn(
          'bg-transparent border-2',
          'hover:bg-primary/10',
          'active:bg-primary/20',
          'focus:ring-primary'
        ),
        style: {
          borderColor: colors.primary,
        },
        textColor: colors.primary,
      }
    case 'ghost':
      return {
        classes: cn(
          'bg-transparent',
          'hover:bg-light-gray hover:bg-opacity-50',
          'active:bg-light-gray active:bg-opacity-70',
          'focus:ring-charcoal'
        ),
        style: {},
        textColor: colors.nearBlack,
      }
    case 'success':
      return {
        classes: cn(
          'bg-success text-white',
          'hover:opacity-90',
          'active:opacity-90',
          'focus:ring-success'
        ),
        style: {
          backgroundColor: colors.success,
        },
        textColor: colors.white,
      }
    case 'warning':
      return {
        classes: cn(
          'bg-warning text-white',
          'hover:opacity-90',
          'active:opacity-90',
          'focus:ring-warning'
        ),
        style: {
          backgroundColor: colors.warning,
        },
        textColor: colors.white,
      }
    case 'error':
      return {
        classes: cn(
          'bg-error text-white',
          'hover:opacity-90',
          'active:opacity-90',
          'focus:ring-error'
        ),
        style: {
          backgroundColor: colors.error,
        },
        textColor: colors.white,
      }
  }
}

/**
 * Get size classes
 */
function getSizeClasses(size: NonNullable<ButtonProps['size']>): string {
  switch (size) {
    case 'small':
      return 'px-3 py-2 min-h-8 rounded-md text-sm'
    case 'medium':
      return 'px-4 py-3 min-h-11 rounded-lg text-base'
    case 'large':
      return 'px-6 py-4 min-h-[52px] rounded-xl text-lg'
    default:
      return 'px-4 py-3 min-h-11 rounded-lg text-base'
  }
}

/**
 * Get text variant for button text
 */
function getTextVariant(
  variant: NonNullable<ButtonProps['variant']>
): 'default' | 'primary' | 'white' {
  switch (variant) {
    case 'primary':
    case 'secondary':
    case 'success':
    case 'warning':
    case 'error':
      return 'white'
    case 'outline':
      return 'primary'
    case 'ghost':
      return 'default'
    default:
      return 'white'
  }
}
