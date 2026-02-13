import React, { useState } from 'react'
import { useThemeColor } from '@/hooks/use-theme-color'
import { BrandColors } from '@/constants/theme'
import { Text } from '@/components/Text'
import { Icon } from '@/components/Icon'
import { cn } from '@/utils/cn'

export interface DatePickerProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size' | 'type' | 'style' | 'value' | 'onChange'
> {
  /**
   * DatePicker label
   */
  label?: string
  /**
   * Helper text shown below date picker
   */
  helperText?: string
  /**
   * Error message (shows error state)
   */
  error?: string
  /**
   * DatePicker size
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * Whether date picker is disabled
   * @default false
   */
  disabled?: boolean
  /**
   * Whether date picker is required (shows asterisk)
   * @default false
   */
  required?: boolean
  /**
   * Minimum selectable date (YYYY-MM-DD format or Date object)
   */
  minDate?: string | Date
  /**
   * Maximum selectable date (YYYY-MM-DD format or Date object)
   */
  maxDate?: string | Date
  /**
   * Show calendar icon
   * @default true
   */
  showIcon?: boolean
  /**
   * Container className
   */
  className?: string
  /**
   * Container style
   */
  containerStyle?: React.CSSProperties
  /**
   * Input style
   */
  inputStyle?: React.CSSProperties
  /**
   * Value in YYYY-MM-DD format or Date object
   */
  value?: string | Date
  /**
   * Callback when date changes
   */
  onChange?: (date: string | null) => void
}

/**
 * DatePicker component with theme support
 *
 * Supports labels, helper text, error states, min/max dates, and theme integration.
 * Uses native HTML5 date input with custom styling.
 *
 * @example
 * ```tsx
 * <DatePicker
 *   label="Birth Date"
 *   placeholder="Select date"
 *   value={selectedDate}
 *   onChange={(date) => setSelectedDate(date)}
 * />
 *
 * <DatePicker
 *   label="Start Date"
 *   minDate="2024-01-01"
 *   maxDate="2024-12-31"
 *   error="Date is required"
 *   required
 * />
 *
 * <DatePicker
 *   label="Event Date"
 *   size="large"
 *   showIcon={false}
 * />
 * ```
 */
export function DatePicker({
  label,
  helperText,
  error,
  size = 'medium',
  disabled = false,
  required = false,
  minDate,
  maxDate,
  showIcon = true,
  className,
  containerStyle,
  inputStyle,
  value,
  onChange,
  onFocus,
  onBlur,
  ...props
}: Readonly<DatePickerProps>) {
  const [isFocused, setIsFocused] = useState(false)

  const themeColors = useDatePickerThemeColors()
  const hasError = !!error
  const iconSize = getIconSizeForDatePicker(size)
  const sizeClasses = getDatePickerSizeClasses(size)

  // Convert value to string format (YYYY-MM-DD)
  const stringValue = React.useMemo(() => {
    if (!value) return ''
    if (typeof value === 'string') return value
    if (value instanceof Date) {
      // Format date as YYYY-MM-DD
      const year = value.getFullYear()
      const month = String(value.getMonth() + 1).padStart(2, '0')
      const day = String(value.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    return ''
  }, [value])

  // Convert minDate to string format
  const minDateString = React.useMemo(() => {
    if (!minDate) return undefined
    if (typeof minDate === 'string') return minDate
    if (minDate instanceof Date) {
      const year = minDate.getFullYear()
      const month = String(minDate.getMonth() + 1).padStart(2, '0')
      const day = String(minDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    return undefined
  }, [minDate])

  // Convert maxDate to string format
  const maxDateString = React.useMemo(() => {
    if (!maxDate) return undefined
    if (typeof maxDate === 'string') return maxDate
    if (maxDate instanceof Date) {
      const year = maxDate.getFullYear()
      const month = String(maxDate.getMonth() + 1).padStart(2, '0')
      const day = String(maxDate.getDate()).padStart(2, '0')
      return `${year}-${month}-${day}`
    }
    return undefined
  }, [maxDate])

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    onFocus?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false)
    onBlur?.(e)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value || null
    onChange?.(newValue)
  }

  let borderColorClass: string
  if (hasError) {
    borderColorClass = 'border-error'
  } else if (isFocused) {
    borderColorClass = 'border-primary'
  } else {
    borderColorClass = 'border-mid-gray'
  }

  const datePickerContainerClasses = cn(
    'flex items-center',
    'bg-white border-2 rounded-lg',
    'transition-colors duration-200',
    sizeClasses.container,
    borderColorClass,
    disabled && 'opacity-60 cursor-not-allowed'
  )

  const inputClasses = cn(
    'flex-1 bg-transparent outline-none',
    'text-near-black placeholder:text-mid-gray',
    sizeClasses.input,
    // Hide native date picker icon on some browsers
    '[&::-webkit-calendar-picker-indicator]:cursor-pointer',
    '[&::-webkit-calendar-picker-indicator]:opacity-0',
    '[&::-webkit-calendar-picker-indicator]:absolute',
    '[&::-webkit-calendar-picker-indicator]:right-0',
    '[&::-webkit-calendar-picker-indicator]:w-full',
    '[&::-webkit-calendar-picker-indicator]:h-full'
  )

  return (
    <div className={className} style={containerStyle}>
      {label && (
        <div className="flex items-center mb-1.5">
          <Text as="label" variant="secondary" className="text-sm font-medium">
            {label}
          </Text>
          {required && (
            <Text variant="error" className="text-sm ml-1">
              *
            </Text>
          )}
        </div>
      )}
      <div className="relative">
        <div className={datePickerContainerClasses}>
          {showIcon && (
            <div className="mr-2 shrink-0">
              <Icon
                name="calendar"
                family="solid"
                size={iconSize}
                variant={disabled ? 'muted' : 'default'}
              />
            </div>
          )}
          <input
            {...props}
            type="date"
            value={stringValue}
            min={minDateString}
            max={maxDateString}
            disabled={disabled}
            className={inputClasses}
            style={{
              color: themeColors.text,
              ...inputStyle,
            }}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onChange={handleChange}
          />
        </div>
      </div>
      {(helperText || error) && (
        <div className="mt-1">
          {error ? (
            <Text variant="error" className="text-xs">
              {error}
            </Text>
          ) : (
            <Text variant="muted" className="text-xs">
              {helperText}
            </Text>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Get all theme colors used by date pickers
 */
function useDatePickerThemeColors() {
  const themeText = useThemeColor({}, 'text')
  const themePrimary = useThemeColor({}, 'primary')
  const themeMidGray = useThemeColor({}, 'midGray')
  const themeError = useThemeColor({}, 'error')
  const themeLightGray = BrandColors.neutral.lightGray
  const themeWhite = BrandColors.neutral.white

  return {
    text: themeText,
    primary: themePrimary,
    midGray: themeMidGray,
    error: themeError,
    lightGray: themeLightGray,
    white: themeWhite,
  }
}

/**
 * Get date picker size classes
 */
function getDatePickerSizeClasses(size: NonNullable<DatePickerProps['size']>): {
  container: string
  input: string
} {
  switch (size) {
    case 'small':
      return {
        container: 'px-2.5 py-2 min-h-9',
        input: 'text-sm',
      }
    case 'medium':
      return {
        container: 'px-3 py-3 min-h-11',
        input: 'text-base',
      }
    case 'large':
      return {
        container: 'px-4 py-3.5 min-h-[52px]',
        input: 'text-lg',
      }
  }
}

/**
 * Get icon size based on date picker size
 */
function getIconSizeForDatePicker(
  size: NonNullable<DatePickerProps['size']>
): number {
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
