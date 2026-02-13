import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { Spinner } from '@/components/Spinner'
import { Stack } from '@/components/Stack'

interface ProtectedRouteProps {
  children: React.ReactNode
  /**
   * Roles that are allowed to access this route
   * If not provided, any authenticated user can access
   */
  allowedRoles?: string[]
  /**
   * Redirect path if not authenticated
   * @default '/login'
   */
  redirectTo?: string
}

/**
 * ProtectedRoute component
 *
 * Protects routes that require authentication.
 * Redirects to login if user is not authenticated.
 * Optionally restricts access based on user roles.
 *
 * @example
 * ```tsx
 * <ProtectedRoute allowedRoles={['COACH', 'ADMIN']}>
 *   <AdminPanel />
 * </ProtectedRoute>
 * ```
 */
export function ProtectedRoute({
  children,
  allowedRoles,
  redirectTo = '/login',
}: Readonly<ProtectedRouteProps>) {
  const { isAuthenticated, isLoading, user } = useAuth()
  const location = useLocation()

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Stack className="flex justify-center items-center min-h-screen">
        <Spinner size="medium" variant="primary" />
      </Stack>
    )
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to={redirectTo} state={{ from: location }} replace />
  }

  // Check role-based access
  if (allowedRoles && user && !allowedRoles.includes(user.role)) {
    // User doesn't have required role, redirect to appropriate page
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
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
