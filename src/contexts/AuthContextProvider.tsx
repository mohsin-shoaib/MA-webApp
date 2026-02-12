import React, { useState, useCallback, useMemo, useEffect } from 'react'
import { authService } from '@/api/auth.service'
import { userService } from '@/api/user.service'
import { AuthContext, type AuthContextValue } from './AuthContext'

interface User {
  id: string
  email: string
  name?: string
  firstName?: string
  lastName?: string
  role: string
  rememberMe?: boolean
  profilePicture?: string
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
  const [isLoading, setIsLoading] = useState(false)

  // Fetch complete user profile on mount if user exists but missing firstName/lastName
  useEffect(() => {
    const fetchUserProfile = async () => {
      const token = localStorage.getItem('accessToken')
      const currentUser = user || getInitialUser()

      if (!token || !currentUser) {
        setIsLoading(false)
        return
      }

      // If user already has firstName and lastName, we're good
      if (currentUser.firstName && currentUser.lastName) {
        setIsLoading(false)
        return
      }

      // Fetch profile to get complete user data
      try {
        setIsLoading(true)
        const response = await userService.getProfile()
        console.log('Profile API response:', response.data)

        // Get user from response (structure: response.data.data.user)
        const profileUser = response.data.data.user

        console.log('Extracted profile user:', profileUser)

        const completeUser: User = {
          id: profileUser.id,
          email: profileUser.email,
          name: profileUser.name,
          firstName: profileUser.firstName,
          lastName: profileUser.lastName,
          role: profileUser.role,
          rememberMe: profileUser.rememberMe,
          profilePicture: profileUser.profilePicture,
        }

        console.log('Complete user object:', completeUser)

        // Update localStorage and state
        localStorage.setItem('user', JSON.stringify(completeUser))
        setUser(completeUser)
      } catch (error) {
        console.error('Failed to fetch user profile:', error)
        // Keep existing user data if fetch fails
      } finally {
        setIsLoading(false)
      }
    }

    fetchUserProfile()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run on mount

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
