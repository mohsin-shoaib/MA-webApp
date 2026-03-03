import Login from '@/pages/auth/login'
import Register from '@/pages/auth/register'
import ForgotPassword from '@/pages/auth/forgot-password'
import ResetPassword from '@/pages/auth/reset-password'
import AcceptInvite from '@/pages/auth/accept-invite'
import Subscription from '@/pages/auth/subscription'
import RegisterMobile from '@/pages/auth/register-mobile'
import Onboarding from '@/pages/onboarding/Onboarding'
import CoachProgramManagement from '@/pages/coach/program-management'
import CoachCyclePrograms from '@/pages/coach/program-management/cycle-programs'
import AdminUserManagement from '@/pages/admin/user-management'
import AdminGoalTypes from '@/pages/admin/goal-types'
import AdminProgramManagement from '@/pages/admin/program-management'
import CyclePrograms from '@/pages/admin/program-management/cycle-programs'
import AdminAnnouncements from '@/pages/admin/announcements'
import AdminCurriculum from '@/pages/admin/curriculum'
import AdminCoachAssignment from '@/pages/admin/coach-assignment'
import AdminRecoveryProtocols from '@/pages/admin/recovery-protocols'
import AdminMarketplace from '@/pages/admin/marketplace'
import AdminTests from '@/pages/admin/tests'
import AdminExercises from '@/pages/admin/exercises'
import CoachHeadUserManagement from '@/pages/coach-head/user-management'
import CoachUserManagement from '@/pages/coach/user-management'
import CoachAthleteDetail from '@/pages/coach/athlete-detail'
import CoachMyAthletes from '@/pages/coach/my-athletes'
import Profile from '@/pages/profile'
import Train from '@/pages/train'
import WorkoutPlayer from '@/pages/train/WorkoutPlayer'
import TodaySession from '@/pages/train/TodaySession'
import ExerciseLibrary from '@/pages/train/ExerciseLibrary'
import AthleteExerciseLibrary from '@/pages/train/AthleteExerciseLibrary'
import { ProgramBrowser } from '@/pages/train/ProgramBrowser'
import { ProgramDetail } from '@/pages/train/ProgramDetail'
import NutritionHub from '@/pages/train/NutritionHub'
import RecoveryHub from '@/pages/train/RecoveryHub'
import Dashboard from '@/pages/dashboard'
import Goals from '@/pages/goals'
import Progress from '@/pages/progress'
import TestsPage from '@/pages/progress/TestsPage'
import AnalyticsPage from '@/pages/progress/AnalyticsPage'
import CoachAnalyticsPage from '@/pages/coach/CoachAnalyticsPage.tsx'
import CoachDashboard from '@/pages/coach/CoachDashboard'
import CoachMarketplace from '@/pages/coach/marketplace'
import CoachExercises from '@/pages/coach/exercises'
import AdminAnalyticsPage from '@/pages/admin/AdminAnalyticsPage.tsx'
import AdminOnboardingReview from '@/pages/admin/onboarding-review'
import Coach from '@/pages/coach'
import Market from '@/pages/market'
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
    path: '/register-mobile',
    element: (
      <AuthRedirect>
        <RegisterMobile />
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
    path: '/accept-invite',
    element: <AcceptInvite />,
  },
  {
    path: '/subscription',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <Subscription />
      </ProtectedRoute>
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
        <Navigate to="/coach/program-management" replace />
      </ProtectedRoute>
    ),
  },
  {
    path: '/coach/dashboard',
    element: (
      <ProtectedRoute allowedRoles={['COACH', 'COACH_HEAD']}>
        <AppLayout>
          <CoachDashboard />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/coach/program-management',
    element: (
      <ProtectedRoute allowedRoles={['COACH']}>
        <AppLayout>
          <CoachProgramManagement />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/coach/program-management/cycles/:cycleId/programs',
    element: (
      <ProtectedRoute allowedRoles={['COACH']}>
        <AppLayout>
          <CoachCyclePrograms />
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
    path: '/coach/athletes/:athleteId',
    element: (
      <ProtectedRoute allowedRoles={['COACH', 'COACH_HEAD']}>
        <AppLayout>
          <CoachAthleteDetail />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/coach/my-athletes',
    element: (
      <ProtectedRoute allowedRoles={['COACH']}>
        <AppLayout>
          <CoachMyAthletes />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/coach/analytics',
    element: (
      <ProtectedRoute allowedRoles={['COACH']}>
        <AppLayout>
          <CoachAnalyticsPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/coach/marketplace',
    element: (
      <ProtectedRoute allowedRoles={['COACH']}>
        <AppLayout>
          <CoachMarketplace />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/coach/exercises',
    element: (
      <ProtectedRoute allowedRoles={['COACH']}>
        <AppLayout>
          <CoachExercises />
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
    path: '/admin/announcements',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AppLayout>
          <AdminAnnouncements />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/curriculum',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AppLayout>
          <AdminCurriculum />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/coach-assignment',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AppLayout>
          <AdminCoachAssignment />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/marketplace',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AppLayout>
          <AdminMarketplace />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/recovery-protocols',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN', 'COACH']}>
        <AppLayout>
          <AdminRecoveryProtocols />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/tests',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AppLayout>
          <AdminTests />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/exercises',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AppLayout>
          <AdminExercises />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/exercise-options',
    element: <Navigate to="/admin/exercises" replace />,
  },
  {
    path: '/admin/analytics',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AppLayout>
          <AdminAnalyticsPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/admin/onboarding-review',
    element: (
      <ProtectedRoute allowedRoles={['ADMIN']}>
        <AppLayout>
          <AdminOnboardingReview />
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
    path: '/goals',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <AppLayout>
          <Goals />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/progress',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <AppLayout>
          <Progress />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/progress/tests',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <AppLayout>
          <TestsPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/progress/analytics',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <AppLayout>
          <AnalyticsPage />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/coach',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <AppLayout>
          <Coach />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '/market',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <AppLayout>
          <Market />
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
    path: '/train/exercises',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <AppLayout>
          <AthleteExerciseLibrary />
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
    path: '/train/recovery',
    element: (
      <ProtectedRoute allowedRoles={['ATHLETE']}>
        <AppLayout>
          <RecoveryHub />
        </AppLayout>
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: <NotFound />,
  },
]
