export interface LoginProps {
  email: string
  password: string
}

export interface LoginResponse {
  data: {
    token: string
    user: {
      id: string
      email: string
      name: string
      role: string
    }
  }
}

export interface RegisterProps {
  firstName: string
  lastName: string
  email: string
  password: string
  role: string
  rememberMe: boolean
}

export interface RegisterResponse {
  data: {
    token: string
    user: {
      id: string
      firstName: string
      lastName: string
      email: string
      role: string
      rememberMe: boolean
    }
  }
}

export interface ForgotPasswordProps {
  email: string
}

export interface ForgotPasswordResponse {
  data: {
    message: string
  }
}

export interface VerifyTokenResponse {
  data: {
    valid: boolean
    message?: string
  }
}

export interface ResetPasswordProps {
  token: string
  password: string
  confirmPassword: string
}

export interface ResetPasswordResponse {
  data: {
    message: string
  }
}
