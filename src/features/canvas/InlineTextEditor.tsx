import { useLayoutEffect, useRef } from 'react'
import type { Shape } from './model'
import { textAppearance } from './textAppearance'
import { displayColor } from './displayColor'
import { useTheme } from '../../theme/useTheme'

export function InlineTextEditor({ shape, value, onChange, onFinish }: { shape: Shape; value: string; onChange: (value: string) => void; onFinish: (save: boolean) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const { preference } = useTheme()
  const appearance = textAppearance(shape)
  const height = appearance.fontSize * 1.6
  const width = Math.max(Math.abs(shape.w), (value.length + 2) * appearance.fontSize, 80)

  useLayoutEffect(() => {
    inputRef.current?.focus({ preventScroll: true })
    inputRef.current?.select()
  }, [shape.id])

  return <foreignObject data-editor-only="true" x={shape.x + shape.w / 2 - width / 2} y={shape.y + shape.h / 2 - height / 2} width={width} height={height} onPointerDown={event => event.stopPropagation()} onDoubleClick={event => event.stopPropagation()}>
    <input ref={inputRef} className="canvas-text-editor" aria-label="แก้ไขข้อความบน Canvas" value={value} spellCheck={false} autoComplete="off" style={{ ...appearance, height, lineHeight: `${height}px`, color: displayColor(shape.stroke, preference.mode, 'stroke'), opacity: shape.opacity / 100 }} onChange={event => onChange(event.target.value)} onBlur={() => onFinish(true)} onKeyDown={event => {
      event.stopPropagation()
      if (event.nativeEvent.isComposing || event.keyCode === 229) return
      if (event.key === 'Enter') { event.preventDefault(); onFinish(true) }
      if (event.key === 'Escape') { event.preventDefault(); onFinish(false) }
    }} />
  </foreignObject>
}
