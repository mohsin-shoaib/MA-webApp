import React, {
  useState,
  useRef,
  useEffect,
  useLayoutEffect,
  useCallback,
} from 'react'
import { createPortal } from 'react-dom'
import { useThemeColor } from '@/hooks/use-theme-color'
import { BrandColors } from '@/constants/theme'
import { Text } from '@/components/Text'
import { Icon } from '@/components/Icon'
import { Input } from '@/components/Input'
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
  /**
   * When true, shows a search input inside the dropdown to filter options
   * @default false
   */
  searchable?: boolean
  /**
   * Placeholder for the search input when searchable is true
   */
  searchPlaceholder?: string
  /**
   * Message shown when dropdown is open and there are no options (or no match when searchable)
   */
  emptyMessage?: string
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
  searchable = false,
  searchPlaceholder = 'Search...',
  emptyMessage,
}: Readonly<DropdownProps>) {
  const [isOpen, setIsOpen] = useState(false)
  const [isFocused, setIsFocused] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [openAbove, setOpenAbove] = useState(false)
  const [listPosition, setListPosition] = useState<{
    top: number
    left: number
    width: number
    openAbove: boolean
  } | null>(null)
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

  // Filter options/groups by search query when searchable
  const filteredOptions = React.useMemo(() => {
    if (!searchable || !searchQuery.trim()) return options || []
    const q = searchQuery.toLowerCase().trim()
    return (options || []).filter(opt => opt.label.toLowerCase().includes(q))
  }, [options, searchable, searchQuery])

  const filteredGroups = React.useMemo(() => {
    if (!searchable || !searchQuery.trim()) return groups
    if (!groups) return undefined
    const q = searchQuery.toLowerCase().trim()
    return groups
      .map(group => ({
        ...group,
        options: group.options.filter(opt =>
          opt.label.toLowerCase().includes(q)
        ),
      }))
      .filter(g => g.options.length > 0)
  }, [groups, searchable, searchQuery])

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

  // When dropdown opens, measure space below and open upward if insufficient
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      if (!isOpen) {
        setOpenAbove(false)
        return
      }
      const button = buttonRef.current
      if (!button) return
      const rect = button.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const listMaxHeight = 192
      setOpenAbove(spaceBelow < listMaxHeight)
    })
    return () => cancelAnimationFrame(raf)
  }, [isOpen])

  // Position portaled list from trigger and update on scroll/resize
  useLayoutEffect(() => {
    if (!isOpen) return
    const updatePosition = () => {
      const button = buttonRef.current
      if (!button) return
      const rect = button.getBoundingClientRect()
      setListPosition({
        top: rect.top,
        left: rect.left,
        width: rect.width,
        openAbove,
      })
    }
    const rafId = requestAnimationFrame(updatePosition)
    document.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      cancelAnimationFrame(rafId)
      document.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [isOpen, openAbove])

  // Handle click outside to close dropdown (include portaled list so clicks inside it don't close)
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node
      const inDropdown = dropdownRef.current?.contains(target)
      const inList = listRef.current?.contains(target)
      if (!inDropdown && !inList) {
        setIsOpen(false)
        setIsFocused(false)
        setSearchQuery('')
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
        setSearchQuery('')
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

  // Focus management: focus search input when searchable, else first option
  useEffect(() => {
    if (isOpen && listRef.current) {
      if (searchable) {
        const input = listRef.current.querySelector('input')
        ;(input as HTMLInputElement)?.focus()
      } else {
        const firstOption = listRef.current.querySelector<HTMLElement>(
          '[data-value]:not([aria-disabled="true"])'
        )
        firstOption?.focus()
      }
    }
  }, [isOpen, searchable])

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
      setSearchQuery('')
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
    'absolute z-[10002] left-0 right-0',
    openAbove ? 'bottom-full mb-1' : 'mt-1',
    'bg-white border border-mid-gray rounded-lg shadow-lg',
    'max-h-48 overflow-auto',
    'focus:outline-none',
    fullWidth ? 'w-full' : 'min-w-full'
  )

  const portalListClasses = cn(
    'z-[10002]',
    'bg-white border border-mid-gray rounded-lg shadow-lg',
    'max-h-48 overflow-auto',
    'focus:outline-none',
    'box-border'
  )

  const listContent = (
    <>
      {searchable && (
        <div
          className="sticky top-0 z-10 p-2 bg-white border-b border-mid-gray rounded-t-lg"
          onMouseDown={e => e.preventDefault()}
        >
          <Input
            type="text"
            placeholder={searchPlaceholder}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'ArrowDown' || e.key === 'Enter') {
                e.preventDefault()
                const firstOption = listRef.current?.querySelector<HTMLElement>(
                  '[data-value]:not([aria-disabled="true"])'
                )
                firstOption?.focus()
              }
            }}
            size="small"
            className="border-mid-gray"
          />
        </div>
      )}
      {filteredGroups
        ? filteredGroups.map((group, groupIndex) => (
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
        : filteredOptions.map(option => (
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
      {((filteredGroups && filteredGroups.every(g => g.options.length === 0)) ||
        (!filteredGroups && filteredOptions.length === 0)) && (
        <div className="px-3 py-4 text-center">
          <Text variant="muted" className="text-sm">
            {emptyMessage ||
              (searchable ? 'No options match your search' : 'No options')}
          </Text>
        </div>
      )}
    </>
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

        {isOpen &&
          listPosition &&
          (() => {
            const win =
              globalThis.window === undefined ? null : globalThis.window
            const vw = win ? win.innerWidth : 0
            let left = listPosition.left
            let width = listPosition.width
            if (vw > 0) {
              if (left < 0) {
                width = width + left
                left = 0
              }
              if (left + width > vw) {
                width = Math.max(0, vw - left)
              }
              width = Math.min(width, vw)
            }
            return createPortal(
              <div
                ref={listRef}
                id={listboxId}
                className={portalListClasses}
                style={{
                  position: 'fixed',
                  ...(listPosition.openAbove
                    ? {
                        bottom: win ? win.innerHeight - listPosition.top : 0,
                        left,
                        width,
                        marginBottom: 4,
                      }
                    : {
                        top: listPosition.top + 4,
                        left,
                        width,
                      }),
                }}
                aria-hidden="true"
              >
                {listContent}
              </div>,
              document.body
            )
          })()}
        {isOpen && !listPosition && (
          <div
            ref={listRef}
            id={listboxId}
            className={listClasses}
            aria-hidden="true"
          >
            {listContent}
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
 * Get selected label text for multiple selection.
 * Shows comma-separated labels so selected values are visible inside the dropdown.
 */
function getSelectedLabelTextMultiple(
  value: string[] | undefined,
  allOptions: DropdownOption[],
  placeholder: string
): string {
  if (!value || value.length === 0) return placeholder
  const labels = value
    .map(v => allOptions.find(opt => opt.value === v)?.label ?? v)
    .filter(Boolean)
  return labels.length > 0 ? labels.join(', ') : placeholder
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
