import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { useParams, useNavigate } from 'react-router-dom'
import { Text } from '@/components/Text'
import { Stack } from '@/components/Stack'
import { Button } from '@/components/Button'
import { Icon } from '@/components/Icon'
import { DataTable, type Column } from '@/components/DataTable'
import { Modal } from '@/components/Modal'
import { Tooltip } from '@/components/Tooltip'
import { Dropdown } from '@/components/Dropdown'
import { Input } from '@/components/Input'
import { ProgramBuilderForm } from '@/components/Program/ProgramBuilderForm'
import { adminService } from '@/api/admin.service'
import { programService } from '@/api/program.service'
import { goalTypeService } from '@/api/goal-type.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import type { Cycle } from '@/types/cycle'
import type { Program } from '@/types/program'
import type { GoalType } from '@/types/goal-type' // used for goalTypes state and filter options
import type { User } from '@/types/admin'
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
  // Red Cycle (3.1): Assign Red program to athlete
  const [assignRedOpen, setAssignRedOpen] = useState(false)
  const [assignRedProgram, setAssignRedProgram] = useState<Program | null>(null)
  const [assignRedUserId, setAssignRedUserId] = useState<number | null>(null)
  const [assignRedStartDate, setAssignRedStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [athletes, setAthletes] = useState<User[]>([])
  const [assignRedLoading, setAssignRedLoading] = useState(false)
  // 3.5 Custom / 1:1: Assign or reassign custom program to athlete
  const [assignCustomOpen, setAssignCustomOpen] = useState(false)
  const [assignCustomProgram, setAssignCustomProgram] =
    useState<Program | null>(null)
  const [assignCustomUserId, setAssignCustomUserId] = useState<number | null>(
    null
  )
  const [assignCustomEndDate, setAssignCustomEndDate] = useState('')
  const [assignCustomLoading, setAssignCustomLoading] = useState(false)
  const [openActionsMenuId, setOpenActionsMenuId] = useState<number | null>(
    null
  )
  const [actionsMenuPosition, setActionsMenuPosition] = useState<{
    top: number
    left: number
  } | null>(null)

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

  const handleFormSuccess = async (createdProgram?: Program | null) => {
    if (createdProgram?.id) {
      // Land on Calendar: close create modal, fetch full program, open edit modal
      setIsCreateModalOpen(false)
      try {
        const response = await programService.getById(createdProgram.id)
        const fullProgram = response.data?.data ?? createdProgram
        setEditingProgram(fullProgram as Program)
        setIsEditModalOpen(true)
      } catch {
        setEditingProgram(null)
      }
      showSuccess('Program created successfully!')
      fetchPrograms()
      return
    }
    setIsCreateModalOpen(false)
    setIsEditModalOpen(false)
    setEditingProgram(null)
    showSuccess(
      editingProgram
        ? 'Program updated successfully!'
        : 'Program created successfully!'
    )
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
  const isRedCycle = cycleName === 'Red'
  const isCustomCycle = cycleName === 'Custom'

  const openAssignRed = (program: Program) => {
    setAssignRedProgram(program)
    setAssignRedUserId(null)
    setAssignRedStartDate(new Date().toISOString().slice(0, 10))
    setAssignRedOpen(true)
  }

  useEffect(() => {
    if (assignRedOpen || assignCustomOpen) {
      adminService
        .getUsers()
        .then(res => {
          const rows = res.data?.data?.rows ?? []
          setAthletes(rows.filter((u: User) => u.role === 'ATHLETE'))
        })
        .catch(() => setAthletes([]))
    }
  }, [assignRedOpen, assignCustomOpen])

  const openAssignCustom = (program: Program) => {
    setAssignCustomProgram(program)
    setAssignCustomUserId(
      (program as { assignedToUserId?: number })?.assignedToUserId ?? null
    )
    setAssignCustomEndDate('')
    setAssignCustomOpen(true)
  }

  const handleAssignCustomSubmit = async () => {
    if (!assignCustomProgram || assignCustomUserId == null) {
      showError('Select an athlete')
      return
    }
    setAssignCustomLoading(true)
    try {
      await programService.assignCustomProgram(assignCustomProgram.id, {
        userId: assignCustomUserId,
        endDate: assignCustomEndDate.trim() || undefined,
      })
      showSuccess(
        'Custom program assigned. Athlete will see it until end date or resume.'
      )
      setAssignCustomOpen(false)
      setAssignCustomProgram(null)
      setAssignCustomUserId(null)
      fetchPrograms()
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>
      showError(axiosErr.response?.data?.message ?? 'Failed to assign program')
    } finally {
      setAssignCustomLoading(false)
    }
  }

  const handleAssignRedSubmit = async () => {
    if (!assignRedProgram || assignRedUserId == null) {
      showError('Select an athlete')
      return
    }
    setAssignRedLoading(true)
    try {
      await programService.assignRedProgram(assignRedProgram.id, {
        userId: assignRedUserId,
        startDate: assignRedStartDate || undefined,
      })
      showSuccess('Red program assigned. Start and end dates set.')
      setAssignRedOpen(false)
      setAssignRedProgram(null)
      setAssignRedUserId(null)
      fetchPrograms()
    } catch (err) {
      const axiosErr = err as AxiosError<{ message?: string }>
      showError(axiosErr.response?.data?.message ?? 'Failed to assign program')
    } finally {
      setAssignRedLoading(false)
    }
  }

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
    ...(isCustomCycle
      ? [
          {
            key: 'assignedToUser',
            label: 'Assigned to',
            sortable: false,
            render: (_value: unknown, row: Program) => {
              const u = (
                row as {
                  assignedToUser?: {
                    firstName?: string
                    lastName?: string
                    email?: string
                  }
                }
              ).assignedToUser
              if (!u) return <Text variant="muted">—</Text>
              const name = [u.firstName, u.lastName]
                .filter(Boolean)
                .join(' ')
                .trim()
              return (
                <Text variant="default" className="text-sm">
                  {name || u.email || '—'}
                </Text>
              )
            },
          },
        ]
      : []),
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'center',
      width: '80px',
      render: (_value, row: Program) => {
        const isMenuOpen = openActionsMenuId === row.id
        return (
          <div className="flex items-center justify-center">
            <button
              type="button"
              className="inline-flex h-8 w-8 items-center justify-center rounded-full hover:bg-gray-100 text-gray-600"
              aria-label="Program actions"
              onClick={e => {
                e.stopPropagation()
                if (isMenuOpen) {
                  setOpenActionsMenuId(null)
                  setActionsMenuPosition(null)
                } else {
                  const rect = (e.target as HTMLElement).getBoundingClientRect()
                  setActionsMenuPosition({
                    top: rect.bottom + 4,
                    left: Math.min(rect.right - 180, window.innerWidth - 200),
                  })
                  setOpenActionsMenuId(row.id)
                }
              }}
            >
              <Icon name="ellipsis-vertical" family="solid" size={14} />
            </button>
          </div>
        )
      },
    },
  ]

  const openActionsRow =
    openActionsMenuId != null
      ? programs.find(p => p.id === openActionsMenuId)
      : null
  const closeActionsMenu = () => {
    setOpenActionsMenuId(null)
    setActionsMenuPosition(null)
  }

  return (
    <div className="p-6">
      {actionsMenuPosition != null &&
        openActionsRow != null &&
        createPortal(
          <>
            <div
              className="fixed inset-0 z-[100]"
              aria-hidden
              onClick={closeActionsMenu}
            />
            <div
              className="fixed z-[101] min-w-[180px] rounded-lg border border-gray-200 bg-white py-1 shadow-lg"
              style={{
                top: actionsMenuPosition.top,
                left: actionsMenuPosition.left,
              }}
            >
              {!openActionsRow.isPublished && (
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                  onClick={e => {
                    e.stopPropagation()
                    closeActionsMenu()
                    handleApproveProgram(openActionsRow)
                  }}
                >
                  Approve
                </button>
              )}
              {isRedCycle && (
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                  onClick={e => {
                    e.stopPropagation()
                    closeActionsMenu()
                    openAssignRed(openActionsRow)
                  }}
                >
                  Assign Red
                </button>
              )}
              {isCustomCycle && (
                <button
                  type="button"
                  className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                  onClick={e => {
                    e.stopPropagation()
                    closeActionsMenu()
                    openAssignCustom(openActionsRow)
                  }}
                >
                  Assign
                </button>
              )}
              <button
                type="button"
                className="w-full px-3 py-1.5 text-left text-sm hover:bg-gray-100"
                onClick={e => {
                  e.stopPropagation()
                  closeActionsMenu()
                  handleEditProgram(openActionsRow)
                }}
              >
                Update
              </button>
            </div>
          </>,
          document.body
        )}
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
              <ProgramBuilderForm
                initialCycleId={cycleId ? Number(cycleId) : undefined}
                program={editingProgram}
                onSuccess={handleFormSuccess}
                onCancel={handleCloseEditModal}
              />
            </div>
          </Modal>
        )}

        {/* 3.1 Red: Assign Red program to athlete */}
        {assignRedOpen && assignRedProgram && (
          <Modal
            visible={assignRedOpen}
            onClose={() => {
              setAssignRedOpen(false)
              setAssignRedProgram(null)
              setAssignRedUserId(null)
            }}
            title="Assign Red Program"
            showCloseButton={true}
          >
            <div className="p-6 space-y-4">
              <Text variant="default" className="font-medium">
                {assignRedProgram.name}
              </Text>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Athlete
                </label>
                <Dropdown
                  placeholder="Select athlete"
                  value={assignRedUserId != null ? String(assignRedUserId) : ''}
                  onValueChange={v => setAssignRedUserId(v ? Number(v) : null)}
                  options={athletes.map(a => ({
                    value: String(a.id),
                    label:
                      [a.firstName, a.lastName].filter(Boolean).join(' ') ||
                      a.email ||
                      String(a.id),
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start date
                </label>
                <Input
                  type="date"
                  value={assignRedStartDate}
                  onChange={e => setAssignRedStartDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setAssignRedOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={assignRedUserId == null || assignRedLoading}
                  onClick={handleAssignRedSubmit}
                >
                  {assignRedLoading ? 'Assigning...' : 'Assign'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* 3.5 Custom: Assign or reassign custom program to athlete */}
        {assignCustomOpen && assignCustomProgram && (
          <Modal
            visible={assignCustomOpen}
            onClose={() => {
              setAssignCustomOpen(false)
              setAssignCustomProgram(null)
              setAssignCustomUserId(null)
              setAssignCustomEndDate('')
            }}
            title="Assign Custom Program (1:1)"
            showCloseButton={true}
          >
            <div className="p-6 space-y-4">
              <Text variant="default" className="font-medium">
                {assignCustomProgram.name}
              </Text>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Athlete
                </label>
                <Dropdown
                  placeholder="Select athlete"
                  value={
                    assignCustomUserId != null ? String(assignCustomUserId) : ''
                  }
                  onValueChange={v =>
                    setAssignCustomUserId(v ? Number(v) : null)
                  }
                  options={athletes.map(a => ({
                    value: String(a.id),
                    label:
                      [a.firstName, a.lastName].filter(Boolean).join(' ') ||
                      a.email ||
                      String(a.id),
                  }))}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End date (optional)
                </label>
                <Input
                  type="date"
                  value={assignCustomEndDate}
                  onChange={e => setAssignCustomEndDate(e.target.value)}
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => setAssignCustomOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  disabled={assignCustomUserId == null || assignCustomLoading}
                  onClick={handleAssignCustomSubmit}
                >
                  {assignCustomLoading ? 'Assigning...' : 'Assign'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </Stack>
    </div>
  )
}

export default CyclePrograms
