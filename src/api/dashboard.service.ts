import api from './axios'
import { trainService } from './train.service'
import { roadmapService } from './roadmap.service'
import type {
  DashboardSummary,
  TodayWorkoutSummary,
  CalendarDayEvent,
} from '@/types/dashboard'
import type { TodayWorkoutResponse } from '@/types/train'
import type { AxiosError } from 'axios'

function toTodaySummary(
  data: TodayWorkoutResponse['data']
): TodayWorkoutSummary {
  const rawStatus = data.sessionStatus ?? data.status
  const status = normalizeSessionStatus(rawStatus)
  return {
    date: data.date,
    phase: data.phase,
    weekIndex: data.weekIndex,
    dayIndex: data.dayIndex,
    dayKey: data.dayKey ?? data.dayExercise?.day ?? data.date,
    dayExercise: data.dayExercise,
    currentCycle: data.currentCycle ?? data.currentCycleName,
    programId: data.programId,
    programName: data.programName,
    sessionId: data.sessionId,
    status,
    completedAt: data.completedAt,
  }
}

function dateRange(start: string, count: number): string[] {
  const out: string[] = []
  const d = new Date(start + 'T12:00:00Z')
  for (let i = 0; i < count; i++) {
    const y = d.getUTCFullYear()
    const m = String(d.getUTCMonth() + 1).padStart(2, '0')
    const day = String(d.getUTCDate()).padStart(2, '0')
    out.push(`${y}-${m}-${day}`)
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

export const dashboardService = {
  /**
   * Get dashboard summary. Tries GET /athlete/dashboard; on 404 or error,
   * composes from train/today + roadmap (streak/compliance/alerts may be placeholders).
   */
  async getDashboard(): Promise<DashboardSummary> {
    try {
      const res = await api.get<{ statusCode: number; data: DashboardSummary }>(
        'athlete/dashboard'
      )
      if (res.data.statusCode === 200 && res.data.data) {
        return res.data.data
      }
    } catch (err) {
      const status = (err as AxiosError)?.response?.status
      if (status !== 404) {
        console.warn(
          'Dashboard API not available, composing from train + roadmap',
          err
        )
      }
    }

    const [todayRes, roadmapRes] = await Promise.all([
      trainService.getTodayWorkout().catch(() => null),
      roadmapService.getRoadmap().catch(() => null),
    ])

    const today: TodayWorkoutSummary | null =
      todayRes?.data?.statusCode === 200 && todayRes.data.data
        ? toTodaySummary(todayRes.data.data)
        : null

    let cycleName: string | null = today?.currentCycle ?? null
    if (
      !cycleName &&
      roadmapRes?.data?.statusCode === 200 &&
      roadmapRes.data.data
    ) {
      const r = roadmapRes.data.data as {
        currentCycle?: string
        cycles?: { cycleName: string; isActive: boolean }[]
      }
      cycleName =
        r.currentCycle ?? r.cycles?.find(c => c.isActive)?.cycleName ?? null
    }

    return {
      isOnboarded: true,
      today,
      cycle: cycleName ? { name: cycleName } : null,
      streak: 0,
      compliance: null,
      alerts: [],
    }
  },

  /**
   * Get events for a week (7 days starting at start). Uses GET /athlete/dashboard/week
   * if available; otherwise calls scheduled-workout for each day.
   */
  async getWeekEvents(start: string): Promise<CalendarDayEvent[]> {
    try {
      const res = await api.get<{
        statusCode: number
        data: CalendarDayEvent[]
      }>('athlete/dashboard/week', { params: { start } })
      if (res.data.statusCode === 200 && Array.isArray(res.data.data)) {
        return res.data.data
      }
    } catch {
      // fallback: one request per day
    }

    const dates = dateRange(start, 7)
    const events: CalendarDayEvent[] = await Promise.all(
      dates.map(async date => {
        try {
          const r = await trainService.getScheduledWorkout(date)
          const d = r.data?.statusCode === 200 ? r.data.data : null
          if (!d) {
            return { date, hasWorkout: false }
          }
          const hasWorkout =
            d.dayExercise?.exercises != null &&
            d.dayExercise.exercises.length > 0
          const rawStatus = d.sessionStatus ?? d.status
          const sessionStatus = normalizeSessionStatus(rawStatus)
          const dayKey = d.dayKey ?? d.dayExercise?.day
          return {
            date,
            hasWorkout,
            programName: d.programName,
            phase: d.phase,
            weekIndex: d.weekIndex,
            dayIndex: d.dayIndex,
            dayKey,
            sessionId: d.sessionId,
            sessionStatus,
            daySummary: d.dayExercise?.exercise_name ?? dayKey,
          }
        } catch {
          return { date, hasWorkout: false }
        }
      })
    )
    return events
  },

  /**
   * Get calendar events for a date range. Tries GET /athlete/dashboard/calendar;
   * otherwise uses scheduled-workout per day (capped to 31 days).
   */
  async getCalendarEvents(
    start: string,
    end: string
  ): Promise<CalendarDayEvent[]> {
    try {
      const res = await api.get<{
        statusCode: number
        data: CalendarDayEvent[] | { events: CalendarDayEvent[] }
      }>('athlete/dashboard/calendar', { params: { start, end } })
      if (res.data.statusCode === 200 && res.data.data) {
        const raw = res.data.data
        const list = Array.isArray(raw)
          ? raw
          : (raw as { events: CalendarDayEvent[] }).events
        if (Array.isArray(list)) return list
      }
    } catch {
      // fallback
    }

    const startD = new Date(start + 'T12:00:00Z')
    const endD = new Date(end + 'T12:00:00Z')
    let count = Math.round((endD.getTime() - startD.getTime()) / 86400000) + 1
    if (count > 31) count = 31
    const dates = dateRange(start, count)
    const events: CalendarDayEvent[] = await Promise.all(
      dates.map(async date => {
        try {
          const r = await trainService.getScheduledWorkout(date)
          const d = r.data?.statusCode === 200 ? r.data.data : null
          if (!d) return { date, hasWorkout: false }
          const hasWorkout =
            d.dayExercise?.exercises != null &&
            d.dayExercise.exercises.length > 0
          const rawStatus = d.sessionStatus ?? d.status
          const sessionStatus = normalizeSessionStatus(rawStatus)
          const dayKey = d.dayKey ?? d.dayExercise?.day
          return {
            date,
            hasWorkout,
            programName: d.programName,
            phase: d.phase,
            weekIndex: d.weekIndex,
            dayKey,
            sessionId: d.sessionId,
            sessionStatus,
            daySummary: d.dayExercise?.exercise_name ?? dayKey,
          }
        } catch {
          return { date, hasWorkout: false }
        }
      })
    )
    return events
  },
}

function normalizeSessionStatus(
  raw: string | undefined
): CalendarDayEvent['sessionStatus'] {
  if (raw == null) return undefined
  const s = raw.toLowerCase()
  if (
    s === 'scheduled' ||
    s === 'in_progress' ||
    s === 'completed' ||
    s === 'skipped'
  ) {
    return s
  }
  return undefined
}
