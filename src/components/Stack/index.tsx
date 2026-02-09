import React from 'react'
import { cn } from '../../utils/cn'

export interface StackProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Direction of the stack
   * @default 'vertical'
   */
  direction?: 'vertical' | 'horizontal'
  /**
   * Spacing between children (in pixels)
   * @default 0
   */
  spacing?: number
  /**
   * Alignment of children along the cross axis (alignItems)
   * @default undefined
   */
  align?: 'start' | 'center' | 'end' | 'stretch'
  /**
   * Alignment of children along the main axis (justifyContent)
   * @default undefined
   */
  justify?:
    | 'start'
    | 'center'
    | 'end'
    | 'space-between'
    | 'space-around'
    | 'space-evenly'
  /**
   * Whether to wrap children to next line
   * @default false
   */
  wrap?: boolean
  /**
   * Additional className for styling
   */
  className?: string
}

/**
 * Stack component for flexible layouts with spacing
 *
 * @example
 * ```tsx
 * <Stack spacing={16} direction="vertical">
 *   <div>Item 1</div>
 *   <div>Item 2</div>
 * </Stack>
 * ```
 */
export function Stack({
  direction = 'vertical',
  spacing = 0,
  align,
  justify,
  wrap = false,
  className,
  children,
  style,
  ...props
}: Readonly<StackProps>) {
  const isVertical = direction === 'vertical'

  // Build Tailwind classes
  const flexDirection = isVertical ? 'flex-col' : 'flex-row'

  // Map alignment props to Tailwind classes
  const alignItems = align ? mapToTailwindAlign(align) : ''
  const justifyContent = justify ? mapToTailwindJustify(justify) : ''
  const flexWrap = wrap ? 'flex-wrap' : 'flex-nowrap'

  // Build className with Tailwind utilities
  const stackClasses = cn(
    'flex',
    flexDirection,
    alignItems,
    justifyContent,
    flexWrap,
    className
  )

  // Handle spacing using inline style (gap with pixel value)
  const stackStyle: React.CSSProperties = {
    gap: spacing > 0 ? `${spacing}px` : undefined,
    ...style,
  }

  return (
    <div className={stackClasses} style={stackStyle} {...props}>
      {children}
    </div>
  )
}

/**
 * Map align prop to Tailwind alignItems classes (cross-axis alignment)
 */
function mapToTailwindAlign(align: NonNullable<StackProps['align']>): string {
  const mapping: Record<string, string> = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch',
  }

  return mapping[align] || ''
}

/**
 * Map justify prop to Tailwind justifyContent classes (main-axis alignment)
 */
function mapToTailwindJustify(
  justify: NonNullable<StackProps['justify']>
): string {
  const mapping: Record<string, string> = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    'space-between': 'justify-between',
    'space-around': 'justify-around',
    'space-evenly': 'justify-evenly',
  }

  return mapping[justify] || ''
}

/**
 * VStack - Vertical Stack component (shorthand for direction="vertical")
 */
export function VStack(props: Readonly<Omit<StackProps, 'direction'>>) {
  return <Stack {...props} direction="vertical" />
}

/**
 * HStack - Horizontal Stack component (shorthand for direction="horizontal")
 */
export function HStack(props: Readonly<Omit<StackProps, 'direction'>>) {
  return <Stack {...props} direction="horizontal" />
}
