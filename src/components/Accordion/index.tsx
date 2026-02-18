import React, { useState } from 'react'
import { Badge } from '@/components/Badge'
import { Icon } from '@/components/Icon'
import type { IconFamily } from '@/components/Icon'
import { Text } from '@/components/Text'
import { cn } from '@/utils/cn'

export interface AccordionItem {
  /**
   * Unique identifier for the accordion item
   */
  id: string
  /**
   * Header title/text
   */
  title: string
  /**
   * Optional header subtitle/description
   */
  subtitle?: string
  /**
   * Content to display when expanded
   */
  content: React.ReactNode
  /**
   * Whether item is disabled
   * @default false
   */
  disabled?: boolean
  /**
   * Whether item is initially expanded (uncontrolled)
   * @default false
   */
  defaultExpanded?: boolean
  /**
   * Custom icon name (replaces default chevron)
   */
  icon?: string
  /**
   * Icon family (if icon is provided)
   * @default 'solid'
   */
  iconFamily?: IconFamily
  /**
   * Badge to display in header
   */
  badge?: number | string
}

export interface AccordionProps {
  /**
   * Array of accordion items
   */
  items: AccordionItem[]
  /**
   * Whether only one item can be expanded at a time
   * @default false
   */
  allowMultiple?: boolean
  /**
   * Controlled expanded items (array of IDs)
   */
  expandedItems?: string[]
  /**
   * Callback when expanded items change
   */
  onExpandedChange?: (expandedIds: string[]) => void
  /**
   * Accordion variant
   * @default 'default'
   */
  variant?: 'default' | 'outlined' | 'bordered'
  /**
   * Additional className for container
   */
  className?: string
  /**
   * Additional style for container
   */
  style?: React.CSSProperties
  /**
   * Additional className for the expanded content area
   */
  contentClassName?: string
}

/**
 * Accordion component with theme support
 *
 * Displays collapsible content sections with headers.
 * Supports single or multiple expanded items.
 *
 * @example
 * ```tsx
 * <Accordion
 *   items={[
 *     { id: '1', title: 'Section 1', content: <Text>Content 1</Text> },
 *     { id: '2', title: 'Section 2', content: <Text>Content 2</Text> },
 *   ]}
 * />
 *
 * <Accordion
 *   allowMultiple
 *   variant="outlined"
 *   items={items}
 * />
 * ```
 */
export function Accordion({
  items,
  allowMultiple = false,
  expandedItems: controlledExpandedItems,
  onExpandedChange,
  variant = 'default',
  className,
  style,
  contentClassName,
}: Readonly<AccordionProps>) {
  const [internalExpandedItems, setInternalExpandedItems] = useState<string[]>(
    items.filter(item => item.defaultExpanded).map(item => item.id)
  )

  const expandedItems = controlledExpandedItems ?? internalExpandedItems

  const handleToggle = (itemId: string) => {
    const isExpanded = expandedItems.includes(itemId)
    let newExpandedItems: string[]

    if (allowMultiple) {
      if (isExpanded) {
        newExpandedItems = expandedItems.filter(id => id !== itemId)
      } else {
        newExpandedItems = [...expandedItems, itemId]
      }
    } else {
      newExpandedItems = isExpanded ? [] : [itemId]
    }

    if (controlledExpandedItems === undefined) {
      setInternalExpandedItems(newExpandedItems)
    }
    onExpandedChange?.(newExpandedItems)
  }

  const containerClasses = getContainerClasses(variant)

  return (
    <div className={cn(containerClasses, className)} style={style}>
      {items.map((item, index) => (
        <AccordionItemComponent
          key={item.id}
          item={item}
          isExpanded={expandedItems.includes(item.id)}
          onToggle={() => handleToggle(item.id)}
          variant={variant}
          isLast={index === items.length - 1}
          contentClassName={contentClassName}
        />
      ))}
    </div>
  )
}

/**
 * Individual accordion item component
 */
interface AccordionItemComponentProps {
  item: AccordionItem
  isExpanded: boolean
  onToggle: () => void
  variant: NonNullable<AccordionProps['variant']>
  isLast: boolean
  contentClassName?: string
}

function AccordionItemComponent({
  item,
  isExpanded,
  onToggle,
  variant,
  isLast,
  contentClassName,
}: Readonly<AccordionItemComponentProps>) {
  const headerClasses = getHeaderClasses(variant, isLast)
  const contentClasses = getContentClasses(isLast, contentClassName)

  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      onToggle()
    }
  }

  return (
    <div>
      {/* Header */}
      <button
        type="button"
        className={headerClasses}
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        disabled={item.disabled}
        aria-expanded={isExpanded}
        aria-disabled={item.disabled}
      >
        <div className="flex items-center flex-1">
          {/* Custom Icon or Default Chevron */}
          {item.icon ? (
            <Icon
              name={item.icon}
              family={item.iconFamily ?? 'solid'}
              size={20}
              variant="secondary"
              className="mr-3"
            />
          ) : (
            <Icon
              name={isExpanded ? 'chevron-up' : 'chevron-down'}
              family="solid"
              size={24}
              variant="secondary"
              className="mr-3 transition-transform duration-200"
            />
          )}

          {/* Title and Subtitle */}
          <div className="flex-1 text-left">
            <Text
              variant={item.disabled ? 'muted' : 'default'}
              className="text-base font-medium"
            >
              {item.title}
            </Text>
            {item.subtitle && (
              <Text variant="secondary" className="text-sm mt-0.5">
                {item.subtitle}
              </Text>
            )}
          </div>

          {/* Badge */}
          {item.badge !== undefined && (
            <Badge variant="primary" size="small" className="ml-2">
              {item.badge}
            </Badge>
          )}
        </div>
      </button>

      {/* Content */}
      {isExpanded && <div className={contentClasses}>{item.content}</div>}
    </div>
  )
}

/**
 * Get container classes based on variant
 */
function getContainerClasses(
  variant: NonNullable<AccordionProps['variant']>
): string {
  switch (variant) {
    case 'default':
      return 'w-full'
    case 'outlined':
      return 'w-full border border-mid-gray rounded-lg overflow-hidden'
    case 'bordered':
      return 'w-full border border-light-gray rounded-lg overflow-hidden'
    default:
      return 'w-full'
  }
}

/**
 * Get header classes based on variant
 */
function getHeaderClasses(
  variant: NonNullable<AccordionProps['variant']>,
  isLast: boolean
): string {
  const baseClasses = 'flex items-center px-4 py-3 bg-white w-full text-left'
  const borderClasses = getHeaderBorderClasses(variant, isLast)
  const interactiveClasses =
    'transition-colors duration-200 hover:bg-light-gray focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:opacity-60 disabled:cursor-not-allowed'

  return cn(baseClasses, borderClasses, interactiveClasses)
}

/**
 * Get header border classes
 */
function getHeaderBorderClasses(
  variant: NonNullable<AccordionProps['variant']>,
  isLast: boolean
): string {
  if (variant === 'outlined' || variant === 'bordered') {
    return isLast ? '' : 'border-b border-light-gray'
  }

  // Default variant: border between items
  return isLast ? '' : 'border-b border-light-gray'
}

/**
 * Get content classes
 */
function getContentClasses(isLast: boolean, contentClassName?: string): string {
  const baseClasses = 'px-4 py-3 bg-light-gray'
  const borderClasses = isLast ? '' : 'border-b border-light-gray'

  return cn(baseClasses, borderClasses, contentClassName)
}
