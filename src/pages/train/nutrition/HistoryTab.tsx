import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { nutritionService } from '@/api/nutrition.service'
import { normalizeMeals } from './utils'
import type { MealLog } from '@/types/nutrition'

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10)
}

function groupMealsByDate(
  meals: MealLog[]
): Map<
  string,
  { calories: number; proteinG: number; carbG: number; fatG: number }
> {
  const map = new Map<
    string,
    { calories: number; proteinG: number; carbG: number; fatG: number }
  >()
  for (const m of meals) {
    const dateKey =
      typeof m.date === 'string'
        ? m.date.slice(0, 10)
        : toDateStr(new Date(m.date))
    const cur = map.get(dateKey) ?? {
      calories: 0,
      proteinG: 0,
      carbG: 0,
      fatG: 0,
    }
    cur.calories += m.calories ?? 0
    cur.proteinG += m.proteinG ?? 0
    cur.carbG += m.carbG ?? 0
    cur.fatG += m.fatG ?? 0
    map.set(dateKey, cur)
  }
  return map
}

const MAX_MONTHS = 12

export function HistoryTab() {
  const [from, setFrom] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return toDateStr(d)
  })
  const [to, setTo] = useState(toDateStr(new Date()))
  const [loading, setLoading] = useState(false)
  const [meals, setMeals] = useState<MealLog[]>([])
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(() => {
    setLoading(true)
    setError(null)
    nutritionService
      .getMealsByRange(from, to)
      .then(res => {
        if (res.data.statusCode === 200 && res.data.data != null) {
          setMeals(normalizeMeals(res.data.data))
        } else {
          setMeals([])
        }
      })
      .catch(() => {
        setError('Failed to load history.')
        setMeals([])
      })
      .finally(() => setLoading(false))
  }, [from, to])

  useEffect(() => {
    queueMicrotask(() => load())
  }, [load])

  const fromDate = new Date(from)
  const toDate = new Date(to)
  const monthsDiff =
    (toDate.getFullYear() - fromDate.getFullYear()) * 12 +
    (toDate.getMonth() - fromDate.getMonth())
  const withinLimit = monthsDiff <= MAX_MONTHS && from <= to

  const byDate = groupMealsByDate(meals)
  const sortedDates = Array.from(byDate.keys()).sort((a, b) =>
    b.localeCompare(a)
  )

  return (
    <div className="space-y-4">
      <Card className="p-4">
        <Text
          variant="default"
          className="font-medium text-gray-900 mb-2 block"
        >
          Meal history (up to 12 months)
        </Text>
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div>
            <label
              htmlFor="history-from"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              From
            </label>
            <input
              id="history-from"
              type="date"
              value={from}
              onChange={e => setFrom(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label
              htmlFor="history-to"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              To
            </label>
            <input
              id="history-to"
              type="date"
              value={to}
              onChange={e => setTo(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2 text-sm"
            />
          </div>
          <Button
            type="button"
            onClick={load}
            disabled={loading || !withinLimit}
          >
            {loading ? 'Loading...' : 'Apply'}
          </Button>
        </div>
        {!withinLimit && (
          <Text variant="secondary" className="text-sm">
            Select a range of 12 months or less and ensure From ≤ To.
          </Text>
        )}
      </Card>

      {error && (
        <Text variant="secondary" className="text-red-600 text-sm">
          {error}
        </Text>
      )}

      <Card className="p-0 overflow-hidden">
        {loading && (
          <div className="p-8 flex justify-center">
            <Spinner />
          </div>
        )}
        {!loading && sortedDates.length === 0 && (
          <div className="p-6 text-center">
            <Text variant="secondary">No meals in this range.</Text>
          </div>
        )}
        {!loading && sortedDates.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50">
                  <th className="text-left py-2 px-3 font-medium text-gray-700">
                    Date
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">
                    Cal
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">
                    P (g)
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">
                    C (g)
                  </th>
                  <th className="text-right py-2 px-3 font-medium text-gray-700">
                    F (g)
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedDates.map(dateKey => {
                  const t = byDate.get(dateKey)!
                  return (
                    <tr
                      key={dateKey}
                      className="border-b border-gray-100 hover:bg-gray-50"
                    >
                      <td className="py-2 px-3 text-gray-900">{dateKey}</td>
                      <td className="text-right py-2 px-3 text-gray-700">
                        {t.calories}
                      </td>
                      <td className="text-right py-2 px-3 text-gray-700">
                        {t.proteinG}
                      </td>
                      <td className="text-right py-2 px-3 text-gray-700">
                        {t.carbG}
                      </td>
                      <td className="text-right py-2 px-3 text-gray-700">
                        {t.fatG}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}
