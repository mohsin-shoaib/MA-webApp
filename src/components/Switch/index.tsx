import React from 'react'
import { useThemeColor } from '@/hooks/use-theme-color'
import { BrandColors } from '@/constants/theme'
import { Text } from '@/components/Text'
import { cn } from '@/utils/cn'

export interface SwitchProps {
  /**
   * Whether switch is on/active
   */
  value: boolean
  /**
   * Callback when switch value changes
   */
  onValueChange: (value: boolean) => void
  /**
   * Switch label
   */
  label?: string
  /**
   * Switch size
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * Whether switch is disabled
   * @default false
   */
  disabled?: boolean
  /**
   * Switch variant
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
 * Switch/Toggle component with theme support
 *
 * Supports on/off states with smooth animations and theme integration.
 * Perfect for settings, preferences, and feature toggles.
 *
 * @example
 * ```tsx
 * <Switch
 *   value={isEnabled}
 *   onValueChange={setIsEnabled}
 *   label="Enable notifications"
 * />
 *
 * <Switch
 *   value={isActive}
 *   onValueChange={setIsActive}
 *   label="Dark mode"
 * />
 * ```
 */
export function Switch({
  value,
  onValueChange,
  label,
  size = 'medium',
  disabled = false,
  variant = 'primary',
  className,
  style,
  labelStyle,
}: Readonly<SwitchProps>) {
  const themeColors = useSwitchThemeColors()
  const switchStyles = getSwitchStyles(variant, themeColors)
  const thumbSize = getThumbSizeForSwitch(size)
  const trackSize = getTrackSizeForSwitch(size)
  const labelFontSize = getLabelFontSize(size)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!disabled) {
      onValueChange(e.target.checked)
    }
  }

  // Calculate thumb position offset (0 when off, moved right when on)
  // Thumb starts at left: 2px, needs to move to: trackWidth - thumbSize - 2px
  const thumbOffset = value ? trackSize.width - thumbSize - 4 : 0

  // Use native checkbox for accessibility, but hide it visually
  const switchId = React.useId()

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
          id={switchId}
          checked={value}
          onChange={handleChange}
          disabled={disabled}
          className="sr-only"
          role="switch"
          aria-checked={value}
        />
        {/* Custom styled switch */}
        <div
          className={cn(
            'relative rounded-full',
            'transition-colors duration-200',
            switchStyles.track,
            disabled && switchStyles.trackDisabled
          )}
          style={{
            width: trackSize.width,
            height: trackSize.height,
            ...(value && switchStyles.trackActive),
          }}
        >
          <div
            className={cn(
              'absolute rounded-full bg-white',
              'transition-transform duration-200 ease-in-out',
              'shadow-sm'
            )}
            style={{
              width: thumbSize,
              height: thumbSize,
              top: 2,
              left: 2,
              transform: `translateX(${thumbOffset}px)`,
            }}
          />
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
 * Get all theme colors used by switches
 */
function useSwitchThemeColors() {
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
 * Get switch styles based on variant
 */
function getSwitchStyles(
  variant: NonNullable<SwitchProps['variant']>,
  colors: {
    primary: string
    primaryDark: string
    midGray: string
    lightGray: string
    white: string
  }
): {
  track: string
  trackActive: React.CSSProperties
  trackDisabled: string
} {
  const backgroundColor =
    variant === 'primary' ? colors.primary : colors.primaryDark

  return {
    track: cn('bg-mid-gray'),
    trackActive: {
      backgroundColor,
    },
    trackDisabled: cn('bg-light-gray'),
  }
}

/**
 * Get track size based on switch size
 */
function getTrackSizeForSwitch(size: NonNullable<SwitchProps['size']>): {
  width: number
  height: number
} {
  switch (size) {
    case 'small':
      return {
        width: 36,
        height: 20,
      }
    case 'medium':
      return {
        width: 44,
        height: 24,
      }
    case 'large':
      return {
        width: 52,
        height: 28,
      }
  }
}

/**
 * Get thumb size based on switch size
 */
function getThumbSizeForSwitch(size: NonNullable<SwitchProps['size']>): number {
  switch (size) {
    case 'small':
      return 16
    case 'medium':
      return 20
    case 'large':
      return 24
  }
}

/**
 * Get label font size based on switch size
 */
function getLabelFontSize(size: NonNullable<SwitchProps['size']>): number {
  switch (size) {
    case 'small':
      return 14
    case 'medium':
      return 16
    case 'large':
      return 18
  }
}
