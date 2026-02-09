import React from 'react'
import { useThemeColor } from '@/hooks/use-theme-color'
import { BrandColors } from '@/constants/theme'
import { Text } from '@/components/Text'
import { Icon } from '@/components/Icon'
import { cn } from '@/utils/cn'

export interface ChipProps {
  /**
   * Chip label/text content
   */
  label: string
  /**
   * Chip variant
   * @default 'default'
   */
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'outline'
    | 'success'
    | 'warning'
    | 'error'
  /**
   * Chip size
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * Whether chip is selected/active
   * @default false
   */
  selected?: boolean
  /**
   * Whether chip is disabled
   * @default false
   */
  disabled?: boolean
  /**
   * Show close/remove icon
   * @default false
   */
  removable?: boolean
  /**
   * Callback when chip is pressed
   */
  onPress?: () => void
  /**
   * Callback when remove icon is pressed
   */
  onRemove?: () => void
  /**
   * Left icon (React element)
   */
  leftIcon?: React.ReactElement
  /**
   * Additional className for styling
   */
  className?: string
  /**
   * Additional style prop
   */
  style?: React.CSSProperties
}

/**
 * Chip/Tag component - Displays labels, categories, or removable items
 *
 * Perfect for filters, tags, categories, and selectable labels.
 * Supports multiple variants, sizes, and states with theme integration.
 *
 * @example
 * ```tsx
 * <Chip label="React" variant="primary" />
 * <Chip label="Selected" selected onPress={handleToggle} />
 * <Chip label="Removable" removable onRemove={handleRemove} />
 * <Chip label="With Icon" leftIcon={<Icon name="star" />} />
 * ```
 */
export function Chip({
  label,
  variant = 'default',
  size = 'medium',
  selected = false,
  disabled = false,
  removable = false,
  onPress,
  onRemove,
  leftIcon,
  className,
  style,
}: Readonly<ChipProps>) {
  const themeColors = useChipThemeColors()
  const chipStyles = getChipStyles(variant, selected, themeColors)
  const sizeClasses = getChipSizeClasses(size)
  const iconSize = getIconSizeForChip(size)

  const handleRemove = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation()
    if (!disabled && onRemove) {
      onRemove()
    }
  }

  const content = (
    <div className="flex items-center gap-1.5">
      {leftIcon && (
        <div>
          {React.isValidElement(leftIcon)
            ? React.cloneElement(
                leftIcon as React.ReactElement<{
                  size?: number
                  color?: string
                }>,
                {
                  size: (leftIcon.props as { size?: number })?.size ?? iconSize,
                  color:
                    (leftIcon.props as { color?: string })?.color ??
                    chipStyles.textColor,
                }
              )
            : leftIcon}
        </div>
      )}
      <Text
        variant={chipStyles.textVariant}
        color={chipStyles.textColor}
        className="font-medium"
        style={{
          fontSize: getChipFontSize(size),
        }}
      >
        {label}
      </Text>
      {removable && (
        <button
          type="button"
          onClick={handleRemove}
          disabled={disabled}
          className="ml-0.5 p-0.5 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded disabled:opacity-60"
          aria-label={`Remove ${label}`}
        >
          <Icon
            name="times"
            family="solid"
            size={iconSize}
            color={chipStyles.textColor}
          />
        </button>
      )}
    </div>
  )

  const baseClasses = cn(
    'inline-flex items-center',
    'transition-all duration-200',
    sizeClasses,
    disabled && 'opacity-60 cursor-not-allowed',
    onPress &&
      'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
    className
  )

  const containerStyle: React.CSSProperties = {
    ...chipStyles.defaultStyle,
    ...style,
  }

  if (onPress) {
    const handlePress = () => {
      if (!disabled) {
        onPress()
      }
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
        e.preventDefault()
        onPress()
      }
    }

    return (
      <button
        type="button"
        className={baseClasses}
        style={containerStyle}
        onClick={handlePress}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-pressed={selected}
        aria-disabled={disabled}
      >
        {content}
      </button>
    )
  }

  return (
    <div className={baseClasses} style={containerStyle}>
      {content}
    </div>
  )
}

/**
 * Get all theme colors used by chips
 */
function useChipThemeColors() {
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
 * Get chip styles based on variant and selected state
 */
function getChipStyles(
  variant: NonNullable<ChipProps['variant']>,
  selected: boolean,
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
  defaultStyle: React.CSSProperties
  textColor: string
  textVariant: 'default' | 'primary' | 'white'
} {
  const isSelected = selected

  switch (variant) {
    case 'default':
      return {
        defaultStyle: {
          backgroundColor: isSelected ? colors.primary : colors.lightGray,
        },
        textColor: isSelected ? colors.white : colors.nearBlack,
        textVariant: isSelected ? 'white' : 'default',
      }
    case 'primary':
      return {
        defaultStyle: {
          backgroundColor: colors.primary,
        },
        textColor: colors.white,
        textVariant: 'white',
      }
    case 'secondary':
      return {
        defaultStyle: {
          backgroundColor: colors.primaryDark,
        },
        textColor: colors.white,
        textVariant: 'white',
      }
    case 'outline':
      return {
        defaultStyle: {
          backgroundColor: 'transparent',
          borderWidth: 1.5,
          borderStyle: 'solid',
          borderColor: isSelected ? colors.primary : colors.midGray,
        },
        textColor: isSelected ? colors.primary : colors.charcoal,
        textVariant: isSelected ? 'primary' : 'default',
      }
    case 'success':
      return {
        defaultStyle: {
          backgroundColor: colors.success,
        },
        textColor: colors.white,
        textVariant: 'white',
      }
    case 'warning':
      return {
        defaultStyle: {
          backgroundColor: colors.warning,
        },
        textColor: colors.white,
        textVariant: 'white',
      }
    case 'error':
      return {
        defaultStyle: {
          backgroundColor: colors.error,
        },
        textColor: colors.white,
        textVariant: 'white',
      }
  }
}

/**
 * Get chip size classes
 */
function getChipSizeClasses(size: NonNullable<ChipProps['size']>): string {
  switch (size) {
    case 'small':
      return 'px-2 py-1 rounded-xl'
    case 'medium':
      return 'px-3 py-1.5 rounded-2xl'
    case 'large':
      return 'px-4 py-2 rounded-3xl'
    default:
      return 'px-3 py-1.5 rounded-2xl'
  }
}

/**
 * Get font size for chip text
 */
function getChipFontSize(size: NonNullable<ChipProps['size']>): number {
  switch (size) {
    case 'small':
      return 12
    case 'medium':
      return 14
    case 'large':
      return 16
    default:
      return 14
  }
}

/**
 * Get icon size based on chip size
 */
function getIconSizeForChip(size: NonNullable<ChipProps['size']>): number {
  switch (size) {
    case 'small':
      return 14
    case 'medium':
      return 16
    case 'large':
      return 18
    default:
      return 16
  }
}
