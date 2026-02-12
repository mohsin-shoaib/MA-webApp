import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Text } from '@/components/Text'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { authService } from '@/api/auth.service'
import type { ForgotPasswordProps } from '@/types/auth'
import AuthLayout from '../authLayout'
import { Stack } from '@/components/Stack'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { AxiosError } from 'axios'

const ForgotPassword = () => {
  const { showSuccess, showError } = useSnackbar()
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordProps>()

  const onSubmit = async (data: ForgotPasswordProps) => {
    setLoading(true)

    try {
      const response = await authService.forgotPassword(data)
      console.log('Forgot password response:', response.data.data)
      setSuccess(true)
      showSuccess('Password reset link sent! Please check your email.')
    } catch (error) {
      console.error('Forgot password error:', error)
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message ||
        'Failed to send reset link. Please try again.'
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <AuthLayout>
        <Stack className="flex justify-center items-center flex-1 space-y-4">
          <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mb-4">
            <Text as="span" variant="success" className="text-3xl font-bold">
              ✓
            </Text>
          </div>
          <Text as="h1" variant="secondary" className="text-2xl font-bold">
            Check Your Email
          </Text>
          <Stack direction="vertical" spacing={8} className="text-center w-3/4">
            <Text as="p" variant="muted">
              If an account with that email exists, a password reset link has
              been sent.
            </Text>
            <Text as="p" variant="muted" className="text-sm">
              Please check your email and click the link to reset your password.
              The link will expire in 15 minutes.
            </Text>
          </Stack>
          <Link to="/login" className="w-3/4">
            <Button variant="primary" className="w-full">
              Back to Login
            </Button>
          </Link>
        </Stack>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Stack className="flex justify-center items-center flex-1 space-y-4">
        <Text as="h1" variant="secondary" className="text-2xl font-bold">
          Forgot Password
        </Text>
        <Text as="p" variant="muted">
          Enter your email address and we'll send you a link to reset your
          password.
        </Text>
        <form className="space-y-4 w-3/4" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="Email Address"
            placeholder="Enter your email"
            type="email"
            error={errors.email?.message}
            disabled={loading}
            {...register('email', {
              required: 'Email is required',
              validate: {
                matchPattren: value =>
                  /^([\w.-]+)?\w+@[\w-]+(\.\w+)+$/.test(value) ||
                  'Email Address must be valid',
              },
            })}
          />

          <Button
            variant="primary"
            type="submit"
            loading={loading}
            disabled={loading}
            className="w-full"
          >
            Send Reset Link
          </Button>
        </form>
        <Stack className="flex flex-row justify-center items-center space-x-2">
          <Text as="p" variant="secondary">
            Remember your password?
          </Text>
          <Text as="span" variant="primary">
            <Link to="/login">Sign In</Link>
          </Text>
        </Stack>
      </Stack>
    </AuthLayout>
  )
}

export default ForgotPassword
