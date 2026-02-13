import api from './axios'
import type {
  GetUsersResponse,
  UpdateUserRoleProps,
  UpdateUserRoleResponse,
} from '@/types/admin'

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
}
