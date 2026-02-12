import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Text } from '@/components/Text'
import { useForm } from 'react-hook-form'
import type { LoginProps } from '@/types/auth'
import { authService } from '@/api/auth.service'
import { useNavigate, Link } from 'react-router-dom'
import { Stack } from '@/components/Stack'
import AuthLayout from '../authLayout'

const Login = () => {
  const navigate = useNavigate()
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginProps>()

  const handleLogin = async (data: LoginProps) => {
    try {
      const response = await authService.login(data)
      console.log('login response::', response.data.data)

      const { token, user } = response.data.data

      localStorage.setItem('accessToken', token)

      console.log('Logged in user:', user)
      if (user.role === 'ATHLETE') {
        navigate('/onboarding')
      }
    } catch (error) {
      console.error(error)
      // show error message / toast
      console.log('Api error::', error)
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
