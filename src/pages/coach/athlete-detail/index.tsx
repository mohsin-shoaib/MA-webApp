/**
 * MASS Phase 8: Coach athlete detail — profile, program, roadmap, tests, recovery, sessions (scorecards), session drill-down, coach response.
 */
import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { coachService } from '@/api/coach.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { WorkoutSession, SetLog } from '@/types/train'
import { AxiosError } from 'axios'

type AthleteFromState = {
  id: number
  firstName?: string
  lastName?: string
  name?: string
  email?: string
}

type AthleteSummary = {
  profile: {
    id: number
    firstName: string | null
    lastName: string | null
    email: string
    role: string
    createdAt: string | null
  } | null
  currentProgram: {
    programName: string
    cycleName: string | null
    startDate: string
    currentWeekIndex: number | null
    currentDayIndex: number | null
  } | null
  roadmap: {
    currentCycleName: string | null
    primaryGoalEnd: string | null
    goalSubCategory: string | null
  } | null
  tests: Array<{
    id: number
    testName: string
    loggedAt: string
    totalScore: number | null
    passed: boolean | null
  }>
  recovery: Array<{
    id: number
    protocolName: string
    protocolType: string
    scheduledDate: string
    status: string
    completedAt: string | null
  }>
}

export default function CoachAthleteDetail() {
  const { athleteId } = useParams<{ athleteId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const athlete = (location.state as { athlete?: AthleteFromState })?.athlete
  const id = athleteId ? Number(athleteId) : 0
  const [summary, setSummary] = useState<AthleteSummary | null>(null)
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [sessions, setSessions] = useState<WorkoutSession[]>([])
  const [loading, setLoading] = useState(true)
  const [from] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().slice(0, 10)
  })
  const [to] = useState(() => new Date().toISOString().slice(0, 10))
  const [detailSession, setDetailSession] = useState<WorkoutSession | null>(
    null
  )
  const [detailLoading, setDetailLoading] = useState(false)
  const [coachComment, setCoachComment] = useState('')
  const [savingComment, setSavingComment] = useState(false)
  const { showError, showSuccess } = useSnackbar()

  const athleteName = athlete
    ? athlete.name ||
      [athlete.firstName, athlete.lastName].filter(Boolean).join(' ') ||
      athlete.email ||
      `Athlete ${id}`
    : summary?.profile
      ? [summary.profile.firstName, summary.profile.lastName]
          .filter(Boolean)
          .join(' ') || summary.profile.email
      : `Athlete ${id}`

  const fetchSummary = useCallback(async () => {
    if (!id || !Number.isFinite(id)) return
    try {
      setSummaryLoading(true)
      const res = await coachService.getAthleteSummary(id)
      if (res.data?.statusCode === 200 && res.data.data) {
        setSummary(res.data.data as AthleteSummary)
      } else {
        setSummary(null)
      }
    } catch {
      setSummary(null)
    } finally {
      setSummaryLoading(false)
    }
  }, [id])

  useEffect(() => {
    fetchSummary()
  }, [fetchSummary])

  const fetchSessions = useCallback(async () => {
    if (!id || !Number.isFinite(id)) return
    try {
      setLoading(true)
      const res = await coachService.getAthleteSessions(id, { from, to })
      if (res.data?.statusCode === 200 && Array.isArray(res.data.data)) {
        setSessions(res.data.data as WorkoutSession[])
      } else {
        setSessions([])
      }
    } catch {
      setSessions([])
      showError('Failed to load sessions')
    } finally {
      setLoading(false)
    }
  }, [id, from, to, showError])

  useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const openSessionDetail = async (session: WorkoutSession) => {
    setDetailSession(session)
    setCoachComment(
      (session as { coachResponseComment?: string | null })
        .coachResponseComment ?? ''
    )
    if (
      session.setLogs?.length === 0 ||
      (session as { sessionSummary?: unknown }).sessionSummary === undefined
    ) {
      setDetailLoading(true)
      try {
        const res = await coachService.getAthleteSession(id!, session.id)
        if (res.data?.statusCode === 200 && res.data.data) {
          setDetailSession(res.data.data as WorkoutSession)
          setCoachComment(
            (res.data.data as { coachResponseComment?: string | null })
              .coachResponseComment ?? ''
          )
        }
      } catch {
        showError('Failed to load session detail')
      } finally {
        setDetailLoading(false)
      }
    }
  }

  const saveCoachResponse = async () => {
    if (!id || !detailSession) return
    setSavingComment(true)
    try {
      await coachService.updateCoachResponse(id, detailSession.id, {
        coachResponseComment: coachComment.trim() || undefined,
      })
      showSuccess('Response saved')
      setDetailSession(prev =>
        prev
          ? { ...prev, coachResponseComment: coachComment.trim() || null }
          : null
      )
      fetchSessions()
    } catch (e) {
      const ax = e as AxiosError<{ message?: string }>
      showError(ax.response?.data?.message || 'Failed to save')
    } finally {
      setSavingComment(false)
    }
  }

  const sessionStatusColor = (status: string) => {
    switch (String(status).toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-800'
      case 'in_progress':
        return 'bg-blue-100 text-blue-800'
      case 'skipped':
        return 'bg-gray-100 text-gray-700'
      default:
        return 'bg-gray-100 text-gray-600'
    }
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-4 mb-6">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/coach/user-management')}
        >
          ← Athletes
        </Button>
        <Text as="h1" variant="primary" className="text-2xl font-bold">
          {athleteName}
        </Text>
      </div>

      {/* MASS Phase 8: Profile, Current program, Roadmap, Tests, Recovery */}
      {summaryLoading ? (
        <div className="mb-6 text-gray-500 text-sm">Loading summary…</div>
      ) : (
        summary && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <Card className="p-4">
              <Text
                variant="default"
                className="font-semibold text-gray-800 mb-2 block"
              >
                Profile
              </Text>
              {summary.profile ? (
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>Email: {summary.profile.email}</li>
                  <li>Role: {summary.profile.role}</li>
                  {summary.profile.createdAt && (
                    <li>
                      Joined:{' '}
                      {new Date(summary.profile.createdAt).toLocaleDateString()}
                    </li>
                  )}
                </ul>
              ) : (
                <Text variant="muted">—</Text>
              )}
            </Card>
            <Card className="p-4">
              <Text
                variant="default"
                className="font-semibold text-gray-800 mb-2 block"
              >
                Current program
              </Text>
              {summary.currentProgram ? (
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>{summary.currentProgram.programName}</li>
                  {summary.currentProgram.cycleName && (
                    <li>Cycle: {summary.currentProgram.cycleName}</li>
                  )}
                  <li>Started: {summary.currentProgram.startDate}</li>
                  {(summary.currentProgram.currentWeekIndex != null ||
                    summary.currentProgram.currentDayIndex != null) && (
                    <li>
                      Week {summary.currentProgram.currentWeekIndex ?? '—'} /
                      Day {summary.currentProgram.currentDayIndex ?? '—'}
                    </li>
                  )}
                </ul>
              ) : (
                <Text variant="muted">No active program</Text>
              )}
            </Card>
            <Card className="p-4">
              <Text
                variant="default"
                className="font-semibold text-gray-800 mb-2 block"
              >
                Roadmap
              </Text>
              {summary.roadmap ? (
                <ul className="text-sm text-gray-600 space-y-1">
                  {summary.roadmap.currentCycleName && (
                    <li>Cycle: {summary.roadmap.currentCycleName}</li>
                  )}
                  {summary.roadmap.goalSubCategory && (
                    <li>Goal: {summary.roadmap.goalSubCategory}</li>
                  )}
                  {summary.roadmap.primaryGoalEnd && (
                    <li>Goal end: {summary.roadmap.primaryGoalEnd}</li>
                  )}
                  {!summary.roadmap.currentCycleName &&
                    !summary.roadmap.goalSubCategory &&
                    !summary.roadmap.primaryGoalEnd && (
                      <Text variant="muted">—</Text>
                    )}
                </ul>
              ) : (
                <Text variant="muted">No roadmap</Text>
              )}
            </Card>
            <Card className="p-4">
              <Text
                variant="default"
                className="font-semibold text-gray-800 mb-2 block"
              >
                Recent tests
              </Text>
              {summary.tests.length === 0 ? (
                <Text variant="muted">No test results</Text>
              ) : (
                <ul className="text-sm text-gray-600 space-y-1">
                  {summary.tests.slice(0, 5).map(t => (
                    <li key={t.id}>
                      {t.testName} — {new Date(t.loggedAt).toLocaleDateString()}
                      {t.totalScore != null && ` (${t.totalScore})`}
                      {t.passed != null && (t.passed ? ' ✓' : ' ✗')}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card className="p-4 md:col-span-2">
              <Text
                variant="default"
                className="font-semibold text-gray-800 mb-2 block"
              >
                Recovery
              </Text>
              {summary.recovery.length === 0 ? (
                <Text variant="muted">No recovery sessions</Text>
              ) : (
                <ul className="text-sm text-gray-600 space-y-1">
                  {summary.recovery.slice(0, 5).map(r => (
                    <li key={r.id}>
                      {r.protocolName} ({r.protocolType}) — {r.scheduledDate} —{' '}
                      {r.status}
                      {r.completedAt && ` completed ${r.completedAt}`}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        )
      )}

      <Card className="p-0">
        <div className="p-4 border-b border-gray-200">
          <Text variant="default" className="font-semibold text-gray-800">
            Sessions (scorecards)
          </Text>
          <Text variant="secondary" className="text-sm">
            {from} to {to}
          </Text>
        </div>
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading…</div>
        ) : sessions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No sessions in this range.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {sessions.map(s => {
              const sum = (
                s as WorkoutSession & {
                  sessionSummary?: {
                    totalSets?: number
                    volumeKg?: number
                    durationMinutes?: number
                  }
                }
              ).sessionSummary
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className="w-full flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-left hover:bg-gray-50 transition-colors"
                    onClick={() => openSessionDetail(s)}
                  >
                    <div className="flex items-center gap-3">
                      <Text variant="default" className="font-medium">
                        {new Date(s.scheduledDate).toLocaleDateString()}
                      </Text>
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${sessionStatusColor(s.status)}`}
                      >
                        {s.status}
                      </span>
                      {s.phase && (
                        <Text variant="secondary" className="text-sm">
                          {s.phase}
                        </Text>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      {sum && (
                        <>
                          {sum.totalSets != null && (
                            <span>{sum.totalSets} sets</span>
                          )}
                          {sum.volumeKg != null && sum.volumeKg > 0 && (
                            <span>{sum.volumeKg} kg</span>
                          )}
                          {sum.durationMinutes != null && (
                            <span>{sum.durationMinutes} min</span>
                          )}
                        </>
                      )}
                      {(s as WorkoutSession & { intensityRating?: number })
                        .intensityRating != null && (
                        <span>
                          RPE{' '}
                          {
                            (s as WorkoutSession & { intensityRating?: number })
                              .intensityRating
                          }
                        </span>
                      )}
                      {(s as { coachResponseComment?: string | null })
                        .coachResponseComment && (
                        <span className="text-[#3AB8ED]">Has response</span>
                      )}
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </Card>

      {/* Session drill-down modal */}
      {detailSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col p-0">
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <Text variant="default" className="font-semibold">
                Session{' '}
                {new Date(detailSession.scheduledDate).toLocaleDateString()} —{' '}
                {detailSession.status}
              </Text>
              <button
                type="button"
                className="text-gray-500 hover:text-gray-700"
                onClick={() => setDetailSession(null)}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 overflow-auto p-4 space-y-4">
              {detailLoading ? (
                <div className="text-center text-gray-500">Loading detail…</div>
              ) : (
                <>
                  {(
                    detailSession as WorkoutSession & {
                      sessionSummary?: {
                        totalSets?: number
                        volumeKg?: number
                        durationMinutes?: number
                      }
                    }
                  ).sessionSummary && (
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span>
                        Sets:{' '}
                        {
                          (
                            detailSession as WorkoutSession & {
                              sessionSummary?: { totalSets?: number }
                            }
                          ).sessionSummary?.totalSets
                        }
                      </span>
                      <span>
                        Volume:{' '}
                        {
                          (
                            detailSession as WorkoutSession & {
                              sessionSummary?: { volumeKg?: number }
                            }
                          ).sessionSummary?.volumeKg
                        }{' '}
                        kg
                      </span>
                      <span>
                        Duration:{' '}
                        {
                          (
                            detailSession as WorkoutSession & {
                              sessionSummary?: { durationMinutes?: number }
                            }
                          ).sessionSummary?.durationMinutes
                        }{' '}
                        min
                      </span>
                    </div>
                  )}
                  {detailSession.sessionComments && (
                    <div>
                      <Text
                        variant="default"
                        className="text-sm font-medium text-gray-700 mb-1"
                      >
                        Athlete comments
                      </Text>
                      <p className="text-sm text-gray-600 whitespace-pre-wrap">
                        {detailSession.sessionComments}
                      </p>
                    </div>
                  )}
                  {detailSession.exerciseSwaps &&
                    detailSession.exerciseSwaps.length > 0 && (
                      <div>
                        <Text
                          variant="default"
                          className="text-sm font-medium text-gray-700 mb-1"
                        >
                          Exercise swaps
                        </Text>
                        <ul className="text-sm text-gray-600 space-y-1">
                          {detailSession.exerciseSwaps.map(
                            (
                              sw: {
                                originalExerciseId: number
                                newExercise?: { name: string }
                              },
                              i: number
                            ) => (
                              <li key={i}>
                                Exercise {sw.originalExerciseId} →{' '}
                                {sw.newExercise?.name ?? sw.originalExerciseId}
                              </li>
                            )
                          )}
                        </ul>
                      </div>
                    )}
                  {detailSession.setLogs &&
                    detailSession.setLogs.length > 0 && (
                      <div>
                        <Text
                          variant="default"
                          className="text-sm font-medium text-gray-700 mb-2"
                        >
                          Set logs (prescribed vs actual)
                        </Text>
                        <div className="space-y-1">
                          {(detailSession.setLogs as SetLog[])
                            .sort((a, b) => a.setIndex - b.setIndex)
                            .map(log => (
                              <div
                                key={log.id}
                                className={`flex flex-wrap gap-3 px-3 py-2 rounded text-sm ${log.isModified ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50'}`}
                              >
                                <span className="font-medium">
                                  Set {log.setIndex}
                                </span>
                                {log.reps != null && (
                                  <span>{log.reps} reps</span>
                                )}
                                {(log.weightLb != null ||
                                  log.weightKg != null) && (
                                  <span>
                                    {log.weightLb ?? log.weightKg}{' '}
                                    {log.weightLb != null ? 'lb' : 'kg'}
                                  </span>
                                )}
                                {log.rpe != null && <span>RPE {log.rpe}</span>}
                                {log.isModified && (
                                  <span className="text-amber-700 font-medium">
                                    Modified
                                  </span>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Coach response (visible to athlete)
                    </label>
                    <textarea
                      className="w-full min-h-[100px] rounded border border-gray-300 px-3 py-2 text-sm"
                      value={coachComment}
                      onChange={e => setCoachComment(e.target.value)}
                      placeholder="Add your feedback..."
                    />
                    <Button
                      type="button"
                      variant="primary"
                      size="small"
                      className="mt-2"
                      disabled={savingComment}
                      onClick={saveCoachResponse}
                    >
                      {savingComment ? 'Saving…' : 'Save response'}
                    </Button>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
