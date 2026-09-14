import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, PointerEvent, ReactNode } from 'react'
import { IconFocusCentered, IconGripVertical } from '@tabler/icons-react'
import { clampPanelPosition } from './floatingPanelPosition'
import type { PanelPosition } from './floatingPanelPosition'
import './floating-toolbar.css'

type FloatingToolbarProps = {
  label: string
  children: ReactNode
  hint?: ReactNode
  active?: boolean
  onActivate?: () => void
  className?: string
}

export function FloatingToolbar({ label, children, hint, active, onActivate, className = '' }: FloatingToolbarProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const gesture = useRef<{ id: number; x: number; y: number; origin: PanelPosition } | null>(null)
  const [position, setPosition] = useState<PanelPosition | null>(null)
  const [dragging, setDragging] = useState(false)

  function constrain(next: PanelPosition) {
    const element = elementRef.current!
    return clampPanelPosition(next, element.parentElement!.getBoundingClientRect(), element.getBoundingClientRect())
  }
  function getPosition() {
    const element = elementRef.current!.getBoundingClientRect()
    const parent = elementRef.current!.parentElement!.getBoundingClientRect()
    return { x: element.left - parent.left, y: element.top - parent.top }
  }
  useEffect(() => {
    const element = elementRef.current!
    const observer = new ResizeObserver(() => {
      setPosition(previous => {
        if (!previous) return previous
        const next = clampPanelPosition(previous, element.parentElement!.getBoundingClientRect(), element.getBoundingClientRect())
        return next.x === previous.x && next.y === previous.y ? previous : next
      })
    })
    observer.observe(element)
    observer.observe(element.parentElement!)
    return () => observer.disconnect()
  }, [])

  function start(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    event.preventDefault()
    event.currentTarget.focus()
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY, origin: getPosition() }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const drag = gesture.current
    if (!drag || drag.id !== event.pointerId) return
    setPosition(constrain({ x: drag.origin.x + event.clientX - drag.x, y: drag.origin.y + event.clientY - drag.y }))
  }
  function stop(event: PointerEvent<HTMLButtonElement>, cancel = false) {
    if (!gesture.current || gesture.current.id !== event.pointerId) return
    if (cancel) setPosition(constrain(gesture.current.origin))
    gesture.current = null
    setDragging(false)
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }
  function keyMove(event: KeyboardEvent<HTMLButtonElement>) {
    const direction = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[event.key]
    if (!direction) return
    event.preventDefault()
    event.stopPropagation()
    const current = getPosition()
    const step = event.shiftKey ? 40 : 10
    setPosition(constrain({ x: current.x + direction[0] * step, y: current.y + direction[1] * step }))
  }

  return <div ref={elementRef} className={`ui-floating-toolbar ${active ? 'is-front' : ''} ${dragging ? 'is-dragging' : ''} ${className}`} style={position ? { left: position.x, top: position.y, transform: 'none' } : undefined} onPointerDownCapture={onActivate} onFocusCapture={onActivate}>
    <div className="ui-toolbar floating-toolbar-surface" role="toolbar" aria-label={label}>
      <button className="floating-toolbar-handle" type="button" aria-label={`Move ${label}`} title="Drag to move · Arrow keys to move · Double-click to reset" onPointerDown={start} onPointerMove={move} onPointerUp={event => stop(event)} onPointerCancel={event => stop(event, true)} onLostPointerCapture={() => { gesture.current = null; setDragging(false) }} onKeyDown={keyMove} onDoubleClick={() => setPosition(null)}><IconGripVertical size={18} /></button>
      <div className="floating-toolbar-tools">{children}</div>
      <button className="floating-toolbar-reset" type="button" aria-label={`Restore ${label} to default position`} title="คืนตำแหน่งเริ่มต้น" onClick={() => setPosition(null)}><IconFocusCentered size={17} /></button>
    </div>
    {hint && <div className="floating-toolbar-hint">{hint}</div>}
  </div>
}
