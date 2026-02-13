// ConfirmationStep.tsx
import { useState, useEffect } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Card } from '@/components/Card'
import { Modal } from '@/components/Modal'
import { cycleTransitionService } from '@/api/cycle-transition.service'
import type { ReadinessRecommendation } from '@/types/readiness'
import type { CycleTransitionResponse } from '@/types/cycle-transition'
import { Dropdown } from '@/components/Dropdown'
import type { AxiosError } from 'axios'

interface ConfirmationStepProps {
  recommendedCycle: string
  recommendation?: ReadinessRecommendation // Optional new recommendation data
  onComplete: (response: CycleTransitionResponse['data']) => void
  loading: boolean
  setLoading: (value: boolean) => void
  setError: (value: string | null) => void
}

export default function ConfirmationStep({
  recommendedCycle,
  recommendation,
  onComplete,
  loading,
  setLoading,
  setError,
}: ConfirmationStepProps) {
  const [showModal, setShowModal] = useState(false)
  const [cycleName, setCycleName] = useState('')

  // Ensure modal is closed when component mounts
  useEffect(() => {
    setShowModal(false)
    setCycleName('')
  }, [])

  const handleConfirmRecommended = async (e?: React.MouseEvent) => {
    e?.preventDefault()
    e?.stopPropagation()

    // Ensure modal is closed
    setShowModal(false)
    setError(null)
    setLoading(true)

    try {
      // Use new API
      if (!recommendation) {
        throw new Error('No recommendation available')
      }

      const response = await cycleTransitionService.confirmCycleTransition({
        cycleName: recommendation.recommendedCycle,
        programId: recommendation.recommendedProgramId || undefined,
      })

      // Axios wraps the response, so data is in response.data
      const apiResponse = response.data
      if (apiResponse.statusCode === 200 && apiResponse.data) {
        // Ensure modal is closed before completing
        setShowModal(false)
        onComplete(apiResponse.data)
      } else {
        throw new Error(apiResponse.message || 'Failed to confirm cycle')
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message ||
        axiosError.message ||
        'Confirmation failed.'
      setError(errorMessage)
      console.error('Confirmation error:', errorMessage, error)
      // Ensure modal stays closed on error
      setShowModal(false)
    } finally {
      setLoading(false)
    }
  }

  const handleSelectAlternative = async () => {
    if (!cycleName) {
      setError('Please select a cycle')
      return
    }

    setError(null)
    setLoading(true)
    // Close modal immediately when user confirms selection
    setShowModal(false)

    try {
      // Use new API
      const response = await cycleTransitionService.confirmCycleTransition({
        cycleName: cycleName,
        programId: undefined, // Will be determined by backend
      })

      // Axios wraps the response, so data is in response.data
      const apiResponse = response.data
      if (apiResponse.statusCode === 200 && apiResponse.data) {
        // Ensure modal stays closed and navigate to next step
        setShowModal(false)
        setCycleName('') // Reset cycle name
        onComplete(apiResponse.data)
      } else {
        throw new Error(apiResponse.message || 'Failed to confirm cycle')
      }
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message ||
        axiosError.message ||
        'Selection failed.'
      setError(errorMessage)
      console.error('Selection error:', errorMessage, error)
      // Keep modal closed on error - user can click "Choose Another" again if needed
      setShowModal(false)
    } finally {
      setLoading(false)
    }
  }

  const cycleOptions = [
    { label: 'Red Cycle', value: 'Red' },
    { label: 'Amber Cycle', value: 'Amber' },
    { label: 'Green Cycle', value: 'Green' },
  ]

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

      <Modal
        visible={showModal && !loading}
        onClose={() => {
          if (!loading) {
            setShowModal(false)
            setCycleName('')
          }
        }}
        title="Select Alternative Cycle"
        primaryAction={{
          label: loading ? 'Confirming...' : 'Confirm Selection',
          onPress: handleSelectAlternative,
          loading: loading,
          disabled: !cycleName || loading,
        }}
        secondaryAction={{
          label: 'Cancel',
          onPress: () => {
            if (!loading) {
              setShowModal(false)
              setCycleName('')
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
        </div>
      </Modal>
    </div>
  )
}
