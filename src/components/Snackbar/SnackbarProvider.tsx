import React, { useState, useCallback, useMemo } from 'react'
import { Snackbar, type SnackbarProps } from './index'
import { SnackbarContext, type SnackbarContextValue } from './SnackbarContext'

interface SnackbarState {
  visible: boolean
  message: string
  variant: SnackbarProps['variant']
  duration?: number
  actionLabel?: string
  onAction?: () => void
}

interface SnackbarProviderProps {
  children: React.ReactNode
  /**
   * Default position for snackbars
   * @default 'bottom'
   */
  position?: SnackbarProps['position']
  /**
   * Default duration for snackbars
   * @default 4000
   */
  defaultDuration?: number
}

/**
 * SnackbarProvider component
 *
 * Provides snackbar functionality throughout the app via context.
 * Wrap your app with this provider to use the useSnackbar hook.
 *
 * @example
 * ```tsx
 * <SnackbarProvider>
 *   <App />
 * </SnackbarProvider>
 * ```
 */
export function SnackbarProvider({
  children,
  position = 'bottom',
  defaultDuration = 4000,
}: Readonly<SnackbarProviderProps>) {
  const [snackbar, setSnackbar] = useState<SnackbarState>({
    visible: false,
    message: '',
    variant: 'info',
  })

  const show = useCallback(
    (
      message: string,
      variant: SnackbarProps['variant'] = 'info',
      options?: Partial<SnackbarState>
    ) => {
      setSnackbar({
        visible: true,
        message,
        variant,
        duration: options?.duration ?? defaultDuration,
        actionLabel: options?.actionLabel,
        onAction: options?.onAction,
      })
    },
    [defaultDuration]
  )

  const showSuccess = useCallback(
    (message: string, options?: Partial<SnackbarState>) => {
      show(message, 'success', options)
    },
    [show]
  )

  const showError = useCallback(
    (message: string, options?: Partial<SnackbarState>) => {
      show(message, 'error', options)
    },
    [show]
  )

  const showInfo = useCallback(
    (message: string, options?: Partial<SnackbarState>) => {
      show(message, 'info', options)
    },
    [show]
  )

  const showWarning = useCallback(
    (message: string, options?: Partial<SnackbarState>) => {
      show(message, 'warning', options)
    },
    [show]
  )

  const hide = useCallback(() => {
    setSnackbar(prev => ({ ...prev, visible: false }))
  }, [])

  const contextValue: SnackbarContextValue = useMemo(
    () => ({
      showSuccess,
      showError,
      showInfo,
      showWarning,
      show,
      hide,
    }),
    [showSuccess, showError, showInfo, showWarning, show, hide]
  )

  return (
    <SnackbarContext.Provider value={contextValue}>
      {children}
      <Snackbar
        visible={snackbar.visible}
        message={snackbar.message}
        variant={snackbar.variant}
        position={position}
        duration={snackbar.duration}
        onDismiss={hide}
        actionLabel={snackbar.actionLabel}
        onAction={snackbar.onAction}
      />
    </SnackbarContext.Provider>
  )
}
