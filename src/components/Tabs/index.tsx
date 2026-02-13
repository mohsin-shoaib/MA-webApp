import { Badge } from '@/components/Badge'
import { Icon } from '@/components/Icon'
import type { IconFamily } from '@/components/Icon'
import { Text } from '@/components/Text'
import React, { useState } from 'react'
import { cn } from '@/utils/cn'

export interface TabItem {
  /**
   * Unique identifier for the tab
   */
  id: string
  /**
   * Tab label/text
   */
  label: string
  /**
   * Optional icon name (from icon family)
   */
  icon?: string
  /**
   * Icon family (if icon is provided)
   * @default 'solid'
   */
  iconFamily?: IconFamily
  /**
   * Tab content (rendered when tab is active)
   */
  content: React.ReactNode
  /**
   * Whether tab is disabled
   * @default false
   */
  disabled?: boolean
  /**
   * Badge count to display on tab
   */
  badge?: number | string
}

export interface TabsProps {
  /**
   * Array of tab items
   */
  items: TabItem[]
  /**
   * Initial active tab ID
   */
  defaultActiveTab?: string
  /**
   * Controlled active tab ID
   */
  activeTab?: string
  /**
   * Callback when active tab changes
   */
  onTabChange?: (tabId: string) => void
  /**
   * Tabs variant
   * @default 'default'
   */
  variant?: 'default' | 'outlined' | 'pills' | 'underline'
  /**
   * Tab size
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * Whether tabs should scroll horizontally
   * @default false
   */
  scrollable?: boolean
  /**
   * Tab list alignment
   * @default 'start'
   */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /**
   * Additional className for container
   */
  className?: string
  /**
   * Additional style for container
   */
  style?: React.CSSProperties
  /**
   * Additional className for tab list
   */
  tabListClassName?: string
  /**
   * Additional style for tab list
   */
  tabListStyle?: React.CSSProperties
  /**
   * Additional className for tab content
   */
  contentClassName?: string
  /**
   * Additional style for tab content
   */
  contentStyle?: React.CSSProperties
}

/**
 * Tabs component with theme support
 *
 * Displays a tabbed interface with tab navigation and content panels.
 * Fully integrated with the theme system and supports various variants.
 *
 * @example
 * ```tsx
 * <Tabs
 *   items={[
 *     { id: 'tab1', label: 'Tab 1', content: <Text>Content 1</Text> },
 *     { id: 'tab2', label: 'Tab 2', content: <Text>Content 2</Text> },
 *   ]}
 * />
 *
 * <Tabs
 *   variant="pills"
 *   items={[
 *     { id: 'tab1', label: 'Tab 1', icon: 'home', content: <Text>Content</Text> },
 *   ]}
 * />
 * ```
 */
export function Tabs({
  items,
  defaultActiveTab,
  activeTab: controlledActiveTab,
  onTabChange,
  variant = 'default',
  size = 'medium',
  scrollable = false,
  align = 'start',
  className,
  style,
  tabListClassName,
  tabListStyle,
  contentClassName,
  contentStyle,
}: Readonly<TabsProps>) {
  const [internalActiveTab, setInternalActiveTab] = useState<string>(
    defaultActiveTab ?? items[0]?.id ?? ''
  )

  const activeTab = controlledActiveTab ?? internalActiveTab

  const handleTabPress = (tabId: string) => {
    if (controlledActiveTab === undefined) {
      setInternalActiveTab(tabId)
    }
    onTabChange?.(tabId)
  }

  const activeTabItem = items.find(item => item.id === activeTab)
  const tabListClasses = getTabListClasses(variant, align, scrollable)
  const contentClasses = getContentClasses()

  return (
    <div className={cn('w-full', className)} style={style}>
      {/* Tab List */}
      <div
        className={cn(tabListClasses, tabListClassName)}
        style={tabListStyle}
        role="tablist"
      >
        {items.map(item => (
          <TabButton
            key={item.id}
            item={item}
            isActive={activeTab === item.id}
            variant={variant}
            size={size}
            onPress={() => !item.disabled && handleTabPress(item.id)}
          />
        ))}
      </div>

      {/* Tab Content */}
      {activeTabItem && (
        <div
          id={`tabpanel-${activeTabItem.id}`}
          className={cn(contentClasses, contentClassName)}
          style={contentStyle}
          role="tabpanel"
          aria-labelledby={`tab-${activeTabItem.id}`}
        >
          {activeTabItem.content}
        </div>
      )}
    </div>
  )
}

/**
 * Individual tab button component
 */
interface TabButtonProps {
  item: TabItem
  isActive: boolean
  variant: NonNullable<TabsProps['variant']>
  size: NonNullable<TabsProps['size']>
  onPress: () => void
}

