import { Stack } from '@/components/Stack'
import { Tabs } from '@/components/Tabs'
import { Text } from '@/components/Text'
import AdminExercises from '../admin/exercises'
import AdminRecoveryProtocols from '../admin/recovery-protocols'
import RecoveryHub from '../train/RecoveryHub'
import { useAuth } from '@/contexts/useAuth'
import AthleteExerciseLibrary from '../train/AthleteExerciseLibrary'
import AdminProgramManagement from '../admin/program-management'
import { ProgramBrowser } from '../train/ProgramBrowser'

export default function LibraryPage() {
  const { user } = useAuth()

  const isAthlete = user?.role === 'ATHLETE'

  const tabItems = isAthlete
    ? [
        {
          id: 'program',
          label: 'Programs',
          icon: 'clipboard-list',
          content: <ProgramBrowser />,
        },
        {
          id: 'exercise',
          label: 'Exercises',
          icon: 'dumbbell',
          content: <AthleteExerciseLibrary />,
        },
        {
          id: 'recovery-protocol',
          label: 'Recovery Protocols',
          icon: 'spa',
          content: <RecoveryHub />,
        },
      ]
    : [
        {
          id: 'program-management',
          label: 'Programs',
          icon: 'clipboard-list',
          content: <AdminProgramManagement />,
        },
        {
          id: 'exercise',
          label: 'Exercises',
          icon: 'dumbbell',
          content: <AdminExercises />,
        },
        {
          id: 'recovery-protocol',
          label: 'Recovery Protocols',
          icon: 'spa',
          content: <AdminRecoveryProtocols />,
        },
      ]

  return (
    <Stack direction="vertical" spacing={16}>
      <Text as="h1" variant="secondary" className="text-3xl font-bold">
        Library
      </Text>
      <Tabs items={tabItems} defaultActiveTab="program-management" />
    </Stack>
  )
}
