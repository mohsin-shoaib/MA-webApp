import React, { useState, useRef, useEffect, useCallback } from 'react'
import { useThemeColor } from '@/hooks/use-theme-color'
import { BrandColors } from '@/constants/theme'
import { Text } from '@/components/Text'
import { Icon } from '@/components/Icon'
import { cn } from '@/utils/cn'

export type DropdownSize = 'small' | 'medium' | 'large'
export type DropdownValue = string | string[] | undefined

export interface DropdownOption {
  value: string
  label: string
  disabled?: boolean
  icon?: string
}

export interface DropdownGroup {
  label: string
  options: DropdownOption[]
  disabled?: boolean
}

export interface DropdownProps {
  /**
   * Dropdown label
   */
  label?: string
  /**
   * Helper text shown below dropdown
   */
  helperText?: string
  /**
   * Error message (shows error state)
   */
  error?: string
  /**
   * Dropdown size
   * @default 'medium'
   */
  size?: DropdownSize
  /**
   * Whether dropdown is disabled
   * @default false
   */
  disabled?: boolean
  /**
   * Whether dropdown is required (shows asterisk)
   * @default false
   */
  required?: boolean
  /**
   * Placeholder text when no option is selected
   */
  placeholder?: string
  /**
   * Selected value(s) - string for single select, string[] for multiple
   */
  value?: DropdownValue
  /**
   * Callback when selection changes
   */
  onValueChange?: (value: DropdownValue) => void
  /**
   * Options array (for simple dropdown without groups)
   */
  options?: DropdownOption[]
  /**
   * Grouped options (for dropdown with groups)
   */
  groups?: DropdownGroup[]
  /**
   * Whether multiple selection is allowed
   * @default false
   */
  multiple?: boolean
  /**
   * Left icon (icon name)
   */
  leftIcon?: string
  /**
   * Container className
   */
  className?: string
  /**
   * Container style
   */
  containerStyle?: React.CSSProperties
  /**
   * Full width dropdown
   * @default true
   */
  fullWidth?: boolean
}

/**
 * Dropdown/Select component with theme support
 *
 * Supports single and multiple selection, grouped options, labels, helper text, and error states.
 * Fully integrated with the theme system.
 *
 * @example
 * ```tsx
 * <Dropdown
 *   label="Select a car"
 *   placeholder="Choose a car"
 *   options={[
 *     { value: 'volvo', label: 'Volvo' },
 *     { value: 'saab', label: 'Saab' },
 *   ]}
 *   value={selectedValue}
 *   onValueChange={setSelectedValue}
 * />
 *
 * <Dropdown
 *   label="Select cars"
 *   groups={[
 *     {
 *       label: 'Swedish Cars',
 *       options: [
 *         { value: 'volvo', label: 'Volvo' },
 *         { value: 'saab', label: 'Saab' },
 *       ],
 *     },
 *     {
 *       label: 'German Cars',
 *       options: [
 *         { value: 'mercedes', label: 'Mercedes' },
 *         { value: 'audi', label: 'Audi' },
 *       ],
 *     },
 *   ]}
 *   multiple
 *   value={selectedValues}
 *   onValueChange={setSelectedValues}
 * />
 * ```
 */
