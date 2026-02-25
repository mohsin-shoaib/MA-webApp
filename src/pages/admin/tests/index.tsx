/** PRD 15.6 — Admin: create, edit, delete tests; add events and standards */
import type { ReactNode } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { adminTestsService } from '@/api/admin-tests.service'
import type { Test } from '@/types/tests'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { AxiosError } from 'axios'

const SCORING_OPTIONS = [
  { value: 'POINTS', label: 'Points' },
  { value: 'PASS_FAIL', label: 'Pass/Fail' },
  { value: 'TIME_BASED', label: 'Time-based' },
]

export default function AdminTestsPage() {
  const { showSuccess, showError } = useSnackbar()
  const [list, setList] = useState<Test[]>([])
  const [loading, setLoading] = useState(true)
  const [createOpen, setCreateOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '',
    description: '',
    audienceTag: '',
    scoringMethod: 'POINTS' as string,
    ageGenderAdjusted: false,
    rules: '',
  })

  const fetchList = useCallback(async () => {
    try {
      setLoading(true)
      const res = await adminTestsService.list()
      if (res.data?.statusCode === 200 && Array.isArray(res.data.data)) {
        setList(res.data.data)
      }
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to load tests')
      setList([])
    } finally {
      setLoading(false)
    }
  }, [showError])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  const handleCreate = async () => {
    if (!form.name.trim()) {
      showError('Name is required')
      return
    }
    setSaving(true)
    try {
      await adminTestsService.create({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        audienceTag: form.audienceTag.trim() || undefined,
        scoringMethod: form.scoringMethod,
        ageGenderAdjusted: form.ageGenderAdjusted,
        rules: form.rules.trim() || undefined,
      })
      showSuccess(
        'Test created. Add events and standards via API or future UI.'
      )
      setCreateOpen(false)
      setForm({
        name: '',
        description: '',
        audienceTag: '',
        scoringMethod: 'POINTS',
        ageGenderAdjusted: false,
        rules: '',
      })
      fetchList()
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Create failed')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (
      !globalThis.confirm(
        'Delete this test and all its events, standards, and logs?'
      )
    )
      return
    try {
      await adminTestsService.delete(id)
      showSuccess('Test deleted')
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
        No tests yet. Create a test and add events via API (POST
        /admin/tests/:testId/events) and standards (POST
        /admin/tests/:testId/standards).
      </div>
    )
  } else {
    cardContent = (
      <ul className="divide-y divide-gray-100">
        {list.map(t => (
          <li
            key={t.id}
            className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
          >
            <div>
              <Text variant="default" className="font-medium">
                {t.name}
              </Text>
              <Text variant="secondary" className="text-sm">
                {t.scoringMethod} · {t.events?.length ?? 0} events ·{' '}
                {t.standards?.length ?? 0} standards
              </Text>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="small"
              onClick={() => handleDelete(t.id)}
            >
              Delete
            </Button>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Text variant="primary" className="text-2xl font-semibold">
          Tests
        </Text>
        <Button type="button" onClick={() => setCreateOpen(true)}>
          Create test
        </Button>
      </div>
      <Card className="p-0">{cardContent}</Card>

      {createOpen && (
        <Modal
          visible={createOpen}
          onClose={() => setCreateOpen(false)}
          title="Create test"
        >
          <div className="space-y-3">
            <Input
              label="Name"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. APFT"
            />
            <Input
              label="Description"
              value={form.description}
              onChange={e =>
                setForm(f => ({ ...f, description: e.target.value }))
              }
            />
            <Input
              label="Audience tag"
              value={form.audienceTag}
              onChange={e =>
                setForm(f => ({ ...f, audienceTag: e.target.value }))
              }
              placeholder="Optional"
            />
            <div>
              <label
                htmlFor="create-test-scoring-method"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Scoring method
              </label>
              <select
                id="create-test-scoring-method"
                value={form.scoringMethod}
                onChange={e =>
                  setForm(f => ({ ...f, scoringMethod: e.target.value }))
                }
                className="border border-gray-300 rounded px-3 py-2 w-full"
              >
                {SCORING_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.ageGenderAdjusted}
                onChange={e =>
                  setForm(f => ({ ...f, ageGenderAdjusted: e.target.checked }))
                }
              />
              <span className="text-sm">Age/gender adjusted standards</span>
            </label>
            <div>
              <label
                htmlFor="create-test-rules"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Rules (reference only)
              </label>
              <textarea
                id="create-test-rules"
                value={form.rules}
                onChange={e => setForm(f => ({ ...f, rules: e.target.value }))}
                className="border border-gray-300 rounded px-3 py-2 w-full h-20"
                placeholder="Time limit, rest periods, event order..."
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleCreate} disabled={saving}>
                {saving ? 'Creating...' : 'Create'}
              </Button>
              <Button variant="secondary" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
