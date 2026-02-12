import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Text } from '@/components/Text'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useState } from 'react'
import { authService } from '@/api/auth.service'
import type { ForgotPasswordProps } from '@/types/auth'
import type { AxiosError } from 'axios'

const ForgotPassword = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordProps>()

  const onSubmit = async (data: ForgotPasswordProps) => {
    setError(null)
    setLoading(true)

    try {
      const response = await authService.forgotPassword(data)
      console.log('Forgot password response:', response.data.data)
      setSuccess(true)
    } catch (err) {
      console.error('Forgot password error:', err)
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
              Check Your Email
            </Text>
            <Text as="p" variant="secondary" className="text-gray-600 mb-4">
              If an account with that email exists, a password reset link has
              been sent.
            </Text>
            <Text as="p" variant="secondary" className="text-sm text-gray-500">
              Please check your email and click the link to reset your password.
              The link will expire in 15 minutes.
            </Text>
          </div>
          <Button
            variant="primary"
            onClick={() => navigate('/login')}
            className="w-full"
          >
            Back to Login
          </Button>
        </div>
      </div>
    )
  }

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
            Forgot Password
          </Text>
          <Text as="p" variant="secondary" className="text-gray-600">
            Enter your email address and we'll send you a link to reset your
            password.
          </Text>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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
                  /^([\w._-]+)?\w+@[\w-]+(\.\w+)+$/.test(value) ||
                  'Email Address must be valid',
              },
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
            disabled={loading}
            className="w-full"
          >
            Send Reset Link
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

export default ForgotPassword
