import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Stack } from '@/components/Stack'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { DataTable, type Column } from '@/components/DataTable'
import { Modal } from '@/components/Modal'
import { ProgramForm } from '@/components/Program/ProgramForm'
import { adminService } from '@/api/admin.service'
import { programService } from '@/api/program.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { Cycle } from '@/types/cycle'
import type { Program } from '@/types/program'
import { AxiosError } from 'axios'

/**
 * Cycle Programs Page
 *
 * Displays programs for a specific cycle.
 * Cycle ID is passed via route params.
 */
const CyclePrograms = () => {
  const { cycleId } = useParams<{ cycleId: string }>()
  const navigate = useNavigate()
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [cycleName, setCycleName] = useState<string>('')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  const { showError, showSuccess } = useSnackbar()

  // Fetch cycle name
  const fetchCycleName = useCallback(async () => {
    if (!cycleId) return

    try {
      const response = await adminService.getCycles()
      const cycles = response.data.data || []
      const cycle = cycles.find((c: Cycle) => c.id === Number(cycleId))
      if (cycle) {
        setCycleName(cycle.name)
      }
    } catch (error) {
      // Silently fail - just won't show cycle name
      console.error('Failed to fetch cycle name:', error)
    }
  }, [cycleId])

  // Fetch programs for the cycle
  const fetchPrograms = useCallback(async () => {
    if (!cycleId) {
      showError('Cycle ID is required')
      navigate('/admin/program-management')
      return
    }

    try {
      setLoading(true)
      // Fetch programs for the specific cycle
      const response = await programService.getAll({ cycleId: Number(cycleId) })
      setPrograms(response.data.data.rows || [])
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message ||
        'Failed to load programs. Please try again.'
      showError(errorMessage)
      setPrograms([])
    } finally {
      setLoading(false)
    }
  }, [cycleId, navigate, showError])

  useEffect(() => {
    fetchCycleName()
    fetchPrograms()
  }, [fetchCycleName, fetchPrograms])

  const handleBack = () => {
    navigate('/admin/program-management')
  }

  const handleCreateProgram = () => {
    setIsCreateModalOpen(true)
  }

  const handleCloseModal = () => {
    setIsCreateModalOpen(false)
  }

  const handleFormSuccess = () => {
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setEditingProgram(null)
    showSuccess(
      editingProgram
        ? 'Program updated successfully!'
        : 'Program created successfully!'
    )
    // Refresh programs list
    fetchPrograms()
  }

  const handleEditProgram = (program: Program) => {
    setEditingProgram(program)
    setIsEditModalOpen(true)
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingProgram(null)
  }

  // Define table columns
  const columns: Column<Program>[] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: '80px',
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: value => (
        <Text variant="default" className="font-medium">
          {(value as string) || '-'}
        </Text>
      ),
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      render: value => (
        <Text variant="secondary" className="text-sm">
          {(value as string) || '-'}
        </Text>
      ),
    },
    {
      key: 'category',
      label: 'Goal Type',
      sortable: true,
      render: value => (
        <Text variant="default" className="text-sm">
          {(value as string) || '-'}
        </Text>
      ),
    },
    {
      key: 'isActive',
      label: 'Status',
      sortable: true,
      align: 'center',
      render: value => (
        <Text
          variant={value ? 'success' : 'muted'}
          className="text-sm font-medium"
        >
          {value ? 'Active' : 'Inactive'}
        </Text>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'center',
      width: '120px',
      render: (_value, row) => (
        <Button
          variant="outline"
          size="small"
          onClick={() => handleEditProgram(row)}
          leftIcon={<Icon name="edit" family="solid" size={14} />}
        >
          Update
        </Button>
      ),
    },
  ]

  return (
    <div className="p-6">
      <Stack direction="vertical" spacing={6}>
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="small"
              leftIcon={<Icon name="arrow-left" family="solid" size={16} />}
              onClick={handleBack}
            >
              Back
            </Button>
            <div>
              <Text as="h1" variant="primary" className="text-2xl font-bold">
                {cycleName || 'Programs'}
              </Text>
              <Text variant="secondary" className="text-sm mt-1">
                View and manage programs for this cycle
              </Text>
            </div>
          </div>
          <Button
            variant="primary"
            leftIcon={<Icon name="plus" family="solid" size={16} />}
            onClick={handleCreateProgram}
          >
            Create Program
          </Button>
        </div>

        {/* Content Area */}
        <div className="bg-white rounded-lg border border-mid-gray p-6">
          <DataTable<Program>
            data={programs}
            columns={columns}
            loading={loading}
            rowKey="id"
            emptyMessage="No programs found for this cycle. Click 'Create Program' to add one."
          />
        </div>

        {/* Create Program Modal */}
        {isCreateModalOpen && (
          <Modal
            visible={isCreateModalOpen}
            onClose={handleCloseModal}
            title="Create New Program"
            size="fullscreen"
            showCloseButton={true}
          >
            <div className="p-6">
              <ProgramForm
                initialCycleId={cycleId ? Number(cycleId) : undefined}
                onSuccess={handleFormSuccess}
                onCancel={handleCloseModal}
              />
            </div>
          </Modal>
        )}

        {/* Edit Program Modal */}
        {isEditModalOpen && editingProgram && (
          <Modal
            visible={isEditModalOpen}
            onClose={handleCloseEditModal}
            title="Update Program"
            size="fullscreen"
            showCloseButton={true}
          >
            <div className="p-6">
              <ProgramForm
                initialCycleId={cycleId ? Number(cycleId) : undefined}
                program={editingProgram}
                onSuccess={handleFormSuccess}
                onCancel={handleCloseEditModal}
              />
            </div>
          </Modal>
        )}
      </Stack>
    </div>
  )
}

export default CyclePrograms
