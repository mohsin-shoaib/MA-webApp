import { useState, useEffect, useMemo } from 'react'
import { Text } from '@/components/Text'
import { Stack } from '@/components/Stack'
import { DataTable, type Column } from '@/components/DataTable'
import { Tabs } from '@/components/Tabs'
import { adminService } from '@/api/admin.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { User } from '@/types/admin'
import { AxiosError } from 'axios'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { useAuth } from '@/contexts/useAuth'

const UserManagement = () => {
  const [activeTab, setActiveTab] = useState('all')
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [updatingRoles, setUpdatingRoles] = useState<
    Record<string | number, boolean>
  >({})
  const [actionLoading, setActionLoading] = useState<Record<string, boolean>>(
    {}
  )
  const { showError, showSuccess } = useSnackbar()
  const { user: currentUser } = useAuth()

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true)
        const response = await adminService.getUsers()

        // Extract users from response.data.data.rows
        const usersData = response.data.data?.rows || []
        setUsers(usersData)
      } catch (error) {
        const axiosError = error as AxiosError<{ message: string }>
        const errorMessage =
          axiosError.response?.data?.message ||
          'Failed to load users. Please try again.'
        showError(errorMessage)
        setUsers([])
      } finally {
        setLoading(false)
      }
    }

    fetchUsers()
  }, [showError])

  const handlePromoteToCoachHead = async (userId: string | number) => {
    try {
      setUpdatingRoles(prev => ({ ...prev, [userId]: true }))
      await adminService.updateUserRole(userId, { role: 'COACH_HEAD' })
      showSuccess('User role updated to Coach Head successfully')
      const response = await adminService.getUsers()
      setUsers(response.data.data?.rows || [])
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      showError(
        axiosError.response?.data?.message || 'Failed to update user role.'
      )
    } finally {
      setUpdatingRoles(prev => ({ ...prev, [userId]: false }))
    }
  }

  const handleImpersonate = async (userId: string | number) => {
    const key = `impersonate-${userId}`
    if (
      !globalThis.confirm(
        'Impersonate this user? You will be logged in as them.'
      )
    )
      return
    try {
      setActionLoading(prev => ({ ...prev, [key]: true }))
      const res = await adminService.impersonate(userId)
      const token = (res.data as { data?: { accessToken?: string } })?.data
        ?.accessToken
      if (token) {
        localStorage.setItem('accessToken', token)
        showSuccess('Impersonating user. Reloading…')
        globalThis.location.href = '/dashboard'
      } else {
        showError('No token returned.')
      }
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || 'Impersonate failed.')
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleResetPassword = async (userId: string | number) => {
    const key = `reset-${userId}`
    if (!globalThis.confirm('Send reset password link to this user?')) return
    try {
      setActionLoading(prev => ({ ...prev, [key]: true }))
      const res = await adminService.resetPassword(userId)
      const link = (res.data as { data?: { resetLink?: string } })?.data
        ?.resetLink
      showSuccess(link ? 'Reset link generated.' : 'Reset password triggered.')
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || 'Reset password failed.')
    } finally {
      setActionLoading(prev => ({ ...prev, [key]: false }))
    }
  }

  const handleDisable = async (userId: string | number) => {
    if (
      !globalThis.confirm('Disable this user? They will not be able to log in.')
    )
      return
    try {
      setActionLoading(prev => ({ ...prev, [`disable-${userId}`]: true }))
      await adminService.disable(userId)
      showSuccess('User disabled.')
      const response = await adminService.getUsers()
      setUsers(response.data.data?.rows || [])
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || 'Disable failed.')
    } finally {
      setActionLoading(prev => {
        const next = { ...prev }
        delete next[`disable-${userId}`]
        return next
      })
    }
  }

  const handleEnable = async (userId: string | number) => {
    try {
      setActionLoading(prev => ({ ...prev, [`enable-${userId}`]: true }))
      await adminService.enable(userId)
      showSuccess('User enabled.')
      const response = await adminService.getUsers()
      setUsers(response.data.data?.rows || [])
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || 'Enable failed.')
    } finally {
      setActionLoading(prev => {
        const next = { ...prev }
        delete next[`enable-${userId}`]
        return next
      })
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
        case 'coach_heads':
          return role === 'COACH_HEAD'
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
      coach_heads: users.filter(u => u.role?.toUpperCase() === 'COACH_HEAD')
        .length,
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
          COACH_HEAD: 'warning',
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
              {date.toLocaleDateString('en-US', {
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
      width: '280px',
      render: (_value, row) => {
        const isAdmin = currentUser?.role === 'ADMIN'
        const isSelf = String(currentUser?.id) === String(row.id)
        const isActive = row.isActive !== false
        const isCoach = row.role === 'COACH'
        const isUpdating = updatingRoles[row.id] || false
        const impLoading = actionLoading[`impersonate-${row.id}`]
        const resetLoading = actionLoading[`reset-${row.id}`]
        const disableLoading = actionLoading[`disable-${row.id}`]
        const enableLoading = actionLoading[`enable-${row.id}`]

        if (!isAdmin) {
          if (isCoach) {
            return (
              <Button
                variant="outline"
                size="small"
                onClick={() => handlePromoteToCoachHead(row.id)}
                loading={isUpdating}
                disabled={isUpdating}
                leftIcon={<Icon name="arrow-up" family="solid" size={14} />}
              >
                Promote
              </Button>
            )
          }
          return <Text variant="muted">—</Text>
        }

        return (
          <div className="flex flex-wrap items-center gap-1 justify-end">
            {isCoach && (
              <Button
                variant="outline"
                size="small"
                onClick={() => handlePromoteToCoachHead(row.id)}
                loading={isUpdating}
                disabled={isUpdating}
                leftIcon={<Icon name="arrow-up" family="solid" size={14} />}
              >
                Promote
              </Button>
            )}
            {!isSelf && (
              <>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => handleImpersonate(row.id)}
                  loading={impLoading}
                  disabled={impLoading}
                  leftIcon={<Icon name="user" family="solid" size={12} />}
                >
                  Impersonate
                </Button>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => handleResetPassword(row.id)}
                  loading={resetLoading}
                  disabled={resetLoading}
                  leftIcon={<Icon name="key" family="solid" size={12} />}
                >
                  Reset PW
                </Button>
                {isActive ? (
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => handleDisable(row.id)}
                    loading={disableLoading}
                    disabled={disableLoading}
                    leftIcon={<Icon name="ban" family="solid" size={12} />}
                  >
                    Disable
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    size="small"
                    onClick={() => handleEnable(row.id)}
                    loading={enableLoading}
                    disabled={enableLoading}
                    leftIcon={<Icon name="check" family="solid" size={12} />}
                  >
                    Enable
                  </Button>
                )}
              </>
            )}
          </div>
        )
      },
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
      id: 'coach_heads',
      label: 'Coach Heads',
      icon: 'shield',
      content: renderTable(
        filteredUsers,
        'Coach Heads',
        roleCounts.coach_heads
      ),
      badge: roleCounts.coach_heads > 0 ? roleCounts.coach_heads : undefined,
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
      <div>
        <Text as="h1" variant="secondary" className="text-3xl font-bold">
          User Management
        </Text>
        <Text as="p" variant="muted" className="mt-2">
          Manage and view all users in the system
        </Text>
      </div>
      <Tabs
        items={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        variant="default"
      />
    </Stack>
  )
}

export default UserManagement
