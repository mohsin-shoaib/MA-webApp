/**
 * PRD 8.2: Registration NOT available on mobile.
 * This screen is shown on the mobile app; it displays a message and redirect button to the web app.
 */
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import AuthLayout from '../authLayout'
import { Stack } from '@/components/Stack'

const WEB_APP_REGISTER_URL =
  typeof window !== 'undefined'
    ? `${window.location.origin}/register`
    : '/register'

export default function RegisterMobilePage() {
  const openWebRegister = () => {
    window.open(WEB_APP_REGISTER_URL, '_blank', 'noopener,noreferrer')
  }

  return (
    <AuthLayout>
      <Stack className="flex justify-center items-center flex-1 space-y-6 px-4">
        <Text
          as="h1"
          variant="secondary"
          className="text-2xl font-bold text-center"
        >
          Register on the web
        </Text>
        <Text as="p" variant="muted" className="text-center w-3/4">
          Registration is not available in the mobile app. To create an account,
          please open the link below in your browser. This keeps subscription
          and payment on the web.
        </Text>
        <Button variant="primary" className="w-3/4" onClick={openWebRegister}>
          Open registration in browser
        </Button>
        <Text as="p" variant="muted" className="text-sm text-center w-3/4">
          Already have an account? Sign in on this app or on the web.
        </Text>
      </Stack>
    </AuthLayout>
  )
}
