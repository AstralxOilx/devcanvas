export type ColorMode = 'light' | 'dark'
export const themes = [
  { id: 'lavender', name: 'Lavender', description: 'Soft & thoughtful', hue: 270, accent: ['#7955aa', '#c3a4ed'], canvas: ['#faf9fc', '#1c1823'] },
  { id: 'ocean', name: 'Ocean', description: 'Clear & focused', hue: 210, accent: ['#2467aa', '#8abcf0'], canvas: ['#f7faff', '#141d27'] },
  { id: 'forest', name: 'Forest', description: 'Fresh & grounded', hue: 150, accent: ['#26754e', '#89d1aa'], canvas: ['#f7fbf8', '#151f19'] },
  { id: 'rose', name: 'Rose', description: 'Warm & expressive', hue: 340, accent: ['#b1446b', '#eda0ba'], canvas: ['#fff8fa', '#25181e'] },
  { id: 'sunset', name: 'Sunset', description: 'A little creative energy', hue: 28, accent: ['#a75b18', '#efbb84'], canvas: ['#fffbf5', '#241c15'] },
  { id: 'slate', name: 'Slate', description: 'Quiet & minimal', hue: 220, accent: ['#52617a', '#b0bfd8'], canvas: ['#f8f9fb', '#191c22'] },
] as const
export type ThemeId = typeof themes[number]['id']
export type ThemePreference = { theme: ThemeId; mode: ColorMode }
export const themeStorageKey = 'devcanvas-appearance'

export function readTheme(): ThemePreference {
  try {
    const saved = JSON.parse(localStorage.getItem(themeStorageKey) || 'null')
    if (saved && themes.some(theme => theme.id === saved.theme) && (saved.mode === 'light' || saved.mode === 'dark')) return { theme: saved.theme, mode: saved.mode }
  } catch { /* Preferences are optional when storage is unavailable. */ }
  return { theme: 'lavender', mode: typeof matchMedia !== 'undefined' && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light' }
}

export function getThemeTokens(preference: ThemePreference) {
  const theme = themes.find(item => item.id === preference.theme) ?? themes[0]
  const dark = preference.mode === 'dark'
  const tint = (saturation: number, lightness: number) => `hsl(${theme.hue} ${saturation}% ${lightness}%)`
  return {
    '--canvas': theme.canvas[dark ? 1 : 0],
    '--surface': dark ? tint(15, 14) : '#ffffff',
    '--surface-soft': tint(dark ? 15 : 30, dark ? 17 : 97),
    '--surface-hover': tint(dark ? 18 : 36, dark ? 21 : 94),
    '--border': tint(dark ? 13 : 23, dark ? 25 : 90),
    '--text': tint(dark ? 20 : 15, dark ? 91 : 24),
    '--text-secondary': tint(dark ? 15 : 12, dark ? 77 : 38),
    '--muted': tint(dark ? 12 : 10, dark ? 65 : 46),
    '--accent': theme.accent[dark ? 1 : 0],
    '--accent-soft': tint(dark ? 25 : 48, dark ? 24 : 93),
    '--accent-hover': tint(dark ? 27 : 47, dark ? 29 : 88),
    '--accent-border': tint(dark ? 28 : 35, dark ? 43 : 76),
    '--grid': tint(dark ? 12 : 20, dark ? 27 : 86),
    '--success': dark ? '#91c6a3' : '#4e825e',
    '--shadow': dark ? '#00000035' : '#31213f12',
    '--overlay': dark ? '#07060cb3' : '#30243d50',
  }
}

export function applyTheme(preference: ThemePreference) {
  const root = document.documentElement
  root.dataset.theme = preference.theme
  root.dataset.mode = preference.mode
  root.style.colorScheme = preference.mode
  Object.entries(getThemeTokens(preference)).forEach(([key, value]) => root.style.setProperty(key, value))
}
