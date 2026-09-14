import type { ColorMode } from '../../theme/themes'

// Display adaptation only: original document colors remain available in the
// properties panel and are restored exactly when returning to light mode.
export function displayColor(color: string, mode: ColorMode, kind: 'stroke' | 'fill') {
  if (mode === 'light' || !/^#[\da-f]{6}$/i.test(color)) return color
  const channels = [1, 3, 5].map(offset => parseInt(color.slice(offset, offset + 2), 16))
  return `#${channels.map(channel => {
    const adapted = kind === 'fill' ? channel * 0.2 + 12 : channel * 0.45 + 140
    return Math.round(adapted).toString(16).padStart(2, '0')
  }).join('')}`
}
