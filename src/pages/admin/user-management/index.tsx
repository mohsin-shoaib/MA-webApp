import { useState, useEffect, useMemo, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Stack } from '@/components/Stack'
import { DataTable, type Column } from '@/components/DataTable'
import { Tabs } from '@/components/Tabs'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Modal } from '@/components/Modal'
import { Spinner } from '@/components/Spinner'
import { adminService } from '@/api/admin.service'
import { coachInviteService } from '@/api/coach-invite.service'
import { AdminSetWorkingMaxModal } from '@/components/AdminSetWorkingMaxModal'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { User } from '@/types/admin'
import { AxiosError } from 'axios'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/Badge'

type WorkingMaxRow = {
  exerciseId: number
  exerciseName: string
  value: number
  unit: string
  source: string
  updatedAt: string
}

function userDisplayName(u: {
  firstName?: string | null
  lastName?: string | null
  email?: string
}) {
  const first = u.firstName ?? ''
  const last = u.lastName ?? ''
  if (first || last) return `${first} ${last}`.trim()
  return u.email ?? ''
}

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState('all')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteFirstName, setInviteFirstName] = useState('')
  const [inviteLastName, setInviteLastName] = useState('')
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [workingMaxUser, setWorkingMaxUser] = useState<User | null>(null)
  const [workingMaxList, setWorkingMaxList] = useState<WorkingMaxRow[]>([])
  const [workingMaxListLoading, setWorkingMaxListLoading] = useState(false)
  const [editingWorkingMax, setEditingWorkingMax] =
    useState<WorkingMaxRow | null>(null)
  const { showError, showSuccess } = useSnackbar()

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true)
      const response = await adminService.getUsers()
      const usersData = response.data.data?.rows || []
      setUsers(usersData)
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      showError(
        axiosError.response?.data?.message ||
          'Failed to load users. Please try again.'
      )
      setUsers([])
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    fetchUsers()
  }, [fetchUsers])

  useEffect(() => {
    if (!workingMaxUser) {
      setWorkingMaxList([])
      return
    }
    setWorkingMaxListLoading(true)
    adminService
      .getUserWorkingMax(Number(workingMaxUser.id))
      .then(res => {
        if (res.data?.statusCode === 200 && res.data.data?.workingMaxes) {
          setWorkingMaxList(res.data.data.workingMaxes)
        } else {
          setWorkingMaxList([])
        }
      })
      .catch(() => setWorkingMaxList([]))
      .finally(() => setWorkingMaxListLoading(false))
  }, [workingMaxUser, workingMaxUser?.id])

  const handleInviteCoach = async () => {
    if (!inviteEmail.trim()) {
      setInviteError('Email is required')
      return
    }
    setInviteError(null)
    setInviteLoading(true)
    try {
      await coachInviteService.inviteCoach({
        email: inviteEmail.trim(),
        firstName: inviteFirstName.trim() || undefined,
        lastName: inviteLastName.trim() || undefined,
      })
      showSuccess(`Invite sent to ${inviteEmail}`)
      setInviteModalOpen(false)
      setInviteEmail('')
      setInviteFirstName('')
      setInviteLastName('')
      fetchUsers()
    } catch (err) {
      const axiosError = err as AxiosError<{ message: string }>
      setInviteError(
        axiosError.response?.data?.message || 'Failed to send invite.'
      )
    } finally {
      setInviteLoading(false)
    }
  }

  // Filter users by role based on active tab
  const filteredUsers = useMemo(() => {
    if (activeTab === 'all') return users
    return users.filter(user => {
      const role = user.role?.toUpperCase()
      switch (activeTab) {
        case 'athletes':
          return role === 'ATHLETE'
        case 'coaches':
          return role === 'COACH'
        case 'admins':
          return role === 'ADMIN'
        default:
          return true
      }
    })
  }, [users, activeTab])

  // Calculate counts for each role
  const roleCounts = useMemo(() => {
    return {
      all: users.length,
      athletes: users.filter(u => u.role?.toUpperCase() === 'ATHLETE').length,
      coaches: users.filter(u => u.role?.toUpperCase() === 'COACH').length,
      admins: users.filter(u => u.role?.toUpperCase() === 'ADMIN').length,
    }
  }, [users])

  const columns: Column<User>[] = [
    {
      key: 'profilePicture',
      label: 'Avatar',
      sortable: false,
      width: '80px',
      align: 'center',
      render: (_value, row) => (
        <Avatar
          source={row.profilePicture}
          name={row.name || row.email}
          size="small"
        />
      ),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (_value, row) => {
        const displayName =
          row.name ||
          [row.firstName, row.lastName].filter(Boolean).join(' ') ||
          row.email
        return (
          <Text variant="default" className="text-sm font-medium">
            {displayName}
          </Text>
        )
      },
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: value => (
        <Text variant="default" className="text-sm">
          {value as string}
        </Text>
      ),
    },
    {
      key: 'role',
      label: 'Role',
      sortable: true,
      render: value => {
        const role = (value as string) || 'N/A'
        const roleColors: Record<
          string,
          'primary' | 'secondary' | 'success' | 'warning' | 'error'
        > = {
          ADMIN: 'primary',
          COACH: 'success',
          ATHLETE: 'secondary',
        }
        return (
          <Badge variant={roleColors[role.toUpperCase()] || 'secondary'}>
            {role}
          </Badge>
        )
      },
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      align: 'center',
      render: (_value, row) => {
        const isActive = row.isActive !== false // Default to true if not specified
        return (
          <Badge variant={isActive ? 'success' : 'error'}>
            {isActive ? 'Active' : 'Inactive'}
          </Badge>
        )
      },
    },
    {
      key: 'createdAt',
      label: 'Created At',
      sortable: true,
      render: value => {
        if (!value) return <Text variant="muted">—</Text>
        try {
          const date = new Date(value as string)
          return (
            <Text variant="default" className="text-sm">
              {date.toLocaleString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          )
        } catch {
          return <Text variant="muted">—</Text>
        }
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'right',
      width: '150px',
      render: (_value, row) => (
        <Button
          type="button"
          variant="outline"
          size="small"
          onClick={() => setWorkingMaxUser(row)}
        >
          Working maxes
        </Button>
      ),
    },
  ]

  const renderTable = (tableUsers: User[], title: string, total: number) => (
    <div className="border border-light-gray rounded-xl bg-white overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-4 border-b"
        style={{ borderColor: '#F3F4F6' }}
      >
        <Text variant="default" className="text-lg font-semibold">
          {title}
        </Text>
        <Text variant="secondary" className="text-sm">
          Total: {total} user{total === 1 ? '' : 's'}
        </Text>
      </div>
      <DataTable<User>
        data={tableUsers}
        columns={columns}
        loading={loading}
        searchable={true}
        searchPlaceholder="Search users by name, email, or role..."
        paginated={true}
        pageSize={10}
        rowKey="id"
        emptyMessage="No users found"
        customSearchFilter={(row, searchTerm) => {
          // Search in firstName
          const firstName = row.firstName
            ? String(row.firstName).toLowerCase()
            : ''
          // Search in lastName
          const lastName = row.lastName
            ? String(row.lastName).toLowerCase()
            : ''
          // Search in full name (firstName + lastName)
          const fullName = `${firstName} ${lastName}`.trim()
          // Search in email
          const email = row.email ? String(row.email).toLowerCase() : ''
          // Search in role
          const role = row.role ? String(row.role).toLowerCase() : ''
          // Search in name field if it exists
          const name = row.name ? String(row.name).toLowerCase() : ''

          return (
            firstName.includes(searchTerm) ||
            lastName.includes(searchTerm) ||
            fullName.includes(searchTerm) ||
            email.includes(searchTerm) ||
            role.includes(searchTerm) ||
            name.includes(searchTerm)
          )
        }}
      />
    </div>
  )

  const tabs = [
    {
      id: 'all',
      label: 'All Users',
      icon: 'users',
      content: renderTable(filteredUsers, 'All Users', roleCounts.all),
      badge: roleCounts.all > 0 ? roleCounts.all : undefined,
    },
    {
      id: 'athletes',
      label: 'Athletes',
      icon: 'user',
      content: renderTable(filteredUsers, 'Athletes', roleCounts.athletes),
      badge: roleCounts.athletes > 0 ? roleCounts.athletes : undefined,
    },
    {
      id: 'coaches',
      label: 'Coaches',
      icon: 'user',
      content: renderTable(filteredUsers, 'Coaches', roleCounts.coaches),
      badge: roleCounts.coaches > 0 ? roleCounts.coaches : undefined,
    },
    {
      id: 'admins',
      label: 'Admins',
      icon: 'cog',
      content: renderTable(filteredUsers, 'Admins', roleCounts.admins),
      badge: roleCounts.admins > 0 ? roleCounts.admins : undefined,
    },
  ]

  return (
    <Stack direction="vertical" spacing={16}>
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <Text as="h1" variant="secondary" className="text-3xl font-bold">
            User Management
          </Text>
          <Text as="p" variant="muted" className="mt-2">
            Manage and view all users in the system
          </Text>
        </div>
        <Button
          variant="primary"
          onClick={() => {
            setInviteError(null)
            setInviteModalOpen(true)
          }}
        >
          Invite coach
        </Button>
      </div>

      <Modal
        visible={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
        title="Invite coach"
        size="small"
        primaryAction={{
          label: 'Send invite',
          onPress: () => void handleInviteCoach(),
          loading: inviteLoading,
        }}
        secondaryAction={{
          label: 'Cancel',
          onPress: () => setInviteModalOpen(false),
        }}
      >
        <Stack direction="vertical" spacing={12}>
          {inviteError && (
            <Text variant="error" className="text-sm">
              {inviteError}
            </Text>
          )}
          <Input
            label="Email"
            type="email"
            placeholder="coach@example.com"
            value={inviteEmail}
            onChange={e => setInviteEmail(e.target.value)}
            required
          />
          <Input
            label="First name (optional)"
            placeholder="First name"
            value={inviteFirstName}
            onChange={e => setInviteFirstName(e.target.value)}
          />
          <Input
            label="Last name (optional)"
            placeholder="Last name"
            value={inviteLastName}
            onChange={e => setInviteLastName(e.target.value)}
          />
        </Stack>
      </Modal>

      <Tabs
        items={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="default"
      />

      {workingMaxUser && (
        <Modal
          visible={!!workingMaxUser}
          onClose={() => {
            setWorkingMaxUser(null)
            setEditingWorkingMax(null)
          }}
          title={`Working maxes: ${userDisplayName(workingMaxUser)}`}
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          size="medium"
          secondaryAction={{
            label: 'Close',
            onPress: () => {
              setWorkingMaxUser(null)
              setEditingWorkingMax(null)
            },
          }}
        >
          <div className="space-y-4">
            {workingMaxListLoading && (
              <div className="flex gap-2 py-4">
                <Spinner size="small" variant="primary" />
                <Text variant="secondary">Loading…</Text>
              </div>
            )}
            {!workingMaxListLoading && workingMaxList.length === 0 && (
              <Text variant="secondary" className="text-sm">
                No working maxes yet. User can set them in Train or by logging
                sets with weight and reps.
              </Text>
            )}
            {!workingMaxListLoading && workingMaxList.length > 0 && (
              <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
                {workingMaxList.map(row => (
                  <li
                    key={row.exerciseId}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <Text variant="default" className="text-sm font-medium">
                        {row.exerciseName}
                      </Text>
                      <Text variant="muted" className="text-xs">
                        {row.value} {row.unit} · {row.source}
                      </Text>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="small"
                      onClick={() => setEditingWorkingMax(row)}
                    >
                      Set
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Modal>
      )}

      {workingMaxUser && editingWorkingMax && (
        <AdminSetWorkingMaxModal
          visible={!!editingWorkingMax}
          onClose={() => setEditingWorkingMax(null)}
          onSuccess={async () => {
            const res = await adminService.getUserWorkingMax(
              Number(workingMaxUser.id)
            )
            if (res.data?.statusCode === 200 && res.data.data?.workingMaxes) {
              setWorkingMaxList(res.data.data.workingMaxes)
            }
          }}
          userId={Number(workingMaxUser.id)}
          exerciseId={editingWorkingMax.exerciseId}
          exerciseName={editingWorkingMax.exerciseName}
          currentValue={editingWorkingMax.value}
          currentUnit={editingWorkingMax.unit as 'lb' | 'kg'}
        />
      )}
    </Stack>
  )
}

export default UserManagement
