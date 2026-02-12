import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Text } from '@/components/Text'
import { useForm } from 'react-hook-form'
import type { LoginProps } from '@/types/auth'
import { authService } from '@/api/auth.service'
import { useNavigate, Link } from 'react-router-dom'

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
    <div className="flex h-screen w-[vw]">
      {/* Left Column */}
      <div className="hidden sm:flex flex-1 bg-gray-200 flex items-center justify-center">
        <h1>Image here</h1>
      </div>

      {/* Right Column */}
      <div className="flex-1 flex flex-col justify-center p-8">
        <div className="mb-6">
          <Text as="h1" variant="secondary" className="text-2xl font-bold mb-2">
            Welcome Back!
          </Text>
          <Text as="p" variant="secondary" className="text-gray-600">
            Sign in to continue your journey
          </Text>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit(handleLogin)}>
          <Input
            label="Email"
            placeholder="Enter your email"
            className="text-black"
            error={errors.email?.message}
            {...register('email', {
              required: true,
              validate: {
                matchPattren: value =>
                  /^([\w._-]+)?\w+@[\w-]+(\.\w+)+$/.test(value) ||
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
          <Text
            as="p"
            variant="primary"
            className="text-right font-bold underline"
          >
            <Link to="/forgot-password">Forgot Password?</Link>
          </Text>
          <Button variant="primary" type="submit" className="w-full">
            Sign In
          </Button>
        </form>

        <div className="flex p-1 justify-center m-2 gap-1.5">
          <Text as="p" variant="secondary">
            Don't have an account?
          </Text>
          <Text as="span" variant="primary">
            <Link to="/register">Sign Up</Link>
          </Text>
        </div>
      </div>
    </div>
  )
}

export default Login
