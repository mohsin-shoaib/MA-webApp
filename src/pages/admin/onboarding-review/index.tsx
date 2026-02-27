import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Stack } from '@/components/Stack'
import { Button } from '@/components/Button'
import { DataTable, type Column } from '@/components/DataTable'
import { adminService } from '@/api/admin.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { FlaggedOnboarding } from '@/types/admin'
import { AxiosError } from 'axios'

export default function AdminOnboardingReview() {
  const [rows, setRows] = useState<FlaggedOnboarding[]>([])
  const [loading, setLoading] = useState(true)
  const [clearingId, setClearingId] = useState<number | null>(null)
  const { showError, showSuccess } = useSnackbar()

  const fetchFlagged = useCallback(async () => {
    try {
      setLoading(true)
      const response = await adminService.getFlaggedOnboardings()
      const data = response.data.data
      setRows(data?.rows ?? [])
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      showError(
        axiosError.response?.data?.message ||
          'Failed to load flagged onboardings.'
      )
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    fetchFlagged()
  }, [fetchFlagged])

  const handleClearFlag = async (id: number) => {
    setClearingId(id)
    try {
      await adminService.clearOnboardingFlag(id)
      showSuccess('Marked as reviewed.')
      setRows(prev => prev.filter(r => r.id !== id))
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      showError(axiosError.response?.data?.message || 'Failed to clear flag.')
    } finally {
      setClearingId(null)
    }
  }

  const columns: Column<FlaggedOnboarding>[] = [
    {
      key: 'user',
      label: 'Athlete',
      sortable: false,
      render: (_value, row) => {
        const u = row.user
        const name =
          u?.firstName || u?.lastName
            ? [u.firstName, u.lastName].filter(Boolean).join(' ')
            : null
        return (
          <Text variant="default" className="text-sm font-medium">
            {name || u?.email || `User #${row.userId}`}
          </Text>
        )
      },
    },
    {
      key: 'email',
      label: 'Email',
      sortable: false,
      render: (_value, row) => (
        <Text variant="default" className="text-sm">
          {row.user?.email ?? '—'}
        </Text>
      ),
    },
    {
      key: 'primaryGoal',
      label: 'Primary goal (closest)',
      sortable: false,
      render: value => (
        <Text variant="default" className="text-sm">
          {(value as string) || '—'}
        </Text>
      ),
    },
    {
      key: 'primaryGoalCategory',
      label: 'Category',
      sortable: false,
      render: value => (
        <Text variant="muted" className="text-sm">
          {(value as string) || '—'}
        </Text>
      ),
    },
    {
      key: 'eventDate',
      label: 'Event date',
      sortable: false,
      render: value => {
        if (!value) return <Text variant="muted">—</Text>
        try {
          const d = new Date(value as string)
          return (
            <Text variant="default" className="text-sm">
              {d.toLocaleDateString()}
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
      width: '140px',
      render: (_value, row) => (
        <Button
          variant="secondary"
          size="small"
          onClick={() => handleClearFlag(row.id)}
          disabled={clearingId === row.id}
        >
          {clearingId === row.id ? 'Updating…' : 'Mark reviewed'}
        </Button>
      ),
    },
  ]

  return (
    <Stack direction="vertical" spacing={16}>
      <div>
        <Text as="h1" variant="secondary" className="text-3xl font-bold">
          Onboarding review
        </Text>
        <Text as="p" variant="muted" className="mt-2">
          Athletes who selected &quot;Other&quot; for Primary Goal and chose the
          closest option. Review and mark as reviewed when done.
        </Text>
      </div>

      <div className="border border-light-gray rounded-xl bg-white overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-4 border-b"
          style={{ borderColor: '#F3F4F6' }}
        >
          <Text variant="default" className="text-lg font-semibold">
            Flagged onboardings
          </Text>
          <Text variant="secondary" className="text-sm">
            Total: {rows.length} to review
          </Text>
        </div>
        <DataTable<FlaggedOnboarding>
          data={rows}
          columns={columns}
          loading={loading}
          searchable={false}
          paginated={rows.length > 10}
          pageSize={10}
          rowKey="id"
        />
      </div>
    </Stack>
  )
}
