import { useState } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { ProgressBar } from '@/components/ProgressBar'
import { nutritionService } from '@/api/nutrition.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { AxiosError } from 'axios'

export function HydrationSection({
  date,
  onDateChange,
  amountOz,
  targetOz,
  loading,
  onReload,
}: Readonly<{
  date: string
  onDateChange: (d: string) => void
  amountOz: number
  targetOz: number
  loading: boolean
  onReload: () => void
}>) {
  const { showSuccess, showError } = useSnackbar()
  const [saving, setSaving] = useState(false)

  const adjust = (delta: number) => {
    const newAmount = Math.max(0, amountOz + delta)
    setSaving(true)
    nutritionService
      .logHydration({ date, amountOz: newAmount })
      .then(() => {
        showSuccess('Hydration updated.')
        onReload()
      })
      .catch((err: AxiosError<{ message?: string }>) => {
        showError(
          err.response?.data?.message || err.message || 'Failed to update.'
        )
      })
      .finally(() => setSaving(false))
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label htmlFor="hydration-date" className="text-sm font-medium">
          Date
        </label>
        <input
          id="hydration-date"
          type="date"
          value={date}
          onChange={e => onDateChange(e.target.value)}
          className="border rounded px-2 py-1"
        />
      </div>
      {loading && (
        <div className="flex items-center gap-2 py-4">
          <Spinner size="small" variant="primary" />
          <Text variant="secondary">Loading...</Text>
        </div>
      )}
      {!loading && (
        <Card className="p-6">
          <Text variant="default" className="font-semibold mb-2">
            Water intake
          </Text>
          <Text variant="secondary" className="mb-4">
            Target: 0.5 oz per lb bodyweight ·{' '}
            {targetOz > 0
              ? `${targetOz} oz`
              : 'Set weight in profile for target'}
          </Text>
          <div className="flex items-center gap-4 flex-wrap">
            <Text variant="default" className="text-2xl font-semibold">
              {amountOz} oz
            </Text>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => adjust(-8)}
                disabled={saving || amountOz <= 0}
              >
                −8 oz
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => adjust(8)}
                disabled={saving}
              >
                +8 oz
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => adjust(16)}
                disabled={saving}
              >
                +16 oz
              </Button>
            </div>
          </div>
          {targetOz > 0 && (
            <div className="mt-4">
              <ProgressBar
                progress={Math.min((amountOz / targetOz) * 100, 100)}
                variant={amountOz >= targetOz ? 'success' : 'primary'}
                showPercentage={true}
              />
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
