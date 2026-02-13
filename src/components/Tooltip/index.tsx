import { Text } from '@/components/Text'
import { BrandColors } from '@/constants/theme'
import React, { useRef, useState, useEffect, useCallback } from 'react'
import { cn } from '@/utils/cn'

export interface TooltipProps {
  /**
   * Tooltip content/text
   */
  content: string | React.ReactNode
  /**
   * Trigger element (the element that shows the tooltip)
   */
  children: React.ReactElement
  /**
   * Tooltip position relative to trigger
   * @default 'top'
   */
  position?: 'top' | 'bottom' | 'left' | 'right'
  /**
   * Delay before showing tooltip (in milliseconds)
   * @default 0
   */
  delay?: number
  /**
   * Whether to show on press (true) or hover (false)
   * @default false (shows on hover)
   */
  showOnPress?: boolean
  /**
   * Whether tooltip is disabled
   * @default false
   */
  disabled?: boolean
  /**
   * Additional className for tooltip container
   */
  className?: string
  /**
   * Additional style for tooltip container
   */
  style?: React.CSSProperties
}

const TOOLTIP_OFFSET = 8

/**
 * Tooltip component - Shows contextual information on hover or press
 *
 * Displays a tooltip with theme-aware styling. Perfect for providing
 * additional context for icon buttons or other UI elements.
 *
 * @example
 * ```tsx
 * <Tooltip content="Close this dialog">
 *   <IconButton icon="xmark" aria-label="Close" />
 * </Tooltip>
 *
 * <Tooltip content="Save changes" position="bottom" showOnPress>
 *   <Button variant="primary">Save</Button>
 * </Tooltip>
 * ```
 */
