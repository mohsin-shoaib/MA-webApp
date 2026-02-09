import React from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type {
  IconDefinition,
  SizeProp,
} from '@fortawesome/fontawesome-svg-core'
import * as solidIcons from '@fortawesome/free-solid-svg-icons'
import * as regularIcons from '@fortawesome/free-regular-svg-icons'
import * as brandsIcons from '@fortawesome/free-brands-svg-icons'
import { useThemeColor } from '@/hooks/use-theme-color'
import { BrandColors } from '@/constants/theme'

export type IconFamily = 'solid' | 'regular' | 'brands'

export interface IconProps {
  /**
   * Icon name (Font Awesome icon name)
   * @example 'home', 'user', 'heart', 'facebook'
   */
  name: string
  /**
   * Icon family/style to use
   * @default 'solid'
   */
  family?: IconFamily
  /**
   * Icon size in pixels
   * @default 24
   */
  size?: number
  /**
   * Color variant (uses theme colors)
   * @default 'default' - uses theme text color
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
   * Override color (takes precedence over variant)
   */
  color?: string
  /**
   * Additional className for styling
   */
  className?: string
  /**
   * Additional style prop
   */
  style?: React.CSSProperties
}

// Icon registry for dynamic icon lookup
const iconRegistry = {
  solid: solidIcons as unknown as Record<string, IconDefinition>,
  regular: regularIcons as unknown as Record<string, IconDefinition>,
  brands: brandsIcons as unknown as Record<string, IconDefinition>,
}

/**
 * Get icon definition from name and family
 * Supports both kebab-case (home) and camelCase (home) names
 * Converts "home" -> "faHome", "user-circle" -> "faUserCircle"
 */
function getIconDefinition(
  name: string,
  family: IconFamily
): IconDefinition | null {
  const registry = iconRegistry[family]

  // Convert kebab-case or snake_case to camelCase with "fa" prefix
  // e.g., "home" -> "faHome", "user-circle" -> "faUserCircle", "arrow-right" -> "faArrowRight"
  const camelCaseName = name
    .split(/[-_]/)
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join('')

  const iconKey = `fa${camelCaseName}`

  const icon = registry[iconKey]

  if (icon && typeof icon === 'object' && 'iconName' in icon) {
    return icon
  }

  return null
}

/**
 * Icon component with theme support
 *
 * Supports Font Awesome icons with automatic theme color integration.
 *
 * @example
 * ```tsx
 * <Icon name="home" family="solid" variant="primary" />
 * <Icon name="heart" family="regular" size={32} color="#27B7EE" />
 * <Icon name="facebook" family="brands" variant="primary" />
 * ```
 */
export function Icon({
  name,
  family = 'solid',
  size = 24,
  variant = 'default',
  color,
  className,
  style,
}: Readonly<IconProps>) {
  // Get theme colors
  const themeText = useThemeColor({}, 'text')
  const themePrimary = useThemeColor({}, 'primary')
  const themeCharcoal = useThemeColor({}, 'charcoal')
  const themeMidGray = useThemeColor({}, 'midGray')
  const themeSuccess = useThemeColor({}, 'success')
  const themeWarning = useThemeColor({}, 'warning')
  const themeError = useThemeColor({}, 'error')
  const themeWhite = BrandColors.neutral.white

  // Get color based on variant
  const variantColor = getVariantColor(variant, {
    text: themeText,
    primary: themePrimary,
    charcoal: themeCharcoal,
    midGray: themeMidGray,
    white: themeWhite,
    success: themeSuccess,
    warning: themeWarning,
    error: themeError,
  })

  const iconColor = color || variantColor

  // Get icon definition
  const iconDefinition = getIconDefinition(name, family)

  if (!iconDefinition) {
    console.warn(
      `Icon "${name}" not found in ${family} family. Falling back to solid.`
    )
    // Try solid as fallback
    const fallbackIcon = getIconDefinition(name, 'solid')
    if (!fallbackIcon) {
      console.error(`Icon "${name}" not found in any family.`)
      return null
    }
    return (
      <FontAwesomeIcon
        icon={fallbackIcon}
        size={size as unknown as SizeProp}
        color={iconColor}
        className={className}
        style={
          style as React.CSSProperties & Record<`--fa-font-${string}`, string>
        }
      />
    )
  }

  return (
    <FontAwesomeIcon
      icon={iconDefinition}
      size={size as unknown as SizeProp}
      color={iconColor}
      className={className}
      style={
        style as React.CSSProperties & Record<`--fa-font-${string}`, string>
      }
    />
  )
}

/**
 * Get color for icon variant
 */
function getVariantColor(
  variant: NonNullable<IconProps['variant']>,
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
      return colors.text
    case 'primary':
      return colors.primary
    case 'secondary':
      return colors.charcoal
    case 'muted':
      return colors.midGray
    case 'white':
      return colors.white
    case 'success':
      return colors.success
    case 'warning':
      return colors.warning
    case 'error':
      return colors.error
    default:
      return colors.text
  }
}
