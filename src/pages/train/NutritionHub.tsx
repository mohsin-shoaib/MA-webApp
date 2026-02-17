import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Tabs } from '@/components/Tabs'
import { nutritionService } from '@/api/nutrition.service'
import { todayDateStr, normalizeMeals } from './nutrition/utils'
import { SummaryTab } from './nutrition/SummaryTab'
import { MacroCalculator } from './nutrition/MacroCalculator'
import { MealLogging } from './nutrition/MealLogging'
import { HydrationSection } from './nutrition/HydrationSection'
import type { UserNutritionTarget, MealLog } from '@/types/nutrition'

function parseHydrationData(data: unknown): {
  amountOz: number
  targetOz: number
} {
  if (data == null) return { amountOz: 0, targetOz: 0 }
  const d = data as Record<string, unknown>
  const amountOz = typeof d.amountOz === 'number' ? d.amountOz : 0
  const targetOz = typeof d.targetOz === 'number' ? d.targetOz : 0
  return { amountOz, targetOz }
}

export default function NutritionHub() {
  const [activeTab, setActiveTab] = useState('summary')
  const [targets, setTargets] = useState<UserNutritionTarget | null>(null)
  const [selectedDate, setSelectedDate] = useState(todayDateStr())
  const [meals, setMeals] = useState<MealLog[]>([])
  const [mealsLoading, setMealsLoading] = useState(false)
  const [hydrationAmount, setHydrationAmount] = useState(0)
  const [hydrationTarget, setHydrationTarget] = useState(0)
  const [hydrationLoading, setHydrationLoading] = useState(false)
  const [dailyLoading, setDailyLoading] = useState(false)

  const loadTargets = useCallback(() => {
    nutritionService
      .getTargets()
      .then(res => {
        if (res.data.statusCode === 200) setTargets(res.data.data ?? null)
      })
      .catch(() => setTargets(null))
  }, [])

  const loadDaily = useCallback((date: string) => {
    setDailyLoading(true)
    setMealsLoading(true)
    setHydrationLoading(true)
    nutritionService
      .getDaily(date)
      .then(dailyRes => {
        if (dailyRes.data.statusCode === 200 && dailyRes.data.data) {
          const d = dailyRes.data.data
          setTargets(d.targets ?? null)
          setMeals(Array.isArray(d.meals) ? d.meals : [])
          setHydrationAmount(d.hydration?.amountOz ?? 0)
          setHydrationTarget(d.hydration?.targetOz ?? 0)
          return
        }
        throw new Error('No daily data')
      })
      .catch(() => {
        return Promise.all([
          nutritionService
            .getTargets()
            .then(res =>
              res.data.statusCode === 200 ? (res.data.data ?? null) : null
            )
            .catch(() => null),
          nutritionService
            .getMealsByDate(date)
            .then(res =>
              res.data.statusCode === 200 && res.data.data != null
                ? normalizeMeals(res.data.data)
                : []
            )
            .catch(() => []),
          nutritionService
            .getHydration(date)
            .then(res =>
              res.data?.statusCode === 200 && res.data.data != null
                ? parseHydrationData(res.data.data)
                : { amountOz: 0, targetOz: 0 }
            )
            .catch(() => ({ amountOz: 0, targetOz: 0 })),
        ]).then(([t, m, h]) => {
          setTargets(t)
          setMeals(m)
          setHydrationAmount(h.amountOz)
          setHydrationTarget(h.targetOz)
        })
      })
      .finally(() => {
        setDailyLoading(false)
        setMealsLoading(false)
        setHydrationLoading(false)
      })
  }, [])

  useEffect(() => {
    loadTargets()
  }, [loadTargets])

  useEffect(() => {
    const cancelled = { current: false }
    queueMicrotask(() => {
      if (!cancelled.current) loadDaily(selectedDate)
    })
    return () => {
      cancelled.current = true
    }
  }, [selectedDate, loadDaily])

  const totals = meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories ?? 0),
      proteinG: acc.proteinG + (m.proteinG ?? 0),
      carbG: acc.carbG + (m.carbG ?? 0),
      fatG: acc.fatG + (m.fatG ?? 0),
    }),
    { calories: 0, proteinG: 0, carbG: 0, fatG: 0 }
  )

  const summaryContent = (
    <SummaryTab
      selectedDate={selectedDate}
      onDateChange={setSelectedDate}
      targets={targets}
      totals={totals}
      hydrationAmount={hydrationAmount}
      hydrationTarget={hydrationTarget}
      loading={dailyLoading}
      onOpenCalculator={() => setActiveTab('calculator')}
    />
  )

  return (
    <div className="space-y-6 max-w-4xl">
      <Text variant="primary" className="text-2xl font-semibold">
        Nutrition Hub
      </Text>
      <Tabs
        items={[
          { id: 'summary', label: 'Today', content: summaryContent },
          {
            id: 'calculator',
            label: 'Macro calculator',
            content: <MacroCalculator onSaved={loadTargets} />,
          },
          {
            id: 'meals',
            label: 'Meal logging',
            content: (
              <MealLogging
                date={selectedDate}
                onDateChange={setSelectedDate}
                meals={meals}
                loading={mealsLoading}
                onReload={() => loadDaily(selectedDate)}
                targets={targets}
              />
            ),
          },
          {
            id: 'hydration',
            label: 'Hydration',
            content: (
              <HydrationSection
                date={selectedDate}
                onDateChange={setSelectedDate}
                amountOz={hydrationAmount}
                targetOz={hydrationTarget}
                loading={hydrationLoading}
                onReload={() => loadDaily(selectedDate)}
              />
            ),
          },
        ]}
        defaultActiveTab="summary"
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />
    </div>
  )
}
