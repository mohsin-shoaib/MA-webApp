import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Text } from '@/components/Text'
import { Spinner } from '@/components/Spinner'
import { useForm } from 'react-hook-form'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { authService } from '@/api/auth.service'
import type { ResetPasswordProps } from '@/types/auth'
import type { AxiosError } from 'axios'

const ResetPassword = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState(false)

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
        setError('Invalid reset link. Missing token.')
        setVerifying(false)
        return
      }

      try {
        const response = await authService.verifyResetToken(token)
        if (response.data.data.valid) {
          setTokenValid(true)
        } else {
          setError(
            response.data.data.message || 'Invalid or expired reset token'
          )
        }
      } catch (err) {
        console.error('Verify token error:', err)
        const axiosError = err as AxiosError<{ message: string }>
        const errorMessage =
          axiosError.response?.data?.message ||
          (err instanceof Error ? err.message : null) ||
          'Failed to verify reset token'
        setError(errorMessage)
      } finally {
        setVerifying(false)
      }
    }

    verifyToken()
  }, [token])

  const onSubmit = async (data: ResetPasswordProps) => {
    if (!token) {
      setError('Invalid reset link. Missing token.')
      return
    }

    setError(null)
    setLoading(true)

    try {
      const payload = { ...data, token }
      const response = await authService.resetPassword(payload)
      console.log('Reset password response:', response.data.data)
      setSuccess(true)

      // Redirect to login after 3 seconds
      setTimeout(() => {
        navigate('/login', {
          state: {
            message:
              'Password reset successful. Please login with your new password.',
          },
        })
      }, 3000)
    } catch (err) {
      console.error('Reset password error:', err)
      const axiosError = err as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message ||
        (err instanceof Error ? err.message : null) ||
        'An unexpected error occurred. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Loading state while verifying token
  if (verifying) {
    return (
      <div className="flex h-screen w-[vw]">
        {/* Left Column */}
        <div className="hidden sm:flex flex-1 bg-gray-200 flex items-center justify-center">
          <h1>Image here</h1>
        </div>

        {/* Right Column */}
        <div className="flex-1 flex flex-col justify-center p-8 items-center">
          <Spinner size="medium" variant="primary" />
          <Text as="p" variant="secondary" className="mt-4">
            Verifying reset token...
          </Text>
        </div>
      </div>
    )
  }

  // Invalid token state
  if (!tokenValid) {
    return (
      <div className="flex h-screen w-[vw]">
        {/* Left Column */}
        <div className="hidden sm:flex flex-1 bg-gray-200 flex items-center justify-center">
          <h1>Image here</h1>
        </div>

        {/* Right Column */}
        <div className="flex-1 flex flex-col justify-center p-8">
          <div className="mb-6 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Text as="span" className="text-3xl text-red-600">
                ✕
              </Text>
            </div>
            <Text
              as="h1"
              variant="secondary"
              className="text-2xl font-bold mb-2"
            >
              Invalid Reset Link
            </Text>
            <Text as="p" variant="error" className="mb-4">
              {error || 'This reset link is invalid or has expired.'}
            </Text>
            <Text
              as="p"
              variant="secondary"
              className="text-sm text-gray-500 mb-6"
            >
              The link may have expired (15 minutes) or already been used.
            </Text>
          </div>
          <div className="space-y-3">
            <Button
              variant="primary"
              onClick={() => navigate('/forgot-password')}
              className="w-full"
            >
              Request New Reset Link
            </Button>
            <Button
              variant="outline"
              onClick={() => navigate('/login')}
              className="w-full"
            >
              Back to Login
            </Button>
          </div>
        </div>
      </div>
    )
  }

  // Success state
  if (success) {
    return (
      <div className="flex h-screen w-[vw]">
        {/* Left Column */}
        <div className="hidden sm:flex flex-1 bg-gray-200 flex items-center justify-center">
          <h1>Image here</h1>
        </div>

        {/* Right Column */}
        <div className="flex-1 flex flex-col justify-center p-8">
          <div className="mb-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Text as="span" className="text-3xl text-green-600">
                ✓
              </Text>
            </div>
            <Text
              as="h1"
              variant="secondary"
              className="text-2xl font-bold mb-2"
            >
              Password Reset Successful
            </Text>
            <Text as="p" variant="secondary" className="text-gray-600 mb-4">
              Your password has been successfully reset.
            </Text>
            <Text as="p" variant="secondary" className="text-sm text-gray-500">
              You can now login with your new password.
            </Text>
            <Text as="p" variant="primary" className="text-sm italic mt-2">
              Redirecting to login page...
            </Text>
          </div>
        </div>
      </div>
    )
  }

  // Reset form
  return (
    <div className="flex h-screen w-[vw]">
      {/* Left Column */}
      <div className="hidden sm:flex flex-1 bg-gray-200 flex items-center justify-center">
        <h1>Image here</h1>
      </div>

      {/* Right Column */}
      <div className="flex-1 flex flex-col justify-center p-8">
        <div className="mb-6">
          <Text as="h1" variant="secondary" className="text-2xl font-bold mb-2">
            Reset Your Password
          </Text>
          <Text as="p" variant="secondary" className="text-gray-600">
            Enter your new password below.
          </Text>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <Text variant="error" className="text-sm">
                {error}
              </Text>
            </div>
          )}

          <Button
            variant="primary"
            type="submit"
            loading={loading}
            disabled={loading || !password || !confirmPassword}
            className="w-full"
          >
            Reset Password
          </Button>

          <div className="text-center">
            <Text
              as="p"
              variant="primary"
              className="font-bold underline cursor-pointer"
              onClick={() => navigate('/login')}
            >
              ← Back to Login
            </Text>
          </div>
        </form>
      </div>
    </div>
  )
}

export default ResetPassword
