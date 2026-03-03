/** Default parameter options (MASS Phase 2) */
export const DEFAULT_PARAMETER_OPTIONS = [
  { value: 'Reps', label: 'Reps' },
  { value: 'Weight_lb', label: 'Weight (lb)' },
  { value: 'Weight_kg', label: 'Weight (kg)' },
  { value: 'Weight_pct', label: 'Weight (%)' },
  { value: 'Weight_LWP', label: 'Weight (LWP+)' },
  { value: 'Time_min_sec', label: 'Time (min:sec)' },
  { value: 'Seconds', label: 'Seconds (s)' },
  { value: 'Distance_miles', label: 'Distance (miles)' },
  { value: 'Distance_yd', label: 'Distance (yd)' },
  { value: 'Distance_ft', label: 'Distance (ft)' },
  { value: 'Distance_inches', label: 'Distance (inches)' },
  { value: 'Distance_meters', label: 'Distance (meters)' },
  { value: 'Height_inches', label: 'Height (inches)' },
  { value: 'Calories', label: 'Calories (cal)' },
  { value: 'RPE', label: 'RPE' },
  { value: 'Watts', label: 'Watts' },
  { value: 'Velocity', label: 'Velocity (m/s)' },
  { value: 'Other', label: 'Other Number' },
] as const

export const PARAMETER_2_OPTIONS = [
  { value: '-', label: '— (single parameter)' },
  ...DEFAULT_PARAMETER_OPTIONS,
]

/** Exercise from library (admin/coach CRUD). MASS Phase 2: tags only, no muscle/equipment/movementPattern. */
export interface Exercise {
  id: number
  name: string
  videoUrl?: string | null
  defaultParameter1?: string | null
  defaultParameter2?: string | null
  pointsOfPerformance?: string | null
  referenceMaxExerciseId?: number | null
  trackAsExerciseId?: number | null
  tags?: string[] | null
  isActive: boolean
  isApproved?: boolean
  createdByUser?: { id: number; firstName?: string; lastName?: string } | null
  createdAt: string
  updatedAt: string
}

export interface CreateExercisePayload {
  name?: string
  videoUrl?: string
  defaultParameter1?: string
  defaultParameter2?: string
  pointsOfPerformance?: string
  referenceMaxExerciseId?: number
  trackAsExerciseId?: number
  tags?: string[]
  isActive?: boolean
}

export interface UpdateExercisePayload {
  name?: string
  videoUrl?: string
  defaultParameter1?: string
  defaultParameter2?: string
  pointsOfPerformance?: string
  referenceMaxExerciseId?: number
  trackAsExerciseId?: number
  tags?: string[]
  isActive?: boolean
}

export interface GetExercisesQuery {
  page?: number
  limit?: number
  q?: string
  tags?: string[]
  isActive?: boolean
}

export interface GetExercisesResponse {
  statusCode: number
  data: {
    rows: Exercise[]
    meta: { total: number; page: number; limit: number; pages: number }
  }
  message?: string
}

export interface GetExerciseResponse {
  statusCode: number
  data: Exercise
  message?: string
}

export interface ExerciseListForBuilderItem {
  id: number
  name: string
  defaultParameter1?: string | null
  defaultParameter2?: string | null
  tags?: string[] | null
}

export interface ListForProgramBuilderResponse {
  statusCode: number
  data: { rows: ExerciseListForBuilderItem[] }
  message?: string
}
