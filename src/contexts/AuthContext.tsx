import { createContext } from 'react'

interface User {
  id: string
  email: string
  name?: string
  firstName?: string
  lastName?: string
  role: string
  rememberMe?: boolean
}

export interface AuthContextValue {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (token: string, user: User) => void
  logout: () => void
  checkAuth: () => boolean
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
)
