/**
 * PRD 8.1.3: After registration, user proceeds to subscription/payment screen.
 * Athletes land here after register; they can start trial and continue to onboarding.
 */
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import AuthLayout from '../authLayout'
import { Stack } from '@/components/Stack'

export default function SubscriptionPage() {
  const navigate = useNavigate()

  return (
    <AuthLayout>
      <Stack className="flex justify-center items-center flex-1 space-y-6 px-4">
        <Text
          as="h1"
          variant="secondary"
          className="text-2xl font-bold text-center"
        >
          Choose your plan
        </Text>
        <Text as="p" variant="muted" className="text-center w-3/4">
          Start with a 7-day free trial. You can select a plan now or continue
          to set up your training—you can subscribe before your trial ends.
        </Text>

        <Card className="p-6 w-full max-w-md space-y-4">
          <div className="rounded-lg border border-gray-200 p-4 bg-gray-50/50">
            <Text variant="default" className="font-semibold">
              7-day free trial
            </Text>
            <Text variant="secondary" className="text-sm mt-1 block">
              Full access during your trial. No charge until it ends.
            </Text>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <Text variant="default" className="font-semibold">
              Monthly
            </Text>
            <Text variant="secondary" className="text-sm mt-1">
              Billed monthly. Cancel anytime.
            </Text>
          </div>
          <div className="rounded-lg border border-gray-200 p-4">
            <Text variant="default" className="font-semibold">
              Annual
            </Text>
            <Text variant="secondary" className="text-sm mt-1">
              Best value. Billed once per year.
            </Text>
          </div>
          <Text variant="muted" className="text-xs block">
            Plan selection and payment will be available here. For now, continue
            to set up your profile and training.
          </Text>
        </Card>

        <Button
          variant="primary"
          className="w-3/4"
          onClick={() => navigate('/onboarding')}
        >
          Continue to setup
        </Button>
      </Stack>
    </AuthLayout>
  )
}
