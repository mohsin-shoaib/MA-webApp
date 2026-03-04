import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Stack } from '@/components/Stack'
import { DataTable, type Column } from '@/components/DataTable'
import { Button } from '@/components/Button'
import { coachService } from '@/api/coach.service'
import { adminService } from '@/api/admin.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { User } from '@/types/admin'
import type { Cycle } from '@/types/cycle'
import { AxiosError } from 'axios'
import { Avatar } from '@/components/Avatar'
import { Badge } from '@/components/Badge'
import { Dropdown, type DropdownValue } from '@/components/Dropdown'

const CoachUserManagement = () => {
  const navigate = useNavigate()
  const [athletes, setAthletes] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [currentPage, setCurrentPage] = useState(1)
  const [searchValue, setSearchValue] = useState('')
  const [total, setTotal] = useState(0)
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [filterCycleId, setFilterCycleId] = useState<number | ''>('')
  const pageSize = 10
  const { showError } = useSnackbar()

  useEffect(() => {
    adminService
      .getCycles()
      .then(res => setCycles(res.data?.data ?? []))
      .catch(() => setCycles([]))
  }, [])

  const fetchAthletes = useCallback(
    async (page: number, search: string, cycleId: number | '') => {
      try {
        setLoading(true)
        const response = await coachService.getAthletes({
          page,
          pageSize,
          search: search || undefined,
          ...(cycleId !== '' && { cycleId: Number(cycleId) }),
          includeStats: true,
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
    fetchAthletes(currentPage, searchValue, filterCycleId)
  }, [fetchAthletes, currentPage, searchValue, filterCycleId])

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
  }

  const handleSearchChange = (value: string) => {
    setSearchValue(value)
    setCurrentPage(1)
  }

  const handleCycleFilterChange = (value: DropdownValue) => {
    const s = typeof value === 'string' ? value : ''
    setFilterCycleId(s === '' ? '' : Number(s))
    setCurrentPage(1)
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
      key: 'compliancePercent',
      label: 'Compliance %',
      sortable: false,
      render: (value, row) => {
        const p = (value ??
          (row as Record<string, unknown>).compliancePercent) as
          | number
          | null
          | undefined
        if (p == null) return <Text variant="muted">—</Text>
        return (
          <Text variant="default" className="text-sm">
            {p}%
          </Text>
        )
      },
    },
    {
      key: 'lastWorkoutDate',
      label: 'Last active',
      sortable: false,
      render: (value, row) => {
        const d = (value ??
          (row as Record<string, unknown>).lastWorkoutDate) as
          | string
          | null
          | undefined
        if (!d) return <Text variant="muted">—</Text>
        try {
          const date = new Date(d)
          return (
            <Text variant="default" className="text-sm">
              {date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              })}
            </Text>
          )
        } catch {
          return <Text variant="muted">—</Text>
        }
      },
    },
    {
      key: 'currentProgramName',
      label: 'Current program',
      sortable: false,
      render: (value, row) => {
        const name = (value ??
          (row as Record<string, unknown>).currentProgramName) as
          | string
          | null
          | undefined
        return (
          <Text variant="default" className="text-sm">
            {name || '—'}
          </Text>
        )
      },
    },
    {
      key: 'cycleName',
      label: 'Cycle',
      sortable: false,
      render: (value, row) => {
        const name = (value ?? (row as Record<string, unknown>).cycleName) as
          | string
          | null
          | undefined
        if (!name) return <Text variant="muted">—</Text>
        return (
          <Badge variant="secondary" className="text-xs">
            {name}
          </Badge>
        )
      },
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
      key: 'id',
      label: 'Actions',
      sortable: false,
      width: '100px',
      render: (_value, row) => (
        <Button
          type="button"
          variant="secondary"
          size="small"
          onClick={() =>
            navigate(`/coach/athletes/${row.id}`, { state: { athlete: row } })
          }
        >
          View
        </Button>
      ),
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
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 border-b"
          style={{ borderColor: '#F3F4F6' }}
        >
          <Text variant="default" className="text-lg font-semibold">
            Athletes
          </Text>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <label
                htmlFor="coach-athlete-cycle"
                className="text-sm text-gray-600 whitespace-nowrap"
              >
                Cycle
              </label>
              <Dropdown
                placeholder="All"
                options={[
                  { value: '', label: 'All' },
                  ...cycles.map(c => ({ value: String(c.id), label: c.name })),
                ]}
                value={filterCycleId === '' ? '' : String(filterCycleId)}
                onValueChange={handleCycleFilterChange}
                size="small"
                fullWidth={false}
              />
            </div>
            <Text variant="secondary" className="text-sm">
              Total: {total} athlete{total === 1 ? '' : 's'}
            </Text>
          </div>
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
