import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Stack } from '@/components/Stack'
import { DataTable, type Column } from '@/components/DataTable'
import { Tabs } from '@/components/Tabs'
import { coachService } from '@/api/coach.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { User } from '@/types/admin'
import { AxiosError } from 'axios'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/Badge'

const CoachHeadUserManagement = () => {
  const [activeTab, setActiveTab] = useState('athletes')
  const [athletes, setAthletes] = useState<User[]>([])
  const [coaches, setCoaches] = useState<User[]>([])
  const [athletesLoading, setAthletesLoading] = useState(true)
  const [coachesLoading, setCoachesLoading] = useState(true)
  const [athletesPage, setAthletesPage] = useState(1)
  const [coachesPage, setCoachesPage] = useState(1)
  const [athletesSearch, setAthletesSearch] = useState('')
  const [coachesSearch, setCoachesSearch] = useState('')
  const [athletesTotal, setAthletesTotal] = useState(0)
  const [coachesTotal, setCoachesTotal] = useState(0)
  const pageSize = 10
  const { showError } = useSnackbar()

  const fetchAthletes = useCallback(
    async (page: number, search: string) => {
      try {
        setAthletesLoading(true)
        const response = await coachService.getAthletes({
          page,
          pageSize,
          search: search || undefined,
        })

        const athletesData = response.data.data?.rows || []
        const meta = response.data.data?.meta
        setAthletes(athletesData)
        setAthletesTotal(meta?.total || 0)
      } catch (error) {
        const axiosError = error as AxiosError<{ message: string }>
        const errorMessage =
          axiosError.response?.data?.message ||
          'Failed to load athletes. Please try again.'
        showError(errorMessage)
        setAthletes([])
      } finally {
        setAthletesLoading(false)
      }
    },
    [showError]
  )

  const fetchCoaches = useCallback(
    async (page: number, search: string) => {
      try {
        setCoachesLoading(true)
        const response = await coachService.getCoaches({
          page,
          pageSize,
          search: search || undefined,
        })

        const coachesData = response.data.data?.rows || []
        const meta = response.data.data?.meta
        setCoaches(coachesData)
        setCoachesTotal(meta?.total || 0)
      } catch (error) {
        const axiosError = error as AxiosError<{ message: string }>
        const errorMessage =
          axiosError.response?.data?.message ||
          'Failed to load coaches. Please try again.'
        showError(errorMessage)
        setCoaches([])
      } finally {
        setCoachesLoading(false)
      }
    },
    [showError]
  )

  useEffect(() => {
    fetchAthletes(athletesPage, athletesSearch)
  }, [fetchAthletes, athletesPage, athletesSearch])

  useEffect(() => {
    if (activeTab === 'coaches') {
      fetchCoaches(coachesPage, coachesSearch)
    }
  }, [fetchCoaches, coachesPage, coachesSearch, activeTab])

  const handleAthletesPageChange = (page: number) => {
    setAthletesPage(page)
  }

  const handleCoachesPageChange = (page: number) => {
    setCoachesPage(page)
  }

  const handleAthletesSearchChange = (value: string) => {
    setAthletesSearch(value)
    setAthletesPage(1) // Reset to first page on search
  }

  const handleCoachesSearchChange = (value: string) => {
    setCoachesSearch(value)
    setCoachesPage(1) // Reset to first page on search
  }

  const commonColumns: Column<User>[] = [
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

  const athletesTable = (
    <div className="border border-light-gray rounded-xl bg-white overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-4 border-b"
        style={{ borderColor: '#F3F4F6' }}
      >
        <Text variant="default" className="text-lg font-semibold">
          Athletes
        </Text>
        <Text variant="secondary" className="text-sm">
          Total: {athletesTotal} athlete{athletesTotal === 1 ? '' : 's'}
        </Text>
      </div>
      <DataTable<User>
        data={athletes}
        columns={commonColumns}
        loading={athletesLoading}
        searchable={true}
        searchPlaceholder="Search athletes by name, email..."
        searchValue={athletesSearch}
        onSearchChange={handleAthletesSearchChange}
        paginated={true}
        pageSize={pageSize}
        currentPage={athletesPage}
        onPageChange={handleAthletesPageChange}
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
  )

  const coachesTable = (
    <div className="border border-light-gray rounded-xl bg-white overflow-hidden">
      <div
        className="flex items-center justify-between px-4 py-4 border-b"
        style={{ borderColor: '#F3F4F6' }}
      >
        <Text variant="default" className="text-lg font-semibold">
          Coaches
        </Text>
        <Text variant="secondary" className="text-sm">
          Total: {coachesTotal} coach{coachesTotal === 1 ? '' : 'es'}
        </Text>
      </div>
      <DataTable<User>
        data={coaches}
        columns={commonColumns}
        loading={coachesLoading}
        searchable={true}
        searchPlaceholder="Search coaches by name, email..."
        searchValue={coachesSearch}
        onSearchChange={handleCoachesSearchChange}
        paginated={true}
        pageSize={pageSize}
        currentPage={coachesPage}
        onPageChange={handleCoachesPageChange}
        rowKey="id"
        emptyMessage="No coaches found"
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
  )

  const tabs = [
    {
      id: 'athletes',
      label: 'Athletes',
      icon: 'user',
      content: athletesTable,
      badge: athletesTotal > 0 ? athletesTotal : undefined,
    },
    {
      id: 'coaches',
      label: 'Coaches',
      icon: 'users',
      content: coachesTable,
      badge: coachesTotal > 0 ? coachesTotal : undefined,
    },
  ]

  return (
    <Stack direction="vertical" spacing={16}>
      <div>
        <Text as="h1" variant="secondary" className="text-3xl font-bold">
          User Management
        </Text>
        <Text as="p" variant="muted" className="mt-2">
          Manage and view athletes and coaches
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

export default CoachHeadUserManagement
