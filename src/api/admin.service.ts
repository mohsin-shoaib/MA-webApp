import api from './axios'
import type {
  GetUsersResponse,
  UpdateUserRoleProps,
  UpdateUserRoleResponse,
} from '@/types/admin'
import type { GetCyclesResponse } from '@/types/cycle'

/** Response from impersonate: new access token to act as user */
export interface ImpersonateResponse {
  statusCode: number
  data?: { accessToken: string }
  message?: string
}

/** Response from reset-password: link to send to user */
export interface ResetPasswordResponse {
  statusCode: number
  data?: { resetLink?: string }
  message?: string
}

/** Program enrollment row for admin view */
export interface ProgramEnrollmentRow {
  id: number
  userId: number
  programId: number
  isActive: boolean
  startDate: string
  endDate?: string | null
  user?: { id: number; email: string; firstName?: string; lastName?: string }
}

export interface GetProgramEnrollmentsResponse {
  statusCode: number
  data: {
    rows: ProgramEnrollmentRow[]
    meta?: { total: number; page: number; limit: number; pages: number }
  }
}

export const adminService = {
  /**
   * Get all users (admin only)
   */
  getUsers: () => api.get<GetUsersResponse>('admin/users'),

  /**
   * Update user role (admin only)
   */
  updateUserRole: (userId: string | number, payload: UpdateUserRoleProps) =>
    api.put<UpdateUserRoleResponse>(`admin/users/${userId}/role`, payload),

  /**
   * Impersonate user (admin only). Returns new access token.
   */
  impersonate: (userId: string | number) =>
    api.post<ImpersonateResponse>(`admin/users/${userId}/impersonate`),

  /**
   * Trigger reset password for user (admin only). Returns reset link.
   */
  resetPassword: (userId: string | number) =>
    api.post<ResetPasswordResponse>(`admin/users/${userId}/reset-password`),

  /**
   * Disable user (admin only)
   */
  disable: (userId: string | number) =>
    api.patch<{ statusCode: number; message?: string }>(
      `admin/users/${userId}/disable`
    ),

  /**
   * Enable user (admin only)
   */
  enable: (userId: string | number) =>
    api.patch<{ statusCode: number; message?: string }>(
      `admin/users/${userId}/enable`
    ),

  /**
   * Get enrollments for a program (admin only)
   */
  getProgramEnrollments: (
    programId: number,
    params?: { page?: number; limit?: number }
  ) =>
    api.get<GetProgramEnrollmentsResponse>(
      `admin/program/enrollments/${programId}`,
      { params }
    ),

  /**
   * Get all cycles (admin only)
   * GET /api/v1/cycle/admin/list
   */
  getCycles: () => api.get<GetCyclesResponse>('cycle/admin/list'),
}
