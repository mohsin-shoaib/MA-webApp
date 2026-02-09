import React, { useState } from 'react'
import { Icon } from '@/components/Icon'
import { Text } from '@/components/Text'
import { BrandColors } from '@/constants/theme'
import { useThemeColor } from '@/hooks/use-theme-color'
import { cn } from '@/utils/cn'

export interface AvatarProps {
  /**
   * Image source (URL string)
   */
  source?: string
  /**
   * User's name for generating initials
   */
  name?: string
  /**
   * Initials to display (overrides name-based initials)
   */
  initials?: string
  /**
   * Fallback icon name (if no image or initials)
   */
  fallbackIcon?: string
  /**
   * Avatar size
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large' | 'xlarge' | number
  /**
   * Whether to show a border/ring
   * @default false
   */
  showBorder?: boolean
  /**
   * Border color variant
   * @default 'primary'
   */
  borderVariant?: 'primary' | 'secondary' | 'muted'
  /**
   * Status indicator (online/offline/busy)
   */
  status?: 'online' | 'offline' | 'busy' | 'away'
  /**
   * Additional className for styling
   */
  className?: string
  /**
   * Additional style prop
   */
  style?: React.CSSProperties
}

/**
 * Avatar component - Displays user avatars with image, initials, or icon fallback
 *
 * Supports images, initials, and icon fallbacks with theme integration.
 * Perfect for user profiles, contact lists, and team displays.
 *
 * @example
 * ```tsx
 * <Avatar source="https://..." name="John Doe" />
 * <Avatar name="Jane Smith" size="large" />
 * <Avatar initials="AB" fallbackIcon="user" />
 * <Avatar source="https://..." showBorder status="online" />
 * ```
 */
export function Avatar({
  source,
  name,
  initials,
  fallbackIcon = 'user',
  size = 'medium',
  showBorder = false,
  borderVariant = 'primary',
  status,
  className,
  style,
}: Readonly<AvatarProps>) {
  const [imageError, setImageError] = useState(false)

  const themePrimary = useThemeColor({}, 'primary')
  const themePrimaryDark = useThemeColor({}, 'primaryDark')
  const themeMidGray = useThemeColor({}, 'midGray')
  const themeLightGray = BrandColors.neutral.lightGray
  const themeWhite = BrandColors.neutral.white

  // Get size dimensions
  const avatarSize = typeof size === 'number' ? size : getSizeValue(size)
  const fontSize = getFontSize(size)
  const iconSize = getIconSize(size)

  // Generate initials from name
  const displayInitials = initials || generateInitials(name)

  // Determine what to show
  const hasImage = source && !imageError
  const hasInitials = displayInitials && !hasImage
  const showIcon = !hasImage && !hasInitials

  // Get border color
  const borderColor = getBorderColor(borderVariant, {
    primary: themePrimary,
    primaryDark: themePrimaryDark,
    midGray: themeMidGray,
  })

  // Avatar container style
  const containerStyle: React.CSSProperties = {
    width: avatarSize,
    height: avatarSize,
    borderRadius: avatarSize / 2,
    backgroundColor: themeLightGray,
    overflow: 'hidden',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    flexShrink: 0,
    ...(showBorder && {
      borderWidth: 2,
      borderStyle: 'solid',
      borderColor: borderColor,
    }),
    ...style,
  }

  // Image style
  const imageStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  }

  const handleImageError = () => {
    setImageError(true)
  }

  const statusSize = getStatusSize(size)
  const statusColor = status ? getStatusColor(status) : undefined

  return (
    <div className={cn('relative', className)} style={containerStyle}>
      {hasImage && (
        <img
          src={source}
          alt={name || 'Avatar'}
          style={imageStyle}
          onError={handleImageError}
        />
      )}
      {hasInitials && (
        <Text
          variant="primary"
          style={{
            fontSize,
            fontWeight: 600,
          }}
        >
          {displayInitials}
        </Text>
      )}
      {showIcon && (
        <Icon
          name={fallbackIcon}
          family="solid"
          size={iconSize}
          variant="muted"
        />
      )}
      {status && statusColor && (
        <div
          style={{
            position: 'absolute',
            bottom: 0,
            right: 0,
            width: statusSize,
            height: statusSize,
            borderRadius: statusSize / 2,
            backgroundColor: statusColor,
            borderWidth: 2,
            borderStyle: 'solid',
            borderColor: themeWhite,
          }}
        />
      )}
    </div>
  )
}

/**
 * Get size value in pixels
 */
function getSizeValue(size: NonNullable<AvatarProps['size']>): number {
  if (typeof size === 'number') return size

  switch (size) {
    case 'small':
      return 32
    case 'medium':
      return 40
    case 'large':
      return 56
    case 'xlarge':
      return 80
    default:
      return 40
  }
}

/**
 * Get font size for initials based on avatar size
 */
function getFontSize(size: NonNullable<AvatarProps['size']>): number {
  if (typeof size === 'number') {
    return Math.max(12, size * 0.4)
  }

  switch (size) {
    case 'small':
      return 12
    case 'medium':
      return 16
    case 'large':
      return 20
    case 'xlarge':
      return 28
    default:
      return 16
  }
}

/**
 * Get icon size based on avatar size
 */
function getIconSize(size: NonNullable<AvatarProps['size']>): number {
  if (typeof size === 'number') {
    return Math.max(16, size * 0.5)
  }

  switch (size) {
    case 'small':
      return 16
    case 'medium':
      return 20
    case 'large':
      return 28
    case 'xlarge':
      return 40
    default:
      return 20
  }
}

/**
 * Get status indicator size
 */
function getStatusSize(size: NonNullable<AvatarProps['size']>): number {
  if (typeof size === 'number') {
    return Math.max(8, size * 0.25)
  }

  switch (size) {
    case 'small':
      return 8
    case 'medium':
      return 10
    case 'large':
      return 12
    case 'xlarge':
      return 16
    default:
      return 10
  }
}

/**
 * Generate initials from name
 */
function generateInitials(name?: string): string {
  if (!name) return ''

  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return ''

  if (parts.length === 1) {
    return parts[0].charAt(0).toUpperCase()
  }

  return (parts[0].charAt(0) + parts.at(-1)!.charAt(0)).toUpperCase()
}

/**
 * Get border color based on variant
 */
function getBorderColor(
  variant: NonNullable<AvatarProps['borderVariant']>,
  colors: {
    primary: string
    primaryDark: string
    midGray: string
  }
): string {
  switch (variant) {
    case 'primary':
      return colors.primary
    case 'secondary':
      return colors.primaryDark
    case 'muted':
      return colors.midGray
    default:
      return colors.primary
  }
}

/**
 * Get status indicator color
 */
function getStatusColor(status: NonNullable<AvatarProps['status']>): string {
  switch (status) {
    case 'online':
      return BrandColors.system.success
    case 'offline':
      return BrandColors.neutral.midGray
    case 'busy':
      return BrandColors.system.error
    case 'away':
      return BrandColors.system.warning
    default:
      return BrandColors.neutral.midGray
  }
}
