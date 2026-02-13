import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Stack } from '@/components/Stack'
import { DataTable, type Column } from '@/components/DataTable'
import { coachService } from '@/api/coach.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { User } from '@/types/admin'
import { AxiosError } from 'axios'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/Badge'

const CoachUserManagement = () => {
  const [athletes, setAthletes] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchValue, setSearchValue] = useState('')
  const [total, setTotal] = useState(0)
  const pageSize = 10
  const { showError } = useSnackbar()

  const fetchAthletes = useCallback(
    async (page: number, search: string) => {
      try {
        setLoading(true)
        const response = await coachService.getAthletes({
          page,
          pageSize,
          search: search || undefined,
        })

        const athletesData = response.data.data?.rows || []
        const meta = response.data.data?.meta
        setAthletes(athletesData)
        setTotal(meta?.total || 0)
      } catch (error) {
        const axiosError = error as AxiosError<{ message: string }>
        const errorMessage =
          axiosError.response?.data?.message ||
          'Failed to load athletes. Please try again.'
        showError(errorMessage)
        setAthletes([])
      } finally {
        setLoading(false)
      }
    },
    [showError]
  )

  useEffect(() => {
    fetchAthletes(currentPage, searchValue)
  }, [fetchAthletes, currentPage, searchValue])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    setCurrentPage(1) // Reset to first page on search
  }

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
  ]

  return (
    <Stack direction="vertical" spacing={16}>
      <div>
        <Text as="h1" variant="secondary" className="text-3xl font-bold">
          Athlete Management
        </Text>
        <Text as="p" variant="muted" className="mt-2">
          Manage and view your athletes
        </Text>
      </div>
      <div className="border border-light-gray rounded-xl bg-white overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-4 border-b"
          style={{ borderColor: '#F3F4F6' }}
        >
          <Text variant="default" className="text-lg font-semibold">
            Athletes
          </Text>
          <Text variant="secondary" className="text-sm">
            Total: {total} athlete{total === 1 ? '' : 's'}
          </Text>
        </div>
        <DataTable<User>
          data={athletes}
          columns={columns}
          loading={loading}
          searchable={true}
          searchPlaceholder="Search athletes by name, email..."
          searchValue={searchValue}
          onSearchChange={handleSearchChange}
          paginated={true}
          pageSize={pageSize}
          currentPage={currentPage}
          onPageChange={handlePageChange}
          rowKey="id"
          emptyMessage="No athletes found"
          customSearchFilter={(row, searchTerm) => {
            const firstName = row.firstName
              ? String(row.firstName).toLowerCase()
              : ''
            const lastName = row.lastName
              ? String(row.lastName).toLowerCase()
              : ''
            const fullName = `${firstName} ${lastName}`.trim()
            const email = row.email ? String(row.email).toLowerCase() : ''
            const name = row.name ? String(row.name).toLowerCase() : ''

            return (
              firstName.includes(searchTerm) ||
              lastName.includes(searchTerm) ||
              fullName.includes(searchTerm) ||
              email.includes(searchTerm) ||
              name.includes(searchTerm)
            )
          }}
        />
      </div>
    </Stack>
  )
}

export default CoachUserManagement
