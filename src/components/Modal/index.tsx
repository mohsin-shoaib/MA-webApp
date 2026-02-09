import React, { useEffect, useRef } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { Stack } from '@/components/Stack'
import { cn } from '@/utils/cn'

export interface ModalProps {
  /**
   * Whether modal is visible
   */
  visible: boolean
  /**
   * Callback when modal should close
   */
  onClose: () => void
  /**
   * Modal title
   */
  title?: string
  /**
   * Modal content/body
   */
  children: React.ReactNode
  /**
   * Primary action button (shown in footer)
   */
  primaryAction?: {
    label: string
    onPress: () => void
    loading?: boolean
    disabled?: boolean
  }
  /**
   * Secondary action button (shown in footer)
   */
  secondaryAction?: {
    label: string
    onPress: () => void
    loading?: boolean
    disabled?: boolean
  }
  /**
   * Whether to show close button in header
   * @default true
   */
  showCloseButton?: boolean
  /**
   * Modal size
   * @default 'medium'
   */
  size?: 'small' | 'medium' | 'large' | 'fullscreen'
  /**
   * Whether to close on backdrop press
   * @default true
   */
  closeOnBackdropPress?: boolean
  /**
   * Whether to close on escape key
   * @default true
   */
  closeOnEscape?: boolean
  /**
   * Additional className for modal container
   */
  className?: string
  /**
   * Additional style for modal container
   */
  containerStyle?: React.CSSProperties
  /**
   * Additional style for modal content
   */
  contentStyle?: React.CSSProperties
}

/**
 * Modal/Dialog component with theme support
 *
 * Displays a modal dialog with header, body, and footer sections.
 * Fully integrated with the theme system and supports actions.
 *
 * @example
 * ```tsx
 * <Modal
 *   visible={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   title="Confirm Action"
 *   primaryAction={{
 *     label: "Confirm",
 *     onPress: handleConfirm
 *   }}
 *   secondaryAction={{
 *     label: "Cancel",
 *     onPress: () => setIsOpen(false)
 *   }}
 * >
 *   <Text>Are you sure you want to proceed?</Text>
 * </Modal>
 * ```
 */
export function Modal({
  visible,
  onClose,
  title,
  children,
  primaryAction,
  secondaryAction,
  showCloseButton = true,
  size = 'medium',
  closeOnBackdropPress = true,
  closeOnEscape = true,
  className,
  containerStyle,
  contentStyle,
}: Readonly<ModalProps>) {
  const modalRef = useRef<HTMLDialogElement>(null)
  const modalStyles = getModalStyles(size)

  // Handle dialog open/close
  useEffect(() => {
    const dialog = modalRef.current
    if (!dialog) return

    if (visible) {
      dialog.showModal()
    } else {
      dialog.close()
    }
  }, [visible])

  // Handle escape key and backdrop clicks
  useEffect(() => {
    if (!visible) return

    const dialog = modalRef.current
    if (!dialog) return

    const handleCancel = (e: Event) => {
      // Cancel event is triggered by:
      // 1. Escape key (if closeOnEscape is true)
      // 2. Backdrop click (if closeOnBackdropPress is true)

      // For escape key
      if (!closeOnEscape) {
        e.preventDefault()
        return
      }

      // For backdrop click, check if closeOnBackdropPress is enabled
      // Note: We can't distinguish between escape and backdrop click in the cancel event
      // So we'll allow both if either is enabled, or prevent if both are disabled
      if (!closeOnBackdropPress && !closeOnEscape) {
        e.preventDefault()
        return
      }

      onClose()
    }

    dialog.addEventListener('cancel', handleCancel)
    return () => {
      dialog.removeEventListener('cancel', handleCancel)
    }
  }, [visible, closeOnEscape, closeOnBackdropPress, onClose])

  // Focus management
  useEffect(() => {
    if (visible && modalRef.current) {
      const firstFocusable = modalRef.current.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      ) as HTMLElement
      firstFocusable?.focus()
    }
  }, [visible])

  return (
    <dialog
      ref={modalRef}
      className={cn(
        'bg-white rounded-xl shadow-lg',
        'flex flex-col',
        'max-w-full max-h-[90vh]',
        'overflow-hidden',
        'p-0',
        'backdrop:bg-black/50',
        modalStyles.containerWidth,
        className
      )}
      style={{
        ...containerStyle,
        // Reset dialog default styles
        margin: 'auto',
        border: 'none',
      }}
      aria-labelledby={title ? 'modal-title' : undefined}
    >
      {/* Header */}
      {(title || showCloseButton) && (
        <div
          className={cn(
            'flex items-center justify-between',
            modalStyles.header
          )}
        >
          {title && (
            <Text
              id="modal-title"
              variant="default"
              className="text-xl font-semibold flex-1"
            >
              {title}
            </Text>
          )}
          {showCloseButton && (
            <IconButton
              icon="times"
              variant="ghost"
              size="small"
              onClick={onClose}
              aria-label="Close"
            />
          )}
        </div>
      )}

      {/* Body */}
      <div
        className={cn('shrink overflow-y-auto', modalStyles.body)}
        style={contentStyle}
      >
        {children}
      </div>

      {/* Footer */}
      {(primaryAction || secondaryAction) && (
        <div className={modalStyles.footer}>
          <Stack direction="horizontal" spacing={12} justify="end">
            {secondaryAction && (
              <Button
                variant="outline"
                onClick={secondaryAction.onPress}
                loading={secondaryAction.loading}
                disabled={secondaryAction.disabled}
              >
                {secondaryAction.label}
              </Button>
            )}
            {primaryAction && (
              <Button
                variant="primary"
                onClick={primaryAction.onPress}
                loading={primaryAction.loading}
                disabled={primaryAction.disabled}
              >
                {primaryAction.label}
              </Button>
            )}
          </Stack>
        </div>
      )}
    </dialog>
  )
}

/**
 * Get modal styles based on size
 */
function getModalStyles(size: NonNullable<ModalProps['size']>): {
  containerWidth: string
  header: string
  body: string
  footer: string
} {
  const containerWidth = getModalWidthClass(size)

  return {
    containerWidth,
    header: cn('px-5 pt-5 pb-4', 'border-b border-light-gray'),
    body: cn('px-5 py-5'),
    footer: cn('px-5 pt-4 pb-5', 'border-t border-light-gray'),
  }
}

/**
 * Get modal width class based on size
 */
function getModalWidthClass(size: NonNullable<ModalProps['size']>): string {
  switch (size) {
    case 'small':
      return 'w-full max-w-sm'
    case 'medium':
      return 'w-full max-w-md'
    case 'large':
      return 'w-full max-w-lg'
    case 'fullscreen':
      return 'w-full h-full max-h-[90vh]'
    default:
      return 'w-full max-w-md'
  }
}
