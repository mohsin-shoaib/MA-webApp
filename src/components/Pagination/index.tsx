import React from 'react'
import { Text } from '@/components/Text'
import { IconButton } from '@/components/IconButton'
import { cn } from '@/utils/cn'

export interface PaginationProps {
  /**
   * Current page (1-indexed)
   */
  currentPage: number
  /**
   * Total number of pages
   */
  totalPages: number
  /**
   * Callback when page changes
   */
  onPageChange: (page: number) => void
  /**
   * Number of page buttons to show on each side of current page
   * @default 1
   */
  siblingCount?: number
  /**
   * Whether to show first/last page buttons
   * @default true
   */
  showFirstLast?: boolean
  /**
   * Whether to show previous/next buttons
   * @default true
   */
  showPrevNext?: boolean
  /**
   * Pagination size
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large'
  /**
   * Pagination variant
   * @default 'default'
   */
  variant?: 'default' | 'outlined' | 'ghost'
  /**
   * Whether pagination is disabled
   * @default false
   */
  disabled?: boolean
  /**
   * Additional className for container
   */
  className?: string
  /**
   * Additional style for container
   */
  style?: React.CSSProperties
}

/**
 * Pagination component with theme support
 *
 * Displays page navigation controls with page numbers and navigation buttons.
 * Perfect for tables, lists, and any paginated content.
 *
 * @example
 * ```tsx
 * <Pagination
 *   currentPage={1}
 *   totalPages={10}
 *   onPageChange={(page) => setCurrentPage(page)}
 * />
 *
 * <Pagination
 *   currentPage={5}
 *   totalPages={20}
 *   onPageChange={handlePageChange}
 *   siblingCount={2}
 *   showFirstLast
 * />
 * ```
 */
export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  siblingCount = 1,
  showFirstLast = true,
  showPrevNext = true,
  size = 'medium',
  variant = 'default',
  disabled = false,
  className,
  style,
}: Readonly<PaginationProps>) {
  const pageNumbers = getPageNumbers(currentPage, totalPages, siblingCount)

  const handlePageClick = (page: number) => {
    if (disabled || page === currentPage || page < 1 || page > totalPages) {
      return
    }
    onPageChange(page)
  }

  const handlePrevious = () => {
    if (currentPage > 1) {
      handlePageClick(currentPage - 1)
    }
  }

  const handleNext = () => {
    if (currentPage < totalPages) {
      handlePageClick(currentPage + 1)
    }
  }

  const handleFirst = () => {
    handlePageClick(1)
  }

  const handleLast = () => {
    handlePageClick(totalPages)
  }

  if (totalPages <= 1) {
    return null
  }

  return (
    <div
      className={cn('flex items-center justify-center gap-1', className)}
      style={style}
    >
      {/* First Button */}
      {showFirstLast && (
        <IconButton
          icon="angles-left"
          variant={variant === 'ghost' ? 'ghost' : 'outline'}
          size={size}
          onClick={handleFirst}
          disabled={disabled || currentPage === 1}
          aria-label="First page"
        />
      )}

      {/* Previous Button */}
      {showPrevNext && (
        <IconButton
          icon="chevron-left"
          variant={variant === 'ghost' ? 'ghost' : 'outline'}
          size={size}
          onClick={handlePrevious}
          disabled={disabled || currentPage === 1}
          aria-label="Previous page"
        />
      )}

      {/* Page Numbers */}
      {pageNumbers.map((page, index) => {
        if (page === 'ellipsis') {
          return (
            <div
              key={`ellipsis-${index}`}
              className={cn(
                getButtonSizeClasses(size),
                'flex items-center justify-center'
              )}
            >
              <Text variant="secondary" className={getTextSizeClass(size)}>
                ...
              </Text>
            </div>
          )
        }

        const isActive = page === currentPage

        return (
          <button
            key={page}
            type="button"
            className={cn(
              getButtonSizeClasses(size),
              'flex items-center justify-center',
              'transition-all duration-200',
              'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
              isActive ? getActiveButtonClasses() : getButtonClasses(variant),
              disabled && 'opacity-50 cursor-not-allowed'
            )}
            onClick={() => handlePageClick(page)}
            disabled={disabled}
            aria-pressed={isActive}
            aria-label={`Page ${page}`}
          >
            <Text
              variant={isActive ? 'white' : 'default'}
              className={getTextSizeClass(size)}
            >
              {page}
            </Text>
          </button>
        )
      })}

      {/* Next Button */}
      {showPrevNext && (
        <IconButton
          icon="chevron-right"
          variant={variant === 'ghost' ? 'ghost' : 'outline'}
          size={size}
          onClick={handleNext}
          disabled={disabled || currentPage === totalPages}
          aria-label="Next page"
        />
      )}

      {/* Last Button */}
      {showFirstLast && (
        <IconButton
          icon="angles-right"
          variant={variant === 'ghost' ? 'ghost' : 'outline'}
          size={size}
          onClick={handleLast}
          disabled={disabled || currentPage === totalPages}
          aria-label="Last page"
        />
      )}
    </div>
  )
}

