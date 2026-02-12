export interface UpdateProfileProps {
  firstName?: string
  lastName?: string
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
    }
  }
}

export interface GetProfileResponse {
  data: {
    user: {
      id: string
      email: string
      name?: string
      firstName?: string
      lastName?: string
      role: string
      rememberMe?: boolean
      profilePicture?: string
    }
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
