/** Activity level options for macro calculator (PRD §14.1) */
export const ACTIVITY_LEVELS = [
  { value: 1.2, label: 'Sedentary' },
  { value: 1.375, label: 'Lightly Active' },
  { value: 1.55, label: 'Moderately Active' },
  { value: 1.725, label: 'Very Active' },
  { value: 1.9, label: 'Extremely Active' },
] as const

/** Goal options for macro calculator */
export const NUTRITION_GOALS = [
  { value: 'fat_loss', label: 'Fat loss' },
  { value: 'muscle_gain', label: 'Muscle gain' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'event_prep', label: 'Event prep' },
] as const

export type NutritionGoal = (typeof NUTRITION_GOALS)[number]['value']

/** Meal types for logging */
export const MEAL_TYPES = [
  { value: 'breakfast', label: 'Breakfast' },
  { value: 'lunch', label: 'Lunch' },
  { value: 'dinner', label: 'Dinner' },
  { value: 'snacks', label: 'Snacks' },
] as const

export type MealType = (typeof MEAL_TYPES)[number]['value']

/** Request body for POST /athlete/nutrition/calculator */
export interface CalculatorInputDTO {
  weightKg: number
  heightCm: number
  age: number
  gender: 'male' | 'female'
  activityMultiplier?: number
  goal?: NutritionGoal
}

/** Response from calculator (computed macros) */
export interface CalculatorResult {
  bmr: number
  tdee: number
  targetCalories: number
  proteinG: number
  carbG: number
  fatG: number
  activityMultiplier?: number
  goal?: NutritionGoal
}

export interface CalculatorResponse {
  statusCode: number
  data: CalculatorResult
  message?: string
}

/** User nutrition targets (saved per athlete) */
export interface UserNutritionTarget {
  id: number
  userId: number
  dailyCalories: number
  proteinG: number
  carbG: number
  fatG: number
  activityMultiplier?: number
  goal?: string
  createdAt?: string
  updatedAt?: string
}

export interface GetTargetsResponse {
  statusCode: number
  data: UserNutritionTarget | null
  message?: string
}

/** Body for POST /athlete/nutrition/targets */
export interface SaveTargetsDTO {
  dailyCalories: number
  proteinG: number
  carbG: number
  fatG: number
  activityMultiplier?: number
  goal?: string
}

/** Single meal log entry */
export interface MealLog {
  id: number
  userId: number
  date: string
  mealType: MealType
  calories?: number
  proteinG?: number
  carbG?: number
  fatG?: number
  createdAt?: string
  updatedAt?: string
}

/** Body for POST /athlete/nutrition/meals */
export interface LogMealDTO {
  date: string
  mealType: MealType
  calories?: number
  proteinG?: number
  carbG?: number
  fatG?: number
}

/** Body for PATCH /athlete/nutrition/meals/:id */
export interface UpdateMealDTO {
  calories?: number
  proteinG?: number
  carbG?: number
  fatG?: number
}

export interface GetMealsResponse {
  statusCode: number
  data: MealLog[] | { rows: MealLog[] }
  message?: string
}

/** Hydration for a date */
export interface HydrationLog {
  id: number
  userId: number
  date: string
  amountOz: number
  createdAt?: string
  updatedAt?: string
}

export interface GetHydrationResponse {
  statusCode: number
  data:
    | {
        amountOz: number
        targetOz?: number
      }
    | HydrationLog
    | null
  message?: string
}

/** Body for POST /athlete/nutrition/hydration */
export interface LogHydrationDTO {
  date: string
  amountOz: number
}

/** Daily summary (GET /athlete/nutrition/daily?date=) */
export interface DailySummary {
  targets: UserNutritionTarget | null
  meals: MealLog[]
  totals: { calories: number; proteinG: number; carbG: number; fatG: number }
  hydration: { amountOz: number; targetOz: number }
}

export interface GetDailyResponse {
  statusCode: number
  data: DailySummary
  message?: string
}
