import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { ProgressBar } from '@/components/ProgressBar'
import { macroVariant, proteinVariant } from './utils'
import type { UserNutritionTarget } from '@/types/nutrition'

export function SummaryTab({
  selectedDate,
  onDateChange,
  targets,
  totals,
  hydrationAmount,
  hydrationTarget,
  loading,
  onOpenCalculator,
}: Readonly<{
  selectedDate: string
  onDateChange: (d: string) => void
  targets: UserNutritionTarget | null
  totals: { calories: number; proteinG: number; carbG: number; fatG: number }
  hydrationAmount: number
  hydrationTarget: number
  loading: boolean
  onOpenCalculator: () => void
}>) {
  return (
    <div className="space-y-6">
      <Card className="p-0">
        <div className="p-5 bg-gray-50/50 flex flex-wrap items-center gap-3">
          <label
            htmlFor="summary-date"
            className="text-sm font-medium text-gray-700"
          >
            Date
          </label>
          <input
            id="summary-date"
            type="date"
            value={selectedDate}
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
      {!loading && !targets && (
        <Card className="p-0">
          <div className="p-6">
            <Text
              variant="default"
              className="font-semibold text-gray-900 mb-2 block"
            >
              No targets set
            </Text>
            <Text
              variant="secondary"
              className="mb-4 block text-sm leading-relaxed"
            >
              Use the Macro calculator to set your daily targets, then track
              meals and hydration here.
            </Text>
            <Button type="button" onClick={onOpenCalculator}>
              Open calculator
            </Button>
          </div>
        </Card>
      )}
      {!loading && targets && (
        <div className="space-y-4">
          <Card className="p-0">
            <div className="flex items-center justify-between pb-3 border-b border-gray-200 px-5 pt-5">
              <Text variant="default" className="font-semibold text-gray-900">
                Daily summary
              </Text>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Text
                    variant="default"
                    className="font-medium text-gray-900 text-sm"
                  >
                    Calories
                  </Text>
                  <Text variant="secondary" className="text-sm">
                    {totals.calories} / {targets.dailyCalories}
                  </Text>
                </div>
                <ProgressBar
                  progress={Math.min(
                    (totals.calories / targets.dailyCalories) * 100,
                    100
                  )}
                  variant={macroVariant(totals.calories, targets.dailyCalories)}
                  showPercentage={true}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Text
                    variant="default"
                    className="font-medium text-gray-900 text-sm"
                  >
                    Protein (g)
                  </Text>
                  <Text variant="secondary" className="text-sm">
                    {totals.proteinG} / {targets.proteinG}
                  </Text>
                </div>
                <ProgressBar
                  progress={Math.min(
                    (totals.proteinG / targets.proteinG) * 100,
                    100
                  )}
                  variant={proteinVariant(totals.proteinG, targets.proteinG)}
                  showPercentage={true}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Text
                    variant="default"
                    className="font-medium text-gray-900 text-sm"
                  >
                    Carbs (g)
                  </Text>
                  <Text variant="secondary" className="text-sm">
                    {totals.carbG} / {targets.carbG}
                  </Text>
                </div>
                <ProgressBar
                  progress={Math.min((totals.carbG / targets.carbG) * 100, 100)}
                  variant={macroVariant(totals.carbG, targets.carbG)}
                  showPercentage={true}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Text
                    variant="default"
                    className="font-medium text-gray-900 text-sm"
                  >
                    Fat (g)
                  </Text>
                  <Text variant="secondary" className="text-sm">
                    {totals.fatG} / {targets.fatG}
                  </Text>
                </div>
                <ProgressBar
                  progress={Math.min((totals.fatG / targets.fatG) * 100, 100)}
                  variant={macroVariant(totals.fatG, targets.fatG)}
                  showPercentage={true}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Text
                    variant="default"
                    className="font-medium text-gray-900 text-sm"
                  >
                    Hydration
                  </Text>
                  <Text variant="secondary" className="text-sm">
                    {hydrationAmount} / {hydrationTarget} oz
                  </Text>
                </div>
                <ProgressBar
                  progress={
                    hydrationTarget > 0
                      ? Math.min((hydrationAmount / hydrationTarget) * 100, 100)
                      : 0
                  }
                  variant={
                    hydrationTarget > 0 && hydrationAmount >= hydrationTarget
                      ? 'success'
                      : 'primary'
                  }
                  showPercentage={true}
                />
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
