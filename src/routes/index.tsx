import Login from '@/pages/auth/login'
import Register from '@/pages/auth/register'
import ForgotPassword from '@/pages/auth/forgot-password'
import ResetPassword from '@/pages/auth/reset-password'
import Onboarding from '@/pages/onboarding/Onboarding'
import Program from '@/pages/program/program'
import AdminUserManagement from '@/pages/admin/user-management'
import AdminGoalTypes from '@/pages/admin/goal-types'
import CoachHeadUserManagement from '@/pages/coach-head/user-management'
import CoachUserManagement from '@/pages/coach/user-management'
import Profile from '@/pages/profile'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AuthRedirect } from '@/components/AuthRedirect'
import { NotFound } from '@/components/NotFound'
import { AppLayout } from '@/components/AppLayout'
import { Navigate } from 'react-router-dom'

export const routes = [
  {
    path: '/',
    element: <Navigate to="/login" replace />,
  },
  {
    path: '/login',
    element: (
      <AuthRedirect>
        <Login />
      </AuthRedirect>
    ),
  },
  {
    path: '/register',
    element: (
      <AuthRedirect>
        <Register />
      </AuthRedirect>
    ),
  },
  {
    path: '/forgot-password',
    element: (
      <AuthRedirect>
        <ForgotPassword />
      </AuthRedirect>
    ),
  },
  {
    path: '/reset-password',
    element: (
      <AuthRedirect>
        <ResetPassword />
      </AuthRedirect>
    ),
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
        <AppLayout>
          <Program />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/coach/user-management',
    element: (
      <ProtectedRoute allowedRoles={['COACH']}>
        <AppLayout>
          <CoachUserManagement />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/user-management',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AppLayout>
          <AdminUserManagement />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/goal-types',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AppLayout>
          <AdminGoalTypes />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/coach-head/user-management',
    element: (
      <ProtectedRoute allowedRoles={['COACH_HEAD']}>
        <AppLayout>
          <CoachHeadUserManagement />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/profile',
    element: (
      <ProtectedRoute>
        <AppLayout>
          <Profile />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <NotFound />,
  },
]
