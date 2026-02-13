import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { Spinner } from '@/components/Spinner'
import { Stack } from '@/components/Stack'

/**
 * AuthRedirect component
 *
 * Redirects authenticated users away from auth pages (login, register, etc.)
 * to their role-specific dashboard.
 *
 * @example
 * ```tsx
 * <AuthRedirect>
 *   <Login />
 * </AuthRedirect>
 * ```
 */
export function AuthRedirect({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const { isAuthenticated, isLoading, user } = useAuth()

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Stack className="flex justify-center items-center min-h-screen">
        <Spinner size="medium" variant="primary" />
      </Stack>
    )
  }

  // If authenticated, redirect to role-specific page
  if (isAuthenticated && user) {
    if (user.role === 'ATHLETE') {
      return <Navigate to="/onboarding" replace />
    }
    if (user.role === 'COACH') {
      return <Navigate to="/create_program" replace />
    }
    if (user.role === 'ADMIN') {
      return <Navigate to="/admin/user-management" replace />
    }
    if (user.role === 'COACH_HEAD') {
      return <Navigate to="/coach-head/user-management" replace />
    }
    // Default redirect for unknown roles
    return <Navigate to="/" replace />
  }

  // Not authenticated, show auth page
  return <>{children}</>
}