export function Dropdown({
  label,
  helperText,
  error,
  size = 'medium',
  disabled = false,
  required = false,
  placeholder = 'Select an option',
  value,
  onValueChange,
  options,
  groups,
  multiple = false,
  leftIcon,
  className,
  containerStyle,
  fullWidth = true,
}: Readonly<DropdownProps>) {
  const [isOpen, setIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const selectRef = useRef<HTMLSelectElement>(null)
  const listboxId = React.useId()

  const themeColors = useDropdownThemeColors()
  const hasError = !!error
  const iconSize = getIconSizeForDropdown(size)
  const sizeClasses = getDropdownSizeStyles(size)

  // Normalize options and groups into a flat structure for easier handling
  const allOptions = React.useMemo(() => {
    if (groups) {
      return groups.flatMap(group => group.options)
    }
    return options || []
  }, [options, groups])

  // Get selected option labels
  const getSelectedLabel = useCallback(() => {
    if (multiple) {
      const selectedValues = Array.isArray(value) ? value : []
      return getSelectedLabelTextMultiple(
        selectedValues,
        allOptions,
        placeholder
      )
    } else {
      const selectedValue = typeof value === 'string' ? value : undefined
      return getSelectedLabelTextSingle(selectedValue, allOptions, placeholder)
    }
  }, [value, multiple, allOptions, placeholder])

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false)
        setIsFocused(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => {
        document.removeEventListener('mousedown', handleClickOutside)
      }
    }
  }, [isOpen])

  // Handle escape key to close dropdown
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
        setIsFocused(false)
        buttonRef.current?.focus()
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => {
        document.removeEventListener('keydown', handleEscape)
      }
    }
  }, [isOpen])

  // Focus management
  useEffect(() => {
    if (isOpen && listRef.current) {
      // Focus first option or selected option
      const firstOption = listRef.current.querySelector<HTMLElement>(
        '[data-value]:not([aria-disabled="true"])'
      )
      firstOption?.focus()
    }
  }, [isOpen])

  const handleToggle = useCallback(() => {
    if (!disabled) {
      setIsOpen(!isOpen)
      setIsFocused(!isOpen)
    }
  }, [disabled, isOpen])

  const handleOptionClickSingle = useCallback(
    (optionValue: string) => {
      const newValue = handleOptionSelectionSingle(optionValue)
      onValueChange?.(newValue)
      setIsOpen(false)
      setIsFocused(false)
    },
    [onValueChange]
  )

  const handleOptionClickMultiple = useCallback(
    (optionValue: string) => {
      const currentValues = Array.isArray(value) ? value : []
      const newValue = handleOptionSelectionMultiple(optionValue, currentValues)
      onValueChange?.(newValue)
    },
    [value, onValueChange]
  )

  const handleOptionClick = useCallback(
    (optionValue: string) => {
      if (multiple) {
        handleOptionClickMultiple(optionValue)
      } else {
        handleOptionClickSingle(optionValue)
      }
      // Sync with native select for accessibility
      if (selectRef.current) {
        if (multiple) {
          const currentValues = Array.isArray(value) ? value : []
          const newValues = currentValues.includes(optionValue)
            ? currentValues.filter(v => v !== optionValue)
            : [...currentValues, optionValue]
          Array.from(selectRef.current.options).forEach(option => {
            option.selected = newValues.includes(option.value)
          })
        } else {
          selectRef.current.value = optionValue
        }
      }
    },
    [multiple, handleOptionClickSingle, handleOptionClickMultiple, value]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        e.preventDefault()
        if (!isOpen) {
          handleToggle()
        }
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault()
        setIsOpen(false)
        setIsFocused(false)
      }
    },
    [isOpen, handleToggle]
  )

  const handleOptionKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>, optionValue: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        handleOptionClick(optionValue)
      } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        handleArrowKeyNavigation(e.key, optionValue, listRef)
      }
    },
    [handleOptionClick]
  )

  const isOptionSelectedSingle = useCallback(
    (optionValue: string) => {
      const selectedValue = typeof value === 'string' ? value : undefined
      return checkOptionSelectedSingle(optionValue, selectedValue)
    },
    [value]
  )

  const isOptionSelectedMultiple = useCallback(
    (optionValue: string) => {
      const selectedValues = Array.isArray(value) ? value : []
      return checkOptionSelectedMultiple(optionValue, selectedValues)
    },
    [value]
  )

  const isOptionSelected = useCallback(
    (optionValue: string) => {
      if (multiple) {
        return isOptionSelectedMultiple(optionValue)
      } else {
        return isOptionSelectedSingle(optionValue)
      }
    },
    [multiple, isOptionSelectedSingle, isOptionSelectedMultiple]
  )

  const borderColorClass = getBorderColorClass(hasError, isFocused, isOpen)

  const buttonClasses = cn(
    'flex items-center justify-between',
    'bg-white border-2 rounded-lg',
    'transition-colors duration-200',
    'text-left w-full',
    'focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light',
    sizeClasses.button,
    borderColorClass,
    disabled && 'opacity-60 cursor-not-allowed',
    isOpen && 'border-primary'
  )

  const listClasses = cn(
    'absolute z-50 mt-1',
    'bg-white border border-mid-gray rounded-lg shadow-lg',
    'max-h-60 overflow-auto',
    'focus:outline-none',
    fullWidth ? 'w-full' : 'min-w-full'
  )

  return (
    <div
      className={cn(fullWidth && 'w-full', className)}
      style={containerStyle}
      ref={dropdownRef}
    >
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

      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          className={buttonClasses}
          onClick={handleToggle}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            // Delay to allow option clicks to register
            setTimeout(() => setIsFocused(false), 200)
          }}
          disabled={disabled}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          aria-controls={isOpen ? listboxId : undefined}
          aria-describedby={error ? `dropdown-error-${label}` : undefined}
        >
          <div className="flex items-center flex-1 min-w-0">
            {leftIcon && (
              <div className="mr-2 shrink-0">
                <Icon
                  name={leftIcon}
                  family="solid"
                  size={iconSize}
                  color={disabled ? themeColors.midGray : themeColors.text}
                />
              </div>
            )}
            <Text
              variant={value ? 'default' : 'muted'}
              className={cn('truncate', sizeClasses.text)}
            >
              {getSelectedLabel()}
            </Text>
          </div>
          <Icon
            name={isOpen ? 'chevron-up' : 'chevron-down'}
            family="solid"
            size={iconSize}
            variant="muted"
            className="ml-2 shrink-0"
          />
        </button>

        {isOpen && (
          <div
            ref={listRef}
            id={listboxId}
            className={listClasses}
            aria-hidden="true"
          >
            {groups
              ? groups.map((group, groupIndex) => (
                  <div key={groupIndex}>
                    {group.label && (
                      <div className="px-3 py-2 bg-light-gray border-b border-mid-gray">
                        <Text
                          variant="secondary"
                          className="text-xs font-semibold uppercase tracking-wide"
                        >
                          {group.label}
                        </Text>
                      </div>
                    )}
                    {group.options.map(option => (
                      <DropdownOption
                        key={option.value}
                        option={option}
                        selected={isOptionSelected(option.value)}
                        multiple={multiple}
                        size={size}
                        iconSize={iconSize}
                        onClick={() => handleOptionClick(option.value)}
                        onKeyDown={e => handleOptionKeyDown(e, option.value)}
                      />
                    ))}
                  </div>
                ))
              : options?.map(option => (
                  <DropdownOption
                    key={option.value}
                    option={option}
                    selected={isOptionSelected(option.value)}
                    multiple={multiple}
                    size={size}
                    iconSize={iconSize}
                    onClick={() => handleOptionClick(option.value)}
                    onKeyDown={e => handleOptionKeyDown(e, option.value)}
                  />
                ))}
          </div>
        )}
      </div>

      {(helperText || error) && (
        <div className="mt-1">
          {error ? (
            <Text
              id={error ? `dropdown-error-${label}` : undefined}
              variant="error"
              className="text-xs"
            >
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
      )}
    </div>
  )
}

