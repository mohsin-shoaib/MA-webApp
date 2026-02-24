import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { adminCurriculumService } from '@/api/adminCurriculum.service'
import type {
  CurriculumItem,
  CreateCurriculumItemPayload,
  EnrolledUser,
} from '@/api/adminCurriculum.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { AxiosError } from 'axios'
import CurriculumItemForm from '@/components/curriculum/curriculumForm'

const CURRICULUM_KEY = '90_UNCHAINED'

export default function AdminCurriculum() {
  const [items, setItems] = useState<CurriculumItem[]>([])
  const [enrolled, setEnrolled] = useState<EnrolledUser[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [editing, setEditing] = useState<CurriculumItem | null>(null)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [enrollUserId, setEnrollUserId] = useState('')
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
      const [itemsRes, enrolledRes] = await Promise.all([
        adminCurriculumService.listItems(CURRICULUM_KEY),
        adminCurriculumService.listEnrolled(CURRICULUM_KEY),
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
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [showError])

  // Ensure modals are closed on mount/refresh
  useEffect(() => {
    setIsModalOpen(false)
    // setIsUpdateModalOpen(false)
  }, [])
  useEffect(() => {
    fetchList()
  }, [fetchList])

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

      console.log('inside create 1', createOpen)

      fetchList()
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to create')
    } finally {
      setSaving(false)
    }
  }

  console.log('inside create', createOpen)

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
      setCreateOpen(false)
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

  const handleOpenModal = () => {
    setForm({
      curriculumKey: CURRICULUM_KEY,
      type: 'WEEKLY_LESSON',
      title: '',
      description: '',
      url: '',
      weekIndex: 1,
      sortOrder: 0,
    })
    setIsModalOpen(true)
  }
  const handleCloseModal = () => {
    setIsModalOpen(false)
  }

  const handleCloseEditModal = () => {
    setEditing(null)
    setEditOpen(false)
  }

  const handleCloseDeleteModal = () => {
    setDeleteId(null)
    setCreateOpen(false)
  }

  const handleEnroll = async () => {
    const uid = Number(enrollUserId)
    if (!uid || Number.isNaN(uid)) {
      showError('Enter a valid user ID')
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

  return (
    <div className="p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <Text as="h1" variant="primary" className="text-2xl font-bold">
            90 Unchained Curriculum
          </Text>
          <Text variant="secondary" className="text-sm mt-1">
            PRD 12: Weekly lessons, PDFs, videos, live call links. Only visible
            to enrolled athletes in Coach tab.
          </Text>
        </div>
        <Button type="button" onClick={handleOpenModal}>
          Add item
        </Button>
      </div>

      <Card className="p-6 mb-6">
        <Text variant="default" className="font-semibold mb-4 block">
          Enroll athlete
        </Text>
        <div className="flex gap-2 items-center">
          <Input
            type="number"
            placeholder="User ID"
            value={enrollUserId}
            onChange={e => setEnrollUserId(e.target.value)}
            className="w-32"
          />
          <Button
            type="button"
            variant="secondary"
            onClick={handleEnroll}
            disabled={saving}
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
        {loading ? (
          <div className="flex items-center gap-2 py-4">
            <Spinner size="small" variant="primary" />
            <Text variant="secondary">Loading...</Text>
          </div>
        ) : items.length === 0 ? (
          <Text variant="secondary">
            No items yet. Add lessons, PDFs, videos, or live call links.
          </Text>
        ) : (
          <ul className="space-y-3">
            {items
              .sort(
                (a, b) => a.weekIndex - b.weekIndex || a.sortOrder - b.sortOrder
              )
              .map(item => (
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
        )}
      </Card>
      {isModalOpen && (
        <Modal
          visible={isModalOpen}
          onClose={handleCloseModal}
          title="Add curriculum item"
          showCloseButton
          primaryAction={{
            label: 'Create',
            onPress: handleCreate,
            disabled: saving,
          }}
          secondaryAction={{ label: 'Cancel', onPress: handleCloseModal }}
        >
          <CurriculumItemForm form={form} setForm={setForm} />
        </Modal>
      )}
      {editOpen && (
        <Modal
          visible={editOpen}
          onClose={handleCloseEditModal}
          title="Edit item"
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          primaryAction={{
            label: 'Save',
            onPress: handleUpdate,
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

      {deleteId && (
        <Modal
          visible={deleteId != null}
          onClose={handleCloseDeleteModal}
          title="Delete item?"
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          primaryAction={{
            label: 'Delete',
            onPress: handleDelete,
            disabled: saving,
          }}
          secondaryAction={{ label: 'Cancel', onPress: handleCloseDeleteModal }}
        >
          <Text variant="secondary">
            This will remove the item from the curriculum.
          </Text>
        </Modal>
      )}
    </div>
  )
}
