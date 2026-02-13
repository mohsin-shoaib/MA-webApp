import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Text } from '@/components/Text'
import { Spinner } from '@/components/Spinner'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { authService } from '@/api/auth.service'
import type { ResetPasswordProps } from '@/types/auth'
import AuthLayout from '../authLayout'
import { Stack } from '@/components/Stack'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { AxiosError } from 'axios'

const ResetPassword = () => {
  const navigate = useNavigate()
  const { showSuccess, showError } = useSnackbar()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    getValues,
  } = useForm<ResetPasswordProps>()

  const password = watch('password')
  const confirmPassword = watch('confirmPassword')

  // Verify token on mount
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setTokenError('Invalid reset link. Missing token.')
        setVerifying(false)
        return
      }

      try {
        const response = await authService.verifyResetToken(token)
        if (response.data.data.valid) {
          setTokenValid(true)
        } else {
          setTokenError(
            response.data.data.message || 'Invalid or expired reset token'
          )
        }
      } catch (err) {
        console.error('Verify token error:', err)
        const axiosError = err as AxiosError<{ message: string }>
        const errorMessage =
          axiosError.response?.data?.message || 'Failed to verify reset token'
        setTokenError(errorMessage)
      } finally {
        setVerifying(false)
      }
    }

    verifyToken()
  }, [token])

  const onSubmit = async (data: ResetPasswordProps) => {
    if (!token) {
      showError('Invalid reset link. Missing token.')
      return
    }

    setLoading(true)

    try {
      const payload = { ...data, token }
      const response = await authService.resetPassword(payload)
      console.log('Reset password response:', response.data.data)
      setSuccess(true)
      showSuccess('Password reset successful! Redirecting to login...')

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login')
      }, 3000)
    } catch (error) {
      console.error('Reset password error:', error)
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message ||
        'Failed to reset password. Please try again.'
      showError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Loading state while verifying token
  if (verifying) {
    return (
      <AuthLayout>
        <Stack className="flex justify-center items-center flex-1 space-y-4">
          <Spinner size="medium" variant="primary" />
          <Text as="p" variant="muted">
            Verifying reset token...
          </Text>
        </Stack>
      </AuthLayout>
    )
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <AuthLayout>
        <Stack className="flex justify-center items-center flex-1 space-y-4">
          <div className="w-16 h-16 bg-error/20 rounded-full flex items-center justify-center mb-4">
            <Text as="span" variant="error" className="text-3xl font-bold">
              ✕
            </Text>
          </div>
          <Text as="h1" variant="secondary" className="text-2xl font-bold">
            Invalid Reset Link
          </Text>
          <Stack direction="vertical" spacing={8} className="text-center w-3/4">
            <Text as="p" variant="error">
              {tokenError || 'This reset link is invalid or has expired.'}
            </Text>
            <Text as="p" variant="muted" className="text-sm">
              The link may have expired (15 minutes) or already been used.
            </Text>
          </Stack>
          <Stack direction="vertical" spacing={12} className="w-3/4">
            <Link to="/forgot-password" className="w-full">
              <Button variant="primary" className="w-full">
                Request New Reset Link
              </Button>
            </Link>
            <Link to="/login" className="w-full">
              <Button variant="outline" className="w-full">
                Back to Login
              </Button>
            </Link>
          </Stack>
        </Stack>
      </AuthLayout>
    )
  }

  // Success state
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
            Password Reset Successful
          </Text>
          <Stack direction="vertical" spacing={8} className="text-center w-3/4">
            <Text as="p" variant="muted">
              Your password has been successfully reset.
            </Text>
            <Text as="p" variant="muted" className="text-sm">
              You can now login with your new password.
            </Text>
            <Text as="p" variant="primary" className="text-sm italic">
              Redirecting to login page...
            </Text>
          </Stack>
        </Stack>
      </AuthLayout>
    )
  }

  // Reset form
  return (
    <AuthLayout>
      <Stack className="flex justify-center items-center flex-1 space-y-4">
        <Text as="h1" variant="secondary" className="text-2xl font-bold">
          Reset Your Password
        </Text>
        <Text as="p" variant="muted">
          Enter your new password below.
        </Text>
        <form className="space-y-4 w-3/4" onSubmit={handleSubmit(onSubmit)}>
          <Input
            label="New Password"
            type="password"
            showPasswordToggle
            placeholder="Enter new password"
            error={errors.password?.message}
            disabled={loading}
            helperText="Password must be at least 8 characters long"
            {...register('password', {
              required: 'Password is required',
              minLength: {
                value: 8,
                message: 'Password must be at least 8 characters long',
              },
            })}
          />

          <Input
            label="Confirm Password"
            type="password"
            showPasswordToggle
            placeholder="Confirm new password"
            error={errors.confirmPassword?.message}
            disabled={loading}
            {...register('confirmPassword', {
              required: 'Please confirm your password',
              validate: value =>
                value === getValues('password') || 'Passwords do not match',
            })}
          />

          <Button
            variant="primary"
            type="submit"
            loading={loading}
            disabled={loading || !password || !confirmPassword}
            className="w-full"
          >
            Reset Password
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

export default ResetPassword
