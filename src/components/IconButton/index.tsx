import React from 'react'
import { Icon } from '@/components/Icon'
import type { IconFamily, IconProps } from '@/components/Icon'
import { Spinner } from '@/components/Spinner'
import { useThemeColor } from '@/hooks/use-theme-color'
import { BrandColors } from '@/constants/theme'
import { cn } from '@/utils/cn'

export interface IconButtonProps extends Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'style' | 'children'
> {
  /**
   * Icon name (Font Awesome icon name)
   */
  icon: string
  /**
   * Icon family/library to use
   * @default 'solid'
   */
  iconFamily?: IconFamily
  /**
   * Button variant
   * @default 'ghost'
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
   * Override icon color (takes precedence over variant)
   */
  iconColor?: string
  /**
   * Additional className for styling
   */
  className?: string
  /**
   * Additional style prop
   */
  style?: React.CSSProperties
  /**
   * Accessibility label (required for icon-only buttons)
   */
  'aria-label': string
}

/**
 * IconButton component - A button that displays only an icon
 *
 * Perfect for icon-only actions like close buttons, menu toggles, etc.
 * Integrates with the theme system and supports all button variants.
 *
 * @example
 * ```tsx
 * <IconButton
 *   icon="close"
 *   variant="ghost"
 *   onClick={handleClose}
 *   aria-label="Close"
 * />
 *
 * <IconButton
 *   icon="heart"
 *   iconFamily="regular"
 *   variant="primary"
 *   size="large"
 *   onClick={handleLike}
 *   aria-label="Like"
 * />
 * ```
 */
export function IconButton({
  icon,
  iconFamily = 'solid',
  variant = 'ghost',
  size = 'medium',
  loading = false,
  disabled = false,
  iconColor,
  className,
  style,
  onClick,
  'aria-label': ariaLabel,
  ...props
}: Readonly<IconButtonProps>) {
  const themeColors = useButtonThemeColors()
  const isDisabled = disabled || loading
  const buttonStyles = getIconButtonStyles(variant, themeColors)
  const sizeClasses = getIconButtonSizeClasses(size)
  const iconSize = getIconSizeForButton(size)
  const iconVariant = getIconVariantForButton(variant)

  const baseClasses = cn(
    'inline-flex items-center justify-center',
    'transition-all duration-200',
    'focus:outline-none focus:ring-2 focus:ring-offset-2',
    'disabled:cursor-not-allowed',
    sizeClasses,
    buttonStyles.classes,
    isDisabled && 'opacity-60',
    className
  )

  const buttonStyle: React.CSSProperties = {
    ...buttonStyles.style,
    ...style,
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
      aria-label={ariaLabel}
      {...props}
    >
      {loading ? (
        <Spinner
          size="small"
          color={iconColor || buttonStyles.iconColor}
          spinnerClassName="border-2"
        />
      ) : (
        <Icon
          name={icon}
          family={iconFamily}
          size={iconSize}
          variant={iconVariant}
          color={iconColor}
        />
      )}
    </button>
  )
}

/**
 * Get all theme colors used by icon buttons
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
 * Get icon button styles based on variant
 */
function getIconButtonStyles(
  variant: NonNullable<IconButtonProps['variant']>,
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
  iconColor: string
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
        iconColor: colors.white,
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
        iconColor: colors.white,
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
        iconColor: colors.primary,
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
        iconColor: colors.nearBlack,
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
        iconColor: colors.white,
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
        iconColor: colors.white,
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
        iconColor: colors.white,
      }
  }
}

/**
 * Get icon button size classes
 */
function getIconButtonSizeClasses(
  size: NonNullable<IconButtonProps['size']>
): string {
  switch (size) {
    case 'small':
      return 'w-8 h-8 rounded-md'
    case 'medium':
      return 'w-11 h-11 rounded-lg'
    case 'large':
      return 'w-[52px] h-[52px] rounded-xl'
    default:
      return 'w-11 h-11 rounded-lg'
  }
}

/**
 * Get icon size based on button size
 */
function getIconSizeForButton(
  size: NonNullable<IconButtonProps['size']>
): number {
  switch (size) {
    case 'small':
      return 18
    case 'medium':
      return 24
    case 'large':
      return 28
  }
}

/**
 * Get icon variant based on button variant
 */
function getIconVariantForButton(
  variant: NonNullable<IconButtonProps['variant']>
): IconProps['variant'] {
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
  }
}
