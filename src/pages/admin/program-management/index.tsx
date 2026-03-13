import { useState, useEffect, useCallback } from 'react'
import { createPortal } from 'react-dom'
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
import type { Program } from '@/types/program'
import {
  CATEGORY_LABELS,
  type Category,
  type GoalType,
} from '@/types/goal-type'
import type { User } from '@/types/admin'
import { AxiosError } from 'axios'

const CYCLE_OPTIONS = [
  { value: '', label: 'All cycles' },
  { value: '1', label: 'Red' },
  { value: '2', label: 'Amber' },
  { value: '3', label: 'Green' },
  { value: '4', label: 'Sustainment' },
  { value: '5', label: 'Custom (1:1)' },
]

/**
 * Admin Program Management — direct list of all programs with Create program at top.
 */
const AdminProgramManagement = () => {
  const [programs, setPrograms] = useState<Program[]>([])
  const [loading, setLoading] = useState(true)
  const [filterCycleId, setFilterCycleId] = useState<string>('')
  const [filterCategory, setFilterCategory] = useState<string>('')
  const [filterStatus, setFilterStatus] = useState<
    'all' | 'draft' | 'published'
  >('all')
  const [goalTypes, setGoalTypes] = useState<GoalType[]>([])
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  const [assignRedOpen, setAssignRedOpen] = useState(false)
  const [assignRedProgram, setAssignRedProgram] = useState<Program | null>(null)
  const [assignRedUserId, setAssignRedUserId] = useState<number | null>(null)
  const [assignRedStartDate, setAssignRedStartDate] = useState(() =>
    new Date().toISOString().slice(0, 10)
  )
  const [assignCustomOpen, setAssignCustomOpen] = useState(false)
  const [assignCustomProgram, setAssignCustomProgram] =
    useState<Program | null>(null)
  const [assignCustomUserId, setAssignCustomUserId] = useState<number | null>(
    null
  )
  const [assignCustomEndDate, setAssignCustomEndDate] = useState('')
  const [athletes, setAthletes] = useState<User[]>([])
  const [assignRedLoading, setAssignRedLoading] = useState(false)
  const [assignCustomLoading, setAssignCustomLoading] = useState(false)
  const { showError, showSuccess } = useSnackbar()
  const [openActionsMenuId, setOpenActionsMenuId] = useState<number | null>(
    null
  )
  const [actionsMenuPosition, setActionsMenuPosition] = useState<{
    top: number
    left: number
  } | null>(null)

  const hasActiveFilters =
    filterCycleId !== '' || filterCategory !== '' || filterStatus !== 'all'

  const clearFilters = () => {
    setFilterCycleId('')
    setFilterCategory('')
    setFilterStatus('all')
  }

  const fetchGoalTypes = useCallback(async () => {
    try {
      const res = await goalTypeService.getAll({ limit: 100 })
      setGoalTypes(res.data.data?.rows || [])
    } catch {
      setGoalTypes([])
    }
  }, [])

  const fetchPrograms = useCallback(async () => {
    try {
      setLoading(true)
      const query: Parameters<typeof programService.getAll>[0] = { limit: 500 }
      if (filterCycleId) query.cycleId = Number(filterCycleId)
      if (filterCategory) query.category = filterCategory
      if (filterStatus === 'draft') query.isPublished = false
      if (filterStatus === 'published') query.isPublished = true
      const response = await programService.getAll(query)
      setPrograms(response.data.data?.rows || [])
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>
      showError(
        axiosError.response?.data?.message ?? 'Failed to load programs.'
      )
      setPrograms([])
    } finally {
      setLoading(false)
    }
  }, [filterCycleId, filterCategory, filterStatus, showError])

  useEffect(() => {
    fetchGoalTypes()
  }, [fetchGoalTypes])

  useEffect(() => {
    fetchPrograms()
  }, [fetchPrograms])

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

  const handleCreateProgram = () => setIsCreateModalOpen(true)
  const handleCloseCreateModal = () => setIsCreateModalOpen(false)

  const handleFormSuccess = async (createdProgram?: Program | null) => {
    if (createdProgram?.id) {
      setIsCreateModalOpen(false)
      try {
        const response = await programService.getById(createdProgram.id)
        const fullProgram = response.data?.data ?? createdProgram
        setEditingProgram(fullProgram)
        setIsEditModalOpen(true)
      } catch {
        setEditingProgram(null)
      }
      showSuccess('Program created successfully!')
    } else {
      setIsCreateModalOpen(false)
      setIsEditModalOpen(false)
      setEditingProgram(null)
      showSuccess(
        editingProgram
          ? 'Program updated successfully!'
          : 'Program created successfully!'
      )
    }
    fetchPrograms()
  }

  const handleEditProgram = async (program: Program) => {
    try {
      const response = await programService.getById(program.id)
      const fullProgram = response.data?.data ?? program
      setEditingProgram(fullProgram)
      setIsEditModalOpen(true)
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>
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
      showSuccess('Program approved and published.')
      fetchPrograms()
    } catch (error) {
      const axiosError = error as AxiosError<{ message?: string }>
      showError(
        axiosError.response?.data?.message ?? 'Failed to approve program'
      )
    }
  }

  const openAssignRed = (program: Program) => {
    setAssignRedProgram(program)
    setAssignRedUserId(null)
    setAssignRedStartDate(new Date().toISOString().slice(0, 10))
    setAssignRedOpen(true)
  }

  const openAssignCustom = (program: Program) => {
    setAssignCustomProgram(program)
    setAssignCustomUserId(
      ((program as Record<string, unknown>).assignedToUserId as
        | number
        | undefined) ?? null
    )
    setAssignCustomEndDate('')
    setAssignCustomOpen(true)
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
      showSuccess('Red program assigned.')
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
      showSuccess('Custom program assigned.')
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

  const cycleNameForRow = (row: Program) => {
    const cycleType = (row as { cycleType?: string }).cycleType
    if (cycleType) {
      const map: Record<string, string> = {
        RED: 'Red',
        AMBER: 'Amber',
        GREEN: 'Green',
        SUSTAINMENT: 'Sustainment',
        CUSTOM: 'Custom (1:1)',
      }
      return map[cycleType] ?? cycleType
    }
    const c = (row as { cycle?: { name?: string } }).cycle
    return c?.name ?? '—'
  }

  const columns: Column<Program>[] = [
    {
      key: 'id',
      label: '#',
      sortable: false,
      width: '50px',
      render: (_value, _row, index) => (
        <Text variant="secondary" className="text-sm">
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
            {(value as string) || '—'}
          </Text>
          {row.description && (
            <Tooltip content={row.description}>
              <span className="inline-flex text-gray-500 cursor-help">
                <Icon name="circle-info" family="solid" size={16} />
              </span>
            </Tooltip>
          )}
        </div>
      ),
    },
    {
      key: 'cycleType',
      label: 'Cycle',
      sortable: false,
      width: '110px',
      render: (_value, row) => (
        <Text variant="default" className="text-sm">
          {cycleNameForRow(row)}
        </Text>
      ),
    },
    {
      key: 'category',
      label: 'Category',
      sortable: true,
      render: value => (
        <Text variant="default" className="text-sm">
          {value
            ? (CATEGORY_LABELS[value as Category] ?? (value as string))
            : '—'}
        </Text>
      ),
    },
    {
      key: 'subCategory',
      label: 'Goal / Sub',
      sortable: true,
      render: value => (
        <Text variant="default" className="text-sm">
          {(value as string) || '—'}
        </Text>
      ),
    },
    {
      key: 'isPublished',
      label: 'Status',
      sortable: false,
      width: '130px',
      render: (_value, row) => (
        <span
          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
            row.isPublished
              ? 'bg-green-100 text-green-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {row.isPublished ? 'Published' : 'Draft'}
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
                  Publish
                </button>
              )}
              {(openActionsRow as { cycleType?: string }).cycleType ===
                'RED' && (
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
              {(openActionsRow as { cycleType?: string }).cycleType ===
                'CUSTOM' && (
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
                Edit
              </button>
            </div>
          </>,
          document.body
        )}
      <Stack direction="vertical" spacing={6}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Text as="h1" variant="primary" className="text-2xl font-bold">
              Program Management
            </Text>
            <Text variant="secondary" className="text-sm mt-0.5">
              Create and manage programs. Filter by cycle, category, or status.
            </Text>
          </div>
          <Button
            variant="primary"
            size="medium"
            onClick={handleCreateProgram}
            leftIcon={<Icon name="plus" family="solid" size={18} />}
          >
            Create program
          </Button>
        </div>

        {/* Filters — single line, compact (match Exercise page) */}
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="w-40">
            <Dropdown
              label="Cycle"
              placeholder="All cycles"
              value={filterCycleId}
              onValueChange={v => setFilterCycleId((v as string) ?? '')}
              options={CYCLE_OPTIONS}
              size="small"
              fullWidth
            />
          </div>
          <div className="w-48">
            <Dropdown
              label="Category"
              placeholder="All"
              value={filterCategory}
              onValueChange={v => setFilterCategory((v as string) ?? '')}
              options={[
                { value: '', label: 'All' },
                ...[
                  ...new Set(goalTypes.map(g => g.category).filter(Boolean)),
                ].map(c => ({
                  value: c as string,
                  label: (CATEGORY_LABELS as Record<string, string>)[c] ?? c,
                })),
              ]}
              size="small"
              fullWidth
            />
          </div>
          <div className="w-32">
            <Dropdown
              label="Status"
              placeholder="All"
              value={filterStatus}
              onValueChange={v =>
                setFilterStatus((v as 'all' | 'draft' | 'published') ?? 'all')
              }
              options={[
                { value: 'all', label: 'All' },
                { value: 'draft', label: 'Draft' },
                { value: 'published', label: 'Published' },
              ]}
              size="small"
              fullWidth
            />
          </div>
          {hasActiveFilters && (
            <Button variant="outline" size="small" onClick={clearFilters}>
              Clear filters
            </Button>
          )}
        </div>

        <div className="bg-white rounded-lg border border-mid-gray p-6">
          <DataTable<Program>
            data={programs}
            columns={columns}
            loading={loading}
            rowKey="id"
            emptyMessage="No programs found. Click 'Create program' to add one."
          />
        </div>

        {isCreateModalOpen && (
          <Modal
            visible={isCreateModalOpen}
            onClose={handleCloseCreateModal}
            title="Create program"
            size="fullscreen"
            showCloseButton
          >
            <div className="p-6">
              <ProgramBuilderForm
                onSuccess={handleFormSuccess}
                onCancel={handleCloseCreateModal}
              />
            </div>
          </Modal>
        )}

        {isEditModalOpen && editingProgram && (
          <Modal
            visible={isEditModalOpen}
            onClose={handleCloseEditModal}
            title="Update program"
            size="fullscreen"
            showCloseButton
          >
            <div className="p-6">
              <ProgramBuilderForm
                program={editingProgram}
                onSuccess={handleFormSuccess}
                onCancel={handleCloseEditModal}
              />
            </div>
          </Modal>
        )}

        {assignRedOpen && assignRedProgram && (
          <Modal
            visible={assignRedOpen}
            onClose={() => {
              setAssignRedOpen(false)
              setAssignRedProgram(null)
              setAssignRedUserId(null)
            }}
            title="Assign Red program"
            showCloseButton
          >
            <div className="p-6 space-y-4">
              <Text variant="default" className="font-medium">
                {assignRedProgram.name}
              </Text>
              <Dropdown
                label="Athlete"
                placeholder="Select athlete"
                value={assignRedUserId == null ? '' : String(assignRedUserId)}
                onValueChange={v => setAssignRedUserId(v ? Number(v) : null)}
                options={athletes.map(a => ({
                  value: String(a.id),
                  label:
                    [a.firstName, a.lastName].filter(Boolean).join(' ') ||
                    a.email ||
                    String(a.id),
                }))}
              />
              <Input
                label="Start date"
                type="date"
                value={assignRedStartDate}
                onChange={e => setAssignRedStartDate(e.target.value)}
              />
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
                  {assignRedLoading ? 'Assigning…' : 'Assign'}
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {assignCustomOpen && assignCustomProgram && (
          <Modal
            visible={assignCustomOpen}
            onClose={() => {
              setAssignCustomOpen(false)
              setAssignCustomProgram(null)
              setAssignCustomUserId(null)
            }}
            title="Assign Custom (1:1) program"
            showCloseButton
          >
            <div className="p-6 space-y-4">
              <Text variant="default" className="font-medium">
                {assignCustomProgram.name}
              </Text>
              <Dropdown
                label="Athlete"
                placeholder="Select athlete"
                value={
                  assignCustomUserId == null ? '' : String(assignCustomUserId)
                }
                onValueChange={v => setAssignCustomUserId(v ? Number(v) : null)}
                options={athletes.map(a => ({
                  value: String(a.id),
                  label:
                    [a.firstName, a.lastName].filter(Boolean).join(' ') ||
                    a.email ||
                    String(a.id),
                }))}
              />
              <Input
                label="End date (optional)"
                type="date"
                value={assignCustomEndDate}
                onChange={e => setAssignCustomEndDate(e.target.value)}
              />
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
                  {assignCustomLoading ? 'Assigning…' : 'Assign'}
                </Button>
              </div>
            </div>
          </Modal>
        )}
      </Stack>
    </div>
  )
}

export default AdminProgramManagement
