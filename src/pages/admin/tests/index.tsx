import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Modal } from '@/components/Modal'
import { DataTable, type Column } from '@/components/DataTable'
import { adminTestService, type Test } from '@/api/test.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { AxiosError } from 'axios'

export default function AdminTests() {
  const [list, setList] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const { showError, showSuccess } = useSnackbar()

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminTestService.list({ limit: 100 })
      const body = res.data as Record<string, unknown>
      const data = body?.data
      // Support multiple response shapes from API
      let rows: Test[] = []
      if (Array.isArray(data)) {
        rows = data as Test[]
      } else if (Array.isArray(body)) {
        rows = body as Test[]
      } else if (data && typeof data === 'object') {
        const d = data as Record<string, unknown>
        if (Array.isArray(d.rows)) rows = d.rows as Test[]
        else if (Array.isArray(d.data)) rows = d.data as Test[]
        else if (Array.isArray(d.tests)) rows = d.tests as Test[]
      }
      setList(rows)
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || 'Failed to load tests.')
      setList([])
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleCreate = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      showError('Name is required.')
      return
    }
    try {
      setSaving(true)
      await adminTestService.create({
        name: name.trim(),
        description: description.trim() || undefined,
      })
      showSuccess('Test created.')
      setModalOpen(false)
      setName('')
      setDescription('')
      fetchList()
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || 'Failed to create.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!globalThis.confirm('Delete this test?')) return
    try {
      await adminTestService.delete(id)
      showSuccess('Deleted.')
      fetchList()
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || 'Delete failed.')
    }
  }

  const columns: Column<Test>[] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: '70px',
      render: v => <Text variant="secondary">{String(v)}</Text>,
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: v => <Text variant="default">{String(v)}</Text>,
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
      key: 'actions',
      label: 'Actions',
      sortable: false,
      width: '100px',
      render: (_, row) => (
        <Button
          variant="outline"
          size="small"
          onClick={() => handleDelete(row.id)}
        >
          Delete
        </Button>
      ),
    },
  ]

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Text as="h1" variant="primary" className="text-2xl font-bold">
            Tests
          </Text>
          <Text variant="secondary" className="text-sm mt-1">
            Manage tests for athlete assessments.
          </Text>
        </div>
        <Button onClick={() => setModalOpen(true)}>Create test</Button>
      </div>
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <DataTable<Test & Record<string, unknown>>
          data={list as (Test & Record<string, unknown>)[]}
          columns={columns}
          loading={loading}
          rowKey="id"
          emptyMessage="No tests."
        />
      </div>
      {modalOpen && (
        <Modal
          visible
          onClose={() => setModalOpen(false)}
          title="Create test"
          size="medium"
          showCloseButton
        >
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <Input
              label="Name"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="Test name"
            />
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (optional)
              </label>
              <textarea
                className="w-full border rounded-lg px-3 py-2 text-sm min-h-[80px]"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Description"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Create'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setModalOpen(false)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
