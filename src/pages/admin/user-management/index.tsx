import { Text } from '@/components/Text'
import { Stack } from '@/components/Stack'
import { useAuth } from '@/contexts/useAuth'
import { Button } from '@/components/Button'

const UserManagement = () => {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen p-8">
      <Stack direction="vertical" spacing={16}>
        <Stack direction="horizontal" justify="space-between" align="center">
          <Text as="h1" variant="secondary" className="text-3xl font-bold">
            User Management
          </Text>
          <Stack direction="horizontal" spacing={8} align="center">
            <Text variant="muted">Welcome, {user?.email}</Text>
            <Button variant="outline" onClick={logout}>
              Logout
            </Button>
          </Stack>
        </Stack>
        <Text as="p" variant="muted">
          Admin user management page - Coming soon
        </Text>
      </Stack>
    </div>
  )
}

export default UserManagement