export function Tooltip({
  content,
  children,
  position = 'top',
  delay = 0,
  showOnPress = false,
  disabled = false,
  className,
  style,
}: Readonly<TooltipProps>) {
  const [visible, setVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState<React.CSSProperties>(
    {}
  )
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)
  const timeoutRef = useRef<number | null>(null)

  // Use dark background for tooltip (better contrast)
  const tooltipBackground = BrandColors.neutral.nearBlack

  const calculatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return

    const triggerRect = triggerRef.current.getBoundingClientRect()
    const tooltipRect = tooltipRef.current.getBoundingClientRect()
    const scrollX = window.scrollX || window.pageXOffset
    const scrollY = window.scrollY || window.pageYOffset

    const tooltipWidth = tooltipRect.width || 200
    const tooltipHeight = tooltipRect.height || 40

    // Calculate center positions
    const centerX = triggerRect.left + triggerRect.width / 2
    const centerY = triggerRect.top + triggerRect.height / 2

    // Ensure tooltip stays within viewport bounds
    const viewportWidth = window.innerWidth
    const viewportHeight = window.innerHeight

    let left = 0
    let top = 0

    switch (position) {
      case 'top':
        left = Math.max(
          TOOLTIP_OFFSET,
          Math.min(
            centerX - tooltipWidth / 2,
            viewportWidth - tooltipWidth - TOOLTIP_OFFSET
          )
        )
        top = triggerRect.top - tooltipHeight - TOOLTIP_OFFSET + scrollY
        break
      case 'bottom':
        left = Math.max(
          TOOLTIP_OFFSET,
          Math.min(
            centerX - tooltipWidth / 2,
            viewportWidth - tooltipWidth - TOOLTIP_OFFSET
          )
        )
        top = triggerRect.bottom + TOOLTIP_OFFSET + scrollY
        break
      case 'left':
        left = triggerRect.left - tooltipWidth - TOOLTIP_OFFSET + scrollX
        top =
          Math.max(
            TOOLTIP_OFFSET,
            Math.min(
              centerY - tooltipHeight / 2,
              viewportHeight - tooltipHeight - TOOLTIP_OFFSET
            )
          ) + scrollY
        break
      case 'right':
        left = triggerRect.right + TOOLTIP_OFFSET + scrollX
        top =
          Math.max(
            TOOLTIP_OFFSET,
            Math.min(
              centerY - tooltipHeight / 2,
              viewportHeight - tooltipHeight - TOOLTIP_OFFSET
            )
          ) + scrollY
        break
    }

    setTooltipPosition({
      position: 'fixed',
      left,
      top,
      zIndex: 9999,
    })
  }, [position])

  const showTooltip = useCallback(() => {
    if (disabled) return

    if (delay > 0) {
      timeoutRef.current = setTimeout(() => {
        setVisible(true)
        // Calculate position after a brief delay to ensure tooltip is rendered
        setTimeout(calculatePosition, 10)
      }, delay)
    } else {
      setVisible(true)
      // Calculate position after a brief delay to ensure tooltip is rendered
      setTimeout(calculatePosition, 10)
    }
  }, [disabled, delay, calculatePosition])

  const hideTooltip = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
      timeoutRef.current = null
    }
    setVisible(false)
  }, [])

  // Recalculate position on scroll/resize
  useEffect(() => {
    if (visible) {
      const handleResize = () => calculatePosition()
      const handleScroll = () => calculatePosition()

      window.addEventListener('resize', handleResize)
      window.addEventListener('scroll', handleScroll, true)

      return () => {
        window.removeEventListener('resize', handleResize)
        window.removeEventListener('scroll', handleScroll, true)
      }
    }
  }, [visible, calculatePosition])

  // Handle click outside for showOnPress mode
  useEffect(() => {
    if (visible && showOnPress) {
      const handleClickOutside = (e: MouseEvent) => {
        const trigger = triggerRef.current
        const tooltip = tooltipRef.current
        if (
          trigger &&
          !trigger.contains(e.target as Node) &&
          tooltip &&
          !tooltip.contains(e.target as Node)
        ) {
          hideTooltip()
        }
      }

      // Use capture phase to catch clicks before they bubble
      document.addEventListener('mousedown', handleClickOutside, true)

      return () => {
        document.removeEventListener('mousedown', handleClickOutside, true)
      }
    }
  }, [visible, showOnPress, hideTooltip])

  // Create event handlers that don't access refs during render
  // Store original handlers in refs to avoid accessing props during render
  const originalHandlersRef = useRef<{
    onClick?: (e: React.MouseEvent) => void
    onMouseEnter?: (e: React.MouseEvent) => void
    onMouseLeave?: (e: React.MouseEvent) => void
    onFocus?: (e: React.FocusEvent) => void
    onBlur?: (e: React.FocusEvent) => void
  }>({})

  // Update handlers ref when children changes
  useEffect(() => {
    if (React.isValidElement(children)) {
      originalHandlersRef.current = {
        onClick: (children.props as { onClick?: (e: React.MouseEvent) => void })
          ?.onClick,
        onMouseEnter: (
          children.props as { onMouseEnter?: (e: React.MouseEvent) => void }
        )?.onMouseEnter,
        onMouseLeave: (
          children.props as { onMouseLeave?: (e: React.MouseEvent) => void }
        )?.onMouseLeave,
        onFocus: (children.props as { onFocus?: (e: React.FocusEvent) => void })
          ?.onFocus,
        onBlur: (children.props as { onBlur?: (e: React.FocusEvent) => void })
          ?.onBlur,
      }
    }
  }, [children])

  const handleClick = useCallback(
    (e: React.MouseEvent) => {
      if (visible) {
        hideTooltip()
      } else {
        showTooltip()
      }
      originalHandlersRef.current.onClick?.(e)
    },
    [visible, showTooltip, hideTooltip]
  )

  const handleMouseEnter = useCallback(
    (e: React.MouseEvent) => {
      showTooltip()
      originalHandlersRef.current.onMouseEnter?.(e)
    },
    [showTooltip]
  )

  const handleMouseLeave = useCallback(
    (e: React.MouseEvent) => {
      hideTooltip()
      originalHandlersRef.current.onMouseLeave?.(e)
    },
    [hideTooltip]
  )

  const handleFocus = useCallback(
    (e: React.FocusEvent) => {
      showTooltip()
      originalHandlersRef.current.onFocus?.(e)
    },
    [showTooltip]
  )

  const handleBlur = useCallback(
    (e: React.FocusEvent) => {
      hideTooltip()
      originalHandlersRef.current.onBlur?.(e)
    },
    [hideTooltip]
  )

  return (
    <>
      <div
        ref={triggerRef}
        className="inline-block"
        {...(showOnPress
          ? { onClick: handleClick }
          : {
              onMouseEnter: handleMouseEnter,
              onMouseLeave: handleMouseLeave,
              onFocus: handleFocus,
              onBlur: handleBlur,
            })}
      >
        {children}
      </div>
      {visible && (
        <div
          ref={tooltipRef}
          className={cn(
            'bg-near-black rounded-lg shadow-lg px-3 py-2 max-w-[200px]',
            'transition-opacity duration-200',
            className
          )}
          style={{
            ...tooltipPosition,
            backgroundColor: tooltipBackground,
            ...style,
          }}
          role="tooltip"
          onMouseEnter={showOnPress ? undefined : showTooltip}
          onMouseLeave={showOnPress ? undefined : hideTooltip}
        >
          {typeof content === 'string' ? (
            <Text variant="white" className="text-xs leading-4 text-center">
              {content}
            </Text>
          ) : (
            content
          )}
        </div>
      )}
    </>
  )
}
