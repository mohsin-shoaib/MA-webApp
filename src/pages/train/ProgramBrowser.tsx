import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { programService } from '@/api/program.service'
import { CYCLE_NAME_TO_ID } from '@/constants/onboarding'
import type { Program } from '@/types/program'

const CYCLE_NAMES = ['Red', 'Amber', 'Green', 'Sustainment'] as const

/** 3.2 Amber: Calendar-synced; no program list to enroll in—workouts are assigned to dates by admin/coach and appear on Train by date. */
function getEmptyCycleMessage(cycleName: string): string {
  if (cycleName === 'Amber')
    return 'Amber (Warfighter) is assigned via onboarding or your coach. Workouts appear on the Train calendar by date—use the Train page to see today’s session.'
  if (cycleName === 'Sustainment')
    return '3.4 Sustainment: Browse the Sustainment Library (by constraint: Travel, Limited Equipment, Rehab, Time, Deployed) to start a temporary override. Roadmap and event date unchanged; when you finish or stop, resume your prior program.'
  return 'No programs in this cycle.'
}

const INITIAL_PROGRAMS: Record<string, Program[]> = {
  Red: [],
  Amber: [],
  Green: [],
  Sustainment: [],
}
const INITIAL_LOADING: Record<string, boolean> = {
  Red: false,
  Amber: false,
  Green: false,
  Sustainment: false,
}

