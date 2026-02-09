import React from 'react'
import { useThemeColor } from '@/hooks/use-theme-color'
import { BrandColors } from '@/constants/theme'
import { Text } from '@/components/Text'
import { Icon } from '@/components/Icon'
import { cn } from '@/utils/cn'

export interface CheckboxProps {
  /**
   * Whether checkbox is checked
   */
  checked: boolean
  /**
   * Callback when checkbox state changes
   */
  onValueChange: (checked: boolean) => void
  /**
   * Checkbox label
   */
  label?: string
  /**
   * Checkbox size
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * Whether checkbox is disabled
   * @default false
   */
  disabled?: boolean
  /**
   * Whether checkbox is in indeterminate state
   * @default false
   */
  indeterminate?: boolean
  /**
   * Checkbox variant
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary'
  /**
   * Additional className for styling
   */
  className?: string
  /**
   * Additional style prop
   */
  style?: React.CSSProperties
  /**
   * Label style
   */
  labelStyle?: React.CSSProperties
}

/**
 * Checkbox component with theme support
 *
 * Supports checked, unchecked, and indeterminate states with theme integration.
 * Perfect for forms, lists, and selection interfaces.
 *
 * @example
 * ```tsx
 * <Checkbox
 *   checked={isChecked}
 *   onValueChange={setIsChecked}
 *   label="Accept terms"
 * />
 *
 * <Checkbox
 *   checked={isSelected}
 *   onValueChange={setIsSelected}
 *   indeterminate={isIndeterminate}
 *   label="Select all"
 * />
 * ```
 */
export function Checkbox({
  checked,
  onValueChange,
  label,
  size = 'medium',
  disabled = false,
  indeterminate = false,
  variant = 'primary',
  className,
  style,
  labelStyle,
}: Readonly<CheckboxProps>) {
  const themeColors = useCheckboxThemeColors()
  const checkboxStyles = getCheckboxStyles(size, variant, themeColors)
  const iconSize = getIconSizeForCheckbox(size)
  const labelFontSize = getLabelFontSize(size)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onValueChange(e.target.checked)
    }
  }

  const isChecked = checked && !indeterminate
  const showIndeterminate = indeterminate

  // Use native checkbox for accessibility, but hide it visually
  const checkboxId = React.useId()

  return (
    <label
      className={cn(
        'flex items-center cursor-pointer',
        disabled && 'opacity-60 cursor-not-allowed',
        className
      )}
      style={style}
    >
      <div className="relative">
        {/* Hidden native checkbox for accessibility */}
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          onChange={handleChange}
          disabled={disabled}
          ref={input => {
            if (input) {
              input.indeterminate = indeterminate
            }
          }}
          className="sr-only"
          aria-checked={indeterminate ? 'mixed' : checked}
        />
        {/* Custom styled checkbox */}
        <div
          className={cn(
            'flex items-center justify-center',
            'border-2 rounded',
            'transition-all duration-200',
            checkboxStyles.container,
            disabled && checkboxStyles.disabled
          )}
          style={{
            ...checkboxStyles.size,
            ...(isChecked && checkboxStyles.checkedStyle),
            ...(showIndeterminate && checkboxStyles.indeterminateStyle),
          }}
        >
          {isChecked && (
            <Icon name="check" family="solid" size={iconSize} variant="white" />
          )}
          {showIndeterminate && (
            <div
              style={{
                width: iconSize * 0.6,
                height: 2,
                backgroundColor: themeColors.white,
                borderRadius: 1,
              }}
            />
          )}
        </div>
      </div>
      {label && (
        <Text
          variant={disabled ? 'muted' : 'default'}
          className="ml-2"
          style={{
            fontSize: labelFontSize,
            ...labelStyle,
          }}
        >
          {label}
        </Text>
      )}
    </label>
  )
}

/**
 * Get all theme colors used by checkboxes
 */
function useCheckboxThemeColors() {
  const themePrimary = useThemeColor({}, 'primary')
  const themePrimaryDark = useThemeColor({}, 'primaryDark')
  const themeMidGray = useThemeColor({}, 'midGray')
  const themeLightGray = BrandColors.neutral.lightGray
  const themeWhite = BrandColors.neutral.white
  const themeNearBlack = BrandColors.neutral.nearBlack

  return {
    primary: themePrimary,
    primaryDark: themePrimaryDark,
    midGray: themeMidGray,
    lightGray: themeLightGray,
    white: themeWhite,
    nearBlack: themeNearBlack,
  }
}

/**
 * Get checkbox styles based on size and variant
 */
function getCheckboxStyles(
  size: NonNullable<CheckboxProps['size']>,
  variant: NonNullable<CheckboxProps['variant']>,
  colors: {
    primary: string
    primaryDark: string
    midGray: string
    lightGray: string
    white: string
    nearBlack: string
  }
): {
  container: string
  checked: string
  indeterminate: string
  disabled: string
  size: React.CSSProperties
  checkedStyle: React.CSSProperties
  indeterminateStyle: React.CSSProperties
} {
  const sizeStyles = getCheckboxSizeStyles(size)
  const backgroundColor =
    variant === 'primary' ? colors.primary : colors.primaryDark

  return {
    container: cn('border-mid-gray bg-transparent'),
    checked: '',
    indeterminate: '',
    disabled: cn('border-light-gray bg-light-gray'),
    size: {
      width: sizeStyles.width,
      height: sizeStyles.height,
    },
    checkedStyle: {
      backgroundColor,
      borderColor: backgroundColor,
    },
    indeterminateStyle: {
      backgroundColor,
      borderColor: backgroundColor,
    },
  }
}

/**
 * Get checkbox size styles
 */
function getCheckboxSizeStyles(size: NonNullable<CheckboxProps['size']>): {
  width: number
  height: number
} {
  switch (size) {
    case 'small':
      return {
        width: 18,
        height: 18,
      }
    case 'medium':
      return {
        width: 20,
        height: 20,
      }
    case 'large':
      return {
        width: 24,
        height: 24,
      }
  }
}

/**
 * Get icon size based on checkbox size
 */
function getIconSizeForCheckbox(
  size: NonNullable<CheckboxProps['size']>
): number {
  switch (size) {
    case 'small':
      return 14
    case 'medium':
      return 16
    case 'large':
      return 20
  }
}

/**
 * Get label font size based on checkbox size
 */
function getLabelFontSize(size: NonNullable<CheckboxProps['size']>): number {
  switch (size) {
    case 'small':
      return 14
    case 'medium':
      return 16
    case 'large':
      return 18
  }
}
