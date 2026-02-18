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
    <div className="space-y-6">
      <Card className="p-0">
        <div className="p-5 bg-gray-50/50 flex flex-wrap items-center gap-3">
          <label
            htmlFor="hydration-date"
            className="text-sm font-medium text-gray-700"
          >
            Date
          </label>
          <input
            id="hydration-date"
            type="date"
            value={date}
            onChange={e => onDateChange(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#3AB8ED]/30 focus:border-[#3AB8ED] outline-none"
          />
        </div>
      </Card>
      {loading && (
        <div className="flex items-center gap-2 py-8">
          <Spinner size="small" variant="primary" />
          <Text variant="secondary">Loading...</Text>
        </div>
      )}
      {!loading && (
        <Card className="p-0">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 px-5 pt-5">
            <Text variant="default" className="font-semibold text-gray-900">
              Water intake
            </Text>
          </div>
          <div className="p-5 space-y-4">
            <Text variant="secondary" className="text-sm block">
              Target: 0.5 oz per lb bodyweight ·{' '}
              {targetOz > 0
                ? `${targetOz} oz`
                : 'Set weight in profile for target'}
            </Text>
            <div className="flex items-center gap-4 flex-wrap">
              <Text
                variant="default"
                className="text-2xl font-semibold text-gray-900"
              >
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
              <div>
                <ProgressBar
                  progress={Math.min((amountOz / targetOz) * 100, 100)}
                  variant={amountOz >= targetOz ? 'success' : 'primary'}
                  showPercentage={true}
                />
              </div>
            )}
          </div>
        </Card>
      )}
    </div>
  )
}
