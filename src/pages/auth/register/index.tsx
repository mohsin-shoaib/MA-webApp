import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Text } from '@/components/Text'
import { useForm } from 'react-hook-form'
import type { RegisterProps } from '@/types/auth'
import { authService } from '@/api/auth.service'
import AuthLayout from '../authLayout'
import { Stack } from '@/components/Stack'
import { Link, useNavigate } from 'react-router-dom'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { useAuth } from '@/contexts/useAuth'
import { registerFcmTokenIfNeeded } from '@/lib/fcm-registration'
import type { AxiosError } from 'axios'

interface FormValues extends RegisterProps {
  confirmPassword: string // only frontend use
}

const Register = () => {
  const navigate = useNavigate()
  const { showSuccess, showError } = useSnackbar()
  const { login: setAuth } = useAuth()
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<FormValues>({
    defaultValues: {
      role: 'ATHLETE',
    },
  })

  const handleRegister = async (data: FormValues) => {
    try {
      // Coach accounts are created via admin invite only; public register is athletes only
      const registerPayload: RegisterProps = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        role: 'ATHLETE',
        rememberMe: false,
      }
      const response = await authService.register(registerPayload)
      console.log('login response::', response.data.data)

      const { token, user } = response.data.data

      // Update auth context
      setAuth(token, {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        rememberMe: user.rememberMe,
      })

      if (user.role === 'ATHLETE') {
        registerFcmTokenIfNeeded().catch(() => {})
      }

      showSuccess('Registration successful!')

      // Navigate based on user role (PRD 8.1.3: athlete proceeds to subscription then onboarding)
      if (user.role === 'ATHLETE') {
        navigate('/subscription')
      } else {
        navigate('/')
      }
    } catch (error) {
      console.error(error)
      // Show error message from API or default message
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message ||
        'Registration failed. Please try again.'
      showError(errorMessage)
    }
  }
  return (
    <AuthLayout>
      <Stack className="flex justify-center items-center flex-1 space-y-4">
        <Text as="h1" variant="secondary" className="text-2xl font-bold">
          Join Us
        </Text>
        <Text as="p" variant="muted">
          Enter your details to get started with your new account
        </Text>
        <form
          className="space-y-4 w-3/4"
          onSubmit={handleSubmit(handleRegister)}
        >
          <Input
            label="First Name"
            placeholder="Enter you First Name"
            error={errors.firstName?.message}
            {...register('firstName', { required: 'First Name is required' })}
          />
          <Input
            label="Last Name"
            placeholder="Enter you Last Name"
            error={errors.lastName?.message}
            {...register('lastName', { required: 'Last Name is required' })}
          />
          <Input
            label="Email"
            placeholder="Enter your email"
            error={errors.email?.message}
            {...register('email', {
              required: 'Email is required',
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
              required: 'Password is required',
              minLength: {
                value: 6,
                message: 'Password must be at least 6 characters',
              },
            })}
          />

          <Input
            label="Confirm Password"
            type="password"
            showPasswordToggle
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              validate: value =>
                value === getValues('password') || 'Passwords do not match',
            })}
          />

          <Button variant="primary" type="submit" className="w-full">
            Create Account
          </Button>
        </form>
        <Stack className="flex flex-row justify-center items-center space-x-2">
          <Text as="p" variant="secondary">
            Already have an account?
          </Text>
          <Text as="span" variant="primary">
            <Link to="/login">Sign In</Link>
          </Text>
        </Stack>
      </Stack>
    </AuthLayout>
  )
}

export default Register
