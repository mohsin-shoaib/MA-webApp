export interface User extends Record<string, unknown> {
  id: string | number
  email: string
  name?: string
  firstName?: string
  lastName?: string
  role: string
  profilePicture?: string
  createdAt?: string
  updatedAt?: string
  isActive?: boolean
  referralCode?: string
}

export interface GetUsersResponse {
  statusCode: number
  status: string
  data: {
    rows: User[]
    meta: {
      total: number
      page: number
      limit: number
      pages: number
    }
  }
  message: string
}

export interface UpdateUserRoleProps {
  role: string
}

export interface UpdateUserRoleResponse {
  statusCode: number
  status: string
  data: {
    user: User
  }
  message: string
}
