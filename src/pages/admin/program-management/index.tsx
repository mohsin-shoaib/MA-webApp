import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Stack } from '@/components/Stack'
import { DataTable, type Column } from '@/components/DataTable'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { Tooltip } from '@/components/Tooltip'
import { adminService } from '@/api/admin.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { Cycle } from '@/types/cycle'
import { AxiosError } from 'axios'

/**
 * Admin Program Management Page
 *
 * Displays list of cycles with option to view programs for each cycle.
 */
const AdminProgramManagement = () => {
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loading, setLoading] = useState(true)
  const { showError } = useSnackbar()
  const navigate = useNavigate()

  // Fetch cycles
  const fetchCycles = useCallback(async () => {
    try {
      setLoading(true)
      const response = await adminService.getCycles()
      setCycles(response.data.data || [])
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message ||
        'Failed to load cycles. Please try again.'
      showError(errorMessage)
      setCycles([])
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    fetchCycles()
  }, [fetchCycles])

  const handleViewPrograms = (cycleId: number) => {
    navigate(`/admin/program-management/cycles/${cycleId}/programs`)
  }

  // Define table columns
  const columns: Column<Cycle>[] = [
    {
      key: 'id',
      label: 'S.No',
      sortable: false,
      width: '80px',
      render: (_value, _row, index) => (
        <Text variant="secondary" className="text-sm">
          {index + 1}
        </Text>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-2">
          <Text variant="default" className="text-sm font-medium">
            {value as string}
          </Text>
          {row.description && (
            <Tooltip content={row.description} position="top">
              <div className="cursor-help">
                <Icon
                  name="circle-info"
                  family="solid"
                  size={16}
                  variant="muted"
                />
              </div>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      key: 'duration',
      label: 'Duration (weeks)',
      sortable: true,
      align: 'center',
      render: value => (
        <Text variant="default" className="text-sm">
          {(value as number) || 0} weeks
        </Text>
      ),
    },
    {
      key: 'createdAt',
      label: 'Created At',
      sortable: true,
      render: value => {
        const date = new Date(value as string)
        return (
          <Text variant="secondary" className="text-sm">
            {date.toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        )
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'center',
      width: '150px',
      render: (_, row) => (
        <Button
          variant="primary"
          size="small"
          onClick={() => handleViewPrograms(row.id)}
        >
          Go to Programs
        </Button>
      ),
    },
  ]

  return (
    <div className="p-6">
      <Stack direction="vertical" spacing={6}>
        {/* Page Header */}
        <div>
          <Text as="h1" variant="primary" className="text-2xl font-bold">
            Program Management
          </Text>
          <Text variant="secondary" className="text-sm mt-1">
            Manage and oversee all cycles and programs in the system
          </Text>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg border border-mid-gray p-6">
          <DataTable<Cycle>
            data={cycles}
            columns={columns}
            loading={loading}
            rowKey="id"
          />
        </div>
      </Stack>
    </div>
  )
}

export default AdminProgramManagement
