import { Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/useAuth'
import { Spinner } from '@/components/Spinner'
import { Stack } from '@/components/Stack'

/**
 * NotFound component
 *
 * Handles 404/not found routes:
 * - If unauthenticated → redirects to login
 * - If authenticated → redirects to role-specific home page
 */
export function NotFound() {
  const { isAuthenticated, isLoading, user } = useAuth()

  // Show loading spinner while checking authentication
  if (isLoading) {
    return (
      <Stack className="flex justify-center items-center min-h-screen">
        <Spinner size="medium" variant="primary" />
      </Stack>
    )
  }

  // If not authenticated, redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // If authenticated, redirect to role-specific home page
  if (user) {
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
  }

  // Fallback to login
  return <Navigate to="/login" replace />
}
