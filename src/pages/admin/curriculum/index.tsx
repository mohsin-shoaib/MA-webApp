import type { ReactNode } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
import { adminCurriculumService } from '@/api/admin-curriculum.service'
import type {
  CurriculumItem,
  CurriculumItemType,
  CreateCurriculumItemPayload,
  EnrolledUser,
  EnrollmentRequestItem,
} from '@/api/admin-curriculum.service'
import { adminService } from '@/api/admin.service'
import type { User } from '@/types/admin'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { AxiosError } from 'axios'

function athleteLabel(u: User): string {
  const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
  return name ? `${name} (${u.email})` : u.email
}

const CURRICULUM_KEY = '90_UNCHAINED'
const ITEM_TYPES: { value: CurriculumItemType; label: string }[] = [
  { value: 'WEEKLY_LESSON', label: 'Weekly lesson' },
  { value: 'PDF', label: 'PDF' },
  { value: 'VIDEO', label: 'Video' },
  { value: 'LIVE_CALL', label: 'Live call' },
]

export default function AdminCurriculum() {
  const [items, setItems] = useState<CurriculumItem[]>([])
  const [enrolled, setEnrolled] = useState<EnrolledUser[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<CurriculumItem | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [enrollUserId, setEnrollUserId] = useState<string>('')
  const [athletes, setAthletes] = useState<User[]>([])
  const [enrollmentRequests, setEnrollmentRequests] = useState<
    EnrollmentRequestItem[]
  >([])
  const [form, setForm] = useState<CreateCurriculumItemPayload>({
    curriculumKey: CURRICULUM_KEY,
    type: 'WEEKLY_LESSON',
    title: '',
    weekIndex: 1,
  })
  const { showError, showSuccess } = useSnackbar()

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      const [itemsRes, enrolledRes, requestsRes] = await Promise.all([
        adminCurriculumService.listItems(CURRICULUM_KEY),
        adminCurriculumService.listEnrolled(CURRICULUM_KEY),
        adminCurriculumService.listEnrollmentRequests(CURRICULUM_KEY),
      ])
      if (
        itemsRes.data?.statusCode === 200 &&
        Array.isArray(itemsRes.data.data)
      ) {
        setItems(itemsRes.data.data)
      }
      if (
        enrolledRes.data?.statusCode === 200 &&
        Array.isArray(enrolledRes.data.data)
      ) {
        setEnrolled(enrolledRes.data.data)
      }
      if (
        requestsRes.data?.statusCode === 200 &&
        Array.isArray(requestsRes.data.data?.requests)
      ) {
        setEnrollmentRequests(requestsRes.data.data.requests)
      }
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [showError])

  const fetchAthletes = useCallback(async () => {
    try {
      const res = await adminService.getUsers()
      const rows = res.data?.data?.rows ?? []
      setAthletes(
        rows.filter((u: User) => String(u.role).toUpperCase() === 'ATHLETE')
      )
    } catch {
      setAthletes([])
    }
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  useEffect(() => {
    fetchAthletes()
  }, [fetchAthletes])

  const openCreate = () => {
    setForm({
      curriculumKey: CURRICULUM_KEY,
      type: 'WEEKLY_LESSON',
      title: '',
      description: '',
      url: '',
      weekIndex: 1,
      sortOrder: 0,
    })
    setCreateOpen(true)
  }

  const openEdit = (item: CurriculumItem) => {
    setEditing(item)
    setForm({
      curriculumKey: item.curriculumKey,
      type: item.type,
      title: item.title,
      description: item.description ?? '',
      url: item.url ?? '',
      weekIndex: item.weekIndex,
      sortOrder: item.sortOrder,
    })
    setEditOpen(true)
  }

  const handleCreate = async () => {
    if (!form.title.trim()) {
      showError('Title is required')
      return
    }
    try {
      setSaving(true)
      await adminCurriculumService.createItem({
        ...form,
        description: form.description || undefined,
        url: form.url || undefined,
      })
      showSuccess('Item created')
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
    if (!form.title.trim()) {
      showError('Title is required')
      return
    }
    try {
      setSaving(true)
      await adminCurriculumService.updateItem(editing.id, {
        type: form.type,
        title: form.title,
        description: form.description || undefined,
        url: form.url || undefined,
        weekIndex: form.weekIndex,
        sortOrder: form.sortOrder,
      })
      showSuccess('Item updated')
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
      await adminCurriculumService.deleteItem(deleteId)
      showSuccess('Item deleted')
      setDeleteId(null)
      fetchList()
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to delete')
    } finally {
      setSaving(false)
    }
  }

  const handleEnroll = async () => {
    const uid = Number(enrollUserId)
    if (!enrollUserId || !uid || Number.isNaN(uid)) {
      showError('Select an athlete')
      return
    }
    try {
      setSaving(true)
      await adminCurriculumService.enrollUser(uid)
      showSuccess('User enrolled in 90 Unchained')
      setEnrollUserId('')
      fetchList()
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to enroll')
    } finally {
      setSaving(false)
    }
  }

  const enrollmentRequestUserLabel = (r: EnrollmentRequestItem) => {
    const u = r.user
    const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
    return name ? `${name} (${u.email})` : u.email
  }

  const athleteOptions = athletes.map(a => ({
    value: String(a.id),
    label: athleteLabel(a),
  }))

  let cardContent: ReactNode
  if (loading) {
    cardContent = (
      <div className="flex items-center gap-2 py-4">
        <Spinner size="small" variant="primary" />
        <Text variant="secondary">Loading...</Text>
      </div>
    )
  } else if (items.length === 0) {
    cardContent = (
      <Text variant="secondary">
        No items yet. Add lessons, PDFs, videos, or live call links.
      </Text>
    )
  } else {
    const sortedItems = [...items].sort(
      (a, b) => a.weekIndex - b.weekIndex || a.sortOrder - b.sortOrder
    )
    cardContent = (
      <ul className="space-y-3">
        {sortedItems.map(item => (
          <li
            key={item.id}
            className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 last:border-0"
          >
            <div>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 mr-2">
                Week {item.weekIndex}
              </span>
              <span className="rounded bg-gray-100 px-2 py-0.5 text-xs text-gray-600 mr-2">
                {item.type.replaceAll('_', ' ')}
              </span>
              <Text variant="default" className="font-medium text-sm">
                {item.title}
              </Text>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 text-xs ml-2"
                >
                  Open
                </a>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => openEdit(item)}
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="small"
                onClick={() => setDeleteId(item.id)}
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
            90 Unchained Curriculum
          </Text>
          <Text variant="secondary" className="text-sm mt-1">
            Weekly lessons, PDFs, videos, live call links. Only visible to
            enrolled athletes in Coach tab.
          </Text>
        </div>
        <Button type="button" onClick={openCreate}>
          Add item
        </Button>
      </div>

      {enrollmentRequests.length > 0 && (
        <Card className="p-6 mb-6 border-violet-200 bg-violet-50/50">
          <Text variant="default" className="font-semibold mb-2 block">
            Pending 90 Unchained requests ({enrollmentRequests.length})
          </Text>
          <Text variant="secondary" className="text-sm mb-4">
            These athletes requested 90 Unchained from the Market page. Enroll
            them below.
          </Text>
          <ul className="space-y-2">
            {enrollmentRequests.map(r => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-violet-100 last:border-0"
              >
                <div>
                  <Text variant="default" className="text-sm font-medium">
                    {enrollmentRequestUserLabel(r)}
                  </Text>
                  <Text variant="muted" className="text-xs">
                    Requested{' '}
                    {new Date(r.createdAt).toLocaleString(undefined, {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </Text>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="small"
                  onClick={() => setEnrollUserId(String(r.userId))}
                >
                  Enroll
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-6 mb-6">
        <Text variant="default" className="font-semibold mb-4 block">
          Enroll athlete
        </Text>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="min-w-[240px] max-w-md">
            <Text variant="secondary" className="text-xs mb-1 block">
              Athlete
            </Text>
            <Dropdown
              placeholder="Select athlete"
              value={enrollUserId}
              onValueChange={v => setEnrollUserId((v as string) ?? '')}
              options={athleteOptions}
              fullWidth
            />
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={handleEnroll}
            disabled={saving || !enrollUserId}
          >
            Enroll in 90 Unchained
          </Button>
        </div>
        {enrolled.length > 0 && (
          <div className="mt-4">
            <Text variant="secondary" className="text-sm font-medium mb-2">
              Enrolled ({enrolled.length})
            </Text>
            <ul className="text-sm text-gray-600 space-y-1">
              {enrolled.slice(0, 20).map(e => (
                <li key={e.id}>
                  {e.user?.email ?? `User ${e.userId}`}
                  {e.user?.firstName &&
                    ` (${e.user.firstName} ${e.user.lastName ?? ''})`}
                </li>
              ))}
              {enrolled.length > 20 && (
                <li>... and {enrolled.length - 20} more</li>
              )}
            </ul>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <Text variant="default" className="font-semibold mb-4 block">
          Curriculum items
        </Text>
        {cardContent}
      </Card>

      {createOpen && (
        <Modal
          visible={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Add curriculum item"
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
          <CurriculumItemForm form={form} setForm={setForm} />
        </Modal>
      )}

      {editOpen && (
        <Modal
          visible={editOpen}
          onClose={() => {
            setEditing(null)
            setEditOpen(false)
          }}
          title="Edit item"
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
          <CurriculumItemForm form={form} setForm={setForm} />
        </Modal>
      )}

      {deleteId != null && (
        <Modal
          visible={deleteId != null}
          onClose={() => setDeleteId(null)}
          title="Delete item?"
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
            This will remove the item from the curriculum.
          </Text>
        </Modal>
      )}
    </div>
  )
}

function CurriculumItemForm({
  form,
  setForm,
}: Readonly<{
  form: CreateCurriculumItemPayload & {
    description?: string
    url?: string
    sortOrder?: number
  }
  setForm: (
    f: CreateCurriculumItemPayload & {
      description?: string
      url?: string
      sortOrder?: number
    }
  ) => void
}>) {
  return (
    <div className="space-y-4">
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Type
        </Text>
        <Dropdown
          value={form.type}
          onValueChange={v =>
            setForm({ ...form, type: v as CurriculumItemType })
          }
          options={ITEM_TYPES.map(t => ({ value: t.value, label: t.label }))}
          placeholder="Type"
        />
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Title
        </Text>
        <Input
          value={form.title}
          onChange={e => setForm({ ...form, title: e.target.value })}
          placeholder="Title"
        />
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Description (optional)
        </Text>
        <textarea
          className="w-full min-h-[60px] rounded border border-gray-300 px-3 py-2 text-sm"
          value={form.description ?? ''}
          onChange={e => setForm({ ...form, description: e.target.value })}
          placeholder="Description"
        />
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          URL (optional)
        </Text>
        <Input
          value={form.url ?? ''}
          onChange={e => setForm({ ...form, url: e.target.value })}
          placeholder="https://..."
        />
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Week number
        </Text>
        <Input
          type="number"
          min={1}
          value={form.weekIndex}
          onChange={e =>
            setForm({ ...form, weekIndex: Number(e.target.value) || 1 })
          }
        />
      </div>
      <div>
        <Text variant="default" className="text-sm font-medium mb-1 block">
          Sort order
        </Text>
        <Input
          type="number"
          min={0}
          value={form.sortOrder ?? 0}
          onChange={e =>
            setForm({ ...form, sortOrder: Number(e.target.value) || 0 })
          }
        />
      </div>
    </div>
  )
}
