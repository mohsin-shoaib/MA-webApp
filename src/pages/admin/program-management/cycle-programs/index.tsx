import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Stack } from '@/components/Stack'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { DataTable, type Column } from '@/components/DataTable'
import { Modal } from '@/components/Modal'
import { Tooltip } from '@/components/Tooltip'
import { Dropdown } from '@/components/Dropdown'
import { ProgramForm } from '@/components/Program/ProgramForm'
import { ProgramBuilderForm } from '@/components/Program/ProgramBuilderForm'
import { adminService } from '@/api/admin.service'
import { programService } from '@/api/program.service'
import { goalTypeService } from '@/api/goal-type.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { Cycle } from '@/types/cycle'
import type { Program } from '@/types/program'
import type { GoalType } from '@/types/goal-type' // used for goalTypes state and filter options
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
  const [goalTypes, setGoalTypes] = useState<GoalType[]>([])
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterSubCategory, setFilterSubCategory] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'draft' | 'published'
  >('all')
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

  const fetchGoalTypes = useCallback(async () => {
    try {
      const res = await goalTypeService.getAll({ limit: 100 })
      setGoalTypes(res.data.data?.rows || [])
    } catch {
      setGoalTypes([])
    }
  }, [])

  // Fetch programs for the cycle (Phase 5: with filters)
  const fetchPrograms = useCallback(async () => {
    if (!cycleId) {
      showError('Cycle ID is required')
      navigate('/admin/program-management')
      return
    }

    try {
      setLoading(true)
      const query: Parameters<typeof programService.getAll>[0] = {
        cycleId: Number(cycleId),
        limit: 100,
      }
      if (filterCategory) query.category = filterCategory
      if (filterSubCategory) query.subCategory = filterSubCategory
      if (filterStatus === 'draft') query.isPublished = false
      if (filterStatus === 'published') query.isPublished = true
      const response = await programService.getAll(query)
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
  }, [
    cycleId,
    navigate,
    showError,
    filterCategory,
    filterSubCategory,
    filterStatus,
  ])

  useEffect(() => {
    fetchCycleName()
    fetchGoalTypes()
  }, [fetchCycleName, fetchGoalTypes])

  useEffect(() => {
    fetchPrograms()
  }, [fetchPrograms])

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

  const handleEditProgram = async (program: Program) => {
    try {
      // Fetch full program with programStructure (from normalized DB) for builder
      const response = await programService.getById(program.id)
      const fullProgram = response.data?.data ?? program
      setEditingProgram(fullProgram as Program)
      setIsEditModalOpen(true)
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      showError(
        axiosError.response?.data?.message ?? 'Failed to load program details'
      )
    }
  }

  const handleCloseEditModal = () => {
    setIsEditModalOpen(false)
    setEditingProgram(null)
  }

  const handleApproveProgram = async (program: Program) => {
    try {
      await programService.publish(program.id)
      showSuccess(
        'Program approved and published. It will now appear in the Program Browser.'
      )
      fetchPrograms()
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>
      showError(
        axiosError.response?.data?.message ?? 'Failed to approve program'
      )
    }
  }

  // Amber cycle (id 2) allows only one program
  const isAmberCycle = cycleId === '2'
  const isAmberLimitReached = isAmberCycle && programs.length >= 1

  // Define table columns
  const columns: Column<Program>[] = [
    {
      key: 'id',
      label: 'Sr No',
      sortable: false,
      width: '80px',
      render: (_value, _row, index) => (
        <Text variant="default" className="font-medium">
          {index + 1}
        </Text>
      ),
    },
    {
      key: 'name',
      label: 'Name',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center gap-1.5">
          <Text variant="default" className="font-medium">
            {(value as string) || '-'}
          </Text>
          <Tooltip content={row.description ?? 'No description'}>
            <span className="inline-flex text-gray-500 cursor-help">
              <Icon name="circle-info" family="solid" size={16} />
            </span>
          </Tooltip>
        </div>
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
      key: 'subCategory',
      label: 'Goal',
      sortable: true,
      render: value => (
        <Text variant="default" className="text-sm">
          {(value as string) || '-'}
        </Text>
      ),
    },
    {
      key: 'isPublished',
      label: 'Status',
      sortable: false,
      width: '140px',
      render: (_value, row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            row.isPublished
              ? 'bg-green-100 text-green-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {row.isPublished ? 'Published' : 'Pending approval'}
        </span>
      ),
    },
    {
      key: 'createdByUser',
      label: 'Created by',
      sortable: false,
      render: (_value, row) => {
        const u = (
          row as {
            createdByUser?: {
              firstName?: string
              lastName?: string
              email?: string
            }
          }
        ).createdByUser
        if (!u) return <Text variant="muted">—</Text>
        const name = [u.firstName, u.lastName].filter(Boolean).join(' ').trim()
        return (
          <Text variant="default" className="text-sm">
            {name || u.email || '—'}
          </Text>
        )
      },
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'center',
      width: '180px',
      render: (_value, row) => (
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {!row.isPublished && (
            <Button
              variant="primary"
              size="small"
              onClick={() => handleApproveProgram(row)}
              leftIcon={<Icon name="check" family="solid" size={14} />}
            >
              Approve
            </Button>
          )}
          <Button
            variant="outline"
            size="small"
            onClick={() => handleEditProgram(row)}
            leftIcon={<Icon name="edit" family="solid" size={14} />}
          >
            Update
          </Button>
        </div>
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
          {isAmberLimitReached ? (
            <Tooltip content="Amber program only support default program">
              <span className="inline-block cursor-not-allowed">
                <Button
                  variant="primary"
                  leftIcon={<Icon name="plus" family="solid" size={16} />}
                  disabled
                >
                  Create Program
                </Button>
              </span>
            </Tooltip>
          ) : (
            <Button
              variant="primary"
              leftIcon={<Icon name="plus" family="solid" size={16} />}
              onClick={handleCreateProgram}
            >
              Create Program
            </Button>
          )}
        </div>

        {/* Phase 5: List filters */}
        <div className="flex flex-wrap items-end gap-3 mb-4">
          <div className="min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal (category)
            </label>
            <Dropdown
              placeholder="All"
              value={filterCategory}
              onValueChange={v => {
                setFilterCategory(Array.isArray(v) ? (v[0] ?? '') : (v ?? ''))
                setFilterSubCategory('')
              }}
              options={[
                ...new Set(goalTypes.map(g => g.category).filter(Boolean)),
              ].map(c => ({ value: c!, label: c! }))}
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Goal type
            </label>
            <Dropdown
              placeholder="All"
              value={filterSubCategory}
              onValueChange={v =>
                setFilterSubCategory(
                  Array.isArray(v) ? (v[0] ?? '') : (v ?? '')
                )
              }
              options={goalTypes
                .filter(g => !filterCategory || g.category === filterCategory)
                .map(g => ({ value: g.subCategory, label: g.subCategory }))}
              disabled={!filterCategory}
            />
          </div>
          <div className="min-w-[120px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <Dropdown
              placeholder="All"
              value={filterStatus}
              onValueChange={v =>
                setFilterStatus(
                  (Array.isArray(v) ? v[0] : v) as 'all' | 'draft' | 'published'
                )
              }
              options={[
                { value: 'all', label: 'All' },
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
              ]}
            />
          </div>
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
              <ProgramBuilderForm
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
              {editingProgram.programStructure?.weeks?.length ? (
                <ProgramBuilderForm
                  initialCycleId={cycleId ? Number(cycleId) : undefined}
                  program={editingProgram}
                  onSuccess={handleFormSuccess}
                  onCancel={handleCloseEditModal}
                />
              ) : (
                <ProgramForm
                  initialCycleId={cycleId ? Number(cycleId) : undefined}
                  program={editingProgram}
                  onSuccess={handleFormSuccess}
                  onCancel={handleCloseEditModal}
                />
              )}
            </div>
          </Modal>
        )}
      </Stack>
    </div>
  )
}

export default CyclePrograms
