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

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
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
      <Card className="p-6">
        <Text variant="default" className="font-semibold mb-4">
          Browse by Readiness Cycle
        </Text>
        <Text variant="secondary" className="text-sm mb-4">
          Programs are grouped by Red, Amber, and Green cycles. Tap View &
          Enroll to see details and enroll on the next page.
        </Text>

        {CYCLE_NAMES.map(cycleName => {
          const programs = programsByCycle[cycleName] ?? []
          const loading = loadingCycles[cycleName]
          return (
            <div key={cycleName} className="mb-6 last:mb-0">
              <Text variant="primary" className="font-medium mb-2">
                {cycleName} cycle
              </Text>
              {loading && (
                <div className="flex items-center gap-2 py-3">
                  <Spinner size="small" variant="primary" />
                  <Text variant="secondary">Loading programs...</Text>
                </div>
              )}
              {!loading && programs.length === 0 && (
                <Text variant="secondary" className="text-sm">
                  No programs in this cycle.
                </Text>
              )}
              {!loading && programs.length > 0 && (
                <div className="space-y-3">
                  {programs.map(program => (
                    <Card
                      key={program.id}
                      className="p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <Text variant="default" className="font-medium">
                          {program.name}
                        </Text>
                        {program.description && (
                          <Text
                            variant="secondary"
                            className="text-sm mt-1 line-clamp-2"
                          >
                            {program.description}
                          </Text>
                        )}
                        <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 rounded text-xs">
                          {cycleName}
                        </span>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => handleViewProgram(program.id)}
                        >
                          View & Enroll
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </Card>
    </div>
  )
}
