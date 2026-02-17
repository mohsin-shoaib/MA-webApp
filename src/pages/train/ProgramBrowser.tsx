import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Card } from '@/components/Card'
import { Button } from '@/components/Button'
import { Spinner } from '@/components/Spinner'
import { programService } from '@/api/program.service'
import { CYCLE_NAME_TO_ID } from '@/constants/onboarding'
import type { Program } from '@/types/program'

const CYCLE_NAMES = ['Red', 'Amber', 'Green'] as const

export function ProgramBrowser() {
  const navigate = useNavigate()
  const [currentProgramId, setCurrentProgramId] = useState<number | null>(null)
  const [programsByCycle, setProgramsByCycle] = useState<
    Record<string, Program[]>
  >({
    Red: [],
    Amber: [],
    Green: [],
  })
  const [loadingCycles, setLoadingCycles] = useState<Record<string, boolean>>({
    Red: false,
    Amber: false,
    Green: false,
  })

  useEffect(() => {
    programService
      .getCurrentProgram()
      .then(res => {
        if (res.data.statusCode === 200 && res.data.data?.programId != null) {
          setCurrentProgramId(res.data.data.programId)
        } else {
          setCurrentProgramId(null)
        }
      })
      .catch(() => setCurrentProgramId(null))
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

  const handleViewProgram = (programId: number) => {
    navigate(`/train/programs/${programId}`)
  }

  const cycleBadgeClass: Record<string, string> = {
    Red: 'bg-red-50 text-red-800 border-red-200',
    Amber: 'bg-amber-50 text-amber-800 border-amber-200',
    Green: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6">
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

      <Card className="p-6 sm:p-8">
        <div className="mb-8">
          <Text variant="default" className="font-semibold text-lg mb-2 block">
            Browse by Readiness Cycle
          </Text>
          <Text variant="secondary" className="text-sm leading-relaxed">
            Programs are grouped by Red, Amber, and Green cycles based on your
            readiness. Open a program to view its structure and enroll.
          </Text>
        </div>

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
              <div className="flex items-center gap-2 mb-4">
                <span
                  className={`inline-block px-3 py-1 rounded-lg border text-sm font-medium ${badgeClass}`}
                >
                  {cycleName} cycle
                </span>
              </div>
              {loading && (
                <div className="flex items-center gap-2 py-4">
                  <Spinner size="small" variant="primary" />
                  <Text variant="secondary">Loading programs...</Text>
                </div>
              )}
              {!loading && programs.length === 0 && (
                <Text variant="secondary" className="text-sm py-2">
                  No programs in this cycle.
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
