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

  const cycleLabel = recommendedCycle ? `${recommendedCycle} Cycle` : '—'

  return (
    <div className="space-y-6">
      <Card className="p-6 sm:p-8 rounded-xl shadow-md border border-gray-200/80 bg-white">
        {/* Confirm step = review & submit (distinct from Program step) */}
        <h2 className="text-xl sm:text-2xl font-semibold text-gray-800 mb-1">
          Review and confirm
        </h2>
        <Text variant="secondary" className="text-sm mb-6">
          Review your selection below, then complete onboarding to continue.
        </Text>

        {/* Compact summary of selection */}
        <div className="rounded-lg bg-gray-50 border border-gray-200 py-4 px-5 mb-6">
          <dl className="space-y-2">
            <div>
              <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                Selected cycle
              </dt>
              <dd className="mt-0.5 font-semibold text-gray-900">
                {cycleLabel}
              </dd>
            </div>
            {recommendation?.reason && (
              <div>
                <dt className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                  Summary
                </dt>
                <dd className="mt-0.5 text-sm text-gray-600">
                  {recommendation.reason}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Actions — same symmetry as Program step */}
        <div className="mt-8 pt-6 border-t border-gray-100 flex flex-col sm:flex-row gap-3">
          <Button
            type="button"
            onClick={handleConfirmRecommended}
            disabled={loading}
            loading={loading}
            className="flex-1 min-w-0 bg-[#3AB8ED] hover:bg-[#2ea8db] text-white font-bold rounded-lg"
          >
            {loading ? 'Confirming...' : 'Complete onboarding'}
          </Button>
          <Button
            type="button"
            onClick={() => setShowModal(true)}
            disabled={loading}
            variant="secondary"
            className="flex-1 min-w-0 bg-[#2196F3] hover:bg-[#1976D2] text-white font-bold rounded-lg border-0"
          >
            Change cycle
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
