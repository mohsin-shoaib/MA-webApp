import { useState, useEffect, useCallback } from 'react'
import type { ReactNode } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
import { adminAnnouncementsService } from '@/api/admin-announcements.service'
import type {
  AdminAnnouncement,
  AnnouncementType,
  CreateAnnouncementPayload,
} from '@/api/admin-announcements.service'
import { adminService } from '@/api/admin.service'
import { programService } from '@/api/program.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { Cycle } from '@/types/cycle'
import type { Program } from '@/types/program'
import { AxiosError } from 'axios'

const ANNOUNCEMENT_TYPES: { value: AnnouncementType; label: string }[] = [
  { value: 'GLOBAL', label: 'Global' },
  { value: 'PROGRAM', label: 'Program-specific' },
  { value: 'CYCLE', label: 'Cycle-specific' },
  { value: 'COACH_TO_ATHLETES', label: 'Coach to athletes' },
]

export default function AdminAnnouncements() {
  const [list, setList] = useState<AdminAnnouncement[]>([])
  const [loading, setLoading] = useState(true)
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<AdminAnnouncement | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<CreateAnnouncementPayload>({
    type: 'GLOBAL',
    title: '',
    body: '',
  })
  const { showError, showSuccess } = useSnackbar()

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminAnnouncementsService.list()
      if (res.data?.statusCode === 200 && Array.isArray(res.data.data)) {
        setList(res.data.data)
      }
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to load announcements')
      setList([])
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    adminService
      .getCycles()
      .then(r => setCycles(r.data.data || []))
      .catch(() => setCycles([]))
    programService
      .getAll({ limit: 500 })
      .then(r => setPrograms(r.data?.data?.rows || []))
      .catch(() => setPrograms([]))
  }, [])

  const openCreate = () => {
    setForm({ type: 'GLOBAL', title: '', body: '' })
    setCreateOpen(true)
  }

  const openEdit = (a: AdminAnnouncement) => {
    setEditing(a)
    setForm({
      type: a.type,
      title: a.title,
      body: a.body,
      programId: a.programId ?? undefined,
      cycleId: a.cycleId ?? undefined,
    })
    setEditOpen(true)
  }

  const handleCreate = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      showError('Title and body are required')
      return
    }
    if (form.type === 'PROGRAM' && form.programId == null) {
      showError('Select a program for program-specific announcement')
      return
    }
    if (form.type === 'CYCLE' && form.cycleId == null) {
      showError('Select a cycle for cycle-specific announcement')
      return
    }
    try {
      setSaving(true)
      await adminAnnouncementsService.create(form)
      showSuccess('Announcement created')
      setCreateOpen(false)
      fetchList()
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editing) return
    if (!form.title.trim() || !form.body.trim()) {
      showError('Title and body are required')
      return
    }
    if (form.type === 'PROGRAM' && form.programId == null) {
      showError('Select a program for program-specific announcement')
      return
    }
    if (form.type === 'CYCLE' && form.cycleId == null) {
      showError('Select a cycle for cycle-specific announcement')
      return
    }
    try {
      setSaving(true)
      await adminAnnouncementsService.update(editing.id, {
        type: form.type,
        title: form.title,
        body: form.body,
        programId: form.programId ?? null,
        cycleId: form.cycleId ?? null,
      })
      showSuccess('Announcement updated')
      setEditOpen(false)
      setEditing(null)
      fetchList()
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to update')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (deleteId == null) return
    try {
      setSaving(true)
      await adminAnnouncementsService.delete(deleteId)
      showSuccess('Announcement deleted')
      setDeleteId(null)
      fetchList()
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  function getTypeLabel(a: AdminAnnouncement): string {
    if (a.type === 'PROGRAM' && a.program?.name)
      return `Program: ${a.program.name}`
    if (a.type === 'CYCLE' && a.cycle?.name) return `Cycle: ${a.cycle.name}`
    return a.type
  }

  let cardContent: ReactNode
  if (loading) {
    cardContent = (
      <div className="flex items-center gap-2 py-8">
        <Spinner size="small" variant="primary" />
        <Text variant="secondary">Loading...</Text>
      </div>
    )
  } else if (list.length === 0) {
    cardContent = (
      <Text variant="secondary">
        No announcements yet. Create one to show in the Coach tab.
      </Text>
    )
  } else {
    cardContent = (
      <ul className="space-y-4">
        {list.map(a => (
          <li
            key={a.id}
            className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-4 last:border-0"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Text variant="default" className="font-medium">
                  {a.title}
                </Text>
                <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
                  {getTypeLabel(a)}
                </span>
              </div>
              <Text variant="secondary" className="text-sm mt-1 line-clamp-2">
                {a.body}
              </Text>
              <Text variant="muted" className="text-xs mt-2">
                {new Date(a.createdAt).toLocaleString()}
              </Text>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => openEdit(a)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => setDeleteId(a.id)}
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
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <Text as="h1" variant="primary" className="text-2xl font-bold">
            Announcements
          </Text>
          <Text variant="secondary" className="text-sm mt-1">
            PRD 11: Global, program-specific, cycle-specific, and
            coach-to-athletes.
          </Text>
        </div>
        <Button type="button" onClick={openCreate}>
          Create announcement
        </Button>
      </div>

      <Card className="p-6">{cardContent}</Card>

      {/* Create modal */}
      {createOpen && (
        <Modal
          visible={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Create announcement"
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          primaryAction={{
            label: 'Create',
            onPress: () => {
              void handleCreate()
            },
            disabled: saving,
          }}
          secondaryAction={{
            label: 'Cancel',
            onPress: () => setCreateOpen(false),
          }}
        >
          <AnnouncementForm
            form={form}
            setForm={setForm}
            cycles={cycles}
            programs={programs}
          />
        </Modal>
      )}

      {/* Edit modal */}
      {editOpen && (
        <Modal
          visible={editOpen}
          onClose={() => {
            setEditing(null)
            setEditOpen(false)
          }}
          title="Edit announcement"
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          primaryAction={{
            label: 'Save',
            onPress: () => {
              void handleUpdate()
            },
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
          <AnnouncementForm
            form={form}
            setForm={setForm}
            cycles={cycles}
            programs={programs}
          />
        </Modal>
      )}

      {/* Delete confirm */}
      {deleteId != null && (
        <Modal
          visible={deleteId != null}
          onClose={() => setDeleteId(null)}
          title="Delete announcement?"
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          primaryAction={{
            label: 'Delete',
            onPress: () => {
              void handleDelete()
            },
            disabled: saving,
          }}
          secondaryAction={{
            label: 'Cancel',
            onPress: () => setDeleteId(null),
          }}
        >
          <Text variant="secondary">
            This cannot be undone. Athletes will no longer see this
            announcement.
          </Text>
        </Modal>
      )}
    </div>
  )
}

function AnnouncementForm({
  form,
  setForm,
  cycles,
  programs,
}: Readonly<{
  form: CreateAnnouncementPayload
  setForm: (f: CreateAnnouncementPayload) => void
  cycles: Cycle[]
  programs: Program[]
}>) {
  return (
    <div className="space-y-4">
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Type
        </Text>
        <Dropdown
          value={form.type}
          onValueChange={v => setForm({ ...form, type: v as AnnouncementType })}
          options={ANNOUNCEMENT_TYPES.map(t => ({
            value: t.value,
            label: t.label,
          }))}
          placeholder="Select type"
        />
      </div>
      {form.type === 'PROGRAM' && (
        <div>
          <Text variant="default" className="text-sm font-medium mb-1 block">
            Program
          </Text>
          <Dropdown
            value={form.programId?.toString() ?? ''}
            onValueChange={v =>
              setForm({ ...form, programId: v ? Number(v) : undefined })
            }
            options={programs.map(p => ({
              value: String(p.id),
              label: p.name,
            }))}
            placeholder="Select program"
          />
        </div>
      )}
      {form.type === 'CYCLE' && (
        <div>
          <Text variant="default" className="text-sm font-medium mb-1 block">
            Cycle
          </Text>
          <Dropdown
            value={form.cycleId?.toString() ?? ''}
            onValueChange={v =>
              setForm({ ...form, cycleId: v ? Number(v) : undefined })
            }
            options={cycles.map(c => ({ value: String(c.id), label: c.name }))}
            placeholder="Select cycle"
          />
        </div>
      )}
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Title
        </Text>
        <Input
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="Announcement title"
        />
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Body
        </Text>
        <textarea
          className="w-full min-h-[120px] rounded border border-gray-300 px-3 py-2 text-sm"
          value={form.body}
          onChange={e => setForm({ ...form, body: e.target.value })}
          placeholder="Announcement body"
        />
      </div>
    </div>
  )
}
