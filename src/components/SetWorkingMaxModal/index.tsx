import { useState, useEffect } from 'react'
import { Modal } from '@/components/Modal'
import { Text } from '@/components/Text'
import { Input } from '@/components/Input'
import { trainService } from '@/api/train.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { AxiosError } from 'axios'

export interface SetWorkingMaxModalProps {
  visible: boolean
  onClose: () => void
  /** Called after successful save so parent can refresh working max data */
  onSuccess?: () => void
  exerciseId: number
  exerciseName: string
  /** Current value if any (for display / prefill) */
  currentValue?: number
  currentUnit?: 'lb' | 'kg'
}

export function SetWorkingMaxModal({
  visible,
  onClose,
  onSuccess,
  exerciseId,
  exerciseName,
  currentValue,
  currentUnit = 'lb',
}: Readonly<SetWorkingMaxModalProps>) {
  const [value, setValue] = useState<string>(
    currentValue != null ? String(currentValue) : ''
  )
  const [unit, setUnit] = useState<'lb' | 'kg'>(currentUnit ?? 'lb')
  const [saving, setSaving] = useState(false)
  const { showSuccess, showError } = useSnackbar()

  useEffect(() => {
    if (visible) {
      setValue(currentValue != null ? String(currentValue) : '')
      setUnit(currentUnit ?? 'lb')
    }
  }, [visible, currentValue, currentUnit])

  const handleSave = async () => {
    const num = value.trim() ? Number(value.trim()) : NaN
    if (!Number.isFinite(num) || num <= 0) {
      showError('Enter a valid weight greater than 0.')
      return
    }
    setSaving(true)
    try {
      await trainService.setWorkingMax({ exerciseId, value: num, unit })
      showSuccess('Working max updated.')
      onSuccess?.()
      onClose()
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message ?? 'Failed to update working max.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      visible={visible}
      onClose={onClose}
      title={`Set working max: ${exerciseName}`}
      showCloseButton
      closeOnBackdropPress
      closeOnEscape
      size="small"
      primaryAction={{
        label: 'Save',
        onPress: handleSave,
        loading: saving,
        disabled: saving || !value.trim(),
      }}
      secondaryAction={{
        label: 'Cancel',
        onPress: onClose,
      }}
    >
      <div className="space-y-4">
        <Text variant="secondary" className="text-sm block">
          Enter your current 1RM or working max. It will be used for
          percentage-based prescriptions. Manual values are not overwritten by
          auto-calculation until you change them again.
        </Text>
        <div>
          <label
            htmlFor="wm-value"
            className="mb-1 block text-sm font-medium text-gray-700"
          >
            Weight
          </label>
          <div className="flex gap-2 items-center">
            <Input
              id="wm-value"
              type="number"
              min={0}
              step={0.5}
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="e.g. 225"
              size="small"
              className="flex-1"
            />
            <select
              value={unit}
              onChange={e => setUnit(e.target.value as 'lb' | 'kg')}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#3AB8ED]/30 focus:border-[#3AB8ED] outline-none"
              aria-label="Unit"
            >
              <option value="lb">lb</option>
              <option value="kg">kg</option>
            </select>
          </div>
        </div>
      </div>
    </Modal>
  )
}
