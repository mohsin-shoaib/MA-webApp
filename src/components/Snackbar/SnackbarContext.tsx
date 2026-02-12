import { createContext } from 'react'
import type { SnackbarProps } from './index'

interface SnackbarState {
  visible: boolean
  message: string
  variant: SnackbarProps['variant']
  duration?: number
  actionLabel?: string
  onAction?: () => void
}

export interface SnackbarContextValue {
  showSuccess: (message: string, options?: Partial<SnackbarState>) => void
  showError: (message: string, options?: Partial<SnackbarState>) => void
  showInfo: (message: string, options?: Partial<SnackbarState>) => void
  showWarning: (message: string, options?: Partial<SnackbarState>) => void
  show: (
    message: string,
    variant: SnackbarProps['variant'],
    options?: Partial<SnackbarState>
  ) => void
  hide: () => void
}

export const SnackbarContext = createContext<SnackbarContextValue | undefined>(
  undefined
)
