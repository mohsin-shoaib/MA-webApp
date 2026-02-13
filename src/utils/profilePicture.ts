/**
 * Normalize profile picture URL
 *
 * Handles both profileImageUrl and profilePicture fields from API responses.
 * Filters out empty strings and returns a valid URL or undefined.
 *
 * @param profileImageUrl - profileImageUrl field from API
 * @param profilePicture - profilePicture field from API
 * @returns Normalized profile picture URL or undefined
 */
export function normalizeProfilePicture(
  profileImageUrl?: string | null,
  profilePicture?: string | null
): string | undefined {
  // Check profileImageUrl first (preferred field name from API)
  if (profileImageUrl && profileImageUrl.trim() !== '') {
    return profileImageUrl.trim()
  }

  // Fallback to profilePicture
  if (profilePicture && profilePicture.trim() !== '') {
    return profilePicture.trim()
  }

  return undefined
}

/**
 * Get profile picture from user object
 *
 * @param user - User object that may have profileImageUrl or profilePicture (can be null)
 * @returns Profile picture URL or undefined
 */
export function getProfilePicture(
  user?: {
    profileImageUrl?: string | null
    profilePicture?: string | null
  } | null
): string | undefined {
  if (!user) return undefined
  return normalizeProfilePicture(user.profileImageUrl, user.profilePicture)
}
