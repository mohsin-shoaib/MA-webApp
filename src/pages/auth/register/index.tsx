import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Text } from '@/components/Text'
import { Radio } from '@/components/Radio'
import { useForm, useWatch } from 'react-hook-form'
import type { RegisterProps } from '@/types/auth'
import { authService } from '@/api/auth.service'
import AuthLayout from '../authLayout'
import { Stack } from '@/components/Stack'
import { Link } from 'react-router-dom'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { AxiosError } from 'axios'

interface FormValues extends RegisterProps {
  confirmPassword: string // only frontend use
}

const Register = () => {
  const { showSuccess, showError } = useSnackbar()
  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
    control,
    setValue,
  } = useForm<FormValues>({
    defaultValues: {
      role: 'ATHLETE', // Default role
    },
  })

  const selectedRole = useWatch({
    control,
    name: 'role',
    defaultValue: 'ATHLETE',
  })

  const handleRegister = async (data: FormValues) => {
    try {
      // Ensure role is included in payload
      // confirmPassword is excluded as it's only for frontend validation
      const registerPayload: RegisterProps = {
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        password: data.password,
        role: data.role || 'ATHLETE',
        rememberMe: false, // Add default value for rememberMe
      }
      const response = await authService.register(registerPayload)
      console.log('login response::', response.data.data)

      const { token, user } = response.data.data

      localStorage.setItem('accessToken', token)

      console.log('Register user:', user)
      showSuccess('Registration successful!')
      // navigate("/dashboard")
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

          {/* Role Selection */}
          <Stack direction="vertical" spacing={8}>
            <Text as="label" variant="default" className="text-sm font-medium">
              Role <span className="text-error">*</span>
            </Text>
            <Stack direction="horizontal" spacing={16} className="flex-wrap">
              <Radio
                selected={selectedRole === 'ATHLETE'}
                onPress={() =>
                  setValue('role', 'ATHLETE', { shouldValidate: true })
                }
                label="Athlete"
                value="ATHLETE"
                name="role"
              />
              <Radio
                selected={selectedRole === 'COACH'}
                onPress={() =>
                  setValue('role', 'COACH', { shouldValidate: true })
                }
                label="Coach"
                value="COACH"
                name="role"
              />
            </Stack>
            {errors.role && (
              <Text variant="error" className="text-sm">
                {errors.role.message}
              </Text>
            )}
          </Stack>
          {/* Hidden input for form validation */}
          <input
            type="hidden"
            {...register('role', {
              required: 'Please select a role',
              validate: value =>
                value === 'ATHLETE' ||
                value === 'COACH' ||
                'Please select a valid role',
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
