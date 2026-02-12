import Login from '@/pages/auth/login'
import Register from '@/pages/auth/register'
import Onboarding from '@/pages/onboarding/Onboarding'
import Program from '@/pages/program/program'

export const routes = [
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/register',
    element: <Register />,
  },
  {
    path: '/onboarding',
    element: <Onboarding />,
  },
  {
    path: '/create_program',
    element: <Program />,
  },
]
