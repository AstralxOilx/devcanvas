import { createContext, useContext } from 'react'
import type { ColorMode, ThemeId, ThemePreference } from './themes'

export const ThemeContext = createContext<{
  preference: ThemePreference
  setMode: (mode: ColorMode) => void
  setTheme: (theme: ThemeId) => void
  storageAvailable: boolean
} | null>(null)

export function useTheme() {
  const context = useContext(ThemeContext)
  if (!context) throw new Error('useTheme must be used inside ThemeProvider')
  return context
}
