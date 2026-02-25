import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import { Modal } from '@/components/Modal'
import { Input } from '@/components/Input'
import { Dropdown } from '@/components/Dropdown'
import { coachService } from '@/api/coach.service'
import { programService } from '@/api/program.service'
import type { Program } from '@/types/program'
import type { User } from '@/types/admin'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { AxiosError } from 'axios'

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

  const openAssign = (athlete: User) => {
    setAssigningAthlete(athlete)
    setProgramId('')
    setStartDate('')
    setEndDate('')
    setAssignOpen(true)
    fetchPrograms()
  }

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

  const programOptions = programs.map(p => ({
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
                <Button
                  type="button"
                  variant="secondary"
                  size="small"
                  onClick={() => openAssign(a)}
                >
                  Assign 1:1 program
                </Button>
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
                emptyMessage="No programs. Create one in Manage Program first."
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
    </div>
  )
}
