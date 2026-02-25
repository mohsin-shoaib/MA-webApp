import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Spinner } from '@/components/Spinner'
import { Dropdown } from '@/components/Dropdown'
import { adminCoachAssignmentService } from '@/api/admin-coach-assignment.service'
import type {
  CoachAssignmentItem,
  CoachRequestItem,
} from '@/api/admin-coach-assignment.service'
import { adminService } from '@/api/admin.service'
import type { User } from '@/types/admin'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { AxiosError } from 'axios'

function userName(u: {
  firstName?: string | null
  lastName?: string | null
  email: string
}) {
  const first = u.firstName ?? ''
  const last = u.lastName ?? ''
  if (first || last) return `${first} ${last}`.trim()
  return u.email
}

export default function AdminCoachAssignment() {
  const [assignments, setAssignments] = useState<CoachAssignmentItem[]>([])
  const [coachRequests, setCoachRequests] = useState<CoachRequestItem[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [coachId, setCoachId] = useState<string>('')
  const [athleteId, setAthleteId] = useState<string>('')
  const { showError, showSuccess } = useSnackbar()

  const fetchAssignments = useCallback(async () => {
    try {
      const res = await adminCoachAssignmentService.list()
      if (res.data?.statusCode === 200 && res.data.data?.assignments) {
        setAssignments(res.data.data.assignments)
      }
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to load assignments')
    }
  }, [showError])

  const fetchCoachRequests = useCallback(async () => {
    try {
      const res = await adminCoachAssignmentService.listCoachRequests()
      if (res.data?.statusCode === 200 && res.data.data?.requests) {
        setCoachRequests(res.data.data.requests)
      }
    } catch {
      setCoachRequests([])
    }
  }, [])

  const fetchUsers = useCallback(async () => {
    try {
      const res = await adminService.getUsers()
      const rows = res.data?.data?.rows ?? []
      setUsers(rows)
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to load users')
    }
  }, [showError])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    Promise.all([
      fetchAssignments(),
      fetchCoachRequests(),
      fetchUsers(),
    ]).finally(() => {
      if (!cancelled) setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [fetchAssignments, fetchCoachRequests, fetchUsers])

  const coaches = users.filter(u => String(u.role).toUpperCase() === 'COACH')
  const athletes = users.filter(u => String(u.role).toUpperCase() === 'ATHLETE')
  const coachOptions = coaches.map(c => ({
    value: String(c.id),
    label:
      userName(
        c as unknown as {
          firstName?: string | null
          lastName?: string | null
          email: string
        }
      ) || c.email,
  }))
  const athleteOptions = athletes.map(a => ({
    value: String(a.id),
    label:
      userName(
        a as unknown as {
          firstName?: string | null
          lastName?: string | null
          email: string
        }
      ) || a.email,
  }))

  const handleAssign = async () => {
    const cId = Number(coachId)
    const aId = Number(athleteId)
    if (!cId || !aId) {
      showError('Select both coach and athlete')
      return
    }
    try {
      setSaving(true)
      await adminCoachAssignmentService.assign(cId, aId)
      showSuccess('Coach assigned to athlete')
      setCoachId('')
      setAthleteId('')
      fetchAssignments()
      fetchCoachRequests()
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to assign')
    } finally {
      setSaving(false)
    }
  }

  const handleUnassign = async (coachId: number, athleteId: number) => {
    try {
      setSaving(true)
      await adminCoachAssignmentService.unassign(coachId, athleteId)
      showSuccess('Assignment removed')
      fetchAssignments()
    } catch (e) {
      const err = e as AxiosError<{ message?: string }>
      showError(err.response?.data?.message || 'Failed to unassign')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <Text as="h1" variant="primary" className="text-2xl font-bold">
          Coach–Athlete Assignment (1:1)
        </Text>
        <Text variant="secondary" className="text-sm mt-1">
          Assign coaches to athletes for 1:1 coaching. Coaches can then assign
          custom programs to their athletes (90 Unchained).
        </Text>
      </div>

      {coachRequests.length > 0 && (
        <Card className="p-6 mb-6 border-amber-200 bg-amber-50/50">
          <Text variant="default" className="font-semibold mb-2 block">
            Pending coach requests ({coachRequests.length})
          </Text>
          <Text variant="secondary" className="text-sm mb-4">
            These athletes requested a coach from the Market page. Assign a
            coach below to fulfill the request.
          </Text>
          <ul className="space-y-2">
            {coachRequests.map(r => (
              <li
                key={r.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2 border-b border-amber-100 last:border-0"
              >
                <div>
                  <Text variant="default" className="text-sm font-medium">
                    {userName(r.athlete)} — {r.athlete.email}
                  </Text>
                  <Text variant="muted" className="text-xs">
                    Requested{' '}
                    {new Date(r.createdAt).toLocaleDateString(undefined, {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </Text>
                </div>
                <Button
                  type="button"
                  variant="primary"
                  size="small"
                  onClick={() => setAthleteId(String(r.athleteId))}
                >
                  Assign coach
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Card className="p-6 mb-6">
        <Text variant="default" className="font-semibold mb-3 block">
          Assign coach to athlete
        </Text>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[200px]">
            <Text variant="secondary" className="text-xs mb-1 block">
              Coach
            </Text>
            <Dropdown
              placeholder="Select coach"
              value={coachId}
              onValueChange={v => setCoachId((v as string) ?? '')}
              options={coachOptions}
              fullWidth
            />
          </div>
          <div className="min-w-[200px]">
            <Text variant="secondary" className="text-xs mb-1 block">
              Athlete
            </Text>
            <Dropdown
              placeholder="Select athlete"
              value={athleteId}
              onValueChange={v => setAthleteId((v as string) ?? '')}
              options={athleteOptions}
              fullWidth
            />
          </div>
          <Button
            type="button"
            onClick={handleAssign}
            disabled={saving || !coachId || !athleteId}
          >
            Assign
          </Button>
        </div>
      </Card>

      <Card className="p-6">
        <Text variant="default" className="font-semibold mb-4 block">
          Current assignments ({assignments.length})
        </Text>
        {loading ? (
          <div className="flex items-center gap-2 py-4">
            <Spinner size="small" variant="primary" />
            <Text variant="secondary">Loading...</Text>
          </div>
        ) : assignments.length === 0 ? (
          <Text variant="secondary">No coach–athlete assignments yet.</Text>
        ) : (
          <ul className="space-y-3">
            {assignments.map(a => (
              <li
                key={`${a.coachId}-${a.athleteId}`}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 pb-3 last:border-0"
              >
                <div>
                  <Text variant="default" className="font-medium text-sm">
                    {userName(a.coach)} → {userName(a.athlete)}
                  </Text>
                  <Text variant="muted" className="text-xs">
                    {a.coach.email} / {a.athlete.email}
                  </Text>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="small"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleUnassign(a.coachId, a.athleteId)}
                  disabled={saving}
                >
                  Unassign
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  )
}
