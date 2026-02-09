import { useEffect, useState } from 'react'

export type ColorScheme = 'light' | 'dark' | null

/**
 * Hook to detect and manage color scheme preference
 * Detects system preference and optionally allows manual override
 *
 * @param initialScheme - Initial color scheme ('light', 'dark', or null for system)
 * @returns Current color scheme ('light' or 'dark')
 */
export function useColorScheme(
  initialScheme: ColorScheme = null
): 'light' | 'dark' {
  const [colorScheme, setColorScheme] = useState<'light' | 'dark'>(() => {
    // If initialScheme is provided, use it
    if (initialScheme === 'light' || initialScheme === 'dark') {
      return initialScheme
    }

    // Otherwise, detect system preference
    if (typeof globalThis !== 'undefined') {
      const mediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)')
      return mediaQuery.matches ? 'dark' : 'light'
    }

    // Default to light if globalThis is not available (SSR)
    return 'light'
  })

  useEffect(() => {
    // If initialScheme is explicitly set, don't listen to system changes
    if (initialScheme === 'light' || initialScheme === 'dark') {
      return
    }

    // Listen to system preference changes
    if (typeof globalThis === 'undefined') {
      return
    }

    const mediaQuery = globalThis.matchMedia('(prefers-color-scheme: dark)')

    const handleChange = (e: MediaQueryListEvent) => {
      setColorScheme(e.matches ? 'dark' : 'light')
    }

    // Add event listener for system preference changes
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [initialScheme])

  return colorScheme
}
