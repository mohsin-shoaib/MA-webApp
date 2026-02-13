export interface UpdateProfileProps {
  firstName?: string
  lastName?: string
  profileImageUrl?: string
}

export interface UpdateProfileResponse {
  data: {
    message: string
    user: {
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

export interface GetProfileResponse {
  statusCode: number
  status: string
  message: string
  data: {
    id: number | string
    email: string
    name?: string
    firstName?: string
    lastName?: string | null
    role: string
    rememberMe?: boolean
    profilePicture?: string
    profileImageUrl?: string // API may return this field
    createdAt?: string
    updatedAt?: string
    referralCode?: string | null
  }
}

export interface UploadProfilePictureResponse {
  data: {
    message: string
    user: {
      id: string
      email: string
      name?: string
      firstName?: string
      lastName?: string
      role: string
      profilePicture?: string
    }
  }
}
