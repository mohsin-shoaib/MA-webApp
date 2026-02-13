/**
 * Program Helper Functions
 *
 * Utility functions for program management operations.
 */

/**
 * Generate unique exercise ID
 * @returns A unique exercise identifier string
 */
export const generateExerciseId = (): string => {
  return `exercise-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get authentication token from storage
 * @returns The access token or empty string if not found
 */
export const getToken = (): string => {
  // Using 'accessToken' as per codebase convention
  return localStorage.getItem('accessToken') || ''
}

/**
 * Validate S3 URL
 * @param url - The URL to validate
 * @returns True if the URL is a valid S3 URL, false otherwise
 */
export const isValidS3Url = (url: string): boolean => {
  if (!url || typeof url !== 'string') {
    return false
  }
  const s3UrlPattern = /^https?:\/\/.*\.s3\.(.*\.)?amazonaws\.com\/.*/
  return s3UrlPattern.test(url)
}

/**
 * Format day for display based on cycle type
 * @param day - The day value (either "day1", "day2" for sequential or ISO date string for Amber)
 * @param cycleName - The name of the cycle (e.g., "Red", "Green", "Amber")
 * @returns Formatted day string for display
 */
export const formatDay = (day: string, cycleName: string): string => {
  if (!day) {
    return ''
  }

  if (cycleName === 'Amber') {
    try {
      const date = new Date(day)
      if (isNaN(date.getTime())) {
        return day // Return original if invalid date
      }
      return date.toLocaleDateString()
    } catch {
      return day // Return original on error
    }
  }

  // For Red/Green cycles, return as-is (e.g., "day1", "day2")
  return day
}