interface DropdownOptionProps {
  option: DropdownOption
  selected: boolean
  multiple: boolean
  size: DropdownSize
  iconSize: number
  onClick: () => void
  onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => void
}

function DropdownOption({
  option,
  selected,
  multiple,
  size,
  iconSize,
  onClick,
  onKeyDown,
}: Readonly<DropdownOptionProps>) {
  const sizeClasses = getDropdownSizeStyles(size)

  const optionClasses = cn(
    'flex items-center px-3 py-2',
    'cursor-pointer transition-colors duration-150',
    'focus:outline-none focus:bg-light-gray',
    selected && !multiple && 'bg-primary-light-blue/10',
    selected && multiple && 'bg-light-gray',
    !option.disabled && 'hover:bg-light-gray',
    option.disabled && 'opacity-50 cursor-not-allowed',
    sizeClasses.option
  )

  return (
    <div
      aria-selected={selected}
      aria-disabled={option.disabled}
      data-value={option.value}
      data-option-value={option.value}
      className={optionClasses}
      onClick={option.disabled ? undefined : onClick}
      onKeyDown={option.disabled ? undefined : onKeyDown}
      tabIndex={option.disabled ? -1 : 0}
    >
      {multiple && (
        <div className="mr-2 shrink-0">
          <div
            className={cn(
              'flex items-center justify-center',
              'border-2 rounded',
              'w-4 h-4',
              selected
                ? 'bg-primary-light-blue border-primary-light-blue'
                : 'border-mid-gray bg-white'
            )}
          >
            {selected && (
              <Icon name="check" family="solid" size={12} variant="white" />
            )}
          </div>
        </div>
      )}
      {option.icon && (
        <div className="mr-2 shrink-0">
          <Icon
            name={option.icon}
            family="solid"
            size={iconSize}
            variant={selected ? 'primary' : 'secondary'}
          />
        </div>
      )}
      <Text
        variant={selected ? 'primary' : 'default'}
        className={cn('flex-1', sizeClasses.text)}
      >
        {option.label}
      </Text>
      {selected && !multiple && (
        <Icon
          name="check"
          family="solid"
          size={iconSize}
          variant="primary"
          className="ml-2 shrink-0"
        />
      )}
    </div>
  )
}

