import { Text } from '@/components/Text'
import { Stack } from '@/components/Stack'

const UserManagement = () => {
  return (
    <Stack direction="vertical" spacing={16}>
      <Text as="h1" variant="secondary" className="text-3xl font-bold">
        User Management
      </Text>
      <Text as="p" variant="muted">
        Coach Head user management page - Coming soon
      </Text>
    </Stack>
  )
}

export default UserManagement
