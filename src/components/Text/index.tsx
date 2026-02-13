import React from 'react'
import { useThemeColor } from '@/hooks/use-theme-color'
import { Colors } from '@/constants/theme'

export interface TextProps extends React.HTMLAttributes<HTMLElement> {
  /**
   * HTML element to render
   * @default 'span'
   */
  as?: 'span' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label' | 'div'
  /**
   * Text color variant
   * @default 'default' - uses theme text color (nearBlack in light, white in dark)
   */
  variant?:
    | 'default'
    | 'primary'
    | 'secondary'
    | 'muted'
    | 'white'
    | 'success'
    | 'warning'
    | 'error'
  /**
   * Override text color (takes precedence over variant)
   */
  color?: string
  /**
   * Additional className for styling
   */
  className?: string
}

/**
 * Text component with theme support
 *
 * Automatically uses theme-appropriate colors based on light/dark mode.
 *
 * @example
 * ```tsx
 * <Text variant="primary">Primary text</Text>
 * <Text variant="secondary" className="text-lg">Secondary text</Text>
 * <Text color="#27B7EE">Custom color</Text>
 * <Text as="h1" variant="primary">Heading</Text>
 * ```
 */
export function Text({
  as: Component = 'span',
  variant = 'default',
  color,
  className,
  style,
  children,
  ...props
}: Readonly<TextProps>) {
  // Get theme colors using hooks (must be called in component)
  const themeText = useThemeColor({}, 'text')
  const themePrimary = useThemeColor({}, 'primary')
  const themeCharcoal = useThemeColor({}, 'charcoal')
  const themeMidGray = useThemeColor({}, 'midGray')
  const themeSuccess = useThemeColor({}, 'success')
  const themeWarning = useThemeColor({}, 'warning')
  const themeError = useThemeColor({}, 'error')

  // Get theme-appropriate color based on variant
  const themeColor = getVariantColor(variant, {
    text: themeText,
    primary: themePrimary,
    charcoal: themeCharcoal,
    midGray: themeMidGray,
    white: Colors.light.white,
    success: themeSuccess,
    warning: themeWarning,
    error: themeError,
  })

  // Use explicit color if provided, otherwise use variant color
  const textColor = color || themeColor

  // Build style object
  const textStyle: React.CSSProperties = {
    color: textColor,
    ...style,
  }

  return (
    <Component className={className} style={textStyle} {...props}>
      {children}
    </Component>
  )
}

/**
 * Get color for text variant based on current theme
 */
function getVariantColor(
  variant: NonNullable<TextProps['variant']>,
  colors: {
    text: string
    primary: string
    charcoal: string
    midGray: string
    white: string
    success: string
    warning: string
    error: string
  }
): string {
  switch (variant) {
    case 'default':
      // Uses theme text color (nearBlack in light, white in dark)
      return colors.text
    case 'primary':
      // Brand primary light blue
      return colors.primary
    case 'secondary':
      // Charcoal for secondary text
      return colors.charcoal
    case 'muted':
      // Mid gray for muted/disabled text
      return colors.midGray
    case 'white':
      // Always white
      return colors.white
    case 'success':
      // System success color
      return colors.success
    case 'warning':
      // System warning color
      return colors.warning
    case 'error':
      // System error color
      return colors.error
    default:
      return colors.text
  }
}
