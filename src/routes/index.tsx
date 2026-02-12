import Login from '@/pages/auth/login'
import Register from '@/pages/auth/register'
import ForgotPassword from '@/pages/auth/forgot-password'
import ResetPassword from '@/pages/auth/reset-password'
import Onboarding from '@/pages/onboarding/Onboarding'
import Program from '@/pages/program/program'
import AdminUserManagement from '@/pages/admin/user-management'
import CoachHeadUserManagement from '@/pages/coach-head/user-management'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Navigate } from 'react-router-dom'

export const routes = [
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/forgot-password',
    element: <ForgotPassword />,
  },
  {
    path: '/reset-password',
    element: <ResetPassword />,
  },
  {
    path: '/onboarding',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <Onboarding />
      </ProtectedRoute>
    ),
  },
  {
    path: '/create_program',
    element: (
      <ProtectedRoute allowedRoles={['COACH']}>
        <Program />
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/user-management',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AdminUserManagement />
      </ProtectedRoute>
    ),
  },
  {
    path: '/coach-head/user-management',
    element: (
      <ProtectedRoute allowedRoles={['COACH_HEAD']}>
        <CoachHeadUserManagement />
      </ProtectedRoute>
    ),
  },
]
