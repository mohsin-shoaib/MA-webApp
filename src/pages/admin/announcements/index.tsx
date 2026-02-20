import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Modal } from '@/components/Modal'
import { DataTable, type Column } from '@/components/DataTable'
import {
  announcementService,
  type Announcement,
} from '@/api/announcement.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { AxiosError } from 'axios'

export default function AdminAnnouncements() {
  const [list, setList] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [type, setType] = useState('global')
  const { showError, showSuccess } = useSnackbar()

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      const res = await announcementService.list({ page: 1, limit: 100 })
      const body = res.data as unknown as Record<string, unknown>
      const data = body?.data as Record<string, unknown> | unknown[] | undefined
      // API returns { data: { data: [...], meta } } or { data: { rows: [...] } } or { data: [...] }
      let rows: Announcement[] = []
      if (Array.isArray(data)) {
        rows = data as Announcement[]
      } else if (data && typeof data === 'object') {
        const d = data as Record<string, unknown>
        if (Array.isArray(d.data)) rows = d.data as Announcement[]
        else if (Array.isArray(d.rows)) rows = d.rows as Announcement[]
      }
      setList(rows)
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || 'Failed to load announcements.')
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
    if (!title.trim()) {
      showError('Title is required.')
      return
    }
    try {
      setSaving(true)
      await announcementService.create({
        title: title.trim(),
        body: body.trim(),
        type,
      })
      showSuccess('Announcement created.')
      setModalOpen(false)
      setTitle('')
      setBody('')
      setType('global')
      fetchList()
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || 'Failed to create.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!globalThis.confirm('Delete this announcement?')) return
    try {
      await announcementService.delete(id)
      showSuccess('Deleted.')
      fetchList()
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || 'Delete failed.')
    }
  }

  const columns: Column<Announcement>[] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: '70px',
      render: v => <Text variant="secondary">{String(v)}</Text>,
    },
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      render: v => <Text variant="default">{String(v)}</Text>,
    },
    {
      key: 'type',
      label: 'Type',
      sortable: true,
      render: v => <Text variant="secondary">{String(v)}</Text>,
    },
    {
      key: 'createdAt',
      label: 'Created',
      sortable: true,
      render: v => (v ? new Date(v as string).toLocaleDateString() : '—'),
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
            Announcements
          </Text>
          <Text variant="secondary" className="text-sm mt-1">
            Create and manage announcements.
          </Text>
        </div>
        <Button onClick={() => setModalOpen(true)}>Create</Button>
      </div>
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        <DataTable<Announcement & Record<string, unknown>>
          data={list as (Announcement & Record<string, unknown>)[]}
          columns={columns}
          loading={loading}
          rowKey="id"
          emptyMessage="No announcements."
        />
      </div>
      {modalOpen && (
        <Modal
          visible
          onClose={() => setModalOpen(false)}
          title="Create Announcement"
          size="medium"
          showCloseButton
        >
          <form onSubmit={handleCreate} className="p-5 space-y-4">
            <Input
              label="Title"
              required
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Title"
            />
            <div>
              <label
                htmlFor="announcement-body"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Body
              </label>
              <textarea
                id="announcement-body"
                className="w-full border rounded-lg px-3 py-2 text-sm min-h-[100px]"
                value={body}
                onChange={e => setBody(e.target.value)}
                placeholder="Content"
              />
            </div>
            <div>
              <label
                htmlFor="announcement-type"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Type
              </label>
              <select
                id="announcement-type"
                className="w-full border rounded-lg px-3 py-2 text-sm"
                value={type}
                onChange={e => setType(e.target.value)}
              >
                <option value="global">Global</option>
                <option value="program">Program</option>
                <option value="cycle">Cycle</option>
                <option value="coach">Coach</option>
              </select>
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
