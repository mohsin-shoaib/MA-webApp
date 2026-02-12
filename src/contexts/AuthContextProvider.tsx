import React, { useState, useCallback, useMemo } from 'react'
import { authService } from '@/api/auth.service'
import { AuthContext, type AuthContextValue } from './AuthContext'

interface User {
  id: string
  email: string
  name?: string
  firstName?: string
  lastName?: string
  role: string
  rememberMe?: boolean
}

// Initialize user from localStorage
function getInitialUser(): User | null {
  const token = localStorage.getItem('accessToken')
  if (!token) return null

  const storedUser = localStorage.getItem('user')
  if (storedUser) {
    try {
      return JSON.parse(storedUser)
    } catch {
      // Invalid stored user, clear it
      localStorage.removeItem('user')
      localStorage.removeItem('accessToken')
      return null
    }
  }
  return null
}

export function AuthProvider({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const [user, setUser] = useState<User | null>(getInitialUser)
  // isLoading starts as false since we initialize user synchronously
  const [isLoading] = useState(false)

  const login = useCallback((token: string, userData: User) => {
    localStorage.setItem('accessToken', token)
    localStorage.setItem('user', JSON.stringify(userData))
    setUser(userData)
  }, [])

  const logout = useCallback(() => {
    authService.logout()
    localStorage.removeItem('user')
    setUser(null)
    // Redirect will be handled by axios interceptor or component
    globalThis.location.href = '/login'
  }, [])

  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('accessToken')
    return !!token && !!user
  }, [user])

  const value: AuthContextValue = useMemo(
    () => ({
      user,
      isAuthenticated: !!user && !!localStorage.getItem('accessToken'),
      isLoading,
      login,
      logout,
      checkAuth,
    }),
    [user, isLoading, login, logout, checkAuth]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
