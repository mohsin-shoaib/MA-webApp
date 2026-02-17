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
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label htmlFor="summary-date" className="text-sm font-medium">
          Date
        </label>
        <input
          id="summary-date"
          type="date"
          value={selectedDate}
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
      {!loading && !targets && (
        <Card className="p-6">
          <Text variant="default" className="font-medium mb-2">
            No targets set
          </Text>
          <Text variant="secondary" className="mb-4">
            Use the Macro calculator to set your daily targets, then track meals
            and hydration here.
          </Text>
          <Button type="button" onClick={onOpenCalculator}>
            Open calculator
          </Button>
        </Card>
      )}
      {!loading && targets && (
        <div className="space-y-4">
          <Card className="p-4">
            <Text variant="default" className="font-semibold mb-3">
              Calories
            </Text>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <ProgressBar
                  progress={Math.min(
                    (totals.calories / targets.dailyCalories) * 100,
                    100
                  )}
                  variant={macroVariant(totals.calories, targets.dailyCalories)}
                  showPercentage={true}
                />
              </div>
              <Text variant="secondary" className="shrink-0">
                {totals.calories} / {targets.dailyCalories}
              </Text>
            </div>
          </Card>
          <Card className="p-4">
            <Text variant="default" className="font-semibold mb-3">
              Protein (g)
            </Text>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <ProgressBar
                  progress={Math.min(
                    (totals.proteinG / targets.proteinG) * 100,
                    100
                  )}
                  variant={proteinVariant(totals.proteinG, targets.proteinG)}
                  showPercentage={true}
                />
              </div>
              <Text variant="secondary" className="shrink-0">
                {totals.proteinG} / {targets.proteinG}
              </Text>
            </div>
          </Card>
          <Card className="p-4">
            <Text variant="default" className="font-semibold mb-3">
              Carbs (g)
            </Text>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <ProgressBar
                  progress={Math.min((totals.carbG / targets.carbG) * 100, 100)}
                  variant={macroVariant(totals.carbG, targets.carbG)}
                  showPercentage={true}
                />
              </div>
              <Text variant="secondary" className="shrink-0">
                {totals.carbG} / {targets.carbG}
              </Text>
            </div>
          </Card>
          <Card className="p-4">
            <Text variant="default" className="font-semibold mb-3">
              Fat (g)
            </Text>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <ProgressBar
                  progress={Math.min((totals.fatG / targets.fatG) * 100, 100)}
                  variant={macroVariant(totals.fatG, targets.fatG)}
                  showPercentage={true}
                />
              </div>
              <Text variant="secondary" className="shrink-0">
                {totals.fatG} / {targets.fatG}
              </Text>
            </div>
          </Card>
          <Card className="p-4">
            <Text variant="default" className="font-semibold mb-3">
              Hydration
            </Text>
            <div className="flex items-center gap-2">
              <div className="flex-1">
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
              <Text variant="secondary" className="shrink-0">
                {hydrationAmount} / {hydrationTarget} oz
              </Text>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
