import api from './axios'
import type {
  LoginProps,
  LoginResponse,
  RegisterProps,
  RegisterResponse,
  ForgotPasswordProps,
  ForgotPasswordResponse,
  VerifyTokenResponse,
  ResetPasswordProps,
  ResetPasswordResponse,
  ChangePasswordProps,
  ChangePasswordResponse,
} from '@/types/auth'

export const authService = {
  login: (payload: LoginProps) =>
    api.post<LoginResponse>('shared/auth/login', payload),

  register: (payload: RegisterProps) =>
    api.post<RegisterResponse>('shared/auth/register', payload),

  logout: () => {
    localStorage.removeItem('accessToken')
  },

  forgotPassword: (payload: ForgotPasswordProps) =>
    api.post<ForgotPasswordResponse>('shared/auth/forgot-password', payload),

  verifyResetToken: (token: string) =>
    api.get<VerifyTokenResponse>('shared/auth/verify-reset-token', {
      params: { token },
    }),

  resetPassword: (payload: ResetPasswordProps) =>
    api.post<ResetPasswordResponse>('shared/auth/reset-password', payload),

  changePassword: (payload: ChangePasswordProps) =>
    api.post<ChangePasswordResponse>('shared/auth/change-password', payload),
}
