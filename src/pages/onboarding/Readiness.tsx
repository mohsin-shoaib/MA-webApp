import { readinessService } from '@/api/readiness.service'
import { Text } from '@/components/Text'
import { useEffect } from 'react'

interface Props {
  trainingExperience: string
  primaryGoal: string
  testDate: string
}

const ReadinessRecommendation: React.FC<Props> = ({
  trainingExperience,
  primaryGoal,
  testDate,
}) => {
  useEffect(() => {
    console.log('Props received: before call ', {
      trainingExperience,
      primaryGoal,
      testDate,
    })
    if (!trainingExperience || !primaryGoal || !testDate) return

    const recommendation = async () => {
      try {
        console.log('Props received:', {
          trainingExperience,
          primaryGoal,
          testDate,
        })
        const response = await readinessService.readinessRecommendation({
          trainingExperience,
          primaryGoal,
          testDate,
        })

        console.log('recommendation', response)
      } catch (error) {
        console.error('Recommendation error', error)
      }
    }

    recommendation()
  }, [trainingExperience, primaryGoal, testDate])

  return (
    <>
      <Text>Recommended Cycle</Text>
    </>
  )
}

export default ReadinessRecommendation
