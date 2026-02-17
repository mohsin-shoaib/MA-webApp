import type { MealLog } from '@/types/nutrition'

export function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10)
}

export function normalizeMeals(
  data: MealLog[] | { rows: MealLog[] }
): MealLog[] {
  return Array.isArray(data) ? data : (data.rows ?? [])
}

/** Calories/carbs/fat: green 0–80%, yellow 80–100%, red >100% */
export function macroVariant(
  consumed: number,
  target: number
): 'primary' | 'success' | 'warning' | 'error' {
  if (target <= 0) return 'primary'
  const pct = (consumed / target) * 100
  if (pct <= 80) return 'success'
  if (pct <= 100) return 'warning'
  return 'error'
}

/** Protein: red <80%, yellow 80–99%, green 100%+ */
export function proteinVariant(
  consumed: number,
  target: number
): 'primary' | 'success' | 'warning' | 'error' {
  if (target <= 0) return 'primary'
  const pct = (consumed / target) * 100
  if (pct >= 100) return 'success'
  if (pct >= 80) return 'warning'
  return 'error'
}
