import { useState, useEffect, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Stack } from '@/components/Stack'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { Dropdown } from '@/components/Dropdown'
import { Input } from '@/components/Input'
import { DataTable, type Column } from '@/components/DataTable'
import { goalTypeService } from '@/api/goal-type.service'
import { useSnackbar } from '@/components/Snackbar/useSnackbar'
import { Category, type GoalType } from '@/types/goal-type'
import { AxiosError } from 'axios'
import { Icon } from '@/components/Icon'

const GoalTypes = () => {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isUpdateModalOpen, setIsUpdateModalOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [goalTypesList, setGoalTypesList] = useState<GoalType[]>([])
  const [goalInput, setGoalInput] = useState('')
  const [editingGoalType, setEditingGoalType] = useState<GoalType | null>(null)
  const [loadingGoalTypesList, setLoadingGoalTypesList] = useState(false)
  const [saving, setSaving] = useState(false)
  const [updating, setUpdating] = useState(false)
  const { showError, showSuccess } = useSnackbar()

  // Fetch all goal types
  const fetchGoalTypesList = useCallback(async () => {
    try {
      setLoadingGoalTypesList(true)
      const response = await goalTypeService.getAll({ limit: 100 })
      setGoalTypesList(response.data.data.rows || [])
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message ||
        'Failed to load goal types. Please try again.'
      showError(errorMessage)
      setGoalTypesList([])
    } finally {
      setLoadingGoalTypesList(false)
    }
  }, [showError])

  // Ensure modals are closed on mount/refresh
  useEffect(() => {
    setIsModalOpen(false)
    setIsUpdateModalOpen(false)
  }, [])

  useEffect(() => {
    fetchGoalTypesList()
  }, [fetchGoalTypesList])

  const handleOpenModal = () => {
    setIsModalOpen(true)
    // Reset form
    setSelectedCategory('')
    setGoalInput('')
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    // Reset form
    setSelectedCategory('')
    setGoalInput('')
  }

  const handleOpenUpdateModal = (goalType: GoalType) => {
    setEditingGoalType(goalType)
    setSelectedCategory(goalType.category)
    setGoalInput(goalType.subCategory)
    setIsUpdateModalOpen(true)
  }

  const handleCloseUpdateModal = () => {
    setIsUpdateModalOpen(false)
    setEditingGoalType(null)
    setSelectedCategory('')
    setGoalInput('')
  }

  const handleSave = async () => {
    if (!selectedCategory || !goalInput.trim()) {
      showError('Please fill in all required fields')
      return
    }

    try {
      setSaving(true)

      // Check if a GoalType already exists with this category and subcategory
      const goalTypesResponse = await goalTypeService.getAll({
        category: selectedCategory as Category,
        limit: 100,
      })

      const existingGoalType = goalTypesResponse.data.data.rows.find(
        gt => gt.subCategory.toLowerCase() === goalInput.trim().toLowerCase()
      )

      if (existingGoalType) {
        showError(
          'A goal type with this category and subcategory already exists'
        )
        return
      }

      // Create new GoalType
      await goalTypeService.create({
        category: selectedCategory as Category,
        subCategory: goalInput.trim(),
      })

      showSuccess('Goal type created successfully')
      handleCloseModal()
      fetchGoalTypesList() // Refresh the list
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message ||
        'Failed to create goal type. Please try again.'
      showError(errorMessage)
    } finally {
      setSaving(false)
    }
  }

  const handleUpdate = async () => {
    if (!editingGoalType || !goalInput.trim()) {
      showError('Please fill in all required fields')
      return
    }

    try {
      setUpdating(true)
      await goalTypeService.update(editingGoalType.id, {
        subCategory: goalInput.trim(),
      })
      showSuccess('Goal type updated successfully')
      handleCloseUpdateModal()
      fetchGoalTypesList() // Refresh the list
    } catch (error) {
      const axiosError = error as AxiosError<{ message: string }>
      const errorMessage =
        axiosError.response?.data?.message ||
        'Failed to update goal type. Please try again.'
      showError(errorMessage)
    } finally {
      setUpdating(false)
    }
  }

  const categoryOptions = [
    { value: Category.Selection, label: 'Selection' },
    { value: Category.School, label: 'School' },
    { value: Category.Competition, label: 'Competition' },
    { value: Category.Personal, label: 'Personal' },
  ]

  const columns: Column<GoalType>[] = [
    {
      key: 'id',
      label: 'ID',
      sortable: true,
      width: '80px',
    },
    {
      key: 'category',
      label: 'Goal Type',
      sortable: true,
      render: (_value, row) => (
        <Text variant="default" className="font-medium">
          {row.category}
        </Text>
      ),
    },
    {
      key: 'subCategory',
      label: 'Goal',
      sortable: true,
      render: (_value, row) => <Text variant="default">{row.subCategory}</Text>,
    },
    {
      key: 'description',
      label: 'Description',
      sortable: false,
      render: (_value, row) => (
        <Text variant="muted" className="text-sm">
          {row.description || '—'}
        </Text>
      ),
    },
    {
      key: 'actions',
      label: 'Actions',
      sortable: false,
      align: 'right',
      width: '120px',
      render: (_value, row) => (
        <Button
          variant="outline"
          size="small"
          onClick={() => handleOpenUpdateModal(row)}
          leftIcon={<Icon name="edit" family="solid" size={14} />}
        >
          Update
        </Button>
      ),
    },
  ]

  return (
    <Stack direction="vertical" spacing={16}>
      <div>
        <Text as="h1" variant="secondary" className="text-3xl font-bold">
          Goal Types Management
        </Text>
        <Text as="p" variant="muted" className="mt-2">
          Manage and configure goal types in the system
        </Text>
      </div>
      <div className="border border-light-gray rounded-xl bg-white overflow-hidden">
        <div
          className="flex items-center justify-between px-4 py-4 border-b"
          style={{ borderColor: '#F3F4F6' }}
        >
          <div className="flex items-center gap-4">
            <Text variant="default" className="text-lg font-semibold">
              Goal
            </Text>
            <Text variant="secondary" className="text-sm">
              Total: {goalTypesList.length} goal
              {goalTypesList.length === 1 ? '' : 's'}
            </Text>
          </div>
          <Button
            variant="primary"
            size="small"
            onClick={handleOpenModal}
            leftIcon={<Icon name="plus" family="solid" size={14} />}
          >
            Create
          </Button>
        </div>
        <DataTable<GoalType>
          data={goalTypesList}
          columns={columns}
          loading={loadingGoalTypesList}
          searchable={true}
          searchPlaceholder="Search goal types by category or subcategory..."
          paginated={true}
          pageSize={10}
          rowKey="id"
          emptyMessage="No goal types found"
          customSearchFilter={(row, searchTerm) => {
            const category = row.category
              ? String(row.category).toLowerCase()
              : ''
            const subCategory = row.subCategory
              ? String(row.subCategory).toLowerCase()
              : ''
            const description = row.description
              ? String(row.description).toLowerCase()
              : ''
            return (
              category.includes(searchTerm) ||
              subCategory.includes(searchTerm) ||
              description.includes(searchTerm)
            )
          }}
        />
      </div>

      {isModalOpen && (
        <Modal
          visible={isModalOpen}
          onClose={handleCloseModal}
          title="Create Goal"
          size="medium"
          primaryAction={{
            label: 'Save',
            onPress: () => {
              handleSave()
            },
            loading: saving,
            disabled: !selectedCategory || !goalInput.trim(),
          }}
          secondaryAction={{
            label: 'Cancel',
            onPress: handleCloseModal,
          }}
        >
          <Stack direction="vertical" spacing={16} className="py-4">
            <Dropdown
              label="Goal Type"
              placeholder="Select a goal type"
              value={selectedCategory}
              onValueChange={value => setSelectedCategory(value as string)}
              options={categoryOptions}
              required
              fullWidth
            />

            <Input
              label="Goal"
              placeholder="Enter your goal (subcategory)"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              required
            />
          </Stack>
        </Modal>
      )}

      {isUpdateModalOpen && editingGoalType && (
        <Modal
          visible={isUpdateModalOpen}
          onClose={handleCloseUpdateModal}
          title="Update Goal"
          size="medium"
          primaryAction={{
            label: 'Update',
            onPress: () => {
              handleUpdate()
            },
            loading: updating,
            disabled: !goalInput.trim(),
          }}
          secondaryAction={{
            label: 'Cancel',
            onPress: handleCloseUpdateModal,
          }}
        >
          <Stack direction="vertical" spacing={16} className="py-4">
            <Dropdown
              label="Category"
              placeholder="Select a category"
              value={selectedCategory}
              options={categoryOptions}
              required
              disabled
              fullWidth
            />

            <Input
              label="Sub Category"
              placeholder="Enter sub category"
              value={goalInput}
              onChange={e => setGoalInput(e.target.value)}
              required
            />
          </Stack>
        </Modal>
      )}
    </Stack>
  )
}

export default GoalTypes
