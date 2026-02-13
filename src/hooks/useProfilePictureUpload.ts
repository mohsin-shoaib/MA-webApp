import { useState, useCallback } from 'react'
import { useFileUpload } from './useFileUpload'
import { FileType } from '@/constants/fileTypes'
import { userService } from '@/api/user.service'
import type { UploadProgress } from '@/types/upload'

/**
 * User data type returned from save file URL
 */
interface SavedFileUrlUser {
  id: string
  email: string
  name?: string
  firstName?: string
  lastName?: string
  role: string
  profilePicture?: string
  profileImageUrl?: string // API may return this field
}

/**
 * Return type for useProfilePictureUpload hook
 */
interface UseProfilePictureUploadReturn {
  uploadAndUpdate: (file: File) => Promise<SavedFileUrlUser>
  uploading: boolean
  updating: boolean
  progress: UploadProgress | null
  error: Error | null
  updateError: Error | null
  reset: () => void
}

/**
 * Specialized React hook for profile picture uploads
 *
 * Combines file upload with automatic profile update.
 * Handles the complete flow: upload file to S3, then update user profile with the file URL.
 *
 * @param onSuccess - Optional callback when upload and update complete successfully
 * @param onError - Optional callback when upload or update fails
 * @returns Upload functions and combined state
 *
 * @example
 * ```tsx
 * const { uploadAndUpdate, uploading, progress, error } = useProfilePictureUpload({
 *   onSuccess: (user) => {
 *     console.log('Profile picture updated:', user)
 *   },
 *   onError: (error) => {
 *     console.error('Failed:', error)
 *   },
 * })
 *
 * const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 *   const file = e.target.files?.[0]
 *   if (file) {
 *     uploadAndUpdate(file)
 *   }
 * }
 * ```
 */
interface UseProfilePictureUploadOptions {
  onSuccess?: (user: SavedFileUrlUser) => void
  onError?: (error: Error) => void
}

export const useProfilePictureUpload = (
  options?: UseProfilePictureUploadOptions
): UseProfilePictureUploadReturn => {
  const [updating, setUpdating] = useState(false)
  const [updateError, setUpdateError] = useState<Error | null>(null)

  const {
    upload,
    uploading,
    progress,
    error,
    reset: resetUpload,
  } = useFileUpload({
    fileType: FileType.PROFILE_IMAGE,
    onError: options?.onError,
  })

  const uploadAndUpdate = useCallback(
    async (file: File): Promise<SavedFileUrlUser> => {
      setUpdateError(null)

      try {
        // Step 1: Upload file to S3
        const fileUrl = await upload(file)

        // Step 2: Save file URL using dedicated API endpoint
        setUpdating(true)
        const response = await userService.saveFileUrl(
          fileUrl,
          FileType.PROFILE_IMAGE
        )

        const result = response.data.data

        // Extract user data from response
        if (!result.user) {
          throw new Error('User data not returned from save file URL endpoint')
        }

        // Normalize profile picture - use profileImageUrl if available, otherwise profilePicture
        const normalizedUser: SavedFileUrlUser = {
          ...result.user,
          profilePicture:
            result.user.profileImageUrl || result.user.profilePicture,
        }

        // Call success callback with updated user
        options?.onSuccess?.(normalizedUser)

        return normalizedUser
      } catch (err) {
        const uploadError =
          err instanceof Error ? err : new Error('Upload or save failed')
        setUpdateError(uploadError)
        options?.onError?.(uploadError)
        throw uploadError
      } finally {
        setUpdating(false)
      }
    },
    [upload, options]
  )

  const reset = useCallback(() => {
    resetUpload()
    setUpdating(false)
    setUpdateError(null)
  }, [resetUpload])

  return {
    uploadAndUpdate,
    uploading: uploading || updating,
    updating,
    progress,
    error: error || updateError,
    updateError,
    reset,
  }
}
