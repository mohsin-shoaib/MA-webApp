import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
import { CoachSetWorkingMaxModal } from '@/components/CoachSetWorkingMaxModal'
import { coachService } from '@/api/coach.service'
import { programService } from '@/api/program.service'
import type { Program } from '@/types/program'
import type { User } from '@/types/admin'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { AxiosError } from 'axios'

type WorkingMaxRow = {
  exerciseId: number
  exerciseName: string
  value: number
  unit: string
  source: string
  updatedAt: string
}

function userName(u: {
  firstName?: string | null
  lastName?: string | null
  email?: string
}) {
  const first = u.firstName ?? ''
  const last = u.lastName ?? ''
  if (first || last) return `${first} ${last}`.trim()
  return u.email ?? ''
}

export default function CoachMyAthletes() {
  const [athletes, setAthletes] = useState<User[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [assignOpen, setAssignOpen] = useState(false)
  const [assigningAthlete, setAssigningAthlete] = useState<User | null>(null)
  const [programId, setProgramId] = useState<string>('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [workingMaxAthlete, setWorkingMaxAthlete] = useState<User | null>(null)
  const [workingMaxList, setWorkingMaxList] = useState<WorkingMaxRow[]>([])
  const [workingMaxListLoading, setWorkingMaxListLoading] = useState(false)
  const [editingWorkingMax, setEditingWorkingMax] =
    useState<WorkingMaxRow | null>(null)
  // 3.5 Custom: Assign a program day to an athlete's calendar date (ad-hoc session).
  const [assignSessionOpen, setAssignSessionOpen] = useState(false)
  const [assignSessionAthlete, setAssignSessionAthlete] = useState<User | null>(
    null
  )
  const [assignSessionDate, setAssignSessionDate] = useState('')
  const [assignSessionProgramDayId, setAssignSessionProgramDayId] = useState<
    number | null
  >(null)
  const [assignSessionProgramId, setAssignSessionProgramId] = useState<
    number | null
  >(null)
  const [assignSessionProgramName, setAssignSessionProgramName] = useState('')
  const [assignSessionDayOptions, setAssignSessionDayOptions] = useState<
    { value: number; label: string }[]
  >([])
  const [assignSessionLoading, setAssignSessionLoading] = useState(false)
  const [assignSessionSaving, setAssignSessionSaving] = useState(false)
  const { showError, showSuccess } = useSnackbar()

  const fetchAthletes = useCallback(async () => {
    try {
      const res = await coachService.getMyAthletes()
      if (res.data?.statusCode === 200 && res.data.data?.athletes) {
        setAthletes(res.data.data.athletes)
      }
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to load athletes')
    }
  }, [showError])

  const fetchPrograms = useCallback(async () => {
    try {
      const res = await programService.getAll({ limit: 200 })
      const rows = res.data?.data?.rows ?? []
      setPrograms(rows)
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to load programs')
    }
  }, [showError])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchAthletes().finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [fetchAthletes])

  useEffect(() => {
    if (!assignSessionOpen || !assignSessionAthlete) return
    let cancelled = false
    setAssignSessionLoading(true)
    coachService
      .listActive1to1()
      .then(res => {
        if (cancelled) return
        const list = (res.data?.data?.assignments ?? []) as Array<{
          userId: number
          programId: number
          program?: { id: number; name: string }
        }>
        const assignment = list.find(
          a => a.userId === Number(assignSessionAthlete?.id)
        )
        if (!assignment) {
          setAssignSessionProgramId(null)
          setAssignSessionProgramName('')
          setAssignSessionDayOptions([])
          setAssignSessionLoading(false)
          return
        }
        const pid = assignment.programId
        setAssignSessionProgramId(pid)
        setAssignSessionProgramName(assignment.program?.name ?? '')
        return programService.getById(pid)
      })
      .then(res => {
        if (cancelled || !res) return
        const prog = res.data?.data as {
          programStructure?: {
            weeks?: Array<{
              weekIndex?: number
              weekName?: string
              days?: Array<{ id: number; dayIndex?: number; dayName?: string }>
            }>
          }
        }
        const weeks = prog?.programStructure?.weeks ?? []
        const options = weeks.flatMap(w =>
          (w.days ?? []).map(
            (d: { id: number; dayIndex?: number; dayName?: string }) => ({
              value: d.id,
              label: `${w.weekName ?? 'Week ' + (w.weekIndex ?? '')} – ${d.dayName ?? 'Day ' + (d.dayIndex ?? '')}`,
            })
          )
        )
        setAssignSessionDayOptions(options)
      })
      .catch(() => {
        if (!cancelled) {
          setAssignSessionDayOptions([])
        }
      })
      .finally(() => {
        if (!cancelled) setAssignSessionLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [assignSessionOpen, assignSessionAthlete])

  const openAssign = (athlete: User) => {
    setAssigningAthlete(athlete)
    setProgramId('')
    setStartDate('')
    setEndDate('')
    setAssignOpen(true)
    fetchPrograms()
  }

  const openAssignSession = (athlete: User) => {
    setAssignSessionAthlete(athlete)
    setAssignSessionDate('')
    setAssignSessionProgramDayId(null)
    setAssignSessionProgramId(null)
    setAssignSessionProgramName('')
    setAssignSessionDayOptions([])
    setAssignSessionOpen(true)
  }

  const openWorkingMaxes = useCallback(
    async (athlete: User) => {
      setWorkingMaxAthlete(athlete)
      setWorkingMaxList([])
      setEditingWorkingMax(null)
      setWorkingMaxListLoading(true)
      try {
        const res = await coachService.getAthleteWorkingMax(Number(athlete.id))
        if (res.data?.statusCode === 200 && res.data.data?.workingMaxes) {
          setWorkingMaxList(res.data.data.workingMaxes)
        }
      } catch (e) {
        const err = e as AxiosError<{ message?: string }>
        showError(err.response?.data?.message || 'Failed to load working maxes')
      } finally {
        setWorkingMaxListLoading(false)
      }
    },
    [showError]
  )

  const handleAssign = async () => {
    if (!assigningAthlete) return
    const pid = Number(programId)
    if (!pid || !startDate.trim() || !endDate.trim()) {
      showError('Select program and enter start and end dates')
      return
    }
    try {
      setSaving(true)
      await coachService.assignCustomProgram({
        athleteId: Number(assigningAthlete.id),
        programId: pid,
        startDate: startDate.trim(),
        endDate: endDate.trim(),
      })
      showSuccess(
        'Custom program assigned. Athlete will see this program until the end date.'
      )
      setAssignOpen(false)
      setAssigningAthlete(null)
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to assign program')
    } finally {
      setSaving(false)
    }
  }

  const handleAssignSession = async () => {
    if (
      !assignSessionAthlete ||
      !assignSessionProgramId ||
      !assignSessionProgramDayId ||
      !assignSessionDate.trim()
    ) {
      showError('Select date and session day')
      return
    }
    try {
      setAssignSessionSaving(true)
      await coachService.assignCustomSessionToDate({
        athleteId: Number(assignSessionAthlete.id),
        programId: assignSessionProgramId,
        date: assignSessionDate.trim(),
        programDayId: assignSessionProgramDayId,
      })
      showSuccess(
        'Session assigned to date. Athlete will see it on their calendar.'
      )
      setAssignSessionOpen(false)
      setAssignSessionAthlete(null)
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to assign session')
    } finally {
      setAssignSessionSaving(false)
    }
  }

  // 3.5 Custom / 1:1: Only Custom cycle programs can be assigned to an athlete (90 Unchained, 1:1 S&C).
  const programOptions = programs
    .filter(
      (p: Program) => (p as { cycleType?: string }).cycleType === 'CUSTOM'
    )
    .map(p => ({
      value: String(p.id),
      label: p.name,
    }))

  return (
    <div className="p-6">
      <div className="mb-6">
        <Text as="h1" variant="primary" className="text-2xl font-bold">
          My Athletes (1:1)
        </Text>
        <Text variant="secondary" className="text-sm mt-1">
          Athletes assigned to you. Assign a custom program to override their
          roadmap until an end date (90 Unchained).
        </Text>
      </div>

      <Card className="p-6">
        {loading && (
          <div className="flex items-center gap-2 py-8">
            <Spinner size="small" variant="primary" />
            <Text variant="secondary">Loading...</Text>
          </div>
        )}
        {!loading && athletes.length === 0 && (
          <Text variant="secondary">
            No athletes assigned to you yet. Admin can assign athletes to you
            from Coach–Athlete 1:1.
          </Text>
        )}
        {!loading && athletes.length > 0 && (
          <ul className="space-y-3">
            {athletes.map(a => (
              <li
                key={a.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 last:border-0"
              >
                <div>
                  <Text variant="default" className="font-medium text-sm">
                    {userName(a)}
                  </Text>
                  <Text variant="muted" className="text-xs">
                    {a.email}
                  </Text>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="small"
                    onClick={() => openWorkingMaxes(a)}
                  >
                    Working maxes
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="small"
                    onClick={() => openAssignSession(a)}
                  >
                    Assign session to date
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => openAssign(a)}
                  >
                    Assign 1:1 program
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {assignOpen && assigningAthlete && (
        <Modal
          visible={assignOpen}
          onClose={() => {
            setAssignOpen(false)
            setAssigningAthlete(null)
          }}
          title={`Assign custom program to ${userName(assigningAthlete)}`}
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          primaryAction={{
            label: 'Assign',
            onPress: () => {
              void handleAssign()
            },
            disabled:
              saving || !programId || !startDate.trim() || !endDate.trim(),
          }}
          secondaryAction={{
            label: 'Cancel',
            onPress: () => {
              setAssignOpen(false)
              setAssigningAthlete(null)
            },
          }}
        >
          <div className="space-y-4">
            <div>
              <Text
                variant="default"
                className="text-sm font-medium mb-1 block"
              >
                Program
              </Text>
              <Dropdown
                placeholder="Select program"
                value={programId}
                onValueChange={v => setProgramId((v as string) ?? '')}
                options={programOptions}
                fullWidth
                emptyMessage="No custom programs. Create one in Program Management → Custom cycle."
              />
            </div>
            <div>
              <Text
                variant="default"
                className="text-sm font-medium mb-1 block"
              >
                Start date
              </Text>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <Text
                variant="default"
                className="text-sm font-medium mb-1 block"
              >
                End date
              </Text>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
              />
            </div>
            <Text variant="muted" className="text-xs">
              From start to end date, this athlete will see workouts from the
              selected program instead of their roadmap.
            </Text>
          </div>
        </Modal>
      )}

      {assignSessionOpen && assignSessionAthlete && (
        <Modal
          visible={assignSessionOpen}
          onClose={() => {
            setAssignSessionOpen(false)
            setAssignSessionAthlete(null)
          }}
          title={`Assign session to date: ${userName(assignSessionAthlete)}`}
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          primaryAction={{
            label: assignSessionSaving ? 'Assigning…' : 'Assign',
            onPress: () => void handleAssignSession(),
            disabled:
              assignSessionSaving ||
              !assignSessionDate.trim() ||
              !assignSessionProgramDayId,
          }}
          secondaryAction={{
            label: 'Cancel',
            onPress: () => {
              setAssignSessionOpen(false)
              setAssignSessionAthlete(null)
            },
          }}
        >
          <div className="space-y-4">
            {assignSessionLoading && (
              <div className="flex gap-2 py-2">
                <Spinner size="small" variant="primary" />
                <Text variant="secondary">Loading program days…</Text>
              </div>
            )}
            {!assignSessionLoading && assignSessionProgramName && (
              <Text variant="muted" className="text-sm">
                Program: {assignSessionProgramName}
              </Text>
            )}
            <div>
              <Text
                variant="default"
                className="text-sm font-medium mb-1 block"
              >
                Date
              </Text>
              <Input
                type="date"
                value={assignSessionDate}
                onChange={e => setAssignSessionDate(e.target.value)}
              />
            </div>
            <div>
              <Text
                variant="default"
                className="text-sm font-medium mb-1 block"
              >
                Session (day)
              </Text>
              <Dropdown
                placeholder="Select session"
                value={
                  assignSessionProgramDayId != null
                    ? String(assignSessionProgramDayId)
                    : ''
                }
                onValueChange={v =>
                  setAssignSessionProgramDayId(v ? Number(v) : null)
                }
                options={assignSessionDayOptions.map(opt => ({
                  value: String(opt.value),
                  label: opt.label,
                }))}
                fullWidth
                emptyMessage="No days in program"
              />
            </div>
          </div>
        </Modal>
      )}

      {workingMaxAthlete && (
        <Modal
          visible={!!workingMaxAthlete}
          onClose={() => {
            setWorkingMaxAthlete(null)
            setEditingWorkingMax(null)
          }}
          title={`Working maxes: ${userName(workingMaxAthlete)}`}
          showCloseButton
          closeOnBackdropPress
          closeOnEscape
          size="medium"
          secondaryAction={{
            label: 'Close',
            onPress: () => {
              setWorkingMaxAthlete(null)
              setEditingWorkingMax(null)
            },
          }}
        >
          <div className="space-y-4">
            {workingMaxListLoading && (
              <div className="flex items-center gap-2 py-4">
                <Spinner size="small" variant="primary" />
                <Text variant="secondary">Loading…</Text>
              </div>
            )}
            {!workingMaxListLoading && workingMaxList.length === 0 && (
              <Text variant="secondary" className="text-sm">
                No working maxes yet. Athlete can set them in Train or by
                logging sets with weight and reps.
              </Text>
            )}
            {!workingMaxListLoading && workingMaxList.length > 0 && (
              <ul className="space-y-2 max-h-[50vh] overflow-y-auto">
                {workingMaxList.map(row => (
                  <li
                    key={row.exerciseId}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-gray-100 last:border-0"
                  >
                    <div>
                      <Text variant="default" className="text-sm font-medium">
                        {row.exerciseName}
                      </Text>
                      <Text variant="muted" className="text-xs">
                        {row.value} {row.unit} · {row.source}
                      </Text>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="small"
                      onClick={() => setEditingWorkingMax(row)}
                    >
                      Set
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Modal>
      )}

      {workingMaxAthlete && editingWorkingMax && (
        <CoachSetWorkingMaxModal
          visible={!!editingWorkingMax}
          onClose={() => setEditingWorkingMax(null)}
          onSuccess={async () => {
            const res = await coachService.getAthleteWorkingMax(
              Number(workingMaxAthlete.id)
            )
            if (res.data?.statusCode === 200 && res.data.data?.workingMaxes) {
              setWorkingMaxList(res.data.data.workingMaxes)
            }
          }}
          athleteId={Number(workingMaxAthlete.id)}
          exerciseId={editingWorkingMax.exerciseId}
          exerciseName={editingWorkingMax.exerciseName}
          currentValue={editingWorkingMax.value}
          currentUnit={editingWorkingMax.unit as 'lb' | 'kg'}
        />
      )}
    </div>
  )
}
