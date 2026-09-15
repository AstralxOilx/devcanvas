import { useEffect, useId, useRef, useState } from 'react'
import type { CSSProperties, KeyboardEvent, PointerEvent, ReactNode } from 'react'
import { IconFocusCentered, IconChevronDown, IconGripVertical, IconMinus, IconX } from '@tabler/icons-react'
import { clampPanelPosition } from './floatingPanelPosition'
import { useLanguage } from '../../i18n/LanguageProvider'
import type { PanelPosition } from './floatingPanelPosition'
import './floating-panel.css'

type FloatingPanelProps = {
  title: string
  icon?: ReactNode
  children: ReactNode
  open: boolean
  onClose: () => void
  side?: 'left' | 'right'
  width?: number
  active?: boolean
  onActivate?: () => void
  className?: string
}

export function FloatingPanel({ title, icon, children, open, onClose, side = 'left', width = 242, active = false, onActivate, className = '' }: FloatingPanelProps) {
  const { tr } = useLanguage()
  const [position, setPosition] = useState<PanelPosition | null>(null)
  const [minimized, setMinimized] = useState(false)
  const [dragging, setDragging] = useState(false)
  const panelRef = useRef<HTMLElement>(null)
  const drag = useRef<{ pointerId: number; clientX: number; clientY: number; origin: PanelPosition } | null>(null)
  const bodyId = useId()
  const titleId = useId()

  function clamp(next: PanelPosition) {
    const panel = panelRef.current!
    return clampPanelPosition(next, panel.parentElement!.getBoundingClientRect(), panel.getBoundingClientRect())
  }
  function currentPosition() {
    const panel = panelRef.current!.getBoundingClientRect()
    const parent = panelRef.current!.parentElement!.getBoundingClientRect()
    return { x: panel.left - parent.left, y: panel.top - parent.top }
  }

  useEffect(() => {
    const panel = panelRef.current
    if (!open || !panel?.parentElement) return
    const observer = new ResizeObserver(() => {
      setPosition(previous => {
        if (!previous) return previous
        const next = clampPanelPosition(previous, panel.parentElement!.getBoundingClientRect(), panel.getBoundingClientRect())
        return next.x === previous.x && next.y === previous.y ? previous : next
      })
    })
    observer.observe(panel.parentElement)
    observer.observe(panel)
    return () => observer.disconnect()
  }, [open])

  function startDrag(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.focus()
    drag.current = { pointerId: event.pointerId, clientX: event.clientX, clientY: event.clientY, origin: currentPosition() }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }
  function moveDrag(event: PointerEvent<HTMLButtonElement>) {
    const start = drag.current
    if (!start || start.pointerId !== event.pointerId) return
    setPosition(clamp({ x: start.origin.x + event.clientX - start.clientX, y: start.origin.y + event.clientY - start.clientY }))
  }
  function finishDrag(event: PointerEvent<HTMLButtonElement>, cancel = false) {
    if (!drag.current || drag.current.pointerId !== event.pointerId) return
    if (cancel) setPosition(clamp(drag.current.origin))
    drag.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  function moveByKeyboard(event: KeyboardEvent<HTMLButtonElement>) {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key]
    if (!direction) return
    event.preventDefault()
    event.stopPropagation()
    const origin = currentPosition()
    const distance = event.shiftKey ? 40 : 10
    setPosition(clamp({ x: origin.x + direction[0] * distance, y: origin.y + direction[1] * distance }))
  }

  if (!open) return null
  const panelStyle = { '--panel-width': `${width}px`, ...(position ? { left: position.x, top: position.y, right: 'auto' } : {}) } as CSSProperties
  return <aside ref={panelRef} aria-labelledby={titleId} className={`ui-floating-panel ui-floating-panel--${side} ${active ? 'is-front' : ''} ${minimized ? 'is-minimized' : ''} ${dragging ? 'is-dragging' : ''} ${className}`} style={panelStyle} onPointerDownCapture={onActivate} onFocusCapture={onActivate}>
    <div className="floating-panel-header">
      <button type="button" className="floating-panel-drag" aria-label={tr(`ย้ายหน้าต่าง ${title}`, `Move ${title} window`)} title={tr('ลากเพื่อย้าย · กดปุ่มลูกศรเพื่อย้าย · ดับเบิลคลิกเพื่อคืนค่า', 'Drag to move · Arrow keys to move · Double-click to reset')} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={event => finishDrag(event)} onPointerCancel={event => finishDrag(event, true)} onLostPointerCapture={() => { drag.current = null; setDragging(false) }} onKeyDown={moveByKeyboard} onDoubleClick={() => setPosition(null)}><IconGripVertical size={12} />{icon}<span id={titleId}>{title}</span></button>
      <div className="floating-panel-actions">
        <button type="button" aria-label={tr(`คืนตำแหน่งเริ่มต้นของ ${title}`, `Restore ${title} to default position`)} title={tr('คืนตำแหน่งเริ่มต้น', 'Restore default position')} onClick={() => setPosition(null)}><IconFocusCentered size={14} /></button>
        <button type="button" aria-label={tr(`${minimized ? 'ขยาย' : 'ย่อ'} ${title}`, `${minimized ? 'Expand' : 'Minimize'} ${title}`)} aria-expanded={!minimized} aria-controls={bodyId} title={tr(minimized ? 'ขยาย' : 'ย่อ', minimized ? 'Expand' : 'Minimize')} onClick={() => setMinimized(!minimized)}>{minimized ? <IconChevronDown size={15} /> : <IconMinus size={15} />}</button>
        <button type="button" aria-label={tr(`ปิด ${title}`, `Close ${title}`)} title={tr('ปิดหน้าต่าง', 'Close window')} onClick={() => { setMinimized(false); onClose() }}><IconX size={15} /></button>
      </div>
    </div>
    <div id={bodyId} className="floating-panel-body" hidden={minimized}>{children}</div>
  </aside>
}
