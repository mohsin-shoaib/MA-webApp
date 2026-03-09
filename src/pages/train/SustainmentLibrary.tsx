/**
 * 3.4 Sustainment Library: Browse sustainment programs by constraint type.
 * Sustainment is an override that pauses the athlete's current cycle; roadmap and event date unchanged.
 * When sustainment ends (complete or manual stop), athlete returns to prior program via Resume.
 */
import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { programService } from '@/api/program.service'
import { CYCLE_NAME_TO_ID } from '@/constants/onboarding'
import type { Program } from '@/types/program'

const SUSTAINMENT_CONSTRAINTS = [
  { value: '', label: 'All constraints' },
  { value: 'Travel', label: 'Travel' },
  { value: 'Limited Equipment', label: 'Limited Equipment' },
  { value: 'Rehab', label: 'Rehab' },
  { value: 'Time', label: 'Time' },
  { value: 'Deployed', label: 'Deployed' },
] as const

type RecommendedSustainment = {
  id: number
  name: string
  description?: string
  constraintCategory?: string
  numberOfWeeks?: number
} | null

export function SustainmentLibrary() {
  const navigate = useNavigate()
  const [currentProgramId, setCurrentProgramId] = useState<number | null>(null)
  const [pausedProgramId, setPausedProgramId] = useState<number | null>(null)
  const [resumeLoading, setResumeLoading] = useState(false)
  const [constraintFilter, setConstraintFilter] = useState('')
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(false)
  const [recommended, setRecommended] = useState<RecommendedSustainment>(null)
  const [recommendedLoading, setRecommendedLoading] = useState(true)
  const [dismissLoading, setDismissLoading] = useState(false)

  const sustainmentCycleId = CYCLE_NAME_TO_ID['Sustainment']

  useEffect(() => {
    programService
      .getCurrentProgram()
      .then(res => {
        if (res.data.statusCode === 200 && res.data.data) {
          const d = res.data.data as {
            programId?: number
            pausedProgramId?: number | null
          }
          setCurrentProgramId(d.programId ?? null)
          setPausedProgramId(d.pausedProgramId ?? null)
        } else {
          setCurrentProgramId(null)
          setPausedProgramId(null)
        }
      })
      .catch(() => {
        setCurrentProgramId(null)
        setPausedProgramId(null)
      })
  }, [])

  useEffect(() => {
    programService
      .getRecommendedSustainment()
      .then(res => {
        if (res.data.statusCode === 200 && res.data.data?.program) {
          setRecommended(res.data.data.program as RecommendedSustainment)
        } else {
          setRecommended(null)
        }
      })
      .catch(() => setRecommended(null))
      .finally(() => setRecommendedLoading(false))
  }, [])

  const fetchSustainmentPrograms = useCallback(() => {
    if (sustainmentCycleId == null) return
    setLoading(true)
    programService
      .getProgramsByCycle(
        sustainmentCycleId,
        undefined,
        constraintFilter || undefined
      )
      .then(({ data }) => setPrograms(data ?? []))
      .catch(() => setPrograms([]))
      .finally(() => setLoading(false))
  }, [sustainmentCycleId, constraintFilter])

  useEffect(() => {
    const id = setTimeout(() => fetchSustainmentPrograms(), 0)
    return () => clearTimeout(id)
  }, [fetchSustainmentPrograms])

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => navigate('/train')}
        >
          ← Back to Train
        </Button>
        <Text variant="primary" className="text-2xl font-semibold">
          Sustainment Library
        </Text>
      </div>

      <Card className="p-4 border-slate-200 bg-slate-50/50">
        <Text variant="default" className="font-medium text-slate-900">
          3.4 Sustainment: temporary override
        </Text>
        <Text variant="secondary" className="text-sm mt-1 block">
          For travel, limited equipment, rehab, time limits, or deployed/field
          conditions. Starting a sustainment program pauses your current cycle
          program; your roadmap and event date stay unchanged. When you finish
          or stop sustainment, resume your previous program from here or the
          Program browser.
        </Text>
      </Card>

      {pausedProgramId != null && (
        <Card className="p-4 mb-4 border-amber-200 bg-amber-50/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Text
              variant="default"
              className="text-sm font-medium text-amber-900"
            >
              You are in a Sustainment override. Your previous program is
              paused.
            </Text>
            <Button
              type="button"
              variant="secondary"
              size="small"
              disabled={resumeLoading}
              onClick={() => {
                setResumeLoading(true)
                programService
                  .resumeProgram()
                  .then(res => {
                    if (
                      res.data.statusCode === 200 &&
                      res.data.data?.enrollment
                    ) {
                      const e = res.data.data.enrollment as {
                        programId: number
                        pausedProgramId?: number | null
                      }
                      setCurrentProgramId(e.programId)
                      setPausedProgramId(e.pausedProgramId ?? null)
                      fetchSustainmentPrograms()
                    }
                  })
                  .finally(() => setResumeLoading(false))
              }}
            >
              {resumeLoading ? 'Resuming...' : 'Resume previous program'}
            </Button>
          </div>
        </Card>
      )}

      {!recommendedLoading && recommended && (
        <Card className="p-4 mb-4 border-slate-300 bg-slate-100/80">
          <Text
            variant="default"
            className="text-sm font-medium text-slate-900 mb-1"
          >
            Your coach recommended
          </Text>
          <Text variant="secondary" className="text-sm mb-3">
            {recommended.name}
            {recommended.constraintCategory && (
              <span className="text-slate-600 ml-1">
                ({recommended.constraintCategory})
              </span>
            )}
          </Text>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="primary"
              size="small"
              onClick={() => navigate(`/train/programs/${recommended.id}`)}
            >
              View &amp; Start
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="small"
              disabled={dismissLoading}
              onClick={() => {
                setDismissLoading(true)
                programService
                  .dismissRecommendedSustainment()
                  .then(() => setRecommended(null))
                  .finally(() => setDismissLoading(false))
              }}
            >
              {dismissLoading ? 'Dismissing...' : 'Dismiss'}
            </Button>
          </div>
        </Card>
      )}

      <Card className="p-6 sm:p-8">
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <label
            htmlFor="sustainment-constraint"
            className="text-sm font-medium"
          >
            Constraint type
          </label>
          <select
            id="sustainment-constraint"
            value={constraintFilter}
            onChange={e => setConstraintFilter(e.target.value)}
            className="rounded border border-gray-300 px-3 py-2 text-sm min-w-[180px]"
          >
            {SUSTAINMENT_CONSTRAINTS.map(opt => (
              <option key={opt.value || 'all'} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {loading && (
          <div className="flex gap-2 py-6">
            <Spinner size="small" variant="primary" />
            <Text variant="secondary">Loading programs...</Text>
          </div>
        )}

        {!loading && programs.length === 0 && (
          <Text variant="secondary" className="text-sm py-4">
            No sustainment programs
            {constraintFilter ? ` for "${constraintFilter}"` : ''} available
            yet.
          </Text>
        )}

        {!loading && programs.length > 0 && (
          <div className="space-y-4">
            {programs.map(program => (
              <Card
                key={program.id}
                className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
              >
                <div className="min-w-0 flex-1">
                  <Text variant="default" className="font-medium">
                    {program.name}
                  </Text>
                  {program.description && (
                    <Text
                      variant="secondary"
                      className="text-sm mt-1.5 line-clamp-2 leading-relaxed"
                    >
                      {program.description}
                    </Text>
                  )}
                  {(program as { constraintCategory?: string })
                    .constraintCategory && (
                    <Text
                      variant="secondary"
                      className="text-xs mt-1.5 text-slate-600"
                    >
                      Constraint:{' '}
                      {
                        (program as { constraintCategory?: string })
                          .constraintCategory
                      }
                    </Text>
                  )}
                  <span className="inline-block mt-3 px-2.5 py-1 rounded-md text-xs font-medium border bg-slate-50 text-slate-800 border-slate-200">
                    Sustainment
                  </span>
                </div>
                <div className="flex pt-2 gap-2 shrink-0 items-center mt-4 sm:mt-0 sm:pl-4">
                  {currentProgramId === program.id ? (
                    <Text variant="secondary" className="text-sm font-medium">
                      Current program
                    </Text>
                  ) : (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => navigate(`/train/programs/${program.id}`)}
                    >
                      View & Enroll
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
