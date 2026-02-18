import { useState } from 'react'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Input } from '@/components/Input'
import { nutritionService } from '@/api/nutrition.service'
import { ACTIVITY_LEVELS, NUTRITION_GOALS } from '@/types/nutrition'
import type { CalculatorResult, NutritionGoal } from '@/types/nutrition'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { AxiosError } from 'axios'

export function MacroCalculator({
  onSaved,
}: Readonly<{ onSaved: () => void }>) {
  const { showSuccess, showError } = useSnackbar()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [result, setResult] = useState<CalculatorResult | null>(null)
  const [weightKg, setWeightKg] = useState('')
  const [heightCm, setHeightCm] = useState('')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState<'male' | 'female'>('male')
  const [activityMultiplier, setActivityMultiplier] = useState(1.725)
  const [goal, setGoal] = useState<NutritionGoal>('maintenance')

  const handleCalculate = () => {
    const w = Number.parseFloat(weightKg)
    const h = Number.parseFloat(heightCm)
    const a = Number.parseInt(age, 10)
    if (
      Number.isNaN(w) ||
      Number.isNaN(h) ||
      Number.isNaN(a) ||
      w <= 0 ||
      h <= 0 ||
      a <= 0
    ) {
      showError('Please enter valid weight (kg), height (cm), and age.')
      return
    }
    setLoading(true)
    setResult(null)
    nutritionService
      .calculator({
        weightKg: w,
        heightCm: h,
        age: a,
        gender,
        activityMultiplier,
        goal,
      })
      .then(res => {
        if (res.data.statusCode === 200 && res.data.data)
          setResult(res.data.data)
        else showError(res.data.message || 'Calculation failed.')
      })
      .catch((err: AxiosError<{ message?: string }>) =>
        showError(
          err.response?.data?.message || err.message || 'Calculation failed.'
        )
      )
      .finally(() => setLoading(false))
  }

  const handleSaveTargets = () => {
    if (!result) return
    setSaving(true)
    nutritionService
      .saveTargets({
        dailyCalories: Math.round(result.targetCalories),
        proteinG: Math.round(result.proteinG * 10) / 10,
        carbG: Math.round(result.carbG * 10) / 10,
        fatG: Math.round(result.fatG * 10) / 10,
        activityMultiplier: result.activityMultiplier,
        goal: result.goal,
      })
      .then(() => {
        showSuccess('Targets saved.')
        onSaved()
      })
      .catch((err: AxiosError<{ message?: string }>) =>
        showError(
          err.response?.data?.message || err.message || 'Failed to save.'
        )
      )
      .finally(() => setSaving(false))
  }

  const inputClass =
    'border border-gray-200 rounded-lg px-3 py-2 w-full text-sm focus:ring-2 focus:ring-[#3AB8ED]/30 focus:border-[#3AB8ED] outline-none'

  return (
    <div className="space-y-6">
      <Card className="p-0">
        <div className="flex items-center justify-between pb-3 border-b border-gray-200 px-5 pt-5">
          <Text variant="default" className="font-semibold text-gray-900">
            Calculator inputs
          </Text>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Input
              label="Weight (kg)"
              type="number"
              value={weightKg}
              onChange={e => setWeightKg(e.target.value)}
            />
            <Input
              label="Height (cm)"
              type="number"
              value={heightCm}
              onChange={e => setHeightCm(e.target.value)}
            />
            <Input
              label="Age"
              type="number"
              value={age}
              onChange={e => setAge(e.target.value)}
            />
            <div>
              <label
                htmlFor="calc-gender"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Gender
              </label>
              <select
                id="calc-gender"
                value={gender}
                onChange={e => setGender(e.target.value as 'male' | 'female')}
                className={inputClass}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label
                htmlFor="calc-activity"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Activity level
              </label>
              <select
                id="calc-activity"
                value={activityMultiplier}
                onChange={e => setActivityMultiplier(Number(e.target.value))}
                className={inputClass}
              >
                {ACTIVITY_LEVELS.map(l => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label
                htmlFor="calc-goal"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Goal
              </label>
              <select
                id="calc-goal"
                value={goal}
                onChange={e => setGoal(e.target.value as NutritionGoal)}
                className={inputClass}
              >
                {NUTRITION_GOALS.map(g => (
                  <option key={g.value} value={g.value}>
                    {g.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <Button type="button" onClick={handleCalculate} disabled={loading}>
            {loading ? 'Calculating...' : 'Calculate'}
          </Button>
        </div>
      </Card>
      {result && (
        <Card className="p-0">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200 px-5 pt-5">
            <Text variant="default" className="font-semibold text-gray-900">
              Results
            </Text>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid gap-2 text-sm text-gray-700">
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span>BMR</span>
                <span className="font-medium">
                  {Math.round(result.bmr)} cal
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span>TDEE</span>
                <span className="font-medium">
                  {Math.round(result.tdee)} cal
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span>Target calories</span>
                <span className="font-medium">
                  {Math.round(result.targetCalories)}
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span>Protein</span>
                <span className="font-medium">
                  {result.proteinG.toFixed(1)} g
                </span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span>Carbs</span>
                <span className="font-medium">{result.carbG.toFixed(1)} g</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-100">
                <span>Fat</span>
                <span className="font-medium">{result.fatG.toFixed(1)} g</span>
              </div>
            </div>
            <Button type="button" onClick={handleSaveTargets} disabled={saving}>
              {saving ? 'Saving...' : 'Save as my targets'}
            </Button>
          </div>
        </Card>
      )}
    </div>
  )
}
