import { useLayoutEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { applyTheme, readTheme, themeStorageKey } from './themes'
import type { ThemePreference } from './themes'
import { ThemeContext } from './useTheme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState(readTheme)
  const [storageAvailable, setStorageAvailable] = useState(true)
  useLayoutEffect(() => { applyTheme(preference) }, [preference])

  function update(next: ThemePreference) {
    setPreference(next)
    try { localStorage.setItem(themeStorageKey, JSON.stringify(next)); setStorageAvailable(true) }
    catch { setStorageAvailable(false) }
  }

  return <ThemeContext.Provider value={{ preference, setMode: mode => update({ ...preference, mode }), setTheme: theme => update({ ...preference, theme }), storageAvailable }}>{children}</ThemeContext.Provider>
}
