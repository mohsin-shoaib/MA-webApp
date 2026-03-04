import React, { useEffect } from 'react'
import { Text } from '@/components/Text'
import { Button } from '@/components/Button'
import { IconButton } from '@/components/IconButton'
import { cn } from '@/utils/cn'

export interface DrawerProps {
  visible: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  primaryAction?: {
    label: string
    onPress: () => void
    loading?: boolean
    disabled?: boolean
  }
  secondaryAction?: {
    label: string
    onPress: () => void
  }
  showCloseButton?: boolean
  closeOnBackdropPress?: boolean
  closeOnEscape?: boolean
  width?: 'sm' | 'md' | 'lg'
  className?: string
}

const widthClass = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-xl',
}

/**
 * Slide-out drawer panel from the right (MASS: exercise creation on the fly without leaving session builder).
 */
export function Drawer({
  visible,
  onClose,
  title,
  children,
  primaryAction,
  secondaryAction,
  showCloseButton = true,
  closeOnBackdropPress = true,
  closeOnEscape = true,
  width = 'md',
  className,
}: DrawerProps) {
  useEffect(() => {
    if (!visible || !closeOnEscape) return
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [visible, closeOnEscape, onClose])

  if (!visible) return null

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/40"
        aria-hidden
        onClick={closeOnBackdropPress ? onClose : undefined}
      />
      <div
        className={cn(
          'relative ml-auto flex h-full w-full flex-col bg-white shadow-xl',
          widthClass[width],
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'drawer-title' : undefined}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-gray-200 px-4 py-3">
          {title && (
            <Text
              id="drawer-title"
              as="h2"
              variant="primary"
              className="text-lg font-semibold"
            >
              {title}
            </Text>
          )}
          {showCloseButton && (
            <IconButton
              icon="xmark"
              iconFamily="solid"
              size="small"
              variant="secondary"
              onClick={onClose}
              aria-label="Close"
            />
          )}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>
        {(primaryAction || secondaryAction) && (
          <div className="flex shrink-0 gap-2 border-t border-gray-200 px-4 py-3">
            {secondaryAction && (
              <Button
                type="button"
                variant="secondary"
                size="medium"
                onClick={secondaryAction.onPress}
              >
                {secondaryAction.label}
              </Button>
            )}
            {primaryAction && (
              <Button
                type="button"
                variant="primary"
                size="medium"
                onClick={primaryAction.onPress}
                disabled={primaryAction.disabled || primaryAction.loading}
              >
                {primaryAction.loading ? 'Saving...' : primaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
