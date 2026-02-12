import api from './axios'
import type {
  UpdateProfileProps,
  UpdateProfileResponse,
  GetProfileResponse,
  UploadProfilePictureResponse,
} from '@/types/user'

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
   * Upload profile picture
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
