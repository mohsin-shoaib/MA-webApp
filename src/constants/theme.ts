/**
 * Brand Colors - Use exactly as specified
 *
 * Primary Brand Colors:
 * - Primary Light Blue (#27B7EE): Primary buttons, key actions, progress indicators, highlights
 * - Primary Dark Blue (#1F8FD6): Secondary buttons, depth, emphasis, gradients
 *
 * Neutrals:
 * - Near Black (#0F1720): Primary text, icons, headers (no pure black)
 * - Charcoal (#2A2F36): Secondary text, inactive icons, helper text
 * - Mid Gray (#6B7280): Dividers, borders, disabled states
 * - Light Gray (#F3F4F6): Backgrounds, cards, panels (avoid pure white when possible)
 * - White (#FFFFFF): Text on dark backgrounds, limited UI surfaces
 *
 * System/State Colors:
 * - Success (#22C55E): System feedback only
 * - Warning (#F59E0B): System feedback only
 * - Error (#EF4444): System feedback only
 */

// Brand Colors
export const BrandColors = {
  primary: {
    light: '#27B7EE',
    dark: '#1F8FD6',
  },
  neutral: {
    nearBlack: '#0F1720',
    charcoal: '#2A2F36',
    midGray: '#6B7280',
    lightGray: '#F3F4F6',
    white: '#FFFFFF',
  },
  system: {
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
  },
} as const

export const Colors = {
  light: {
    text: BrandColors.neutral.nearBlack,
    background: BrandColors.neutral.lightGray,
    tint: BrandColors.primary.light,
    icon: BrandColors.neutral.charcoal,
    tabIconDefault: BrandColors.neutral.midGray,
    tabIconSelected: BrandColors.primary.light,
    // Brand color aliases
    primary: BrandColors.primary.light,
    primaryDark: BrandColors.primary.dark,
    // Neutral aliases
    nearBlack: BrandColors.neutral.nearBlack,
    charcoal: BrandColors.neutral.charcoal,
    midGray: BrandColors.neutral.midGray,
    lightGray: BrandColors.neutral.lightGray,
    white: BrandColors.neutral.white,
    // System colors
    success: BrandColors.system.success,
    warning: BrandColors.system.warning,
    error: BrandColors.system.error,
  },
  dark: {
    text: BrandColors.neutral.white,
    background: BrandColors.neutral.nearBlack,
    tint: BrandColors.primary.light,
    icon: BrandColors.neutral.midGray,
    tabIconDefault: BrandColors.neutral.midGray,
    tabIconSelected: BrandColors.primary.light,
    // Brand color aliases
    primary: BrandColors.primary.light,
    primaryDark: BrandColors.primary.dark,
    // Neutral aliases
    nearBlack: BrandColors.neutral.nearBlack,
    charcoal: BrandColors.neutral.charcoal,
    midGray: BrandColors.neutral.midGray,
    lightGray: BrandColors.neutral.lightGray,
    white: BrandColors.neutral.white,
    // System colors
    success: BrandColors.system.success,
    warning: BrandColors.system.warning,
    error: BrandColors.system.error,
  },
}

export const Fonts = {
  sans: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
  rounded:
    "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
  mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
} as const
