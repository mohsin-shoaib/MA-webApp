import React, { useState, useMemo, useCallback } from 'react'
import { Text } from '@/components/Text'
import { Icon } from '@/components/Icon'
import { Input } from '@/components/Input'
import { Pagination } from '@/components/Pagination'
import { Spinner } from '@/components/Spinner'
import { Card } from '@/components/Card'
import { Checkbox } from '@/components/Checkbox'
import { BrandColors } from '@/constants/theme'
import { cn } from '@/utils/cn'

export type SortDirection = 'asc' | 'desc' | null

export interface SortConfig<T = unknown> {
  key: keyof T | string
  direction: SortDirection
}

export interface Column<T = unknown> {
  /**
   * Unique key for the column (should match a property in the data)
   */
  key: keyof T | string
  /**
   * Column header label
   */
  label: string
  /**
   * Whether column is sortable
   * @default true
   */
  sortable?: boolean
  /**
   * Custom render function for cell content
   */
  render?: (value: unknown, row: T, index: number) => React.ReactNode
  /**
   * Column width (CSS value or Tailwind class)
   */
  width?: string
  /**
   * Column alignment
   * @default 'left'
   */
  align?: 'left' | 'center' | 'right'
  /**
   * Whether column is resizable
   * @default false
   */
  resizable?: boolean
}

export interface DataTableProps<T = unknown> {
  /**
   * Table data (array of objects)
   */
  data: T[]
  /**
   * Column definitions
   */
  columns: Column<T>[]
  /**
   * Whether table is in loading state
   * @default false
   */
  loading?: boolean
  /**
   * Whether to show row selection checkboxes
   * @default false
   */
  selectable?: boolean
  /**
   * Selected row IDs (when selectable is true)
   */
  selectedRows?: string[]
  /**
   * Callback when row selection changes
   */
  onSelectionChange?: (selectedIds: string[]) => void
  /**
   * Key to use as unique identifier for rows (for selection)
   * @default 'id'
   */
  rowKey?: keyof T | ((row: T) => string)
  /**
   * Whether to enable sorting
   * @default true
   */
  sortable?: boolean
  /**
   * Initial sort configuration
   */
  defaultSort?: SortConfig<T>
  /**
   * Callback when sort changes
   */
  onSortChange?: (sort: SortConfig<T>) => void
  /**
   * Whether to enable search/filtering
   * @default true
   */
  searchable?: boolean
  /**
   * Search input placeholder
   * @default 'Search...'
   */
  searchPlaceholder?: string
  /**
   * Search value (controlled)
   */
  searchValue?: string
  /**
   * Callback when search value changes
   */
  onSearchChange?: (value: string) => void
  /**
   * Custom search filter function
   */
  customSearchFilter?: (row: T, searchTerm: string) => boolean
  /**
   * Whether to enable pagination
   * @default true
   */
  paginated?: boolean
  /**
   * Items per page
   * @default 10
   */
  pageSize?: number
  /**
   * Current page (1-indexed, controlled)
   */
  currentPage?: number
  /**
   * Callback when page changes
   */
  onPageChange?: (page: number) => void
  /**
   * Empty state message
   * @default 'No data available'
   */
  emptyMessage?: string
  /**
   * Empty state component (overrides emptyMessage)
   */
  emptyComponent?: React.ReactNode
  /**
   * Table title
   */
  title?: string
  /**
   * Table subtitle
   */
  subtitle?: string
  /**
   * Additional className for table container
   */
  className?: string
  /**
   * Additional style for table container
   */
  style?: React.CSSProperties
  /**
   * Whether to show table header
   * @default true
   */
  showHeader?: boolean
  /**
   * Custom row click handler
   */
  onRowClick?: (row: T, index: number) => void
  /**
   * Whether rows are clickable
   * @default false
   */
  rowClickable?: boolean
  /**
   * Custom row className function
   */
  getRowClassName?: (row: T, index: number) => string
}

/**
 * DataTable component with sorting, filtering, pagination, and selection
 *
 * A comprehensive table component with full-featured data manipulation capabilities.
 * Integrates with the theme system and follows design system patterns.
 *
 * @example
 * ```tsx
 * const columns = [
 *   { key: 'name', label: 'Name', sortable: true },
 *   { key: 'email', label: 'Email', sortable: true },
 *   { key: 'role', label: 'Role' },
 * ]
 *
 * <DataTable
 *   data={users}
 *   columns={columns}
 *   loading={isLoading}
 *   selectable
 *   onSelectionChange={setSelectedRows}
 * />
 * ```
 */
