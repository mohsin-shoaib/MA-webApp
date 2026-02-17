/** Dashboard summary – from GET /athlete/dashboard or composed from train + roadmap */
export interface DashboardSummary {
  today: TodayWorkoutSummary | null
  cycle: { id?: number; name: string } | null
  streak: number
  compliance: ComplianceSummary | null
  alerts: DashboardAlert[]
}

export interface TodayWorkoutSummary {
  date: string
  phase: string
  weekIndex: number
  dayIndex?: number
  dayKey: string
  dayExercise: { exercise_name: string; exercises: unknown[] }
  currentCycle?: string
  programId?: number
  programName?: string
  sessionId?: number
  status?: 'scheduled' | 'in_progress' | 'completed' | 'skipped'
  completedAt?: string
}

export interface ComplianceSummary {
  rollingDays: number
  scheduledCount: number
  completedCount: number
  compliancePercent: number | null
}

export interface DashboardAlert {
  type: string
  message: string
  date?: string
  metadata?: Record<string, unknown>
}

/** Single day event for weekly strip and calendar (program exercise events) */
export interface CalendarDayEvent {
  date: string
  hasWorkout: boolean
  programName?: string
  phase?: string
  weekIndex?: number
  dayIndex?: number
  dayKey?: string
  sessionId?: number
  sessionStatus?: 'scheduled' | 'in_progress' | 'completed' | 'skipped'
  daySummary?: string
}
