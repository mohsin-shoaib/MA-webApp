// ConfirmationStep.tsx
import { useState } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { readinessService } from '@/api/readiness.service'
import type {
  ConfirmProps,
  ConfirmResponse,
  SelectionProps,
} from '@/types/readiness'
import { Dropdown } from '@/components/Dropdown'
import type { AxiosError } from 'axios'

interface ConfirmationStepProps {
  recommendedCycle: string
  primaryGoal: string
  onComplete: (response: ConfirmResponse['data']) => void
  loading: boolean
  setLoading: (value: boolean) => void
  setError: (value: string | null) => void
}

export default function ConfirmationStep({
  recommendedCycle,
  primaryGoal,
  onComplete,
  loading,
  setLoading,
  setError,
}: ConfirmationStepProps) {
  const [showModal, setShowModal] = useState(false)
  const [cycleName, setCycleName] = useState('')

  const handleConfirm = async (confirmed: boolean) => {
    if (confirmed) {
      setError(null)
      setLoading(true)

      try {
        const payload: ConfirmProps = {
          cycle: recommendedCycle,
          confirmed: true,
        }

        const response = await readinessService.confirmation(payload)

        onComplete(response.data.data)
      } catch (error) {
        const axiosError = error as AxiosError<{ message: string }>
        const errorMessage =
          axiosError.response?.data?.message || 'Confirmation failed.'
        setError(errorMessage)
        console.error(errorMessage)
        setError(errorMessage)
      } finally {
        setLoading(false)
      }
    } else {
      setShowModal(true)
    }
  }

  const handleSelection = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()

    setError(null)
    setLoading(true)
    setShowModal(false)

    try {
      const payload: SelectionProps = {
        primaryGoal,
        cycleName,
      }

      const response = await readinessService.readinessSelection(payload)

      onComplete(response.data.data)
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message || 'Selection failed.'
      setError(errorMessage)
      console.error(errorMessage)
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const cycleOptions = [
    { label: 'Red Cycle', value: 'Red Cycle' },
    { label: 'Amber Cycle', value: 'Amber Cycle' },
    { label: 'Green Cycle', value: 'Green Cycle' },
  ]

  return (
    <div className="text-center space-y-6 p-6 border rounded">
      <Text variant="primary" className="text-2xl font-semibold">
        Confirm Your Recommended Cycle
      </Text>

      <div className="border rounded p-4 bg-gray-50">
        <Text variant="default" className="font-semibold">
          {recommendedCycle}
        </Text>
      </div>

      <div className="flex justify-center gap-4">
        <Button
          variant="secondary"
          onClick={() => handleConfirm(false)}
          disabled={loading}
        >
          No, choose another
        </Button>

        <Button onClick={() => handleConfirm(true)} loading={loading}>
          Confirm Cycle
        </Button>
      </div>

      {/* Selection Modal */}
      {showModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black/40"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded p-6 w-96 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <Text variant="primary" className="font-semibold">
              Select Another Cycle
            </Text>

            <form onSubmit={handleSelection} className="space-y-4">
              <div>
                <Dropdown
                  label="Selet Cycle"
                  value={cycleName}
                  onValueChange={v => setCycleName(v as string)}
                  options={cycleOptions}
                  required
                  fullWidth
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </Button>

                <Button type="submit" loading={loading}>
                  Select Cycle
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
