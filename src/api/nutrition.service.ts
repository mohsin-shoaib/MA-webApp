import api from './axios'
import type {
  CalculatorInputDTO,
  CalculatorResponse,
  GetTargetsResponse,
  SaveTargetsDTO,
  GetMealsResponse,
  LogMealDTO,
  UpdateMealDTO,
  GetHydrationResponse,
  LogHydrationDTO,
  GetDailyResponse,
  MealLog,
} from '@/types/nutrition'

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export const nutritionService = {
  /**
   * Compute macros (no save). POST /athlete/nutrition/calculator
   */
  calculator: (body: CalculatorInputDTO) =>
    api.post<CalculatorResponse>('athlete/nutrition/calculator', body),

  /**
   * Get current nutrition targets. GET /athlete/nutrition/targets
   */
  getTargets: () => api.get<GetTargetsResponse>('athlete/nutrition/targets'),

  /**
   * Save nutrition targets. POST /athlete/nutrition/targets
   */
  saveTargets: (body: SaveTargetsDTO) =>
    api.post<GetTargetsResponse>('athlete/nutrition/targets', body),

  /**
   * Get meals for a date. GET /athlete/nutrition/meals?date=YYYY-MM-DD
   */
  getMealsByDate: (date: string) =>
    api.get<GetMealsResponse>('athlete/nutrition/meals', { params: { date } }),

  /**
   * Get meals for date range (history). GET /athlete/nutrition/meals?from=&to=
   */
  getMealsByRange: (from: string, to: string) =>
    api.get<GetMealsResponse>('athlete/nutrition/meals', {
      params: { from, to },
    }),

  /**
   * Log a meal. POST /athlete/nutrition/meals
   */
  logMeal: (body: LogMealDTO) =>
    api.post<{ statusCode: number; data: MealLog; message?: string }>(
      'athlete/nutrition/meals',
      body
    ),

  /**
   * Update a meal. PATCH /athlete/nutrition/meals/:id
   */
  updateMeal: (id: number, body: UpdateMealDTO) =>
    api.patch<{ statusCode: number; data: MealLog; message?: string }>(
      `athlete/nutrition/meals/${id}`,
      body
    ),

  /**
   * Delete a meal. DELETE /athlete/nutrition/meals/:id
   */
  deleteMeal: (id: number) =>
    api.delete<{ statusCode: number; message?: string }>(
      `athlete/nutrition/meals/${id}`
    ),

  /**
   * Get hydration for a date. GET /athlete/nutrition/hydration?date=YYYY-MM-DD
   */
  getHydration: (date: string) =>
    api.get<GetHydrationResponse>('athlete/nutrition/hydration', {
      params: { date },
    }),

  /**
   * Log hydration (upsert for date). POST /athlete/nutrition/hydration
   */
  logHydration: (body: LogHydrationDTO) =>
    api.post<GetHydrationResponse>('athlete/nutrition/hydration', body),

  /**
   * Get daily summary (targets + meals totals + hydration). GET /athlete/nutrition/daily?date=
   */
  getDaily: (date?: string) => {
    const d = date ?? toDateOnly(new Date())
    return api.get<GetDailyResponse>('athlete/nutrition/daily', {
      params: { date: d },
    })
  },
}
