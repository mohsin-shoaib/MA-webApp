import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { DataTable, type Column } from '@/components/DataTable'
import {
  adminRecoveryService,
  type RecoveryProtocol,
} from '@/api/recovery.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { AxiosError } from 'axios'

export default function AdminRecovery() {
  const [list, setList] = useState<RecoveryProtocol[]>([])
  const [loading, setLoading] = useState(true)
  const [approvingId, setApprovingId] = useState<number | null>(null)
  const { showError, showSuccess } = useSnackbar()

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminRecoveryService.list({ limit: 100 })
      const body = res.data as Record<string, unknown>
      const data = body?.data as Record<string, unknown> | unknown[] | undefined
      // API returns { data: { data: [...], meta } } or { data: { rows: [...] } } or { data: [...] }
      let rows: RecoveryProtocol[] = []
      if (Array.isArray(data)) {
        rows = data as RecoveryProtocol[]
      } else if (data && typeof data === 'object') {
        const d = data as Record<string, unknown>
        if (Array.isArray(d.data)) rows = d.data as RecoveryProtocol[]
        else if (Array.isArray(d.rows)) rows = d.rows as RecoveryProtocol[]
      }
      setList(rows)
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(
        ax.response?.data?.message || 'Failed to load recovery protocols.'
      )
      setList([])
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleApprove = async (id: number) => {
    try {
      setApprovingId(id)
      await adminRecoveryService.approve(id)
      showSuccess('Protocol approved.')
      fetchList()
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || 'Approve failed.')
    } finally {
      setApprovingId(null)
    }
  }

  const columns: Column<RecoveryProtocol>[] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: '70px',
      render: v => <Text variant="secondary">{v as number}</Text>,
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: v => <Text variant="default">{v as string}</Text>,
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      render: v => (
        <Text variant="secondary" className="max-w-xs truncate">
          {(v as string) || '—'}
        </Text>
      ),
    },
    {
      key: 'isActive',
      label: 'Active',
      sortable: true,
      render: v => (v ? 'Yes' : 'No'),
    },
    {
      key: 'approvedById',
      label: 'Approved',
      sortable: false,
      render: v => (v ? 'Yes' : '—'),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      width: '120px',
      render: (_, row) =>
        !row.approvedById ? (
          <Button
            variant="outline"
            size="small"
            onClick={() => handleApprove(row.id)}
            disabled={approvingId === row.id}
          >
            {approvingId === row.id ? 'Approving…' : 'Approve'}
          </Button>
        ) : (
          <Text variant="muted">—</Text>
        ),
    },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Text as="h1" variant="primary" className="text-2xl font-bold">
          Recovery protocols
        </Text>
        <Text variant="secondary" className="text-sm mt-1">
          Approve recovery protocols created by coaches.
        </Text>
      </div>
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <DataTable<RecoveryProtocol & Record<string, unknown>>
          data={list as (RecoveryProtocol & Record<string, unknown>)[]}
          columns={columns}
          loading={loading}
          rowKey="id"
          emptyMessage="No recovery protocols."
        />
      </div>
    </div>
  )
}
