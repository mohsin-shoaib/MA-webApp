import { useState, useCallback } from 'react'
import { uploadService } from '@/services/uploadService'
import type { FileType } from '@/constants/fileTypes'
import type { UploadProgress } from '@/types/upload'

/**
 * Options for useFileUpload hook
 */
interface UseFileUploadOptions {
  fileType: FileType
  parent?: string
  onSuccess?: (fileUrl: string) => void
  onError?: (error: Error) => void
}

/**
 * Return type for useFileUpload hook
 */
interface UseFileUploadReturn {
  upload: (file: File) => Promise<string>
  uploading: boolean
  progress: UploadProgress | null
  error: Error | null
  reset: () => void
}

/**
 * React hook for file uploads with state management
 *
 * Provides a simple interface for uploading files to S3 using presigned URLs.
 * Handles validation, progress tracking, and error management.
 *
 * @param options - Configuration options for the upload hook
 * @returns Upload functions and state
 *
 * @example
 * ```tsx
 * const { upload, uploading, progress, error } = useFileUpload({
 *   fileType: FileType.PROFILE_IMAGE,
 *   onSuccess: (fileUrl) => {
 *     console.log('Upload successful:', fileUrl)
 *   },
 *   onError: (error) => {
 *     console.error('Upload failed:', error)
 *   },
 * })
 *
 * const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 *   const file = e.target.files?.[0]
 *   if (file) {
 *     upload(file)
 *   }
 * }
 * ```
 */
export const useFileUpload = (
  options: UseFileUploadOptions
): UseFileUploadReturn => {
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState<UploadProgress | null>(null)
  const [error, setError] = useState<Error | null>(null)

  // Destructure options to ensure proper dependency tracking
  const { fileType, parent, onSuccess, onError } = options

  const upload = useCallback(
    async (file: File): Promise<string> => {
      setUploading(true)
      setError(null)
      setProgress(null)

      try {
        // Validate file
        const validation = uploadService.validateFile(file, fileType)
        if (!validation.valid) {
          throw new Error(validation.error)
        }

        // Upload file
        const fileUrl = await uploadService.uploadFile(
          file,
          fileType,
          parent,
          progressData => {
            setProgress(progressData)
          }
        )

        // Call success callback
        onSuccess?.(fileUrl)
        return fileUrl
      } catch (err) {
        const uploadError =
          err instanceof Error ? err : new Error('Upload failed')
        setError(uploadError)
        onError?.(uploadError)
        throw uploadError
      } finally {
        setUploading(false)
        setProgress(null)
      }
    },
    [fileType, parent, onSuccess, onError]
  )

  const reset = useCallback(() => {
    setUploading(false)
    setProgress(null)
    setError(null)
  }, [])

  return {
    upload,
    uploading,
    progress,
    error,
    reset,
  }
}
