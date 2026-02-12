// ConfirmationStep.tsx
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'

interface ConfirmationStepProps {
  onFinish?: () => void // optional callback to navigate to dashboard/home
  confirmedRecommendation?: {
    name: string
    durationWeeks: number
    description: string
  }
}

export default function ConfirmationStep({
  onFinish,
  confirmedRecommendation,
}: ConfirmationStepProps) {
  return (
    <div className="text-center space-y-4 p-6">
      <Text variant="primary" className="text-2xl font-semibold">
        🎉 Your cycle is confirmed!
      </Text>

      {confirmedRecommendation && (
        <div className="border rounded p-4 bg-gray-50">
          <Text variant="default" className="font-semibold">
            {confirmedRecommendation.name} (
            {confirmedRecommendation.durationWeeks} weeks)
          </Text>
          <Text variant="secondary">{confirmedRecommendation.description}</Text>
        </div>
      )}

      <Button onClick={onFinish} className="mt-4">
        Go to Dashboard
      </Button>
    </div>
  )
}
