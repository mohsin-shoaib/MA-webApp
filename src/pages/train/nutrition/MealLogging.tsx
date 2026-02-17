import { useState } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { Spinner } from '@/components/Spinner'
import { nutritionService } from '@/api/nutrition.service'
import { MEAL_TYPES } from '@/types/nutrition'
import type { MealLog, MealType, UserNutritionTarget } from '@/types/nutrition'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { AxiosError } from 'axios'

function MealEntryDisplay({ meal }: Readonly<{ meal: MealLog | undefined }>) {
  if (!meal)
    return (
      <Text variant="secondary" className="text-sm">
        No entry
      </Text>
    )
  return (
    <Text variant="secondary" className="text-sm">
      {meal.calories ?? 0} cal · P {meal.proteinG ?? 0}g · C {meal.carbG ?? 0}g
      · F {meal.fatG ?? 0}g
    </Text>
  )
}

export function MealLogging({
  date,
  onDateChange,
  meals,
  loading,
  onReload,
  targets,
}: Readonly<{
  date: string
  onDateChange: (d: string) => void
  meals: MealLog[]
  loading: boolean
  onReload: () => void
  targets: UserNutritionTarget | null
}>) {
  const { showSuccess, showError } = useSnackbar()
  const [editingMeal, setEditingMeal] = useState<MealType | null>(null)
  const [form, setForm] = useState({
    calories: '',
    proteinG: '',
    carbG: '',
    fatG: '',
  })

  const getMealForType = (mealType: MealType) =>
    meals.find(m => m.mealType === mealType)

  const handleSave = (mealType: MealType) => {
    const calories = form.calories ? Number(form.calories) : undefined
    const proteinG = form.proteinG ? Number(form.proteinG) : undefined
    const carbG = form.carbG ? Number(form.carbG) : undefined
    const fatG = form.fatG ? Number(form.fatG) : undefined
    const existing = getMealForType(mealType)
    setEditingMeal(null)
    if (existing) {
      nutritionService
        .updateMeal(existing.id, { calories, proteinG, carbG, fatG })
        .then(() => {
          showSuccess('Meal updated.')
          onReload()
        })
        .catch((err: AxiosError<{ message?: string }>) =>
          showError(
            err.response?.data?.message || err.message || 'Failed to update.'
          )
        )
    } else {
      nutritionService
        .logMeal({ date, mealType, calories, proteinG, carbG, fatG })
        .then(() => {
          showSuccess('Meal logged.')
          onReload()
        })
        .catch((err: AxiosError<{ message?: string }>) =>
          showError(
            err.response?.data?.message || err.message || 'Failed to log.'
          )
        )
    }
  }

  const openEdit = (mealType: MealType) => {
    const m = getMealForType(mealType)
    setForm({
      calories: m?.calories != null ? String(m.calories) : '',
      proteinG: m?.proteinG != null ? String(m.proteinG) : '',
      carbG: m?.carbG != null ? String(m.carbG) : '',
      fatG: m?.fatG != null ? String(m.fatG) : '',
    })
    setEditingMeal(mealType)
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <label htmlFor="meals-date" className="text-sm font-medium">
          Date
        </label>
        <input
          id="meals-date"
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
        <div className="space-y-3">
          {MEAL_TYPES.map(({ value: mealType, label }) => {
            const m = getMealForType(mealType)
            const isEditing = editingMeal === mealType
            return (
              <Card key={mealType} className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <Text variant="default" className="font-medium">
                    {label}
                  </Text>
                  {!isEditing && (
                    <Button
                      type="button"
                      variant="secondary"
                      size="small"
                      onClick={() => openEdit(mealType)}
                    >
                      {m ? 'Edit' : 'Add'}
                    </Button>
                  )}
                </div>
                {isEditing ? (
                  <>
                    <div className="grid gap-2 sm:grid-cols-4">
                      <Input
                        label="Cal"
                        type="number"
                        value={form.calories}
                        onChange={e =>
                          setForm(f => ({ ...f, calories: e.target.value }))
                        }
                      />
                      <Input
                        label="Protein (g)"
                        type="number"
                        value={form.proteinG}
                        onChange={e =>
                          setForm(f => ({ ...f, proteinG: e.target.value }))
                        }
                      />
                      <Input
                        label="Carbs (g)"
                        type="number"
                        value={form.carbG}
                        onChange={e =>
                          setForm(f => ({ ...f, carbG: e.target.value }))
                        }
                      />
                      <Input
                        label="Fat (g)"
                        type="number"
                        value={form.fatG}
                        onChange={e =>
                          setForm(f => ({ ...f, fatG: e.target.value }))
                        }
                      />
                    </div>
                    <div className="flex gap-2 mt-2">
                      <Button
                        type="button"
                        onClick={() => handleSave(mealType)}
                      >
                        Save
                      </Button>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => setEditingMeal(null)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </>
                ) : (
                  <MealEntryDisplay meal={m} />
                )}
              </Card>
            )
          })}
        </div>
      )}
      {targets && !loading && (
        <Card className="p-4">
          <Text variant="default" className="font-semibold mb-2">
            Day total
          </Text>
          <Text variant="secondary" className="text-sm">
            {meals.reduce((s, m) => s + (m.calories ?? 0), 0)} /{' '}
            {targets.dailyCalories} cal · Protein{' '}
            {meals.reduce((s, m) => s + (m.proteinG ?? 0), 0)} /{' '}
            {targets.proteinG}g
          </Text>
        </Card>
      )}
    </div>
  )
}
