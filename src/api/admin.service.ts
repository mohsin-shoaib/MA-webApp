import api from './axios'
import type {
  GetUsersResponse,
  UpdateUserRoleProps,
  UpdateUserRoleResponse,
  GetFlaggedOnboardingsResponse,
  ClearOnboardingFlagResponse,
} from '@/types/admin'
import type { GetCyclesResponse } from '@/types/cycle'

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
   * Get all cycles (admin only)
   * GET /api/v1/cycle/admin/list
   */
  getCycles: () => api.get<GetCyclesResponse>('cycle/admin/list'),

  /**
   * List onboardings flagged for review (user selected "Other" goal and chose closest option)
   */
  getFlaggedOnboardings: () =>
    api.get<GetFlaggedOnboardingsResponse>('admin/onboardings/flagged'),

  /**
   * Clear flagged-for-review on an onboarding after admin review
   */
  clearOnboardingFlag: (onboardingId: number) =>
    api.patch<ClearOnboardingFlagResponse>(
      `admin/onboardings/${onboardingId}/clear-flag`
    ),

  /** MASS Phase 3: Get working maxes for a user. GET admin/users/:userId/working-max */
  getUserWorkingMax: (userId: number) =>
    api.get<{
      statusCode: number
      data: {
        workingMaxes: Array<{
          exerciseId: number
          exerciseName: string
          value: number
          unit: string
          source: string
          updatedAt: string
        }>
      }
    }>(`admin/users/${userId}/working-max`),

  /** MASS Phase 3: Set user working max. POST admin/users/:userId/working-max */
  setUserWorkingMax: (
    userId: number,
    body: { exerciseId: number; value: number; unit: 'lb' | 'kg' }
  ) =>
    api.post<{ statusCode: number; data: { workingMax: unknown } }>(
      `admin/users/${userId}/working-max`,
      body
    ),
}
