import React from 'react'
import { Stack } from '../../components/Stack'
import authImage from '../../assets/images/auth.png'

const AuthLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <Stack className="flex flex-row h-screen w-full">
      <Stack className="hidden sm:flex justify-center items-center w-2/4">
        <img src={authImage} alt="auth" className="w-full h-full object-fill" />
      </Stack>
      <Stack className="w-full sm:w-2/4">{children}</Stack>
    </Stack>
  )
}
export default AuthLayout
