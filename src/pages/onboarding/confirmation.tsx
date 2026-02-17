// ConfirmationStep.tsx
import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Modal } from '@/components/Modal'
import { onboardingService } from '@/api/onboarding.service'
import { programService } from '@/api/program.service'
import type { ReadinessRecommendation } from '@/types/readiness'
import type { CreateOnboardingDTO } from '@/types/onboarding'
import type { Program } from '@/types/program'
import { Dropdown } from '@/components/Dropdown'
import { Spinner } from '@/components/Spinner'
import {
  CYCLE_NAME_TO_ID,
  CYCLES_REQUIRING_PROGRAM,
} from '@/constants/onboarding'
import type { AxiosError } from 'axios'

interface ConfirmationStepProps {
  readonly recommendedCycle: string
  readonly recommendation?: ReadinessRecommendation
  /** Full onboarding data from Step 1 (defer-save: sent to confirm endpoint) */
  readonly onboardData: CreateOnboardingDTO
  readonly onComplete: () => void
  readonly onAlreadyOnboarded?: () => void
  readonly loading: boolean
  readonly setLoading: (value: boolean) => void
  readonly setError: (value: string | null) => void
}

export default function ConfirmationStep({
  recommendedCycle,
  recommendation,
  onboardData,
  onComplete,
  onAlreadyOnboarded,
  loading,
  setLoading,
  setError,
}: ConfirmationStepProps) {
  const [showModal, setShowModal] = useState(false)
  const [cycleName, setCycleName] = useState('')
  const [selectedProgramId, setSelectedProgramId] = useState<number | null>(
    null
  )
  const [programsForCycle, setProgramsForCycle] = useState<Program[]>([])
  const [loadingPrograms, setLoadingPrograms] = useState(false)

  const requiresProgram =
    cycleName && CYCLES_REQUIRING_PROGRAM.includes(cycleName)
  const canConfirmManual =
    cycleName &&
    (!requiresProgram || (requiresProgram && selectedProgramId != null))

  // Reset manual selection state when modal closes
  const resetManualState = useCallback(() => {
    setCycleName('')
    setSelectedProgramId(null)
    setProgramsForCycle([])
  }, [])

  // Ensure modal is closed when component mounts
  useEffect(() => {
    setShowModal(false)
    resetManualState()
  }, [resetManualState])

  // When user selects a cycle (Red/Green), fetch programs; Amber has no programs
  useEffect(() => {
    if (!cycleName) {
      setProgramsForCycle([])
      setSelectedProgramId(null)
      return
    }
    if (!CYCLES_REQUIRING_PROGRAM.includes(cycleName)) {
      setProgramsForCycle([])
      setSelectedProgramId(null)
      return
    }
    const cycleId = CYCLE_NAME_TO_ID[cycleName]
    if (cycleId == null) {
      setProgramsForCycle([])
      return
    }
    let cancelled = false
    setLoadingPrograms(true)
    setSelectedProgramId(null)
    const subCategory = onboardData.primaryGoal || undefined
    programService
      .getProgramsByCycle(cycleId, subCategory)
      .then(({ data }) => {
        if (!cancelled) setProgramsForCycle(data ?? [])
      })
      .catch(() => {
        if (!cancelled) setProgramsForCycle([])
      })
      .finally(() => {
        if (!cancelled) setLoadingPrograms(false)
      })
    return () => {
      cancelled = true
    }
  }, [cycleName, onboardData.primaryGoal])

  const callConfirmOnboarding = async (
    cycleNameToUse: string,
    programId?: number
  ) => {
    setError(null)
    setLoading(true)
    setShowModal(false)

    try {
      const response = await onboardingService.confirmOnboarding({
        onboarding: onboardData,
        cycleName: cycleNameToUse,
        programId,
      })
      const apiResponse = response.data
      if (apiResponse.statusCode === 200) {
        setShowModal(false)
        onComplete()
      } else {
        throw new Error(apiResponse.message || 'Failed to confirm')
      }
    } catch (error) {
      const axiosError = error as AxiosError<{
        message?: string
        statusCode?: number
      }>
      const status = axiosError.response?.status
      const message =
        axiosError.response?.data?.message ||
        axiosError.message ||
        'Confirmation failed.'

      if (status === 409) {
        onAlreadyOnboarded?.()
        return
      }
      setError(message)
      console.error('Confirmation error:', message, error)
      setShowModal(false)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirmRecommended = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()
    if (!recommendation) {
      setError('No recommendation available')
      return
    }
    await callConfirmOnboarding(
      recommendation.recommendedCycle,
      recommendation.recommendedProgramId ?? undefined
    )
  }

  const handleSelectAlternative = async () => {
    if (!cycleName) {
      setError('Please select a cycle')
      return
    }
    if (requiresProgram && selectedProgramId == null) {
      setError('Please select a program')
      return
    }
    if (requiresProgram && programsForCycle.length === 0 && !loadingPrograms) {
      setError('No programs available for this cycle. Please contact support.')
      return
    }
    await callConfirmOnboarding(
      cycleName,
      requiresProgram ? (selectedProgramId ?? undefined) : undefined
    )
    resetManualState()
  }

  const cycleOptions = [
    { label: 'Red Cycle', value: 'Red' },
    { label: 'Amber Cycle', value: 'Amber' },
    { label: 'Green Cycle', value: 'Green' },
  ]

  const programOptions = programsForCycle.map(p => ({
    label: p.name,
    value: String(p.id),
  }))

  return (
    <div className="space-y-6">
      <Card className="p-6 border-2 border-blue-500">
        <Text variant="primary" className="text-2xl font-semibold mb-4">
          Recommended: {recommendedCycle} Cycle
        </Text>
        {recommendation && (
          <Text variant="secondary" className="mb-4">
            {recommendation.reason}
          </Text>
        )}
        <div className="flex gap-4">
          <Button
            type="button"
            onClick={handleConfirmRecommended}
            disabled={loading}
            loading={loading}
            className="flex-1"
          >
            {loading ? 'Confirming...' : 'Confirm Cycle'}
          </Button>
          <Button
            type="button"
            onClick={() => {
              setShowModal(true)
            }}
            disabled={loading}
            variant="secondary"
            className="flex-1"
          >
            No, Choose Another
          </Button>
        </div>
      </Card>

      {showModal && !loading && (
        <Modal
          visible={showModal && !loading}
          onClose={() => {
            if (!loading) {
              setShowModal(false)
              resetManualState()
            }
          }}
          title="Choose manually"
          primaryAction={{
            label: loading ? 'Confirming...' : 'Confirm Selection',
            onPress: () => {
              void handleSelectAlternative()
            },
            loading: loading,
            disabled: !canConfirmManual || loading || loadingPrograms,
          }}
          secondaryAction={{
            label: 'Cancel',
            onPress: () => {
              if (!loading) {
                setShowModal(false)
                resetManualState()
              }
            },
            disabled: loading,
          }}
          closeOnBackdropPress={!loading}
          closeOnEscape={!loading}
        >
          <div className="space-y-4">
            <Dropdown
              label="Select Cycle"
              value={cycleName}
              onValueChange={v => setCycleName(v as string)}
              options={cycleOptions}
              required
              fullWidth
            />
            {requiresProgram && (
              <>
                {loadingPrograms && (
                  <div className="flex items-center gap-2 py-2">
                    <Spinner size="small" variant="primary" />
                    <Text variant="secondary">Loading programs...</Text>
                  </div>
                )}
                {!loadingPrograms && programsForCycle.length === 0 && (
                  <Text variant="secondary" className="text-amber-600">
                    No programs available for this cycle. Please contact
                    support.
                  </Text>
                )}
                {!loadingPrograms && programsForCycle.length > 0 && (
                  <Dropdown
                    label="Select Program"
                    value={
                      selectedProgramId == null ? '' : String(selectedProgramId)
                    }
                    onValueChange={v =>
                      setSelectedProgramId(v ? Number(v) : null)
                    }
                    options={programOptions}
                    required
                    fullWidth
                    placeholder="Select a program"
                  />
                )}
              </>
            )}
          </div>
        </Modal>
      )}
    </div>
  )
}
