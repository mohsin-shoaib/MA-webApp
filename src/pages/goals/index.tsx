import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Modal } from '@/components/Modal'
import { Dropdown } from '@/components/Dropdown'
import { DatePicker } from '@/components/DatePicker'
import { Spinner } from '@/components/Spinner'
import { athleteGoalsService } from '@/api/athlete-goals.service'
import { goalTypeService } from '@/api/goal-type.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { AthleteGoal, SetPrimaryWhen } from '@/types/athlete-goal'
import type { GoalType } from '@/types/goal-type'
import { AxiosError } from 'axios'

export default function GoalsPage() {
  const [goals, setGoals] = useState<AthleteGoal[]>([])
  const [goalTypes, setGoalTypes] = useState<GoalType[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [setPrimaryModalOpen, setSetPrimaryModalOpen] = useState(false)
  const [goalToSetPrimary, setGoalToSetPrimary] = useState<AthleteGoal | null>(
    null
  )
  const [primaryOption, setPrimaryOption] = useState<SetPrimaryWhen>('now')
  const [primaryEffectiveDate, setPrimaryEffectiveDate] = useState('')
  const [formGoalTypeId, setFormGoalTypeId] = useState('')
  const [formEventDate, setFormEventDate] = useState('')
  const [formIsPrimary, setFormIsPrimary] = useState(false)
  const { showSuccess, showError } = useSnackbar()

  const fetchGoals = useCallback(async () => {
    try {
      const list = await athleteGoalsService.getMyGoals()
      setGoals(Array.isArray(list) ? list : [])
    } catch (err) {
      const e = err as AxiosError<{ message?: string }>
      showError(e.response?.data?.message ?? 'Failed to load goals')
      setGoals([])
    } finally {
      setLoading(false)
    }
  }, [showError])

  const fetchGoalTypes = useCallback(async () => {
    try {
      const res = await goalTypeService.getAll({ limit: 100 })
      setGoalTypes(res.data?.data?.rows ?? [])
    } catch {
      setGoalTypes([])
    }
  }, [])

  useEffect(() => {
    fetchGoals()
    fetchGoalTypes()
  }, [fetchGoals, fetchGoalTypes])

  const handleAddGoal = async () => {
    if (!formGoalTypeId) {
      showError('Select a goal type')
      return
    }
    setSaving(true)
    try {
      await athleteGoalsService.createGoal({
        goalTypeId: Number(formGoalTypeId),
        eventDate: formEventDate || undefined,
        isPrimary: formIsPrimary,
      })
      showSuccess('Goal added')
      setAddModalOpen(false)
      setFormGoalTypeId('')
      setFormEventDate('')
      setFormIsPrimary(false)
      fetchGoals()
    } catch (err) {
      const e = err as AxiosError<{ message?: string }>
      showError(e.response?.data?.message ?? 'Failed to add goal')
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteGoal = async (goal: AthleteGoal) => {
    if (
      !globalThis.confirm(
        `Remove "${goal.goalType.subCategory}" from your goals?`
      )
    )
      return
    setSaving(true)
    try {
      await athleteGoalsService.deleteGoal(goal.id)
      showSuccess('Goal removed')
      fetchGoals()
    } catch (err) {
      const e = err as AxiosError<{ message?: string }>
      showError(e.response?.data?.message ?? 'Failed to remove goal')
    } finally {
      setSaving(false)
    }
  }

  const openSetPrimaryModal = (goal: AthleteGoal) => {
    setGoalToSetPrimary(goal)
    setPrimaryOption('now')
    setPrimaryEffectiveDate('')
    setSetPrimaryModalOpen(true)
  }

  const handleSetPrimary = async () => {
    if (!goalToSetPrimary) return
    if (primaryOption === 'date' && !primaryEffectiveDate) {
      showError('Choose a start date')
      return
    }
    setSaving(true)
    try {
      const payload: { when: SetPrimaryWhen; effectiveDate?: string } = {
        when: primaryOption,
      }
      if (
        (primaryOption === 'date' || primaryOption === 'end_of_block') &&
        primaryEffectiveDate
      ) {
        payload.effectiveDate = primaryEffectiveDate
      }
      await athleteGoalsService.setPrimaryGoal(goalToSetPrimary.id, payload)
      showSuccess('Primary goal updated')
      setSetPrimaryModalOpen(false)
      setGoalToSetPrimary(null)
      fetchGoals()
    } catch (err) {
      const e = err as AxiosError<{ message?: string }>
      showError(e.response?.data?.message ?? 'Failed to set primary goal')
    } finally {
      setSaving(false)
    }
  }

  const formatDate = (d: string | null) =>
    d ? new Date(d).toLocaleDateString(undefined, { dateStyle: 'medium' }) : '—'

  let cardContent: React.ReactNode
  if (loading) {
    cardContent = (
      <div className="flex items-center gap-2 py-8">
        <Spinner size="small" />
        <Text variant="secondary">Loading goals…</Text>
      </div>
    )
  } else if (goals.length === 0) {
    cardContent = (
      <Text variant="secondary" className="py-6">
        No goals yet. Add a goal to get started, or your primary goal was set
        during onboarding.
      </Text>
    )
  } else {
    cardContent = (
      <ul className="space-y-3">
        {goals.map(goal => (
          <li
            key={goal.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-gray-200 bg-gray-50/50 px-4 py-3"
          >
            <div>
              <span className="font-medium text-gray-900">
                {goal.goalType.subCategory}
              </span>
              {goal.goalType.category && (
                <span className="text-gray-500 text-sm ml-2">
                  ({goal.goalType.category})
                </span>
              )}
              {goal.isPrimary && (
                <span className="ml-2 px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-xs font-medium">
                  Primary
                </span>
              )}
              <div className="text-sm text-gray-500 mt-0.5">
                Event date: {formatDate(goal.eventDate)}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {!goal.isPrimary && (
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => openSetPrimaryModal(goal)}
                  disabled={saving}
                >
                  Set as primary
                </Button>
              )}
              <Button
                variant="secondary"
                size="small"
                onClick={() => handleDeleteGoal(goal)}
                disabled={saving}
              >
                Remove
              </Button>
            </div>
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Text variant="primary" className="text-2xl font-semibold">
          My Goals
        </Text>
        <Button
          onClick={() => setAddModalOpen(true)}
          className="bg-[#2196F3] hover:bg-[#1976D2] text-white"
        >
          Add goal
        </Button>
      </div>

      <Card className="p-6 rounded-xl border border-gray-200 bg-white">
        <Text variant="secondary" className="text-sm mb-4 block">
          Your primary goal drives your training roadmap. You can add multiple
          goals and choose which one is primary.
        </Text>
        {cardContent}
      </Card>

      {/* Add goal modal */}
      {addModalOpen && (
        <Modal
          visible={addModalOpen}
          onClose={() => setAddModalOpen(false)}
          title="Add goal"
        >
          <div className="space-y-4">
            <Dropdown
              label="Goal type"
              value={formGoalTypeId}
              onValueChange={v =>
                setFormGoalTypeId(typeof v === 'string' ? v : '')
              }
              options={goalTypes.map(gt => {
                const label = gt.category
                  ? `${gt.subCategory} (${gt.category})`
                  : gt.subCategory
                return { label, value: String(gt.id) }
              })}
              placeholder="Select goal"
              fullWidth
            />
            <DatePicker
              label="Event date (optional)"
              value={formEventDate}
              onChange={d => setFormEventDate(d ?? '')}
            />
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formIsPrimary}
                onChange={e => setFormIsPrimary(e.target.checked)}
              />
              <Text variant="default">Set as primary goal</Text>
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                onClick={() => setAddModalOpen(false)}
              >
                Cancel
              </Button>
              <Button onClick={handleAddGoal} loading={saving}>
                Add
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Set primary goal modal — PRD 5.3 */}
      {setPrimaryModalOpen && (
        <Modal
          visible={setPrimaryModalOpen}
          onClose={() => {
            setSetPrimaryModalOpen(false)
            setGoalToSetPrimary(null)
          }}
          title="Change primary goal"
        >
          {goalToSetPrimary && (
            <div className="space-y-4">
              <Text variant="default">
                Your new primary goal changes your training timeline. Would you
                like to:
              </Text>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="primaryWhen"
                    checked={primaryOption === 'now'}
                    onChange={() => setPrimaryOption('now')}
                  />
                  <Text variant="default">Switch now</Text>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="primaryWhen"
                    checked={primaryOption === 'end_of_block'}
                    onChange={() => setPrimaryOption('end_of_block')}
                  />
                  <Text variant="default">
                    Finish your current training block
                  </Text>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="primaryWhen"
                    checked={primaryOption === 'date'}
                    onChange={() => setPrimaryOption('date')}
                  />
                  <Text variant="default">Choose a start date</Text>
                </label>
              </div>
              {(primaryOption === 'date' ||
                primaryOption === 'end_of_block') && (
                <DatePicker
                  label="Start date"
                  value={primaryEffectiveDate}
                  onChange={d => setPrimaryEffectiveDate(d ?? '')}
                />
              )}
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSetPrimaryModalOpen(false)
                    setGoalToSetPrimary(null)
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleSetPrimary} loading={saving}>
                  Update primary goal
                </Button>
              </div>
            </div>
          )}
        </Modal>
      )}
    </div>
  )
}
