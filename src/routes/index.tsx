import Login from '@/pages/auth/login'
import Register from '@/pages/auth/register'
import ForgotPassword from '@/pages/auth/forgot-password'
import ResetPassword from '@/pages/auth/reset-password'
import Onboarding from '@/pages/onboarding/Onboarding'
import Program from '@/pages/program/program'
import AdminUserManagement from '@/pages/admin/user-management'
import AdminGoalTypes from '@/pages/admin/goal-types'
import AdminProgramManagement from '@/pages/admin/program-management'
import CyclePrograms from '@/pages/admin/program-management/cycle-programs'
import CoachHeadUserManagement from '@/pages/coach-head/user-management'
import CoachUserManagement from '@/pages/coach/user-management'
import Profile from '@/pages/profile'
import Train from '@/pages/train'
import WorkoutPlayer from '@/pages/train/WorkoutPlayer'
import TodaySession from '@/pages/train/TodaySession'
import ExerciseLibrary from '@/pages/train/ExerciseLibrary'
import { ProgramBrowser } from '@/pages/train/ProgramBrowser'
import { ProgramDetail } from '@/pages/train/ProgramDetail'
import NutritionHub from '@/pages/train/NutritionHub'
import Dashboard from '@/pages/dashboard'
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
    path: '/admin/program-management',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AppLayout>
          <AdminProgramManagement />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/program-management/cycles/:cycleId/programs',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AppLayout>
          <CyclePrograms />
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
    path: '/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <AppLayout>
          <Dashboard />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/train',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <AppLayout>
          <Train />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/train/programs',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <AppLayout>
          <ProgramBrowser />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/train/programs/:id',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <AppLayout>
          <ProgramDetail />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/train/today',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <AppLayout>
          <TodaySession />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/train/player',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <AppLayout>
          <WorkoutPlayer />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/train/library',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <AppLayout>
          <ExerciseLibrary />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/train/nutrition',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <AppLayout>
          <NutritionHub />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <NotFound />,
  },
]
