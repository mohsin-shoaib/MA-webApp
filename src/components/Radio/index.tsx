import React from 'react'
import { useThemeColor } from '@/hooks/use-theme-color'
import { BrandColors } from '@/constants/theme'
import { Text } from '@/components/Text'
import { cn } from '@/utils/cn'

export interface RadioProps {
  /**
   * Whether radio is selected
   */
  selected: boolean
  /**
   * Callback when radio is pressed
   */
  onPress: () => void
  /**
   * Radio label
   */
  label?: string
  /**
   * Radio size
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * Whether radio is disabled
   * @default false
   */
  disabled?: boolean
  /**
   * Radio variant
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
  /**
   * Value for the radio (useful for RadioGroup)
   */
  value?: string
  /**
   * Name attribute for radio group
   */
  name?: string
}

/**
 * Radio component with theme support
 *
 * Supports selected and unselected states with theme integration.
 * Perfect for single-choice forms and option selection.
 *
 * @example
 * ```tsx
 * <Radio
 *   selected={selectedValue === 'option1'}
 *   onPress={() => setSelectedValue('option1')}
 *   label="Option 1"
 * />
 *
 * <Radio
 *   selected={isSelected}
 *   onPress={handleSelect}
 *   label="Choose this option"
 * />
 * ```
 */
export function Radio({
  selected,
  onPress,
  label,
  size = 'medium',
  disabled = false,
  variant = 'primary',
  className,
  style,
  labelStyle,
  value,
  name,
}: Readonly<RadioProps>) {
  const themeColors = useRadioThemeColors()
  const radioStyles = getRadioStyles(variant, themeColors)
  const dotSize = getDotSizeForRadio(size)
  const containerSize = getRadioContainerSize(size)
  const labelFontSize = getLabelFontSize(size)

  const handleChange = () => {
    if (!disabled) {
      onPress()
    }
  }

  // Use native radio for accessibility, but hide it visually
  const radioId = React.useId()

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
        {/* Hidden native radio for accessibility */}
        <input
          type="radio"
          id={radioId}
          name={name}
          value={value}
          checked={selected}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          aria-checked={selected}
        />
        {/* Custom styled radio */}
        <div
          className={cn(
            'flex items-center justify-center',
            'border-2 rounded-full',
            'transition-all duration-200',
            radioStyles.container,
            disabled && radioStyles.disabled
          )}
          style={{
            width: containerSize,
            height: containerSize,
            ...(selected && radioStyles.selectedStyle),
          }}
        >
          {selected && (
            <div
              style={{
                width: dotSize,
                height: dotSize,
                borderRadius: dotSize / 2,
                backgroundColor: radioStyles.dotColor,
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
 * Get all theme colors used by radio buttons
 */
function useRadioThemeColors() {
  const themePrimary = useThemeColor({}, 'primary')
  const themePrimaryDark = useThemeColor({}, 'primaryDark')
  const themeMidGray = useThemeColor({}, 'midGray')
  const themeLightGray = BrandColors.neutral.lightGray
  const themeWhite = BrandColors.neutral.white

  return {
    primary: themePrimary,
    primaryDark: themePrimaryDark,
    midGray: themeMidGray,
    lightGray: themeLightGray,
    white: themeWhite,
  }
}

/**
 * Get radio container size
 */
function getRadioContainerSize(size: NonNullable<RadioProps['size']>): number {
  switch (size) {
    case 'small':
      return 18
    case 'medium':
      return 20
    case 'large':
      return 24
    default:
      return 20
  }
}

/**
 * Get radio styles based on size and variant
 */
function getRadioStyles(
  variant: NonNullable<RadioProps['variant']>,
  colors: {
    primary: string
    primaryDark: string
    midGray: string
    lightGray: string
    white: string
  }
): {
  container: string
  selectedStyle: React.CSSProperties
  disabled: string
  dotColor: string
} {
  const borderColor =
    variant === 'primary' ? colors.primary : colors.primaryDark
  const dotColor = variant === 'primary' ? colors.primary : colors.primaryDark

  return {
    container: cn('border-mid-gray bg-transparent'),
    selectedStyle: {
      borderColor: borderColor,
    },
    disabled: cn('border-light-gray'),
    dotColor,
  }
}

/**
 * Get dot size based on radio size
 */
function getDotSizeForRadio(size: NonNullable<RadioProps['size']>): number {
  switch (size) {
    case 'small':
      return 8
    case 'medium':
      return 10
    case 'large':
      return 12
    default:
      return 10
  }
}

/**
 * Get label font size based on radio size
 */
function getLabelFontSize(size: NonNullable<RadioProps['size']>): number {
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
