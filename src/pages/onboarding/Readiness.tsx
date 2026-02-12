// RecommendationStep.tsx
import { useEffect, useState } from 'react'
import { Button } from '@/components/Button'
import { Text } from '@/components/Text'
import type { ConfirmProps } from '@/types/readiness'
import { readinessService } from '@/api/readiness.service'
import type { OnboardingProps } from '@/types/onboarding'

interface RecommendationStepProps {
  onboardingData: OnboardingProps
  onConfirm: (selected: ConfirmProps) => void
  loading?: boolean
}

export default function RecommendationStep({
  onboardingData,
  onConfirm,
  loading = false,
}: RecommendationStepProps) {
  const [selected, setSelected] = useState<ConfirmProps>()
  const [recommendations, setRecommendations] = useState<string>('')

  useEffect(() => {
    const fetchRecommendation = async () => {
      if (!onboardingData) return
      try {
        const response = await readinessService.readinessRecommendation({
          trainingExperience: onboardingData.trainingExperience,
          primaryGoal: onboardingData.primaryGoal,
          testDate: onboardingData.testDate,
        })
        setRecommendations(response.data.data.cycle.recommendedCycle)
        setSelected({
          cycle: response.data.data.cycle.recommendedCycle,
          confirmed: true,
        })
      } catch (error) {
        console.log('API error', error)
      }
    }

    fetchRecommendation()
  }, [onboardingData])

  return (
    <div className="space-y-4">
      <Text variant="primary" className="font-semibold text-lg">
        Recommended Cycles
      </Text>

      {/* {recommendations.length === 0 && <p>No recommendations found.</p>} */}

      <div className="flex flex-col gap-3">
        {/* {recommendations.map((rec, index) => (
          <div
            key={index}
            onClick={() => setSelected(rec)}
            className={`border rounded p-4 cursor-pointer transition
              ${selected?.trainingExperience === rec.trainingExperience ? 'border-primary bg-primary/10' : 'border-gray-300'}
            `}
          >
            <Text variant="default" className="font-semibold">
              {rec.trainingExperience} ({rec.testDate} weeks)
            </Text>
            <Text variant="secondary">{rec.primaryGoal}</Text>
          </div>
        ))} */}

        <h1>{recommendations}</h1>
      </div>

      <Button
        onClick={() => selected && onConfirm(selected)}
        disabled={!selected}
        loading={loading}
      >
        Confirm Recommendation
      </Button>
    </div>
  )
}
