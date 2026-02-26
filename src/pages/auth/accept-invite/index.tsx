import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Text } from '@/components/Text'
import { Spinner } from '@/components/Spinner'
import { useForm } from 'react-hook-form'
import AuthLayout from '../authLayout'
import { Stack } from '@/components/Stack'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { useAuth } from '@/contexts/useAuth'
import { coachInviteService } from '@/api/coach-invite.service'
import type { AxiosError } from 'axios'

interface FormValues {
  password: string
  confirmPassword: string
  firstName?: string
  lastName?: string
}

const AcceptInvite = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')
  const { showSuccess, showError } = useSnackbar()
  const { login: setAuth } = useAuth()

  const [loading, setLoading] = useState(false)
  const [verifying, setVerifying] = useState(true)
  const [invite, setInvite] = useState<{
    email: string
    firstName?: string | null
    lastName?: string | null
  } | null>(null)
  const [tokenError, setTokenError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<FormValues>({
    defaultValues: {
      firstName: '',
      lastName: '',
    },
  })

  useEffect(() => {
    const fetchInvite = async () => {
      if (!token) {
        setTokenError('Invalid invite link. Missing token.')
        setVerifying(false)
        return
      }
      try {
        const res = await coachInviteService.getByToken(token)
        if (res.data.statusCode === 200 && res.data.data) {
          setInvite(res.data.data)
        } else {
          setTokenError('Invalid or expired invite.')
        }
      } catch (err) {
        const axiosError = err as AxiosError<{ message: string }>
        setTokenError(
          axiosError.response?.data?.message ||
            'Invalid or expired invite link.'
        )
      } finally {
        setVerifying(false)
      }
    }
    fetchInvite()
  }, [token])

  const onSubmit = async (data: FormValues) => {
    if (!token) return
    setLoading(true)
    try {
      const res = await coachInviteService.acceptCoach({
        token,
        password: data.password,
        firstName: data.firstName || undefined,
        lastName: data.lastName || undefined,
      })
      const response = res.data
      if (response.statusCode === 200 && response.data) {
        const { token: authToken, user } = response.data
        setAuth(authToken, {
          id: String(user.id),
          email: user.email,
          firstName: user.firstName ?? undefined,
          lastName: user.lastName ?? undefined,
          role: user.role,
          rememberMe: false,
        })
        showSuccess('Account created. Welcome!')
        navigate('/coach/program-management', { replace: true })
      } else {
        showError(response.message || 'Something went wrong.')
      }
    } catch (err) {
      const axiosError = err as AxiosError<{ message: string }>
      showError(
        axiosError.response?.data?.message || 'Failed to create account.'
      )
    } finally {
      setLoading(false)
    }
  }

  if (verifying) {
    return (
      <AuthLayout>
        <Stack className="flex justify-center items-center flex-1">
          <Spinner size="large" />
          <Text variant="muted" className="mt-4">
            Verifying invite...
          </Text>
        </Stack>
      </AuthLayout>
    )
  }

  if (tokenError) {
    return (
      <AuthLayout>
        <Stack className="flex justify-center items-center flex-1 space-y-4">
          <Text as="h1" variant="secondary" className="text-xl font-bold">
            Invalid invite
          </Text>
          <Text variant="muted" className="text-center">
            {tokenError}
          </Text>
          <Button variant="primary" onClick={() => navigate('/login')}>
            Go to login
          </Button>
        </Stack>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout>
      <Stack className="flex justify-center items-center flex-1 space-y-4">
        <Text as="h1" variant="secondary" className="text-2xl font-bold">
          Accept coach invite
        </Text>
        {invite && (
          <Text variant="muted" className="text-center">
            Create your account for {invite.email}
          </Text>
        )}
        <form
          className="space-y-4 w-3/4 max-w-md"
          onSubmit={handleSubmit(onSubmit)}
        >
          <Input
            label="First name (optional)"
            placeholder="First name"
            {...register('firstName')}
          />
          <Input
            label="Last name (optional)"
            placeholder="Last name"
            {...register('lastName')}
          />
          <Input
            label="Password"
            type="password"
            showPasswordToggle
            placeholder="Choose a password"
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
            label="Confirm password"
            type="password"
            showPasswordToggle
            placeholder="Confirm password"
            error={errors.confirmPassword?.message}
            {...register('confirmPassword', {
              validate: v =>
                v === getValues('password') || 'Passwords do not match',
            })}
          />
          <Button
            type="submit"
            variant="primary"
            className="w-full"
            loading={loading}
          >
            Create coach account
          </Button>
        </form>
      </Stack>
    </AuthLayout>
  )
}

export default AcceptInvite
