import { FileType, FILE_TYPE_CONFIG } from '@/constants/fileTypes'
import type {
  PresignedUrlRequest,
  PresignedUrlResponse,
  UploadProgress,
  ApiResponse,
} from '@/types/upload'

/**
 * Upload Service
 *
 * Handles presigned URL requests and direct S3 file uploads.
 * Provides file validation and progress tracking.
 */
export class UploadService {
  private baseURL: string
  private readonly requestPresignedUrlEndpoint =
    'shared/user/request-presigned-url'

  constructor(baseURL?: string) {
    this.baseURL = baseURL || import.meta.env.VITE_API_BASE_URL || ''
  }

  /**
   * Get authentication token from localStorage
   */
  private getAuthToken(): string | null {
    return localStorage.getItem('accessToken')
  }

  /**
   * Request presigned URL from backend
   *
   * @param file - File to upload
   * @param fileType - Type of file (from FileType enum)
   * @param parent - Optional parent type override (defaults to fileType config)
   * @returns Presigned URL response with upload URL and file URL
   * @throws Error if authentication fails or request fails
   */
  async requestPresignedUrl(
    file: File,
    fileType: FileType,
    parent?: string
  ): Promise<PresignedUrlResponse> {
    const token = this.getAuthToken()
    if (!token) {
      throw new Error('Authentication token not found')
    }

    const config = FILE_TYPE_CONFIG[fileType]
    const requestBody: PresignedUrlRequest = {
      fileName: file.name,
      contentType: file.type,
      fileType,
      parent: parent || config.parent,
    }

    // Normalize URL to handle trailing slashes
    const baseUrl = this.baseURL.endsWith('/')
      ? this.baseURL.slice(0, -1)
      : this.baseURL
    const endpoint = this.requestPresignedUrlEndpoint.startsWith('/')
      ? this.requestPresignedUrlEndpoint.slice(1)
      : this.requestPresignedUrlEndpoint
    const url = `${baseUrl}/${endpoint}`

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    })

    if (!response.ok) {
      const error = await response
        .json()
        .catch(() => ({ message: 'Request failed' }))
      throw new Error(
        error.message ||
          error.data?.message ||
          `HTTP ${response.status}: ${response.statusText}`
      )
    }

    const result: ApiResponse<PresignedUrlResponse> = await response.json()
    return result.data
  }

  /**
   * Upload file directly to S3 using presigned URL
   *
   * @param presignedUrl - Presigned URL from backend
   * @param file - File to upload
   * @param onProgress - Optional progress callback
   * @returns Promise that resolves when upload completes
   * @throws Error if upload fails
   */
  async uploadToS3(
    presignedUrl: string,
    file: File,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()

      // Track upload progress
      if (onProgress) {
        xhr.upload.addEventListener('progress', e => {
          if (e.lengthComputable) {
            onProgress({
              loaded: e.loaded,
              total: e.total,
              percent: (e.loaded / e.total) * 100,
            })
          }
        })
      }

      // Handle completion
      xhr.addEventListener('load', () => {
        if (xhr.status === 200 || xhr.status === 204) {
          resolve()
        } else {
          // Try to get error message from response
          let errorMessage = `Upload failed with status ${xhr.status}`
          try {
            const responseText = xhr.responseText
            if (responseText) {
              const errorData = JSON.parse(responseText)
              errorMessage =
                errorData.message || errorData.error || errorMessage
            }
          } catch {
            // Ignore JSON parse errors
          }
          reject(new Error(errorMessage))
        }
      })

      // Handle errors (including CORS errors)
      xhr.addEventListener('error', () => {
        // Check if it's a CORS error
        if (xhr.status === 0) {
          reject(
            new Error(
              'CORS error: The S3 bucket may not have CORS configured. Please contact the administrator.'
            )
          )
        } else {
          reject(
            new Error(
              'Upload failed: Network error. Please check your connection.'
            )
          )
        }
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was aborted'))
      })

      // Handle timeout
      xhr.addEventListener('timeout', () => {
        reject(new Error('Upload timed out. Please try again.'))
      })

      // Set timeout (5 minutes)
      xhr.timeout = 5 * 60 * 1000

      // Start upload
      xhr.open('PUT', presignedUrl)

      // Set Content-Type header - this is important for S3
      // The presigned URL should match the Content-Type we send
      xhr.setRequestHeader('Content-Type', file.type)

      // Don't set any other headers - let the presigned URL handle authentication
      xhr.send(file)
    })
  }

  /**
   * Complete upload flow: request URL, upload, return file URL
   *
   * @param file - File to upload
   * @param fileType - Type of file (from FileType enum)
   * @param parent - Optional parent type override
   * @param onProgress - Optional progress callback
   * @returns File URL for saving to entity
   * @throws Error if any step fails
   */
  async uploadFile(
    file: File,
    fileType: FileType,
    parent?: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<string> {
    // Step 1: Request presigned URL
    const { presignedUrl, fileUrl } = await this.requestPresignedUrl(
      file,
      fileType,
      parent
    )

    // Step 2: Upload to S3
    await this.uploadToS3(presignedUrl, file, onProgress)

    // Step 3: Return file URL for saving
    return fileUrl
  }

  /**
   * Validate file before upload
   *
   * @param file - File to validate
   * @param fileType - Type of file (from FileType enum)
   * @returns Validation result with error message if invalid
   */
  validateFile(
    file: File,
    fileType: FileType
  ): { valid: boolean; error?: string } {
    const config = FILE_TYPE_CONFIG[fileType]

    // Check file type
    if (!config.allowedMimeTypes.includes(file.type)) {
      return {
        valid: false,
        error: `File type ${file.type} is not allowed. Allowed types: ${config.allowedMimeTypes.join(', ')}`,
      }
    }

    // Check file size
    if (file.size > config.maxSize) {
      const maxSizeMB = (config.maxSize / 1024 / 1024).toFixed(2)
      return {
        valid: false,
        error: `File size exceeds maximum allowed size of ${maxSizeMB}MB`,
      }
    }

    return { valid: true }
  }
}

// Export singleton instance
export const uploadService = new UploadService()
