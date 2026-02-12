import { useContext } from 'react'
import { AuthContext } from './AuthContext'
import type { AuthContextValue } from './AuthContext'

/**
 * Hook to access authentication context
 *
 * @example
 * ```tsx
 * const { user, isAuthenticated, logout } = useAuth()
 *
 * if (isAuthenticated) {
 *   return <div>Welcome, {user?.email}</div>
 * }
 * ```
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
