import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { Dropdown } from '@/components/Dropdown'
import { ProgramBuilderForm } from '@/components/Program/ProgramBuilderForm'
import { adminService } from '@/api/admin.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { Cycle } from '@/types/cycle'
import { AxiosError } from 'axios'

/**
 * Coach Create Program page.
 * Uses the same Program Builder (Weeks → Days → Blocks → Exercises) as admin.
 * Coach selects a cycle first, then creates a program (saved as unpublished until admin approves).
 */
const Program = () => {
  const navigate = useNavigate()
  const { showError, showSuccess } = useSnackbar()
  const [cycles, setCycles] = useState<Cycle[]>([])
  const [loadingCycles, setLoadingCycles] = useState(true)
  const [selectedCycleId, setSelectedCycleId] = useState<number | undefined>(
    undefined
  )

  const fetchCycles = useCallback(async () => {
    try {
      setLoadingCycles(true)
      const response = await adminService.getCycles()
      setCycles(response.data.data || [])
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>
      showError(axiosError.response?.data?.message ?? 'Failed to load cycles')
      setCycles([])
    } finally {
      setLoadingCycles(false)
    }
  }, [showError])

  useEffect(() => {
    fetchCycles()
  }, [fetchCycles])

  const handleSuccess = () => {
    showSuccess(
      'Program created and submitted for admin approval. It will appear in the Program Browser once approved.'
    )
    setSelectedCycleId(undefined)
  }

  const handleCancel = () => {
    setSelectedCycleId(undefined)
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="small"
          onClick={() => navigate(-1)}
          leftIcon={<span className="text-lg">←</span>}
        >
          Back
        </Button>
      </div>
      <div>
        <Text as="h1" variant="primary" className="text-2xl font-bold">
          Create Program
        </Text>
        <Text variant="secondary" className="text-sm mt-1">
          Build a program with weeks, days, sections, and exercises. Once you
          create a program, it is sent to admin for approval. After approval, it
          will appear in the Program Browser for athletes.
        </Text>
      </div>

      <div className="bg-white rounded-lg border border-mid-gray p-6 space-y-6">
        <div>
          <Text variant="default" className="text-sm font-medium block mb-1">
            Select cycle *
          </Text>
          <Dropdown
            value={selectedCycleId ? String(selectedCycleId) : ''}
            onValueChange={v => setSelectedCycleId(v ? Number(v) : undefined)}
            options={cycles.map(c => ({ value: String(c.id), label: c.name }))}
            placeholder={loadingCycles ? 'Loading...' : 'Select cycle'}
            disabled={loadingCycles}
          />
        </div>

        {selectedCycleId ? (
          <ProgramBuilderForm
            initialCycleId={selectedCycleId}
            onSuccess={handleSuccess}
            onCancel={handleCancel}
          />
        ) : (
          <div className="text-center py-8 text-gray-500 text-sm">
            Select a cycle above to build your program.
          </div>
        )}
      </div>
    </div>
  )
}

export default Program
