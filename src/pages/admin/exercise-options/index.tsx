import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import {
  exerciseOptionService,
  type ExerciseOption,
  type ExerciseOptionType,
} from '@/api/exercise-option.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { AxiosError } from 'axios'

const OPTION_TYPE_LABELS: Record<ExerciseOptionType, string> = {
  muscle_group: 'Muscle groups',
  equipment: 'Equipment',
  movement_pattern: 'Movement patterns',
}

type TabType = ExerciseOptionType

export default function AdminExerciseOptions() {
  const [activeTab, setActiveTab] = useState<TabType>('muscle_group')
  const [rows, setRows] = useState<ExerciseOption[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [name, setName] = useState('')
  const [saving, setSaving] = useState(false)
  const { showError, showSuccess } = useSnackbar()

  const fetchOptions = useCallback(async () => {
    try {
      setLoading(true)
      const res = await exerciseOptionService.list(activeTab)
      setRows(res.data?.data?.rows ?? [])
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message ?? 'Failed to load options')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [activeTab, showError])

  useEffect(() => {
    fetchOptions()
  }, [fetchOptions])

  const openCreate = () => {
    setEditId(null)
    setName('')
    setModalOpen(true)
  }

  const openEdit = (option: ExerciseOption) => {
    setEditId(option.id)
    setName(option.name)
    setModalOpen(true)
  }

  const closeModal = () => {
    setModalOpen(false)
    setEditId(null)
    setName('')
  }

  const handleSave = async () => {
    const trimmed = name.trim()
    if (!trimmed) {
      showError('Name is required')
      return
    }
    setSaving(true)
    try {
      if (editId != null) {
        await exerciseOptionService.update(editId, { name: trimmed })
        showSuccess('Option updated')
      } else {
        await exerciseOptionService.create({
          type: activeTab,
          name: trimmed,
        })
        showSuccess('Option added')
      }
      closeModal()
      fetchOptions()
    } catch (e) {
      const err = e as AxiosError<{
        message?: string
        data?: { message?: string }
      }>
      showError(
        err.response?.data?.message ??
          err.response?.data?.data?.message ??
          'Failed to save'
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Text as="h1" variant="primary" className="text-2xl font-bold">
          Exercise dropdown options
        </Text>
        <Text variant="secondary" className="text-sm mt-1">
          Manage muscle groups, equipment, and movement patterns used in the
          Exercise Library.
        </Text>
      </div>

      <div className="flex gap-2 mb-4 border-b border-gray-200">
        {(['muscle_group', 'equipment', 'movement_pattern'] as const).map(
          type => (
            <button
              key={type}
              type="button"
              onClick={() => setActiveTab(type)}
              className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
                activeTab === type
                  ? 'border-primary text-primary'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              {OPTION_TYPE_LABELS[type]}
            </button>
          )
        )}
      </div>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <Text variant="default" className="font-medium">
            {OPTION_TYPE_LABELS[activeTab]}
          </Text>
          <Button type="button" size="small" onClick={openCreate}>
            Add option
          </Button>
        </div>
        {loading ? (
          <Text variant="muted" className="text-sm">
            Loading...
          </Text>
        ) : rows.length === 0 ? (
          <Text variant="muted" className="text-sm">
            No options yet. Add one to use in the Exercise Library.
          </Text>
        ) : (
          <ul className="space-y-2">
            {rows.map(opt => (
              <li
                key={opt.id}
                className="flex items-center justify-between py-2 px-3 rounded-lg border border-gray-100 hover:bg-gray-50"
              >
                <Text variant="default" className="text-sm">
                  {opt.name}
                </Text>
                <Button
                  type="button"
                  variant="outline"
                  size="small"
                  onClick={() => openEdit(opt)}
                >
                  Edit
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {modalOpen && (
        <Modal
          visible={modalOpen}
          onClose={closeModal}
          title={editId != null ? 'Edit option' : 'Add option'}
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          primaryAction={{
            label: editId != null ? 'Save' : 'Add',
            onPress: () => void handleSave(),
            disabled: saving || !name.trim(),
          }}
          secondaryAction={{
            label: 'Cancel',
            onPress: closeModal,
          }}
        >
          <div className="space-y-4">
            <div>
              <Text
                variant="default"
                className="text-sm font-medium mb-1 block"
              >
                Name
              </Text>
              <Input
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder={`e.g. ${activeTab === 'muscle_group' ? 'Quadriceps' : activeTab === 'equipment' ? 'Barbell' : 'Squat'}`}
                size="small"
              />
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
