import { Stack } from '@/components/Stack'
import { Tabs } from '@/components/Tabs'
import { Text } from '@/components/Text'
import AdminExercises from '../admin/exercises'
import AdminRecoveryProtocols from '../admin/recovery-protocols'
import RecoveryHub from '../train/RecoveryHub'
import { useAuth } from '@/contexts/useAuth'
import AthleteExerciseLibrary from '../train/AthleteExerciseLibrary'

export default function LibraryPage() {
  const { user } = useAuth()

  const isAthlete = user?.role === 'ATHLETE'

  const tabItems = isAthlete
    ? [
        {
          id: 'exercise',
          label: 'Exercise Library',
          icon: 'dumbbell',
          content: <AthleteExerciseLibrary />,
        },
        {
          id: 'recovery-protocol',
          label: 'Recovery Protocol',
          icon: 'spa',
          content: <RecoveryHub />,
        },
      ]
    : [
        {
          id: 'exercise',
          label: 'Exercise Library',
          icon: 'dumbbell',
          content: <AdminExercises />,
        },
        {
          id: 'recovery-protocol',
          label: 'Recovery Protocol',
          icon: 'spa',
          content: <AdminRecoveryProtocols />,
        },
      ]

  return (
    <Stack direction="vertical" spacing={16}>
      <Text as="h1" variant="secondary" className="text-3xl font-bold">
        Profile
      </Text>
      <Tabs items={tabItems} defaultActiveTab="exercise" />
    </Stack>
  )
}