export function ProgramBrowser() {
  const navigate = useNavigate()
  const [currentProgramId, setCurrentProgramId] = useState<number | null>(null)
  /** MASS Phase 6: when in Sustainment/Custom override, resume previous program */
  const [pausedProgramId, setPausedProgramId] = useState<number | null>(null)
  const [resumeLoading, setResumeLoading] = useState(false)
  const [programsByCycle, setProgramsByCycle] =
    useState<Record<string, Program[]>>(INITIAL_PROGRAMS)
  const [loadingCycles, setLoadingCycles] =
    useState<Record<string, boolean>>(INITIAL_LOADING)
  const [recommended, setRecommended] = useState<{
    program: Program | null
    reason: string | null
  }>({ program: null, reason: null })
  const [recommendedLoading, setRecommendedLoading] = useState(true)

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

  const fetchCyclePrograms = useCallback((cycleName: string) => {
    const cycleId = CYCLE_NAME_TO_ID[cycleName]
    if (cycleId == null) return
    setLoadingCycles(prev => ({ ...prev, [cycleName]: true }))
    programService
      .getProgramsByCycle(cycleId)
      .then(({ data }) => {
        setProgramsByCycle(prev => ({ ...prev, [cycleName]: data ?? [] }))
      })
      .catch(() => {
        setProgramsByCycle(prev => ({ ...prev, [cycleName]: [] }))
      })
      .finally(() => {
        setLoadingCycles(prev => ({ ...prev, [cycleName]: false }))
      })
  }, [])

  useEffect(() => {
    CYCLE_NAMES.forEach(cycleName => fetchCyclePrograms(cycleName))
  }, [fetchCyclePrograms])

  useEffect(() => {
    programService
      .getRecommendedNext()
      .then(res => {
        if (res.data.statusCode === 200 && res.data.data) {
          setRecommended({
            program: res.data.data.program ?? null,
            reason: res.data.data.reason ?? null,
          })
        } else {
          setRecommended({ program: null, reason: null })
        }
      })
      .catch(() => setRecommended({ program: null, reason: null }))
      .finally(() => setRecommendedLoading(false))
  }, [])

  const handleViewProgram = (programId: number) => {
    navigate(`/train/programs/${programId}`)
  }

  const cycleBadgeClass: Record<string, string> = {
    Red: 'bg-red-50 text-red-800 border-red-200',
    Amber: 'bg-amber-50 text-amber-800 border-amber-200',
    Green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    Sustainment: 'bg-slate-50 text-slate-800 border-slate-200',
  }

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
          Program browser
        </Text>
      </div>

      {pausedProgramId != null && (
        <Card className="p-4 mb-4 border-amber-200 bg-amber-50/50">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Text
              variant="default"
              className="text-sm font-medium text-amber-900"
            >
              You are in a Sustainment or Custom 1:1 override. Your previous
              program is paused.
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

      <Card className="p-6 sm:p-8">
        <div className="mb-8">
          <Text variant="default" className="font-semibold text-lg mb-2 block">
            Browse by Readiness Cycle
          </Text>
          <Text variant="secondary" className="text-sm leading-relaxed">
            Programs are grouped by Readiness Cycle (Red, Amber, Green,
            Sustainment). Each shows focus areas and goals. Open a program to
            view its structure and enroll.
          </Text>
        </div>

        {recommendedLoading && (
          <div className="flex gap-2 py-4 mb-6">
            <Spinner size="small" variant="primary" />
            <Text variant="secondary">Checking recommended program...</Text>
          </div>
        )}
        {!recommendedLoading && recommended.program && (
          <section className="pb-8 mb-8 border-b border-gray-200">
            <Text variant="default" className="font-semibold mb-2 block">
              Recommended for you
            </Text>
            <Text variant="secondary" className="text-sm mb-4">
              {recommended.reason ?? 'Based on your timeline and goals.'} You
              can enroll below; nothing is auto-assigned.
            </Text>
            <Card className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="min-w-0 flex-1">
                <Text variant="default" className="font-medium">
                  {recommended.program.name}
                </Text>
                {recommended.program.description && (
                  <Text
                    variant="secondary"
                    className="text-sm mt-1.5 line-clamp-2 leading-relaxed"
                  >
                    {recommended.program.description}
                  </Text>
                )}
                {recommended.program.subCategory && (
                  <Text
                    variant="secondary"
                    className="text-xs mt-1.5 text-gray-600"
                  >
                    Focus: {recommended.program.subCategory}
                  </Text>
                )}
              </div>
              <div className="flex pt-2 gap-2 shrink-0 items-center mt-4 sm:mt-0 sm:pl-4">
                {currentProgramId === recommended.program.id ? (
                  <Text variant="secondary" className="text-sm font-medium">
                    Current program
                  </Text>
                ) : (
                  <Button
                    type="button"
                    variant="primary"
                    onClick={() => handleViewProgram(recommended.program!.id)}
                  >
                    View & Enroll
                  </Button>
                )}
              </div>
            </Card>
          </section>
        )}

        {CYCLE_NAMES.map((cycleName, index) => {
          const programs = programsByCycle[cycleName] ?? []
          const loading = loadingCycles[cycleName]
          const badgeClass =
            cycleBadgeClass[cycleName] ??
            'bg-gray-100 text-gray-800 border-gray-200'
          return (
            <section
              key={cycleName}
              className={
                index < CYCLE_NAMES.length - 1
                  ? 'pb-8 mb-8 border-b border-gray-200'
                  : ''
              }
            >
              <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <span
                  className={`inline-block px-3 py-1 rounded-lg border text-sm font-medium ${badgeClass}`}
                >
                  {cycleName} cycle
                </span>
                {cycleName === 'Sustainment' && (
                  <Button
                    type="button"
                    variant="secondary"
                    size="small"
                    onClick={() => navigate('/train/sustainment')}
                  >
                    Open Sustainment Library
                  </Button>
                )}
              </div>
              {loading && (
                <div className="flex items-center gap-2 py-4">
                  <Spinner size="small" variant="primary" />
                  <Text variant="secondary">Loading programs...</Text>
                </div>
              )}
              {!loading && programs.length === 0 && (
                <Text variant="secondary" className="text-sm py-2">
                  {getEmptyCycleMessage(cycleName)}
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
                        {program.subCategory && (
                          <Text
                            variant="secondary"
                            className="text-xs mt-1.5 text-gray-600"
                          >
                            Focus: {program.subCategory}
                          </Text>
                        )}
                        <span
                          className={`inline-block mt-3 px-2.5 py-1 rounded-md text-xs font-medium border ${badgeClass}`}
                        >
                          {cycleName}
                        </span>
                      </div>
                      <div className="flex pt-2 gap-2 shrink-0 items-center mt-4 sm:mt-0 sm:pl-4">
                        {currentProgramId === program.id ? (
                          <Text
                            variant="secondary"
                            className="text-sm font-medium"
                          >
                            Current program
                          </Text>
                        ) : (
                          <Button
                            type="button"
                            variant="secondary"
                            onClick={() => handleViewProgram(program.id)}
                          >
                            View & Enroll
                          </Button>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </Card>
    </div>
  )
}
