import React, { useState } from 'react'
import { useThemeColor } from '@/hooks/use-theme-color'
import { BrandColors } from '@/constants/theme'
import { Text } from '@/components/Text'
import { Icon } from '@/components/Icon'
import { cn } from '@/utils/cn'

export interface InputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'size' | 'style'
> {
  /**
   * Input label
   */
  label?: string
  /**
   * Helper text shown below input
   */
  helperText?: string
  /**
   * Error message (shows error state)
   */
  error?: string
  /**
   * Input size
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * Whether input is disabled
   * @default false
   */
  disabled?: boolean
  /**
   * Whether input is required (shows asterisk)
   * @default false
   */
  required?: boolean
  /**
   * Left icon (React element or icon name)
   */
  leftIcon?: React.ReactElement | string
  /**
   * Right icon (React element or icon name)
   */
  rightIcon?: React.ReactElement | string
  /**
   * Show password visibility toggle (for password inputs)
   * @default false
   */
  showPasswordToggle?: boolean
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
}

/**
 * Input/TextField component with theme support
 *
 * Supports labels, helper text, error states, icons, and password visibility toggle.
 * Fully integrated with the theme system.
 *
 * @example
 * ```tsx
 * <Input
 *   label="Email"
 *   placeholder="Enter your email"
 *   leftIcon="envelope"
 * />
 *
 * <Input
 *   label="Password"
 *   type="password"
 *   showPasswordToggle
 *   error="Password is required"
 * />
 *
 * <Input
 *   label="Search"
 *   leftIcon="search"
 *   rightIcon="filter"
 * />
 * ```
 */
export function Input({
  label,
  helperText,
  error,
  size = 'medium',
  disabled = false,
  required = false,
  leftIcon,
  rightIcon,
  showPasswordToggle = false,
  type,
  className,
  containerStyle,
  inputStyle,
  onFocus,
  onBlur,
  ...props
}: Readonly<InputProps>) {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  const themeColors = useInputThemeColors()
  const hasError = !!error
  const isPassword = type === 'password'
  const actualType = showPasswordToggle && isPasswordVisible ? 'text' : type

  const iconSize = getIconSizeForInput(size)
  const sizeClasses = getInputSizeClasses(size)

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(true)
    onFocus?.(e)
  }

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    setIsFocused(false)
    onBlur?.(e)
  }

  const togglePasswordVisibility = () => {
    setIsPasswordVisible(!isPasswordVisible)
  }

  // Render left icon
  const renderLeftIcon = () => {
    if (!leftIcon) return null

    if (typeof leftIcon === 'string') {
      return (
        <div className="mr-2">
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
      <div className="mr-2">
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

  // Render right icon
  const renderRightIcon = () => {
    if (showPasswordToggle && isPassword) {
      return (
        <button
          type="button"
          onClick={togglePasswordVisibility}
          className="ml-2 p-1 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded"
          aria-label={isPasswordVisible ? 'Hide password' : 'Show password'}
        >
          <Icon
            name={isPasswordVisible ? 'eye-slash' : 'eye'}
            family="solid"
            size={iconSize}
            variant="muted"
          />
        </button>
      )
    }

    if (!rightIcon) return null

    if (typeof rightIcon === 'string') {
      return (
        <div className="ml-2">
          <Icon
            name={rightIcon}
            family="solid"
            size={iconSize}
            variant={disabled ? 'muted' : 'default'}
          />
        </div>
      )
    }

    return (
      <div className="ml-2">
        {React.isValidElement(rightIcon)
          ? React.cloneElement(
              rightIcon as React.ReactElement<{
                size?: number
                color?: string
              }>,
              {
                size: (rightIcon.props as { size?: number })?.size ?? iconSize,
              }
            )
          : rightIcon}
      </div>
    )
  }

  let borderColorClass: string
  if (hasError) {
    borderColorClass = 'border-error'
  } else if (isFocused) {
    borderColorClass = 'border-primary'
  } else {
    borderColorClass = 'border-mid-gray'
  }

  const inputContainerClasses = cn(
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
    sizeClasses.input
  )

  return (
    <div className={className} style={containerStyle}>
      {label && (
        <div className="flex items-center mb-1.5">
          <Text as="label" variant="default" className="text-sm font-medium">
            {label}
          </Text>
          {required && (
            <Text variant="error" className="text-sm ml-1">
              *
            </Text>
          )}
        </div>
      )}
      <div className={inputContainerClasses}>
        {renderLeftIcon()}
        <input
          {...props}
          type={actualType}
          disabled={disabled}
          className={inputClasses}
          style={{
            color: themeColors.text,
            ...inputStyle,
          }}
          onFocus={handleFocus}
          onBlur={handleBlur}
        />
        {renderRightIcon()}
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
 * Get all theme colors used by inputs
 */
function useInputThemeColors() {
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
 * Get input size classes
 */
function getInputSizeClasses(size: NonNullable<InputProps['size']>): {
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
 * Get icon size based on input size
 */
function getIconSizeForInput(size: NonNullable<InputProps['size']>): number {
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
