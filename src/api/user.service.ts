import api from './axios'
import type {
  UpdateProfileProps,
  UpdateProfileResponse,
  GetProfileResponse,
  UploadProfilePictureResponse,
} from '@/types/user'
import type { PresignedUrlRequest } from '@/types/upload'

/**
 * Response type for presigned URL request
 */
interface RequestPresignedUrlResponse {
  data: {
    presignedUrl: string
    fileUrl: string
    key: string
    expiresIn: number
  }
}

/**
 * Response type for save file URL
 */
interface SaveFileUrlResponse {
  data: {
    message: string
    fileUrl: string
    user?: {
      id: string
      email: string
      name?: string
      firstName?: string
      lastName?: string
      role: string
      profilePicture?: string
      profileImageUrl?: string // API may return this field
    }
  }
}

export const userService = {
  /**
   * Get current user profile
   */
  getProfile: () => api.get<GetProfileResponse>('shared/user/profile'),

  /**
   * Update user profile
   */
  updateProfile: (payload: UpdateProfileProps) =>
    api.put<UpdateProfileResponse>('shared/user/profile', payload),

  /**
   * Request presigned URL for file upload
   *
   * @param payload - Presigned URL request payload
   * @returns Presigned URL response with upload URL and file URL
   */
  requestPresignedUrl: (payload: PresignedUrlRequest) =>
    api.post<RequestPresignedUrlResponse>(
      'shared/user/request-presigned-url',
      payload
    ),

  /**
   * Save file URL to user profile
   *
   * @param fileUrl - The S3 file URL to save
   * @param fileType - The type of file (e.g., 'profile', 'video', 'image', 'document')
   * @returns Response confirming file URL was saved with updated user data
   */
  saveFileUrl: (fileUrl: string, fileType: string) =>
    api.post<SaveFileUrlResponse>(
      'shared/user/save-file-url',
      { fileUrl },
      {
        params: { fileType },
      }
    ),

  /**
   * Upload profile picture (legacy method - uses FormData)
   * Kept for backward compatibility
   *
   * @deprecated Consider using presigned URL flow with uploadService instead
   */
  uploadProfilePicture: (file: File) => {
    const formData = new FormData()
    formData.append('image', file)
    return api.post<UploadProfilePictureResponse>(
      'shared/user/upload-image',
      formData
    )
  },
}
