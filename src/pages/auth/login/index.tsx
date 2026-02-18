import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Text } from '@/components/Text'
import { useForm } from 'react-hook-form'
import type { LoginProps } from '@/types/auth'
import { authService } from '@/api/auth.service'
import { dashboardService } from '@/api/dashboard.service'
import { useNavigate, Link } from 'react-router-dom'
import { Stack } from '@/components/Stack'
import AuthLayout from '../authLayout'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { useAuth } from '@/contexts/useAuth'
import type { AxiosError } from 'axios'

const Login = () => {
  const navigate = useNavigate()
  const { showError } = useSnackbar()
  const { login: setAuth } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginProps>()

  const handleLogin = async (data: LoginProps) => {
    try {
      const response = await authService.login(data)
      const { token, user } = response.data.data

      // Update auth context (token is stored so next API call is authenticated)
      setAuth(token, {
        id: user.id,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      })

      // Navigate based on user role
      if (user.role === 'ATHLETE') {
        // Check onboarding status: if already onboarded (or has program data) go to dashboard, else onboarding with optional resume state
        const data = await dashboardService.getDashboard().catch(() => null)
        const hasProgram = data ? !!(data.today ?? data.cycle) : false
        const isOnboarded = data?.isOnboarded !== false || hasProgram
        if (isOnboarded) {
          navigate('/dashboard')
        } else {
          const hasResume = data != null && data.onboardingResumeStep != null
          navigate('/onboarding', {
            state:
              hasResume && data
                ? {
                    resumeStep: data.onboardingResumeStep as 2 | 3 | 4,
                    onboardingState: data.onboardingState,
                  }
                : undefined,
          })
        }
      } else if (user.role === 'COACH') {
        navigate('/create_program')
      } else if (user.role === 'ADMIN') {
        navigate('/admin/user-management')
      } else if (user.role === 'COACH_HEAD') {
        navigate('/coach-head/user-management')
      } else {
        // Default redirect for other roles
        navigate('/')
      }
    } catch (error) {
      console.error('Login error:', error)
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message ||
        'Login failed. Please check your credentials.'
      showError(errorMessage)
    }
  }
  return (
    <AuthLayout>
      <Stack className="flex justify-center items-center flex-1 space-y-4">
        <Text as="h1" variant="secondary" className="text-2xl font-bold">
          Welcome Back!
        </Text>
        <Text as="p" variant="muted">
          Sign in to continue your journey
        </Text>
        <form className="space-y-4 w-3/4" onSubmit={handleSubmit(handleLogin)}>
          <Input
            label="Email"
            placeholder="Enter your email"
            error={errors.email?.message}
            {...register('email', {
              required: true,
              validate: {
                matchPattren: value =>
                  /^([\w.-]+)?\w+@[\w-]+(\.\w+)+$/.test(value) ||
                  'Email Address must be valid',
              },
            })}
          />
          <Input
            label="Password"
            type="password"
            showPasswordToggle
            placeholder="Enter your password"
            error={errors.password?.message}
            {...register('password', {
              required: true,
            })}
          />
          <Text as="p" variant="primary" className="text-right font-bold">
            <Link to="/forgot-password">Forgot Password?</Link>
          </Text>
          <Button variant="primary" type="submit" className="w-full">
            Sign In
          </Button>
        </form>
        <Stack className="flex flex-row justify-center items-center space-x-2">
          <Text as="p" variant="secondary">
            Don't have an account?
          </Text>
          <Text as="span" variant="primary">
            <Link to="/register">Sign Up</Link>
          </Text>
        </Stack>
      </Stack>
    </AuthLayout>
  )
}

export default Login
