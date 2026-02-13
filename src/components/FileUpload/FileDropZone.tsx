import { useCallback, useState } from 'react'
import { Text } from '@/components/Text'
import { Icon } from '@/components/Icon'
import { cn } from '@/utils/cn'

/**
 * Props for FileDropZone component
 */
export interface FileDropZoneProps {
  /**
   * Callback when a file is selected
   */
  onFileSelect: (file: File) => void

  /**
   * Accepted file types (e.g., "image/*", "video/*", ".pdf")
   */
  accept?: string

  /**
   * Maximum file size in bytes
   */
  maxSize?: number

  /**
   * Custom content to display in the drop zone
   */
  children?: React.ReactNode

  /**
   * Disabled state
   */
  disabled?: boolean

  /**
   * Additional className
   */
  className?: string
}

/**
 * FileDropZone component
 *
 * Provides a drag-and-drop area for file uploads with visual feedback.
 * Also supports click-to-select functionality.
 *
 * @example
 * ```tsx
 * <FileDropZone
 *   onFileSelect={(file) => console.log(file)}
 *   accept="image/*"
 *   maxSize={5 * 1024 * 1024}
 * />
 * ```
 */
export function FileDropZone({
  onFileSelect,
  accept,
  maxSize,
  children,
  disabled = false,
  className,
}: Readonly<FileDropZoneProps>) {
  const [isDragging, setIsDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(true)
    },
    [disabled]
  )

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
    },
    [disabled]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      if (disabled) return
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)
      setError(null)

      const file = e.dataTransfer.files[0]
      if (file) {
        // Validate file size
        if (maxSize && file.size > maxSize) {
          const maxSizeMB = (maxSize / 1024 / 1024).toFixed(2)
          setError(`File size exceeds ${maxSizeMB}MB`)
          return
        }

        onFileSelect(file)
      }
    },
    [onFileSelect, maxSize, disabled]
  )

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled) return
      const file = e.target.files?.[0]
      if (file) {
        // Validate file size
        if (maxSize && file.size > maxSize) {
          const maxSizeMB = (maxSize / 1024 / 1024).toFixed(2)
          setError(`File size exceeds ${maxSizeMB}MB`)
          return
        }

        setError(null)
        onFileSelect(file)
      }
      // Reset input value to allow selecting the same file again
      e.target.value = ''
    },
    [onFileSelect, maxSize, disabled]
  )

  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(
          'border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200',
          isDragging && !disabled
            ? 'border-primary bg-primary/5'
            : 'border-midGray bg-lightGray/50',
          disabled && 'opacity-50 cursor-not-allowed',
          !disabled && 'cursor-pointer hover:border-primary hover:bg-primary/5'
        )}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          className="hidden"
          id="file-dropzone-input"
          disabled={disabled}
        />
        <label
          htmlFor="file-dropzone-input"
          className={cn(
            'flex flex-col items-center justify-center gap-4 cursor-pointer',
            disabled && 'cursor-not-allowed'
          )}
        >
          {children || (
            <>
              <Icon
                name="cloud-arrow-up"
                family="solid"
                size={48}
                variant={isDragging ? 'primary' : 'default'}
                className="transition-colors"
              />
              <div className="flex flex-col gap-2">
                <Text variant="secondary" className="text-base font-medium">
                  {isDragging ? 'Drop file here' : 'Drag and drop a file here'}
                </Text>
                <Text variant="muted" className="text-sm">
                  or click to select
                </Text>
              </div>
            </>
          )}
        </label>
      </div>

      {error && (
        <div className="mt-2">
          <Text variant="error" className="text-sm">
            {error}
          </Text>
        </div>
      )}
    </div>
  )
}
