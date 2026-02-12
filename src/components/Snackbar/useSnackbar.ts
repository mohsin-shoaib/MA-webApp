import { useContext } from 'react'
import { SnackbarContext, type SnackbarContextValue } from './SnackbarContext'

/**
 * Hook to access snackbar functions
 *
 * @example
 * ```tsx
 * const { showSuccess, showError } = useSnackbar()
 *
 * // In API call
 * try {
 *   await api.call()
 *   showSuccess('Operation successful!')
 * } catch (error) {
 *   showError('Something went wrong')
 * }
 * ```
 */
export function useSnackbar(): SnackbarContextValue {
  const context = useContext(SnackbarContext)
  if (context === undefined) {
    throw new Error('useSnackbar must be used within a SnackbarProvider')
  }
  return context
}
