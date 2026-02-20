import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Modal } from '@/components/Modal'
import {
  nutritionConfigService,
  type NutritionConfigItem,
} from '@/api/nutrition-config.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { AxiosError } from 'axios'

export default function AdminNutritionConfig() {
  const [list, setList] = useState<NutritionConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [key, setKey] = useState('')
  const [value, setValue] = useState('')
  const { showError, showSuccess } = useSnackbar()

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      const res = await nutritionConfigService.list()
      const body = res.data as Record<string, unknown>
      const data = body?.data as Record<string, unknown> | unknown[] | undefined
      // API returns { data: { data: [...], meta } } or { data: [...] }
      let rows: NutritionConfigItem[] = []
      if (Array.isArray(data)) {
        rows = data as NutritionConfigItem[]
      } else if (
        data &&
        typeof data === 'object' &&
        Array.isArray((data as Record<string, unknown>).data)
      ) {
        rows = (data as { data: NutritionConfigItem[] }).data
      } else if (
        data &&
        typeof data === 'object' &&
        Array.isArray((data as Record<string, unknown>).rows)
      ) {
        rows = (data as { rows: NutritionConfigItem[] }).rows
      }
      setList(rows)
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || 'Failed to load config.')
      setList([])
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleSave = async (e: React.SyntheticEvent) => {
    e.preventDefault()
    if (!key.trim()) {
      showError('Key is required.')
      return
    }
    const num = Number(value)
    const valueToSend = value === '' ? '' : Number.isNaN(num) ? value : num
    try {
      setSaving(true)
      await nutritionConfigService.set({
        key: key.trim(),
        value: valueToSend as string | number,
      })
      showSuccess('Config saved.')
      setModalOpen(false)
      setKey('')
      setValue('')
      fetchList()
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (k: string) => {
    if (!globalThis.confirm(`Delete config key "${k}"?`)) return
    try {
      await nutritionConfigService.delete(k)
      showSuccess('Deleted.')
      fetchList()
    } catch (err) {
      const ax = err as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || 'Delete failed.')
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <Text as="h1" variant="primary" className="text-2xl font-bold">
            Nutrition Config
          </Text>
          <Text variant="secondary" className="text-sm mt-1">
            Configure protein multiplier, calorie deltas, and other calculator
            settings.
          </Text>
        </div>
        <Button onClick={() => setModalOpen(true)}>Add / Edit key</Button>
      </div>
      <div className="border border-gray-200 rounded-xl bg-white overflow-hidden">
        {loading ? (
          <div className="p-6 text-gray-500">Loading…</div>
        ) : list.length === 0 ? (
          <div className="p-6 text-gray-500">
            No config keys. Add one to get started.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 font-medium">Key</th>
                <th className="text-left p-3 font-medium">Value</th>
                <th className="w-24 p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {list.map((item, i) => (
                <tr key={item.key || i} className="border-b">
                  <td className="p-3 font-mono">{item.key}</td>
                  <td className="p-3">
                    {typeof item.value === 'object'
                      ? JSON.stringify(item.value)
                      : String(item.value)}
                  </td>
                  <td className="p-3">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => handleDelete(item.key)}
                    >
                      Delete
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      {modalOpen && (
        <Modal
          visible
          onClose={() => setModalOpen(false)}
          title="Set config key"
          size="medium"
          showCloseButton
        >
          <form onSubmit={handleSave} className="p-5 space-y-4">
            <Input
              label="Key"
              required
              value={key}
              onChange={e => setKey(e.target.value)}
              placeholder="e.g. proteinMultiplier"
            />
            <Input
              label="Value"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder="number or string"
            />
            <div className="flex gap-2">
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
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