/**
 * Get page numbers to display with ellipsis
 */
function getPageNumbers(
  currentPage: number,
  totalPages: number,
  siblingCount: number
): (number | 'ellipsis')[] {
  const totalNumbers = siblingCount * 2 + 5 // siblings + current + first + last + 2 ellipsis
  const totalBlocks = totalNumbers + 2 // +2 for ellipsis

  if (totalPages <= totalBlocks) {
    return Array.from({ length: totalPages }, (_, i) => i + 1)
  }

  const leftSiblingIndex = Math.max(currentPage - siblingCount, 1)
  const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages)

  const shouldShowLeftEllipsis = leftSiblingIndex > 2
  const shouldShowRightEllipsis = rightSiblingIndex < totalPages - 1

  if (!shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const leftItemCount = 3 + 2 * siblingCount
    const leftRange = Array.from({ length: leftItemCount }, (_, i) => i + 1)
    return [...leftRange, 'ellipsis', totalPages]
  }

  if (shouldShowLeftEllipsis && !shouldShowRightEllipsis) {
    const rightItemCount = 3 + 2 * siblingCount
    const rightRange = Array.from(
      { length: rightItemCount },
      (_, i) => totalPages - rightItemCount + i + 1
    )
    return [1, 'ellipsis', ...rightRange]
  }

  if (shouldShowLeftEllipsis && shouldShowRightEllipsis) {
    const middleRange = Array.from(
      { length: rightSiblingIndex - leftSiblingIndex + 1 },
      (_, i) => leftSiblingIndex + i
    )
    return [1, 'ellipsis', ...middleRange, 'ellipsis', totalPages]
  }

  return Array.from({ length: totalPages }, (_, i) => i + 1)
}

/**
 * Get button size classes
 */
function getButtonSizeClasses(
  size: NonNullable<PaginationProps['size']>
): string {
  switch (size) {
    case 'small':
      return 'min-w-8 h-8 px-2'
    case 'medium':
      return 'min-w-10 h-10 px-3'
    case 'large':
      return 'min-w-12 h-12 px-4'
    default:
      return 'min-w-10 h-10 px-3'
  }
}

/**
 * Get button classes based on variant
 */
function getButtonClasses(
  variant: NonNullable<PaginationProps['variant']>
): string {
  switch (variant) {
    case 'default':
      return 'bg-white border border-light-gray hover:bg-light-gray'
    case 'outlined':
      return 'bg-transparent border border-mid-gray hover:bg-light-gray hover:bg-opacity-50'
    case 'ghost':
      return 'bg-transparent hover:bg-light-gray hover:bg-opacity-50'
    default:
      return 'bg-white border border-light-gray hover:bg-light-gray'
  }
}

/**
 * Get active button classes
 */
function getActiveButtonClasses(): string {
  return cn('bg-primary border-primary text-white')
}

/**
 * Get text size class
 */
function getTextSizeClass(size: NonNullable<PaginationProps['size']>): string {
  switch (size) {
    case 'small':
      return 'text-sm font-medium'
    case 'medium':
      return 'text-base font-medium'
    case 'large':
      return 'text-lg font-medium'
    default:
      return 'text-base font-medium'
  }
}