/**
 * Get selected label text for single selection
 */
function getSelectedLabelTextSingle(
  value: string | undefined,
  allOptions: DropdownOption[],
  placeholder: string
): string {
  if (!value) return placeholder
  const option = allOptions.find(opt => opt.value === value)
  return option?.label || placeholder
}

/**
 * Get selected label text for multiple selection
 */
function getSelectedLabelTextMultiple(
  value: string[] | undefined,
  allOptions: DropdownOption[],
  placeholder: string
): string {
  if (!value || value.length === 0) return placeholder
  if (value.length === 1) {
    const option = allOptions.find(opt => opt.value === value[0])
    return option?.label || placeholder
  }
  return `${value.length} selected`
}

/**
 * Handle option selection for single selection mode
 */
function handleOptionSelectionSingle(optionValue: string): string {
  return optionValue
}

/**
 * Handle option selection for multiple selection mode
 */
function handleOptionSelectionMultiple(
  optionValue: string,
  currentValues: string[]
): string[] {
  return currentValues.includes(optionValue)
    ? currentValues.filter(v => v !== optionValue)
    : [...currentValues, optionValue]
}

/**
 * Handle arrow key navigation in dropdown options
 */
function handleArrowKeyNavigation(
  key: string,
  currentOptionValue: string,
  listRef: React.RefObject<HTMLDivElement | null>
): void {
  const options = listRef.current?.querySelectorAll<HTMLElement>(
    '[data-value]:not([aria-disabled="true"])'
  )
  if (!options) return

  const currentIndex = Array.from(options).findIndex(opt => {
    const element = opt as HTMLElement & {
      dataset: { value?: string; optionValue?: string }
    }
    return (
      element.dataset.value === currentOptionValue ||
      element.dataset.optionValue === currentOptionValue
    )
  })

  if (key === 'ArrowDown') {
    const nextIndex = (currentIndex + 1) % options.length
    options[nextIndex]?.focus()
  } else if (key === 'ArrowUp') {
    const prevIndex = currentIndex === 0 ? options.length - 1 : currentIndex - 1
    options[prevIndex]?.focus()
  }
}

/**
 * Check if an option is selected in single selection mode
 */
function checkOptionSelectedSingle(
  optionValue: string,
  value: string | undefined
): boolean {
  return value === optionValue
}

/**
 * Check if an option is selected in multiple selection mode
 */
function checkOptionSelectedMultiple(
  optionValue: string,
  selectedValues: string[]
): boolean {
  return selectedValues.includes(optionValue)
}

/**
 * Get border color class based on state
 */
function getBorderColorClass(
  hasError: boolean,
  isFocused: boolean,
  isOpen: boolean
): string {
  if (hasError) return 'border-error'
  if (isFocused || isOpen) return 'border-primary'
  return 'border-mid-gray'
}

/**
 * Get all theme colors used by dropdowns
 */
function useDropdownThemeColors() {
  const themeText = useThemeColor({}, 'text')
  const themePrimary = useThemeColor({}, 'primary')
  const themeCharcoal = useThemeColor({}, 'charcoal')
  const themeMidGray = useThemeColor({}, 'midGray')
  const themeLightGray = BrandColors.neutral.lightGray

  return {
    text: themeText,
    primary: themePrimary,
    charcoal: themeCharcoal,
    midGray: themeMidGray,
    lightGray: themeLightGray,
  }
}

/**
 * Get dropdown size styles
 */
function getDropdownSizeStyles(size: DropdownSize) {
  switch (size) {
    case 'small':
      return {
        button: 'px-3 py-1.5 min-h-[32px]',
        text: 'text-sm',
        option: 'py-1.5',
      }
    case 'medium':
      return {
        button: 'px-4 py-2 min-h-[44px]',
        text: 'text-base',
        option: 'py-2',
      }
    case 'large':
      return {
        button: 'px-5 py-3 min-h-[52px]',
        text: 'text-lg',
        option: 'py-2.5',
      }
  }
}

/**
 * Get icon size for dropdown
 */
function getIconSizeForDropdown(size: DropdownSize): number {
  switch (size) {
    case 'small':
      return 16
    case 'medium':
      return 20
    case 'large':
      return 24
  }
}
