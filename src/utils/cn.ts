/**
 * Utility function to merge classNames
 * Filters out falsy values and joins them with spaces
 */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ')
}