function TabButton({
  item,
  isActive,
  variant,
  size,
  onPress,
}: Readonly<TabButtonProps>) {
  const buttonClasses = getTabButtonClasses(item, isActive, variant, size)
  const indicatorClasses = getIndicatorClasses(variant, isActive)

  return (
    <button
      id={`tab-${item.id}`}
      type="button"
      className={buttonClasses}
      onClick={onPress}
      disabled={item.disabled}
      role="tab"
      aria-selected={isActive}
      aria-disabled={item.disabled}
      aria-controls={`tabpanel-${item.id}`}
    >
      <div className="flex flex-row items-center justify-center">
        {item.icon && (
          <Icon
            name={item.icon}
            family={item.iconFamily ?? 'solid'}
            size={getIconSize(size)}
            variant={isActive ? 'primary' : 'secondary'}
            className={item.label ? 'mr-2' : ''}
          />
        )}
        {!!item.label && (
          <Text
            variant={isActive ? 'primary' : 'secondary'}
            className={getTextSizeClass(size)}
          >
            {item.label}
          </Text>
        )}
        {item.badge !== undefined && (
          <Badge variant="primary" size="small" className="ml-2">
            {item.badge}
          </Badge>
        )}
      </div>
      {variant === 'underline' && (
        <div
          className={cn(
            'absolute bottom-0 left-0 right-0 h-0.5',
            indicatorClasses
          )}
        />
      )}
    </button>
  )
}

/**
 * Get tab list Tailwind classes
 */
function getTabListClasses(
  variant: NonNullable<TabsProps['variant']>,
  align: NonNullable<TabsProps['align']>,
  scrollable: boolean
): string {
  const baseClasses = 'flex flex-row'
  const alignClasses = getAlignClasses(align)
  const variantClasses = getTabListVariantClasses(variant)

  if (scrollable) {
    return cn(baseClasses, variantClasses, 'overflow-x-auto')
  }

  return cn(baseClasses, alignClasses, variantClasses)
}

/**
 * Get alignment classes for tab list
 */
function getAlignClasses(align: NonNullable<TabsProps['align']>): string {
  switch (align) {
    case 'start':
      return 'justify-start'
    case 'center':
      return 'justify-center'
    case 'end':
      return 'justify-end'
    case 'stretch':
      return ''
  }
}

/**
 * Get variant-specific classes for tab list
 */
function getTabListVariantClasses(
  variant: NonNullable<TabsProps['variant']>
): string {
  switch (variant) {
    case 'default':
      return 'border-b border-light-gray'
    case 'outlined':
      return 'border-b-2 border-mid-gray'
    case 'pills':
      return 'gap-2'
    case 'underline':
      return 'border-b border-light-gray'
    default:
      return ''
  }
}

/**
 * Get tab button Tailwind classes
 */
function getTabButtonClasses(
  item: TabItem,
  isActive: boolean,
  variant: NonNullable<TabsProps['variant']>,
  size: NonNullable<TabsProps['size']>
): string {
  const baseClasses =
    'relative flex items-center justify-center transition-colors'
  const sizeClasses = getButtonSizeClasses(size)
  const variantClasses = getButtonVariantClasses(
    variant,
    isActive,
    item.disabled ?? false
  )
  const stateClasses = item.disabled
    ? 'opacity-50 cursor-not-allowed'
    : 'cursor-pointer hover:opacity-80'

  return cn(baseClasses, sizeClasses, variantClasses, stateClasses)
}

/**
 * Get size classes for tab button
 */
function getButtonSizeClasses(size: NonNullable<TabsProps['size']>): string {
  switch (size) {
    case 'small':
      return 'px-3 py-2'
    case 'medium':
      return 'px-4 py-3'
    case 'large':
      return 'px-5 py-4'
  }
}

/**
 * Get variant classes for tab button
 */
function getButtonVariantClasses(
  variant: NonNullable<TabsProps['variant']>,
  isActive: boolean,
  disabled: boolean
): string {
  if (disabled) {
    return ''
  }

  switch (variant) {
    case 'default':
      return isActive
        ? 'border-b-2 border-primary-light text-primary'
        : 'border-b-2 border-transparent text-charcoal'
    case 'outlined':
      return isActive
        ? 'border-b-2 border-primary-dark text-primary'
        : 'border-b-2 border-transparent text-charcoal'
    case 'pills':
      return isActive
        ? 'bg-primary-light rounded-full text-white'
        : 'bg-transparent rounded-full text-charcoal'
    case 'underline':
      return isActive ? 'text-primary' : 'text-charcoal'
    default:
      return ''
  }
}

/**
 * Get indicator classes for underline variant
 */
function getIndicatorClasses(
  variant: NonNullable<TabsProps['variant']>,
  isActive: boolean
): string {
  if (variant !== 'underline' || !isActive) {
    return 'bg-transparent'
  }
  return 'bg-primary-light'
}

/**
 * Get icon size based on tab size
 */
function getIconSize(size: NonNullable<TabsProps['size']>): number {
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
 * Get text size class based on tab size
 */
function getTextSizeClass(size: NonNullable<TabsProps['size']>): string {
  switch (size) {
    case 'small':
      return 'text-sm'
    case 'medium':
      return 'text-base'
    case 'large':
      return 'text-lg'
  }
}

/**
 * Get content container classes
 */
function getContentClasses(): string {
  return 'w-full'
}
