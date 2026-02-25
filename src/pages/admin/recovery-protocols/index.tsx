import type { ReactNode } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { RichTextEditor } from '@/components/RichTextEditor'
import { adminRecoveryService } from '@/api/admin-recovery.service'
import type { RecoveryProtocolWithCreator } from '@/types/recovery'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { useAuth } from '@/contexts/useAuth'
import type { AxiosError } from 'axios'

const TYPES = [
  { value: 'MOBILITY', label: 'Mobility' },
  { value: 'STRETCHING', label: 'Stretching' },
  { value: 'SOFT_TISSUE', label: 'Soft tissue' },
  { value: 'ROUTINE', label: 'Routine' },
]

export default function AdminRecoveryProtocols() {
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'
  const [list, setList] = useState<RecoveryProtocolWithCreator[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<RecoveryProtocolWithCreator | null>(
    null
  )
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    type: 'MOBILITY' as string,
    content: '' as string,
    isPublished: false,
  })
  const { showError, showSuccess } = useSnackbar()

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminRecoveryService.list()
      if (res.data?.statusCode === 200 && Array.isArray(res.data.data)) {
        setList(res.data.data)
      }
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to load')
      setList([])
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const openCreate = () => {
    setForm({
      name: '',
      description: '',
      type: 'MOBILITY',
      content: '',
      isPublished: false,
    })
    setCreateOpen(true)
  }

  const openEdit = (p: RecoveryProtocolWithCreator) => {
    setEditing(p)
    let contentStr = ''
    if (typeof p.content === 'string') {
      contentStr = p.content
    } else if (p.content != null) {
      contentStr = JSON.stringify(p.content, null, 2)
    }
    setForm({
      name: p.name ?? '',
      description: p.description ?? '',
      type: p.type ?? 'MOBILITY',
      content: contentStr,
      isPublished: p.isPublished ?? false,
    })
    setEditOpen(true)
  }

  const handleCreate = async () => {
    if (!form.name.trim()) {
      showError('Name is required')
      return
    }
    setSaving(true)
    try {
      await adminRecoveryService.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        content: form.content.trim() || undefined,
        isPublished: isAdmin ? form.isPublished : false,
      })
      showSuccess('Recovery protocol created')
      setCreateOpen(false)
      fetchList()
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editing || !form.name.trim()) return
    setSaving(true)
    try {
      await adminRecoveryService.update(editing.id, {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        type: form.type,
        content: form.content.trim() || undefined,
        isPublished: isAdmin ? form.isPublished : undefined,
      })
      showSuccess('Updated')
      setEditOpen(false)
      setEditing(null)
      fetchList()
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Update failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!globalThis.confirm('Delete this recovery protocol?')) return
    try {
      await adminRecoveryService.delete(id)
      showSuccess('Deleted')
      fetchList()
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Delete failed')
    }
  }

  let cardContent: ReactNode
  if (loading) {
    cardContent = (
      <div className="p-8 flex justify-center">
        <Spinner />
      </div>
    )
  } else if (list.length === 0) {
    cardContent = (
      <div className="p-6 text-center text-gray-500">
        No recovery protocols yet. Coaches can create; Admin approves before
        publishing.
      </div>
    )
  } else {
    cardContent = (
      <ul className="divide-y divide-gray-100">
        {list.map(p => (
          <li
            key={p.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
          >
            <div>
              <Text variant="default" className="font-medium">
                {p.name}
              </Text>
              <Text variant="secondary" className="text-sm">
                {TYPES.find(t => t.value === p.type)?.label ?? p.type}
                {p.isPublished ? ' · Published' : ' · Draft'}
                {p.creator &&
                  ` · ${p.creator.firstName ?? ''} ${p.creator.lastName ?? ''}`.trim()}
              </Text>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="small"
                onClick={() => openEdit(p)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="small"
                onClick={() => handleDelete(p.id)}
              >
                Delete
              </Button>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Text variant="primary" className="text-2xl font-semibold">
          Recovery protocols
        </Text>
        <Button type="button" onClick={openCreate}>
          Create protocol
        </Button>
      </div>
      <Card className="p-0">{cardContent}</Card>

      {createOpen && (
        <Modal
          visible={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Create recovery protocol"
          size="fullscreen"
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          primaryAction={{
            label: saving ? 'Creating...' : 'Create',
            onPress: () => void handleCreate(),
            disabled: saving,
          }}
          secondaryAction={{
            label: 'Cancel',
            onPress: () => setCreateOpen(false),
          }}
        >
          <div className="p-6 space-y-6 max-w-3xl">
            <div className="space-y-3">
              <Text
                variant="default"
                className="text-sm font-medium text-gray-700"
              >
                Basic info
              </Text>
              <Input
                label="Name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Hip mobility flow"
              />
              <Input
                label="Description"
                value={form.description}
                onChange={e =>
                  setForm(f => ({ ...f, description: e.target.value }))
                }
                placeholder="Optional"
              />
              <div>
                <label
                  htmlFor="create-protocol-type"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Type
                </label>
                <select
                  id="create-protocol-type"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                >
                  {TYPES.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <label
                htmlFor="create-protocol-content"
                className="block text-sm font-medium text-gray-700"
              >
                Content
              </label>
              <RichTextEditor
                id="create-protocol-content"
                value={form.content}
                onChange={content => setForm(f => ({ ...f, content }))}
                placeholder="Instructions, steps, or notes (bold, lists, links supported)"
                minHeight="240px"
                className="mb-2"
              />
            </div>
            {isAdmin && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={e =>
                    setForm(f => ({ ...f, isPublished: e.target.checked }))
                  }
                />
                <span className="text-sm">Publish (visible to athletes)</span>
              </label>
            )}
          </div>
        </Modal>
      )}

      {editOpen && (
        <Modal
          visible={editOpen}
          onClose={() => {
            setEditing(null)
            setEditOpen(false)
          }}
          title="Edit recovery protocol"
          size="fullscreen"
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          primaryAction={{
            label: saving ? 'Saving...' : 'Save',
            onPress: () => void handleUpdate(),
            disabled: saving,
          }}
          secondaryAction={{
            label: 'Cancel',
            onPress: () => {
              setEditing(null)
              setEditOpen(false)
            },
          }}
        >
          <div className="p-6 space-y-6 max-w-3xl">
            <div className="space-y-3">
              <Text
                variant="default"
                className="text-sm font-medium text-gray-700"
              >
                Basic info
              </Text>
              <Input
                label="Name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
              <Input
                label="Description"
                value={form.description}
                onChange={e =>
                  setForm(f => ({ ...f, description: e.target.value }))
                }
              />
              <div>
                <label
                  htmlFor="edit-protocol-type"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Type
                </label>
                <select
                  id="edit-protocol-type"
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  className="border border-gray-300 rounded px-3 py-2 w-full"
                >
                  {TYPES.map(t => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="space-y-3">
              <label
                htmlFor="edit-protocol-content"
                className="block text-sm font-medium text-gray-700"
              >
                Content
              </label>
              <RichTextEditor
                id="edit-protocol-content"
                value={form.content}
                onChange={content => setForm(f => ({ ...f, content }))}
                placeholder="Instructions, steps, or notes"
                minHeight="240px"
                className="mb-2"
              />
            </div>
            {isAdmin && (
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.isPublished}
                  onChange={e =>
                    setForm(f => ({ ...f, isPublished: e.target.checked }))
                  }
                />
                <span className="text-sm">Published</span>
              </label>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
