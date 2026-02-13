import { Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { BrandColors } from '@/constants/theme'
import { useThemeColor } from '@/hooks/use-theme-color'
import React, { useState } from 'react'
import { cn } from '@/utils/cn'

export interface TextAreaProps extends Omit<
  React.TextareaHTMLAttributes<HTMLTextAreaElement>,
  'size' | 'style'
> {
  /**
   * TextArea label
   */
  label?: string
  /**
   * Helper text shown below textarea
   */
  helperText?: string
  /**
   * Error message (shows error state)
   */
  error?: string
  /**
   * TextArea size
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * Whether textarea is disabled
   * @default false
   */
  disabled?: boolean
  /**
   * Whether textarea is required (shows asterisk)
   * @default false
   */
  required?: boolean
  /**
   * Minimum number of lines
   * @default 3
   */
  minLines?: number
  /**
   * Maximum number of lines (0 = unlimited)
   * @default 0
   */
  maxLines?: number
  /**
   * Left icon (React element or icon name)
   */
  leftIcon?: React.ReactElement | string
  /**
   * Character count display
   * @default false
   */
  showCharacterCount?: boolean
  /**
   * Maximum character count (for character counter)
   */
  maxLength?: number
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
   * Callback when text changes (for compatibility with React Native onChangeText)
   */
  onChangeText?: (text: string) => void
}

/**
 * TextArea component - Multi-line text input with theme support
 *
 * Supports labels, helper text, error states, icons, and character counting.
 * Fully integrated with the theme system.
 *
 * @example
 * ```tsx
 * <TextArea
 *   label="Description"
 *   placeholder="Enter description"
 *   minLines={4}
 * />
 *
 * <TextArea
 *   label="Comments"
 *   error="Comments are required"
 *   showCharacterCount
 *   maxLength={500}
 * />
 * ```
 */
export function TextArea({
  label,
  helperText,
  error,
  size = 'medium',
  disabled = false,
  required = false,
  minLines = 3,
  maxLines = 0,
  leftIcon,
  showCharacterCount = false,
  maxLength,
  value,
  onChange,
  onChangeText,
  className,
  containerStyle,
  inputStyle,
  ...props
}: Readonly<TextAreaProps>) {
  const [isFocused, setIsFocused] = useState(false)

  const themeColors = useTextAreaThemeColors()
  const hasError = !!error
  const textAreaStyles = getTextAreaStyles(
    size,
    hasError,
    isFocused,
    disabled,
    themeColors
  )
  const iconSize = getIconSizeForTextArea(size)
  const { minHeight, maxHeight } = calculateTextAreaHeight(
    size,
    minLines,
    maxLines
  )
  const characterCount = typeof value === 'string' ? value.length : 0
  const showCounter = showCharacterCount && maxLength !== undefined

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    if (onChangeText) {
      onChangeText(e.target.value)
    }
    onChange?.(e)
  }

  const handleFocus = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(true)
    props.onFocus?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    setIsFocused(false)
    props.onBlur?.(e)
  }

  return (
    <div className={cn('w-full', className)} style={containerStyle}>
      {label && renderLabel(label, required)}
      <div
        className={cn(
          'flex flex-row items-start',
          'border-2 rounded-lg',
          'transition-colors duration-200',
          textAreaStyles.container,
          hasError && textAreaStyles.error,
          disabled && 'opacity-60'
        )}
        style={{
          minHeight,
          maxHeight,
          ...(isFocused && textAreaStyles.focused),
        }}
      >
        {renderLeftIcon(leftIcon, iconSize, disabled)}
        <textarea
          {...props}
          value={value}
          onChange={handleChange}
          disabled={disabled}
          maxLength={maxLength}
          className={cn(
            'flex-1 resize-none',
            'outline-none bg-transparent',
            textAreaStyles.input,
            disabled && 'cursor-not-allowed'
          )}
          style={{
            paddingTop: getInputPaddingTop(size),
            color: themeColors.text,
            ...inputStyle,
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
      </div>
      {renderFooter(helperText, error, showCounter, characterCount, maxLength)}
    </div>
  )
}

/**
 * Render label with optional required indicator
 */
function renderLabel(label: string, required: boolean) {
  return (
    <div className="flex flex-row items-center mb-1.5">
      <Text variant="default" className="text-sm font-medium">
        {label}
      </Text>
      {required && (
        <Text variant="error" className="text-sm ml-1">
          *
        </Text>
      )}
    </div>
  )
}

/**
 * Render left icon for textarea
 */
function renderLeftIcon(
  leftIcon: React.ReactElement | string | undefined,
  iconSize: number,
  disabled: boolean
) {
  if (!leftIcon) return null

  if (typeof leftIcon === 'string') {
    return (
      <div className="mr-2 mt-1 self-start">
        <Icon
          name={leftIcon}
          family="solid"
          size={iconSize}
          variant={disabled ? 'muted' : 'default'}
        />
      </div>
    )
  }

  return (
    <div className="mr-2 mt-1 self-start">
      {React.isValidElement(leftIcon)
        ? React.cloneElement(
            leftIcon as React.ReactElement<{ size?: number; color?: string }>,
            {
              size: (leftIcon.props as { size?: number })?.size ?? iconSize,
            }
          )
        : leftIcon}
    </div>
  )
}

/**
 * Get line height based on size
 */
function getLineHeight(size: NonNullable<TextAreaProps['size']>): number {
  if (size === 'small') return 20
  if (size === 'large') return 24
  return 22
}

/**
 * Get padding based on size
 */
function getPadding(size: NonNullable<TextAreaProps['size']>): number {
  if (size === 'small') return 16
  if (size === 'large') return 28
  return 24
}

/**
 * Calculate textarea height based on lines
 */
function calculateTextAreaHeight(
  size: NonNullable<TextAreaProps['size']>,
  minLines: number,
  maxLines: number
): { minHeight: number; maxHeight: number | undefined } {
  const lineHeight = getLineHeight(size)
  const padding = getPadding(size)
  const minHeight = minLines * lineHeight + padding
  const maxHeight = maxLines > 0 ? maxLines * lineHeight + padding : undefined

  return { minHeight, maxHeight }
}

/**
 * Get padding top for textarea input
 */
function getInputPaddingTop(size: NonNullable<TextAreaProps['size']>): number {
  switch (size) {
    case 'small':
      return 8
    case 'large':
      return 14
    default:
      return 12
  }
}

/**
 * Render footer with helper text, error, and character counter
 */
function renderFooter(
  helperText: string | undefined,
  error: string | undefined,
  showCounter: boolean,
  characterCount: number,
  maxLength: number | undefined
) {
  const hasHelperOrError = !!(helperText || error)

  if (!hasHelperOrError && !showCounter) return null

  return (
    <div className="flex flex-row justify-between items-center mt-1">
      <div className="flex-1">
        {error ? (
          <Text variant="error" className="text-xs">
            {error}
          </Text>
        ) : (
          helperText && (
            <Text variant="muted" className="text-xs">
              {helperText}
            </Text>
          )
        )}
      </div>
      {showCounter && maxLength !== undefined && (
        <Text
          variant={characterCount > maxLength ? 'error' : 'muted'}
          className="text-xs ml-2"
        >
          {characterCount}/{maxLength}
        </Text>
      )}
    </div>
  )
}

/**
 * Get all theme colors used by textareas
 */
function useTextAreaThemeColors() {
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
 * Get textarea styles based on size, state, and theme
 */
function getTextAreaStyles(
  size: NonNullable<TextAreaProps['size']>,
  hasError: boolean,
  isFocused: boolean,
  _disabled: boolean,
  colors: {
    text: string
    primary: string
    midGray: string
    error: string
    lightGray: string
    white: string
  }
): {
  container: string
  focused: React.CSSProperties
  error: string
  input: string
} {
  const sizeStyles = getTextAreaSizeStyles(size)

  return {
    container: cn(
      'bg-white',
      sizeStyles.container,
      hasError ? 'border-error' : 'border-mid-gray'
    ),
    focused: {
      borderColor: isFocused && !hasError ? colors.primary : undefined,
    },
    error: cn('border-error'),
    input: cn(sizeStyles.input),
  }
}

/**
 * Get textarea size styles
 */
function getTextAreaSizeStyles(size: NonNullable<TextAreaProps['size']>): {
  container: string
  input: string
} {
  switch (size) {
    case 'small':
      return {
        container: 'px-2.5 pb-2',
        input: 'text-sm leading-5',
      }
    case 'medium':
      return {
        container: 'px-3 pb-3',
        input: 'text-base leading-[22px]',
      }
    case 'large':
      return {
        container: 'px-4 pb-3.5',
        input: 'text-lg leading-6',
      }
  }
}

/**
 * Get icon size based on textarea size
 */
function getIconSizeForTextArea(
  size: NonNullable<TextAreaProps['size']>
): number {
  switch (size) {
    case 'small':
      return 18
    case 'medium':
      return 20
    case 'large':
      return 24
  }
}