export function DataTable<
  T extends Record<string, unknown> = Record<string, unknown>,
>({
  data,
  columns,
  loading = false,
  selectable = false,
  selectedRows = [],
  onSelectionChange,
  rowKey = 'id' as keyof T,
  sortable = true,
  defaultSort,
  onSortChange,
  searchable = true,
  searchPlaceholder = 'Search...',
  searchValue: controlledSearchValue,
  onSearchChange,
  customSearchFilter,
  paginated = true,
  pageSize = 10,
  currentPage: controlledCurrentPage,
  onPageChange,
  emptyMessage = 'No data available',
  emptyComponent,
  title,
  subtitle,
  className,
  style,
  showHeader = true,
  onRowClick,
  rowClickable = false,
  getRowClassName,
}: Readonly<DataTableProps<T>>) {
  // Internal state
  const [internalSearchValue, setInternalSearchValue] = useState('')
  const [internalSort, setInternalSort] = useState<SortConfig<T>>(
    defaultSort || { key: '', direction: null }
  )
  const [internalCurrentPage, setInternalCurrentPage] = useState(1)

  // Use controlled or internal state
  const searchValue = controlledSearchValue ?? internalSearchValue
  const currentPage = controlledCurrentPage ?? internalCurrentPage
  // Determine effective sort: use defaultSort if provided and controlled, otherwise use internal sort
  const effectiveSort = (() => {
    if (defaultSort && onSortChange) {
      return defaultSort
    }
    if (defaultSort) {
      return defaultSort
    }
    return internalSort
  })()

  // Get row ID
  const getRowId = useCallback(
    (row: T): string => {
      if (typeof rowKey === 'function') {
        return rowKey(row)
      }
      return String(row[rowKey] ?? '')
    },
    [rowKey]
  )

  // Handle search
  const handleSearchChange = useCallback(
    (value: string) => {
      if (onSearchChange) {
        onSearchChange(value)
      } else {
        setInternalSearchValue(value)
      }
      // Reset to first page on search
      if (onPageChange) {
        onPageChange(1)
      } else {
        setInternalCurrentPage(1)
      }
    },
    [onSearchChange, onPageChange]
  )

  // Handle sort
  const handleSort = useCallback(
    (columnKey: keyof T | string) => {
      const column = columns.find(col => col.key === columnKey)
      if (!column || column.sortable === false) return

      const currentSort = effectiveSort
      // Determine new sort direction
      const getNewSortDirection = (): SortDirection => {
        if (
          currentSort?.key === columnKey &&
          currentSort?.direction === 'asc'
        ) {
          return 'desc'
        }
        if (
          currentSort?.key === columnKey &&
          currentSort?.direction === 'desc'
        ) {
          return null
        }
        return 'asc'
      }

      const newSort: SortConfig<T> = {
        key: columnKey,
        direction: getNewSortDirection(),
      }

      if (onSortChange) {
        onSortChange(newSort)
      } else if (!defaultSort) {
        setInternalSort(newSort)
      }
    },
    [columns, effectiveSort, onSortChange, defaultSort]
  )

  // Filter data based on search
  const filteredData = useMemo(() => {
    if (!searchValue.trim()) return data

    const searchTerm = searchValue.toLowerCase().trim()

    if (customSearchFilter) {
      return data.filter(row => customSearchFilter(row, searchTerm))
    }

    // Default search: search across all string/number values
    return data.filter(row => {
      return columns.some(column => {
        const value = row[column.key as keyof T]
        if (value === null || value === undefined) return false
        return String(value).toLowerCase().includes(searchTerm)
      })
    })
  }, [data, searchValue, columns, customSearchFilter])

  // Sort data
  const sortedData = useMemo(() => {
    if (!effectiveSort || !effectiveSort.key || !effectiveSort.direction)
      return filteredData

    const sorted = [...filteredData].sort((a, b) => {
      const aValue = a[effectiveSort.key as keyof T]
      const bValue = b[effectiveSort.key as keyof T]

      // Handle null/undefined
      if (aValue === null || aValue === undefined) return 1
      if (bValue === null || bValue === undefined) return -1

      // Compare values
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return effectiveSort.direction === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return effectiveSort.direction === 'asc'
          ? aValue - bValue
          : bValue - aValue
      }

      // Fallback to string comparison
      const aStr = String(aValue)
      const bStr = String(bValue)
      return effectiveSort.direction === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr)
    })

    return sorted
  }, [filteredData, effectiveSort])

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!paginated) return sortedData

    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return sortedData.slice(startIndex, endIndex)
  }, [sortedData, paginated, currentPage, pageSize])

  // Calculate total pages
  const totalPages = useMemo(() => {
    if (!paginated) return 1
    return Math.ceil(sortedData.length / pageSize)
  }, [sortedData.length, paginated, pageSize])

  // Handle page change
  const handlePageChange = useCallback(
    (page: number) => {
      if (onPageChange) {
        onPageChange(page)
      } else {
        setInternalCurrentPage(page)
      }
    },
    [onPageChange]
  )

  // Handle row selection
  const handleSelectAll = useCallback(() => {
    if (!selectable || !onSelectionChange) return

    const allIds = paginatedData.map(getRowId)
    const allSelected = allIds.every(id => selectedRows.includes(id))

    if (allSelected) {
      // Deselect all on current page
      const newSelection = selectedRows.filter(id => !allIds.includes(id))
      onSelectionChange(newSelection)
    } else {
      // Select all on current page
      const newSelection = [...new Set([...selectedRows, ...allIds])]
      onSelectionChange(newSelection)
    }
  }, [selectable, onSelectionChange, paginatedData, selectedRows, getRowId])

  const handleSelectRow = useCallback(
    (rowId: string) => {
      if (!selectable || !onSelectionChange) return

      const newSelection = selectedRows.includes(rowId)
        ? selectedRows.filter(id => id !== rowId)
        : [...selectedRows, rowId]

      onSelectionChange(newSelection)
    },
    [selectable, onSelectionChange, selectedRows]
  )

  // Check if all rows on current page are selected
  const allSelectedOnPage = useMemo(() => {
    if (!selectable || paginatedData.length === 0) return false
    return paginatedData.every(row => selectedRows.includes(getRowId(row)))
  }, [selectable, paginatedData, selectedRows, getRowId])

  // Check if some rows on current page are selected
  const someSelectedOnPage = useMemo(() => {
    if (!selectable || paginatedData.length === 0) return false
    return paginatedData.some(row => selectedRows.includes(getRowId(row)))
  }, [selectable, paginatedData, selectedRows, getRowId])

  // Render sort icon
  const renderSortIcon = (columnKey: keyof T | string) => {
    if (!sortable) return null

    const column = columns.find(col => col.key === columnKey)
    if (!column || column.sortable === false) return null

    const isSorted =
      effectiveSort?.key === columnKey && effectiveSort?.direction !== null

    if (!isSorted) {
      return (
        <Icon
          name="sort"
          family="solid"
          size={14}
          variant="muted"
          className="ml-1 opacity-40"
        />
      )
    }

    return (
      <Icon
        name={effectiveSort?.direction === 'asc' ? 'arrow-up' : 'arrow-down'}
        family="solid"
        size={14}
        variant="primary"
        className="ml-1"
      />
    )
  }

  // Render cell content
  const renderCell = (column: Column<T>, row: T, index: number) => {
    const value = row[column.key as keyof T]

    if (column.render) {
      return column.render(value, row, index)
    }

    // Default rendering
    if (value === null || value === undefined) {
      return (
        <Text variant="muted" className="text-sm">
          —
        </Text>
      )
    }

    return (
      <Text variant="default" className="text-sm">
        {String(value)}
      </Text>
    )
  }

  // Render empty state
  const renderEmptyState = () => {
    if (emptyComponent) return emptyComponent

    return (
      <div className="py-12 text-center">
        <Icon
          name="inbox"
          family="solid"
          size={48}
          variant="muted"
          className="mx-auto mb-4 opacity-50"
        />
        <Text variant="secondary" className="text-base">
          {emptyMessage}
        </Text>
      </div>
    )
  }

  return (
    <Card
      title={title}
      subtitle={subtitle}
      className={cn('overflow-hidden', className)}
      style={style}
      padding="none"
    >
      {/* Search Bar */}
      {searchable && (
        <div
          className="px-4 py-3 border-b"
          style={{ borderColor: BrandColors.neutral.lightGray }}
        >
          <Input
            placeholder={searchPlaceholder}
            value={searchValue}
            onChange={e => handleSearchChange(e.target.value)}
            leftIcon="search"
            size="small"
            className="max-w-md"
          />
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        {(() => {
          if (loading) {
            return (
              <div className="py-12 text-center">
                <Spinner size="medium" variant="primary" />
                <Text variant="secondary" className="mt-4 text-sm">
                  Loading...
                </Text>
              </div>
            )
          }
          if (paginatedData.length === 0) {
            return renderEmptyState()
          }
          return (
            <table className="w-full border-collapse">
              {/* Header */}
              {showHeader && (
                <thead>
                  <tr
                    style={{
                      backgroundColor: BrandColors.neutral.lightGray,
                      borderBottom: `1px solid ${BrandColors.neutral.midGray}`,
                    }}
                  >
                    {selectable && (
                      <th
                        className="px-4 py-3 text-left"
                        style={{ width: '48px', minWidth: '48px' }}
                      >
                        <Checkbox
                          checked={allSelectedOnPage}
                          indeterminate={
                            someSelectedOnPage && !allSelectedOnPage
                          }
                          onValueChange={handleSelectAll}
                          aria-label="Select all rows"
                        />
                      </th>
                    )}
                    {columns.map(column => (
                      <th
                        key={String(column.key)}
                        className={cn(
                          'px-4 py-3 text-left',
                          column.align === 'center' && 'text-center',
                          column.align === 'right' && 'text-right',
                          column.sortable !== false &&
                            sortable &&
                            'cursor-pointer select-none',
                          'hover:bg-opacity-80 transition-colors'
                        )}
                        style={{
                          width: column.width,
                          backgroundColor: BrandColors.neutral.lightGray,
                        }}
                        onClick={() =>
                          column.sortable !== false &&
                          sortable &&
                          handleSort(column.key)
                        }
                      >
                        <div
                          className={cn(
                            'flex items-center',
                            column.align === 'center' && 'justify-center',
                            column.align === 'right' && 'justify-end'
                          )}
                        >
                          <Text
                            variant="secondary"
                            className="text-xs font-semibold uppercase tracking-wide"
                          >
                            {column.label}
                          </Text>
                          {renderSortIcon(column.key)}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
              )}

              {/* Body */}
              <tbody>
                {paginatedData.map((row, index) => {
                  const rowId = getRowId(row)
                  const isSelected = selectedRows.includes(rowId)
                  const rowClassName = getRowClassName?.(row, index) || ''

                  return (
                    <tr
                      key={rowId}
                      className={cn(
                        'border-b transition-colors',
                        rowClickable && 'cursor-pointer hover:bg-opacity-50',
                        isSelected && 'bg-opacity-10',
                        rowClassName
                      )}
                      style={{
                        borderColor: BrandColors.neutral.lightGray,
                        backgroundColor: isSelected
                          ? `${BrandColors.primary.light}10`
                          : 'transparent',
                      }}
                      onClick={() => {
                        if (rowClickable && onRowClick) {
                          onRowClick(row, index)
                        }
                      }}
                    >
                      {selectable && (
                        <td
                          className="px-4 py-3"
                          onClick={e => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={isSelected}
                            onValueChange={() => handleSelectRow(rowId)}
                            aria-label={`Select row ${rowId}`}
                          />
                        </td>
                      )}
                      {columns.map(column => (
                        <td
                          key={String(column.key)}
                          className={cn(
                            'px-4 py-3',
                            column.align === 'center' && 'text-center',
                            column.align === 'right' && 'text-right'
                          )}
                          style={{ width: column.width }}
                        >
                          {renderCell(column, row, index)}
                        </td>
                      ))}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )
        })()}
      </div>

      {/* Pagination */}
      {paginated && !loading && paginatedData.length > 0 && (
        <div
          className="px-4 py-3 border-t flex items-center justify-between"
          style={{ borderColor: BrandColors.neutral.lightGray }}
        >
          <Text variant="secondary" className="text-sm">
            Showing{' '}
            {Math.min((currentPage - 1) * pageSize + 1, sortedData.length)} to{' '}
            {Math.min(currentPage * pageSize, sortedData.length)} of{' '}
            {sortedData.length} results
          </Text>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            size="small"
          />
        </div>
      )}
    </Card>
  )
}
