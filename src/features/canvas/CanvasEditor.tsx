import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent } from 'react'
import { IconSitemap, IconArrowDown, IconArrowRight, IconArrowUp, IconArrowsLeftRight, IconChartLine, IconCheck, IconChevronDown, IconCircle, IconCopy, IconDownload, IconGridDots, IconHandStop, IconHelp, IconAdjustmentsHorizontal, IconLayersIntersect, IconLine, IconLock, IconMinus, IconPointer2 as IconMousePointer2, IconPencil, IconPlus, IconRoute, IconSearch, IconSettings, IconPalette, IconSquare, IconTrash, IconTypography, IconArrowBackUp, IconArrowForwardUp, IconShape, IconX, IconZoomScan, IconSparkles, IconEye, IconEyeOff, IconDeviceFloppy, IconStar, IconPentagon, IconHexagon, IconOctagon, IconHeart, IconCloud } from '@tabler/icons-react'
import { Button, IconButton, FloatingPanel, FloatingToolbar, Toolbar, Tabs, PropertyField, ColorPicker, SegmentedControl, Toggle, StatusBar, ThemePicker } from '../../components/ui'
import { defaultStyle, readBoard } from './model'
import type { DrawingStyle, FlowNodeKind, Port, Shape, Tool } from './model'
import { resizeShape } from './resize'
import { BrushStroke } from './BrushStroke'
import { ShapeView } from './ShapeView'
import { InlineTextEditor } from './InlineTextEditor'
import { FlowchartLibrary } from './flowchart/FlowchartLibrary'
import { createConnection, createFlowNode, createFlowTemplate, isFlowNode, portPoint, ports, removeFlowItem, resolveConnection } from './flowchart'
import type { FlowTemplateId } from './flowchart'
import { useTheme } from '../../theme/useTheme'
import { getThemeTokens } from '../../theme/themes'

function RhombusIcon({ size = 24, stroke = 2 }: { size?: number; stroke?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3 21 12 12 21 3 12 12 3Z" stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" /></svg>
}

const brushes = [
  { value: 'pen', label: 'ปากกา', description: 'เส้นกลม เรียบลื่น' },
  { value: 'brush', label: 'พู่กัน', description: 'ปลายเรียว มีน้ำหนัก' },
  { value: 'marker', label: 'มาร์กเกอร์', description: 'เส้นหนา เต็มสี' },
  { value: 'highlighter', label: 'ไฮไลต์', description: 'หัวแบน โปร่งแสง' },
] as const
const toolItems = [
  { id: 'hand', label: 'Hand', key: 'H', icon: IconHandStop },
  { id: 'select', label: 'Selection', key: 'V', icon: IconMousePointer2 },
  { id: 'rectangle', label: 'Rectangle', key: 'R', icon: IconSquare },
  { id: 'diamond', label: 'Rhombus', key: 'D', icon: RhombusIcon },
  { id: 'ellipse', label: 'Ellipse', key: 'O', icon: IconCircle },
  { id: 'arrow', label: 'Arrow', key: 'A', icon: IconArrowRight },
  { id: 'line', label: 'Line', key: 'L', icon: IconMinus },
  { id: 'elbow', label: 'Elbow connector', key: 'E', icon: IconRoute },
  { id: 'curve', label: 'Curved connector', key: 'U', icon: IconChartLine },
  { id: 'double-arrow', label: 'Double arrow', key: 'B', icon: IconArrowsLeftRight },
  { id: 'draw', label: 'Draw', key: 'P', icon: IconPencil },
  { id: 'text', label: 'Text', key: 'T', icon: IconTypography },
  { id: 'flowchart', label: 'Flowchart', key: 'F', icon: IconSitemap },
  { id: 'connect', label: 'Connect nodes', key: 'C', icon: IconLine },
] as const
const extraShapeItems = [
  { id: 'star', label: 'Star', icon: IconStar }, { id: 'pentagon', label: 'Pentagon', icon: IconPentagon },
  { id: 'hexagon', label: 'Hexagon', icon: IconHexagon }, { id: 'octagon', label: 'Octagon', icon: IconOctagon },
  { id: 'heart', label: 'Heart', icon: IconHeart }, { id: 'cloud', label: 'Cloud', icon: IconCloud },
  { id: 'parallelogram', label: 'Parallelogram', icon: IconShape },
  { id: 'elbow', label: 'Elbow connector', icon: IconRoute }, { id: 'curve', label: 'Curved connector', icon: IconChartLine },
  { id: 'double-arrow', label: 'Double arrow', icon: IconArrowsLeftRight },
  { id: 'flowchart', label: 'Flowchart', icon: IconSitemap }, { id: 'connect', label: 'Connect nodes', icon: IconLine },
] as const
const extraToolGroups = [
  { label: 'Connectors', items: extraShapeItems.filter(item => ['elbow', 'curve', 'double-arrow'].includes(item.id)) },
  { label: 'Shapes', items: extraShapeItems.filter(item => !['elbow', 'curve', 'double-arrow', 'connect', 'flowchart'].includes(item.id)) },
  { label: 'Diagrams', items: extraShapeItems.filter(item => item.id === 'flowchart') },
]
const extraToolItems = extraToolGroups.flatMap(group => group.items)
const workspaceShapeItems = [
  { id: 'rectangle', label: 'Rectangle', icon: IconSquare }, { id: 'diamond', label: 'Rhombus', icon: RhombusIcon },
  { id: 'ellipse', label: 'Ellipse', icon: IconCircle }, { id: 'star', label: 'Star', icon: IconStar },
  { id: 'pentagon', label: 'Pentagon', icon: IconPentagon }, { id: 'hexagon', label: 'Hexagon', icon: IconHexagon },
  { id: 'heart', label: 'Heart', icon: IconHeart }, { id: 'cloud', label: 'Cloud', icon: IconCloud },
  { id: 'parallelogram', label: 'Parallelogram', icon: IconShape },
] as const
function savedPanelState(key: string) {
  try { const value = localStorage.getItem(key); return value === null ? false : value === 'true' } catch { return false }
}
function savedDrawingStyle() {
  try {
    const value = JSON.parse(localStorage.getItem('devcanvas-drawing-style') || 'null')
    if (value && typeof value.stroke === 'string' && typeof value.fill === 'string' && Number.isFinite(value.width) && Number.isFinite(value.opacity)) return { ...defaultStyle, ...value }
  } catch { /* Storage may be unavailable. */ }
  return defaultStyle
}

export function CanvasEditor() {
  const { preference } = useTheme()
  const themeTokens = getThemeTokens(preference)
  const [saved] = useState(readBoard)
  const [shapes, setShapes] = useState<Shape[]>(saved.shapes)
  const [title, setTitle] = useState(saved.title)
  const [tool, setTool] = useState<Tool>('select')
  const [shapeMenuOpen, setShapeMenuOpen] = useState(false)
  const shapeMoreRef = useRef<HTMLSpanElement>(null)
  const [shapeMenuPosition, setShapeMenuPosition] = useState({ left: 0, top: 0 })
  const workspaceAddRef = useRef<HTMLSpanElement>(null)
  const [workspaceAddPosition, setWorkspaceAddPosition] = useState({ left: 0, top: 0 })
  const [flowKind, setFlowKind] = useState<FlowNodeKind>('process')
  const [flowchartOneShot, setFlowchartOneShot] = useState(false)
  const [connectionStart, setConnectionStart] = useState<{ id: string; port?: Port } | null>(null)
  const [connectionCursor, setConnectionCursor] = useState<{ x: number; y: number } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [editingSession, setEditingSession] = useState<{ shape: Shape; isNew: boolean } | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const editingSessionRef = useRef<typeof editingSession>(null)
  const editingId = editingSession?.shape.id
  const [style, setStyle] = useState<DrawingStyle>(savedDrawingStyle)
  const [zoom, setZoom] = useState(100)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [grid, setGrid] = useState(true)
  const [leftOpen, setLeftOpen] = useState(() => savedPanelState('devcanvas-workspace-open'))
  const [rightOpen, setRightOpen] = useState(() => savedPanelState('devcanvas-properties-open'))
  const [frontPanel, setFrontPanel] = useState<'workspace' | 'properties' | 'toolbar'>('workspace')
  const [tab, setTab] = useState<'layers' | 'library'>('layers')
  const [canvasLayersOpen, setCanvasLayersOpen] = useState(true)
  const [workspaceAddOpen, setWorkspaceAddOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState<Shape[][]>([])
  const [future, setFuture] = useState<Shape[][]>([])
  const [help, setHelp] = useState(false)
  const [toast, setToast] = useState('')
  const [storageOk, setStorageOk] = useState(true)
  const svgRef = useRef<SVGSVGElement>(null)
  const modalRef = useRef<HTMLElement>(null)
  const gesture = useRef<{ kind: 'move' | 'draw' | 'pan' | 'route' | 'resize'; handle?: number; id?: string; routeIndex?: number; x: number; y: number; original?: Shape; before: Shape[]; pan: { x: number; y: number }; moved: boolean } | null>(null)
  const connectionDrag = useRef<{ pointerId: number; sourceId: string; sourcePort?: Port; x: number; y: number; moved: boolean } | null>(null)
  const renderShapes = shapes.filter(shape => !shape.hidden).map(shape => resolveConnection(shape, shapes))
  const active = renderShapes.find(s => s.id === selected)
  const current = active ?? style
  const selectedTool = toolItems.find(item => item.id === tool) ?? extraToolItems.find(item => item.id === tool)
  const MoreToolIcon = extraToolItems.find(item => item.id === tool)?.icon ?? IconPlus
  const ActiveShapeIcon = toolItems.find(item => item.id === active?.type)?.icon ?? extraToolItems.find(item => item.id === active?.type)?.icon ?? selectedTool?.icon ?? IconAdjustmentsHorizontal
  const propertyTitle = active ? active.type.charAt(0).toUpperCase() + active.type.slice(1) : selectedTool?.label ?? 'Drawing style'
  const propertyType = active?.type ?? tool
  const isBrushTool = propertyType === 'draw'
  const isTextTool = propertyType === 'text'
  const isLineTool = isBrushTool || ['arrow', 'line', 'elbow', 'curve', 'double-arrow', 'connect', 'text'].includes(propertyType) || !!active?.connection

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { localStorage.setItem('devcanvas-board', JSON.stringify({ shapes, title })); setStorageOk(true) }
      catch { setStorageOk(false) }
    }, 150)
    return () => window.clearTimeout(timer)
  }, [shapes, title])
  useEffect(() => {
    try { localStorage.setItem('devcanvas-workspace-open', String(leftOpen)); localStorage.setItem('devcanvas-properties-open', String(rightOpen)) } catch { /* Storage may be unavailable. */ }
  }, [leftOpen, rightOpen])
  useEffect(() => {
    try { localStorage.setItem('devcanvas-drawing-style', JSON.stringify(style)) } catch { /* Storage may be unavailable. */ }
  }, [style])
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(''), 2800); return () => window.clearTimeout(id) }, [toast])
  useLayoutEffect(() => {
    if (!shapeMenuOpen || !shapeMoreRef.current) return
    const rect = shapeMoreRef.current.getBoundingClientRect()
    const menuHeight = Math.min(430, window.innerHeight - 16)
    const openBelow = rect.bottom + 8 + menuHeight <= window.innerHeight
    setShapeMenuPosition({ left: Math.min(window.innerWidth - 268, Math.max(8, rect.right - 260)), top: openBelow ? rect.bottom + 8 : Math.max(8, rect.top - menuHeight - 8) })
  }, [shapeMenuOpen])
  useLayoutEffect(() => {
    if (!workspaceAddOpen || !workspaceAddRef.current) return
    const rect = workspaceAddRef.current.getBoundingClientRect()
    setWorkspaceAddPosition({ left: Math.min(window.innerWidth - 236, rect.right + 8), top: rect.top - 4 })
  }, [workspaceAddOpen])
  useEffect(() => {
    if (!help) return
    const previous = document.activeElement as HTMLElement | null
    modalRef.current?.focus()
    return () => previous?.focus()
  }, [help])
  const commit = useCallback((next: Shape[]) => { setHistory(h => [...h.slice(-49), shapes]); setFuture([]); setShapes(next) }, [shapes])
  const finishTextEditing = useCallback((save = true) => {
    const session = editingSessionRef.current
    if (!session) return
    // Clear synchronously so Enter/Escape followed by blur cannot commit twice.
    editingSessionRef.current = null
    if (save) {
      if (session.isNew && editingValue.trim()) {
        commit([...shapes, { ...session.shape, text: editingValue }])
      } else if (!session.isNew) {
        const existing = shapes.find(shape => shape.id === session.shape.id)
        if (existing && existing.text !== editingValue) {
          commit(shapes.map(shape => shape.id === existing.id ? { ...shape, text: editingValue } : shape))
        }
      }
    }
    if (session.isNew && (!save || !editingValue.trim())) setSelected(null)
    setEditingSession(null)
  }, [commit, editingValue, shapes])
  const beginTextEditing = useCallback((shape: Shape, isNew = false) => {
    gesture.current = null
    const session = { shape, isNew }
    editingSessionRef.current = session
    setEditingSession(session)
    setEditingValue(shape.text)
    setSelected(shape.id)
  }, [])
  const undo = useCallback(() => {
    if (!history.length) return
    setFuture(f => [...f, shapes]); setShapes(history[history.length - 1]); setHistory(h => h.slice(0, -1)); setSelected(null)
  }, [history, shapes])
  const redo = useCallback(() => {
    if (!future.length) return
    setHistory(h => [...h, shapes]); setShapes(future[future.length - 1]); setFuture(f => f.slice(0, -1)); setSelected(null)
  }, [future, shapes])
  const remove = useCallback(() => { if (selected) { commit(removeFlowItem(shapes, selected)); setSelected(null); setConnectionStart(null) } }, [commit, selected, shapes])
  const duplicate = useCallback(() => {
    const original = shapes.find(shape => shape.id === selected)
    if (!original || original.connection) return
    const copy = { ...original, id: crypto.randomUUID(), x: original.x + 24, y: original.y + 24 }
    commit([...shapes, copy]); setSelected(copy.id)
  }, [selected, commit, shapes])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSelected(null); setTool('select'); setShapeMenuOpen(false); setConnectionStart(null); setConnectionCursor(null); setHelp(false); return }
      if (help || editingSessionRef.current || (e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 'Enter' && tool === 'select' && active) { e.preventDefault(); beginTextEditing(active); return }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'd') { e.preventDefault(); duplicate(); return }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove() }
      const match = toolItems.find((t, index) => t.key.toLowerCase() === e.key.toLowerCase() || (index < 9 && String(index + 1) === e.key))
      if (match) {
        setTool(match.id); setSelected(null); setRightOpen(true); setFrontPanel('properties'); setFlowchartOneShot(false); setConnectionStart(null); setConnectionCursor(null)
        if (match.id === 'flowchart') { setTab('library'); setLeftOpen(true) }
      }
      if (e.key === '?') setHelp(true)
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, remove, duplicate, help, active, tool, beginTextEditing])
  function updateStyle(patch: Partial<Shape>) {
    setStyle(s => ({ ...s, ...patch }))
    if (active) commit(shapes.map(s => s.id === selected ? { ...s, ...patch } : s))
  }
  function point(e: ReactPointerEvent<SVGSVGElement> | ReactMouseEvent<SVGSVGElement>) {
    const svg = svgRef.current!; const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY
    const local = p.matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: (local.x - 500 - pan.x) / (zoom / 100) + 500, y: (local.y - 350 - pan.y) / (zoom / 100) + 350 }
  }
  function connectionRoutePoints(shape: Shape) {
    if (!shape.connection || !shape.points) return []
    return shape.points.split(' ').map(pair => { const [x, y] = pair.split(',').map(Number); return { x: shape.x + x, y: shape.y + y } })
  }
  function pointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button !== 0) return
    if (editingSessionRef.current) { finishTextEditing(true); return }
    setShapeMenuOpen(false)
    const p = point(e); const eventTarget = e.target as Element
    const resizeTarget = eventTarget.closest('[data-resize-shape]')
    if (resizeTarget) {
      const original = shapes.find(s => s.id === resizeTarget.getAttribute('data-resize-shape'))
      const handle = Number(resizeTarget.getAttribute('data-resize-handle'))
      if (original && !original.connection && Number.isInteger(handle) && handle >= 0 && handle <= 3) {
        e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
        setTool('select'); setSelected(original.id)
        gesture.current = { kind: 'resize', id: original.id, handle, ...p, original, before: shapes, pan, moved: false }
        return
      }
    }
    const routeShapeId = eventTarget.closest('[data-route-shape]')?.getAttribute('data-route-shape')
    const routeIndex = Number(eventTarget.closest('[data-route-index]')?.getAttribute('data-route-index'))
    if (tool === 'select' && routeShapeId && Number.isInteger(routeIndex)) {
      const original = renderShapes.find(shape => shape.id === routeShapeId)
      const route = original ? connectionRoutePoints(original) : []
      if (original?.connection && route.length >= 2) {
        e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
        gesture.current = { kind: 'route', id: routeShapeId, routeIndex, ...p, original: { ...original, route }, before: shapes, pan, moved: false }
        setSelected(routeShapeId)
        return
      }
    }
    const targetId = eventTarget.closest('[data-shape]')?.getAttribute('data-shape')
    const clickedNode = shapes.find(shape => shape.id === targetId)
    if (tool === 'connect' && !targetId && !eventTarget.closest('[data-port]')) {
      e.preventDefault()
      setTool('select')
      setSelected(null)
      setConnectionStart(null)
      setConnectionCursor(null)
      connectionDrag.current = null
      gesture.current = null
      return
    }
    if (clickedNode && isFlowNode(clickedNode) && tool !== 'hand' && !e.altKey && !eventTarget.closest('[data-port]')) {
      e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
      setSelected(clickedNode.id)
      setRightOpen(true); setFrontPanel('properties'); setFlowchartOneShot(false)
      connectionDrag.current = null
      gesture.current = { kind: 'move', id: clickedNode.id, ...p, original: clickedNode, before: shapes, pan, moved: false }
      return
    }
    const connecting = tool === 'connect'
    if (clickedNode && !clickedNode.connection && tool !== 'hand' && !connecting && !e.altKey) {
      e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
      setTool('select'); setSelected(clickedNode.id)
      setRightOpen(true); setFrontPanel('properties'); setFlowchartOneShot(false)
      setConnectionStart(null); setConnectionCursor(null); connectionDrag.current = null
      gesture.current = { kind: 'move', id: clickedNode.id, ...p, original: clickedNode, before: shapes, pan, moved: false }
      return
    }
    if (tool === 'flowchart') {
      const node = createFlowNode(flowKind, p, style)
      commit([...shapes, node]); setSelected(node.id)
      if (flowchartOneShot) { setTool('select'); setFlowchartOneShot(false) }
      return
    }
    if (tool === 'connect') {
      const node = shapes.find(shape => shape.id === targetId)
      if (!node || !isFlowNode(node)) { setConnectionStart(null); setConnectionCursor(null); return }
      const candidatePort = (e.target as Element).closest('[data-port]')?.getAttribute('data-port')
      const port = ports.find(item => item === candidatePort)
      e.currentTarget.setPointerCapture(e.pointerId)
      connectionDrag.current = { pointerId: e.pointerId, sourceId: node.id, sourcePort: port, x: p.x, y: p.y, moved: false }
      if (!connectionStart || !shapes.some(shape => shape.id === connectionStart.id)) {
        setConnectionStart({ id: node.id, port }); setConnectionCursor(p); setSelected(node.id)
      } else {
        const edge = createConnection({ from: connectionStart.id, to: node.id, fromPort: connectionStart.port, toPort: port }, shapes, style)
        if (edge) { commit([...shapes, edge]); setSelected(edge.id); setConnectionStart(null); setConnectionCursor(null) }
        else setToast('เลือกโหนดปลายทางอื่น หรือเส้นเชื่อมนี้มีอยู่แล้ว')
      }
      return
    }
    if (tool === 'text') {
      e.preventDefault()
      const target = renderShapes.find(shape => shape.id === targetId)
      if (target) beginTextEditing(target)
      else beginTextEditing({ id: crypto.randomUUID(), type: 'text', ...p, w: 220, h: 44, ...style, fill: 'none', text: '' }, true)
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    if (tool === 'hand') { gesture.current = { kind: 'pan', ...p, before: shapes, pan, moved: false }; return }
    if (tool === 'select') {
      setSelected(targetId || null)
      const original = shapes.find(s => s.id === targetId)
      if (original && !original.connection) gesture.current = { kind: 'move', id: original.id, ...p, original, before: shapes, pan, moved: false }
      return
    }
    const shape: Shape = { id: crypto.randomUUID(), type: tool, ...p, w: 0, h: 0, ...style, width: style.width, text: '', points: tool === 'draw' ? '0,0' : undefined }
    gesture.current = { kind: 'draw', id: shape.id, ...p, original: shape, before: shapes, pan, moved: false }
    setShapes([...shapes, shape]); setSelected(shape.id)
  }
  function pointerMove(e: ReactPointerEvent<SVGSVGElement>) {
    const drag = connectionDrag.current
    if (tool === 'connect' && drag?.pointerId === e.pointerId) {
      const cursor = point(e)
      drag.moved = drag.moved || Math.abs(cursor.x - drag.x) + Math.abs(cursor.y - drag.y) > 5
      if (drag.moved) { setConnectionStart({ id: drag.sourceId, port: drag.sourcePort }); setConnectionCursor(cursor) }
    }
    if (tool === 'connect' && connectionStart) setConnectionCursor(point(e))
    const g = gesture.current; if (!g) return
    const p = point(e); const dx = p.x - g.x; const dy = p.y - g.y
    if (Math.hypot(dx, dy) * zoom / 100 > 4) g.moved = true
    if (g.kind === 'move' && !g.moved) return
    if (g.kind === 'move') { setTool('select'); setConnectionStart(null); setConnectionCursor(null) }
    if (g.kind === 'pan') { setPan({ x: pan.x + dx * zoom / 100, y: pan.y + dy * zoom / 100 }); return }
    if (g.kind === 'route') {
      setShapes(items => items.map(s => s.id === g.id ? { ...s, route: g.original!.route!.map((point, index) => index === g.routeIndex ? { x: p.x, y: p.y } : point) } : s))
      return
    }
    setShapes(items => items.map(s => {
      if (s.id !== g.id) return s
      if (g.kind === 'resize') return resizeShape(g.original!, g.handle!, p, e.shiftKey)
      if (g.kind === 'move') return { ...s, x: g.original!.x + dx, y: g.original!.y + dy }
      if (s.type === 'draw') return { ...s, points: `${s.points} ${p.x - g.x},${p.y - g.y}`, w: dx, h: dy }
      if (['arrow', 'line', 'elbow', 'curve', 'double-arrow'].includes(s.type)) return { ...s, w: dx, h: dy }
      return { ...s, x: Math.min(g.x, p.x), y: Math.min(g.y, p.y), w: Math.abs(dx), h: Math.abs(dy) }
    }))
  }
  function pointerUp(event?: ReactPointerEvent<SVGSVGElement>, cancel = false) {
    const drag = connectionDrag.current
    if (tool === 'connect' && drag && event?.pointerId === drag.pointerId) {
      if (drag.moved && !cancel) {
        const hit = document.elementFromPoint(event.clientX, event.clientY) ?? event.target as Element
        const targetId = hit.closest('[data-shape]')?.getAttribute('data-shape')
        const target = shapes.find(shape => shape.id === targetId)
        const targetPort = ports.find(port => port === hit.closest('[data-port]')?.getAttribute('data-port'))
        const edge = target && isFlowNode(target) ? createConnection({ from: drag.sourceId, to: target.id, fromPort: drag.sourcePort, toPort: targetPort }, shapes, style) : null
        if (edge) { commit([...shapes, edge]); setSelected(edge.id) }
        else setToast('ลากไปยังโหนดปลายทางเพื่อสร้างเส้นเชื่อม')
        setConnectionStart(null); setConnectionCursor(null)
      }
      connectionDrag.current = null
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      return
    }
    const g = gesture.current; if (!g) return
    if (!cancel && g.kind === 'move' && !g.moved && g.original && isFlowNode(g.original)) {
      setTool('connect')
      if (tool !== 'connect') {
        setConnectionStart(null); setConnectionCursor(null)
      } else if (connectionStart && connectionStart.id !== g.id) {
        const edge = createConnection({ from: connectionStart.id, to: g.original.id, fromPort: connectionStart.port }, shapes, style)
        if (edge) { commit([...shapes, edge]); setSelected(edge.id) }
        setConnectionStart(null); setConnectionCursor(null)
      } else {
        setConnectionStart({ id: g.original.id }); setConnectionCursor({ x: g.x, y: g.y })
      }
    }
    if (cancel || (g.kind === 'draw' && !g.moved)) { setShapes(g.before); if (g.kind !== 'route') setSelected(null) }
    else if (g.kind !== 'pan' && g.moved) {
      setHistory(h => [...h.slice(-49), g.before]); setFuture([])
      if (g.kind === 'draw' && g.original?.type !== 'draw') setTool('select')
    }
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    gesture.current = null
  }
  function exportSvg() {
    const clone = svgRef.current!.cloneNode(true) as SVGSVGElement
    clone.querySelectorAll('[data-editor-only]').forEach(el => el.remove())
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('width', '1400'); clone.setAttribute('height', '980')
    const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: 'image/svg+xml' }))
    const link = document.createElement('a'); link.href = url; link.download = `${title || 'Untitled canvas'}.svg`; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000); setToast('Your canvas has been exported')
  }
  function addWorkspaceShape(type: typeof workspaceShapeItems[number]['id']) {
    const labels: Record<typeof type, string> = { rectangle: 'New idea', diamond: 'Decision', ellipse: 'Start', star: 'New star', pentagon: 'New pentagon', hexagon: 'New hexagon', heart: 'New heart', cloud: 'New cloud', parallelogram: 'New shape' }
    const shape: Shape = { id: crypto.randomUUID(), type, x: 410, y: 380, w: 160, h: 100, ...style, text: labels[type] }
    commit([...shapes, shape]); setSelected(shape.id); setTool('select')
  }
  function insertFlowTemplate(template: FlowTemplateId) {
    const rightmost = shapes.length ? Math.max(...shapes.map(shape => shape.x + Math.max(0, shape.w))) : -150
    const origin = { x: rightmost + 180, y: 110 }
    const items = createFlowTemplate(origin, style, template)
    const nodes = items.filter(isFlowNode)
    const minX = Math.min(...nodes.map(node => node.x)); const maxX = Math.max(...nodes.map(node => node.x + node.w))
    const minY = Math.min(...nodes.map(node => node.y)); const maxY = Math.max(...nodes.map(node => node.y + node.h))
    commit([...shapes, ...items])
    setZoom(80)
    setPan({ x: (500 - (minX + maxX) / 2) * .8, y: (350 - (minY + maxY) / 2) * .8 })
    setSelected(null); setTool('select'); setConnectionStart(null)
    setToast('เพิ่ม Flowchart ตัวอย่างแล้ว — ดับเบิลคลิกเพื่อแก้ข้อความ')
  }
  function reorder(front: boolean) { if (!active) return; const rest = shapes.filter(s => s.id !== active.id); commit(front ? [...rest, active] : [active, ...rest]) }
  function toggleVisibility(id: string) {
    const item = shapes.find(shape => shape.id === id)
    if (!item) return
    commit(shapes.map(shape => shape.id === id ? { ...shape, hidden: !shape.hidden } : shape))
    if (!item.hidden) setSelected(null)
  }
  function resetView() { setZoom(100); setPan({ x: 0, y: 0 }) }
  function addConnectionRoutePoint(shape: Shape, cursor: { x: number; y: number }) {
    const route = connectionRoutePoints(shape)
    if (!shape.connection || route.length < 2) return false
    let bestIndex = 1; let bestDistance = Infinity; let bestPoint = cursor
    for (let index = 0; index < route.length - 1; index += 1) {
      const a = route[index]; const b = route[index + 1]; const dx = b.x - a.x; const dy = b.y - a.y
      const lengthSquared = dx * dx + dy * dy; const t = lengthSquared ? Math.max(0, Math.min(1, ((cursor.x - a.x) * dx + (cursor.y - a.y) * dy) / lengthSquared)) : 0
      const candidate = { x: a.x + t * dx, y: a.y + t * dy }; const distance = Math.hypot(cursor.x - candidate.x, cursor.y - candidate.y)
      if (distance < bestDistance) { bestDistance = distance; bestIndex = index + 1; bestPoint = candidate }
    }
    if (bestDistance > 28) return false
    const nextRoute = [...route.slice(0, bestIndex), bestPoint, ...route.slice(bestIndex)]
    commit(shapes.map(item => item.id === shape.id ? { ...item, route: nextRoute } : item)); setSelected(shape.id)
    return true
  }
  const filtered = [...shapes].reverse().filter(s => `${s.text} ${s.type}`.toLowerCase().includes(query.toLowerCase()))

  return <div className="editor">
    <header className="topbar">
      <a className="brand" href="./" aria-label="Devcanvas home"><span className="brand-mark"><IconPencil size={21} stroke={2} /></span><span>devcanvas<span className="brand-dot">.</span></span></a>
      <div className="document-title"><span className="header-divider" /><input aria-label="Canvas name" value={title} onChange={e => setTitle(e.target.value)} onBlur={() => { if (!title.trim()) setTitle('Untitled canvas') }} /><IconChevronDown size={14} /><span className="saved-label"><IconCheck size={14} />{storageOk ? 'Saved locally' : 'Unsaved'}</span></div>
      <div className="header-actions"><ThemePicker /><span className="private-label"><IconLock size={13} />Private canvas</span><Button variant="primary" icon={<IconDownload size={16} />} onClick={exportSvg}>Export SVG</Button><button className="avatar" onClick={() => setToast('Personal workspace · stored in this browser')} aria-label="Personal workspace">Y</button></div>
    </header>
    <div className="editor-workspace">
    <FloatingPanel title="Workspace" icon={<IconLayersIntersect size={15} />} className="workspace-window" open={leftOpen} onClose={() => setLeftOpen(false)} side="left" width={236} active={frontPanel === 'workspace'} onActivate={() => setFrontPanel('workspace')}>
      <Tabs items={[{ value: 'layers', label: 'Layers', icon: <IconLayersIntersect size={15} />, count: shapes.length }, { value: 'library', label: 'Library', icon: <IconGridDots size={15} /> }]} value={tab} onChange={setTab} />
      {tab === 'layers' ? <><div className="workspace-overview"><div><span>WORKSPACE</span><strong>จัดระเบียบไอเดียของคุณ</strong></div><span>{shapes.length} items</span></div><label className="layer-search"><IconSearch size={15} /><input aria-label="Find a layer" placeholder="ค้นหาเลเยอร์..." value={query} onChange={e => setQuery(e.target.value)} /></label><div className="layer-section-title"><button type="button" className="layer-section-toggle" aria-expanded={canvasLayersOpen} onClick={() => setCanvasLayersOpen(open => !open)}><IconChevronDown size={12} />CANVAS <small>{shapes.length}</small></button><div><IconButton label="Open Flowchart library" onClick={() => { setTab('library'); setTool('flowchart'); setLeftOpen(true) }}><IconSitemap size={14} /></IconButton><span ref={workspaceAddRef} className="workspace-add-wrap"><IconButton label="Add shape" active={workspaceAddOpen} onClick={() => setWorkspaceAddOpen(open => !open)}><IconPlus size={14} /></IconButton></span></div></div>{canvasLayersOpen && <div className="layer-list">{filtered.map(s => { const ItemIcon = toolItems.find(t => t.id === s.type)?.icon ?? extraToolItems.find(t => t.id === s.type)?.icon ?? IconSquare; const name = s.text || (s.type === 'arrow' ? 'Connection' : s.type.charAt(0).toUpperCase() + s.type.slice(1)); return <div key={s.id} className={`layer-row ${selected === s.id ? 'selected' : ''} ${s.hidden ? 'is-hidden' : ''}`}><button className="layer-item" onClick={() => { if (s.hidden) toggleVisibility(s.id); setSelected(s.id); setTool('select') }}><span className="layer-icon"><ItemIcon size={15} /></span><span><strong>{name}</strong><small>{s.flowKind ? 'Flowchart node' : s.connection ? 'Connection' : s.type}</small></span></button><IconButton className="layer-visibility" label={s.hidden ? `Show ${name}` : `Hide ${name}`} active={!s.hidden} onClick={() => toggleVisibility(s.id)}>{s.hidden ? <IconEyeOff size={15} /> : <IconEye size={15} />}</IconButton></div> })}{!filtered.length && <p className="empty-layers">{query ? 'ไม่พบเลเยอร์ที่ตรงกัน' : 'เริ่มวางไอเดียแรกของคุณได้เลย'}</p>}</div>}</> : <FlowchartLibrary selectedKind={tool === 'flowchart' ? flowKind : null} connecting={tool === 'connect'} onChoose={kind => { setFlowKind(kind); setFlowchartOneShot(true); setTool('flowchart'); setConnectionStart(null); setSelected(null) }} onConnect={() => { setTool('connect'); setFlowchartOneShot(false); setConnectionStart(null); setConnectionCursor(null) }} onTemplate={insertFlowTemplate} />}
      <div className="sidebar-bottom"><div className="tip-card"><IconSparkles size={18} /><strong>A space for your ideas</strong><p>Sketch it out. Move things around.<br />There’s no wrong place to start.</p><span>Made for your train of thought <span>↗</span></span></div><button className="help-row" onClick={() => setHelp(true)}><IconHelp size={17} />Help & shortcuts<kbd>?</kbd></button></div>
    </FloatingPanel>
      <FloatingToolbar label="Drawing tools" className="floating-toolbar" active={frontPanel === 'toolbar'} onActivate={() => setFrontPanel('toolbar')} hint={<>{tool === 'flowchart' ? 'คลิกบน Canvas เพื่อวางโหนด · เลือกชนิดที่ Library' : tool === 'connect' ? connectionStart ? 'คลิกโหนดปลายทางเพื่อเชื่อมต่อ' : 'คลิกโหนดต้นทาง หรือจุดเชื่อมบนขอบโหนด' : tool === 'select' ? 'Double-click text to edit. Drag an item to move.' : tool === 'hand' ? 'Drag anywhere to move around your canvas.' : tool === 'text' ? 'Click text to edit, or click empty space to write.' : `Click and drag to ${tool === 'draw' ? 'draw freely' : `draw ${tool === 'ellipse' || tool === 'arrow' ? 'an' : 'a'} ${tool}`}.`}<kbd>Esc</kbd> to reset</>}>{toolItems.map((item, i) => i >= 7 && i <= 9 || item.id === 'flowchart' || item.id === 'connect' ? null : <IconButton key={item.id} className={`tool-button ${i === 2 ? 'tool-separator' : ''}`} label={`${item.label} (${item.key})`} active={tool === item.id} onClick={() => { setTool(item.id); setSelected(null); setRightOpen(true); setFrontPanel('properties'); setShapeMenuOpen(false); setConnectionStart(null); setConnectionCursor(null) }}><item.icon size={20} stroke={1.7} /><span>{i < 9 ? i + 1 : item.key}</span></IconButton>)}<span ref={shapeMoreRef} className="shape-more-wrap"><IconButton className="tool-button" label="More tools" active={shapeMenuOpen || extraToolItems.some(item => item.id === tool)} onClick={() => setShapeMenuOpen(open => !open)}><MoreToolIcon size={20} stroke={1.7} /></IconButton></span></FloatingToolbar>
      {shapeMenuOpen && createPortal(<div className="shape-more-menu shape-more-menu-portal" role="menu" style={{ left: shapeMenuPosition.left, top: shapeMenuPosition.top }}>{extraToolGroups.map(group => <div className="tool-group" key={group.label}><div className="tool-group-title">{group.label}</div>{group.items.map(item => <button key={item.id} className={tool === item.id ? 'is-selected' : ''} role="menuitemradio" aria-checked={tool === item.id} onClick={() => { setTool(item.id); setSelected(null); setRightOpen(true); setFrontPanel('properties'); setShapeMenuOpen(false); setConnectionStart(null); setConnectionCursor(null); if (item.id === 'flowchart') { setLeftOpen(true); setTab('library') } if (item.id === 'connect') setTab('layers') }}><item.icon size={18} /><span>{item.label}</span>{tool === item.id && <IconCheck size={14} className="tool-check" />}</button>)}</div>)}</div>, document.body)}
      {workspaceAddOpen && createPortal(<div className="workspace-add-menu workspace-add-menu-portal" role="menu" aria-label="Choose a shape" style={{ left: workspaceAddPosition.left, top: workspaceAddPosition.top }}>{workspaceShapeItems.map(item => <button type="button" key={item.id} role="menuitem" onClick={() => { addWorkspaceShape(item.id); setWorkspaceAddOpen(false) }}><item.icon size={16} /><span>{item.label}</span></button>)}</div>, document.body)}
    <main className={`canvas-area tool-${tool} ${grid ? '' : 'grid-hidden'}`}>
      <IconButton className="panel-toggle left-toggle" label="Workspace — layers & library" active={leftOpen} onClick={() => { setLeftOpen(!leftOpen); setFrontPanel('workspace') }}><IconLayersIntersect size={18} /></IconButton>
      <div className="canvas-settings-trigger"><ThemePicker /><IconButton className="panel-toggle right-toggle" label="Properties" active={rightOpen} onClick={() => { setRightOpen(!rightOpen); setFrontPanel('properties') }}><IconPalette size={18} /></IconButton></div>
      <div className="canvas-top-label"><span className="live-dot" />YOUR CREATIVE SPACE</div>



      <svg ref={svgRef} className="drawing-canvas" viewBox="0 0 1000 700" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={event => pointerUp(event)} onPointerCancel={event => pointerUp(event, true)} onDoubleClick={event => {
        if (editingSessionRef.current || (tool !== 'select' && tool !== 'text')) return
        const id = (event.target as Element).closest('[data-shape]')?.getAttribute('data-shape') ?? selected
        const shape = renderShapes.find(item => item.id === id)
        if (tool === 'select' && shape?.connection && addConnectionRoutePoint(shape, point(event))) { event.preventDefault(); return }
        if (shape) { event.preventDefault(); beginTextEditing(shape) }
      }} aria-label="Drawing canvas">
        <defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.85" fill={themeTokens['--grid']} /></pattern>{[1, 2, 3, 4, 5].map(level => <filter key={level} id={`sloppy-${level}`} x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency={0.018 + level * 0.006} numOctaves="1" seed="7" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale={level * 0.7} /></filter>)}</defs>
        <rect width="1000" height="700" fill={themeTokens['--canvas']} />
        {grid && <rect width="1000" height="700" fill="url(#dots)" />}
        <g transform={`translate(${500 + pan.x} ${350 + pan.y}) scale(${zoom / 100}) translate(-500 -350)`}>
          {renderShapes.map(shape => {
            const routePoints = connectionRoutePoints(shape)
            return <g key={shape.id}>
              <ShapeView shape={shape} selected={selected === shape.id && editingId !== shape.id} interactive={tool === 'select' || tool === 'connect'} editing={editingId === shape.id} />
              {tool === 'select' && selected === shape.id && shape.connection && routePoints.length > 2 && <g data-editor-only="true" className="connection-route-handles">
                {routePoints.slice(1, -1).map((point, index) => <circle key={`${shape.id}-route-${index}`} className="connection-route-handle" data-route-shape={shape.id} data-route-index={index + 1} cx={point.x} cy={point.y} r="6" />)}
              </g>}
            </g>
          })}
          {tool === 'connect' && !editingSession && <g data-editor-only="true">
            {connectionStart && connectionCursor && shapes.some(shape => shape.id === connectionStart.id) && (() => {
              const node = shapes.find(shape => shape.id === connectionStart.id)!
              const source = portPoint(node, connectionStart.port ?? 'bottom')
              return <line x1={source.x} y1={source.y} x2={connectionCursor.x} y2={connectionCursor.y} stroke={themeTokens['--accent']} strokeWidth="2" strokeDasharray="5 5" pointerEvents="none" />
            })()}
            {shapes.filter(isFlowNode).map(node => <g key={node.id} data-shape={node.id}>{ports.map(port => { const point = portPoint(node, port); return <circle key={port} data-port={port} className="flow-connection-port" cx={point.x} cy={point.y} r="5" fill={connectionStart?.id === node.id ? themeTokens['--accent'] : themeTokens['--surface']} stroke={themeTokens['--accent']} strokeWidth="2" /> })}</g>)}
          </g>}
          {editingSession && <InlineTextEditor key={editingSession.shape.id} shape={editingSession.shape} value={editingValue} onChange={setEditingValue} onFinish={finishTextEditing} />}
        </g>
      </svg>
      <div className="canvas-bottom-left"><Toolbar label="Canvas zoom" className="zoom-control"><IconButton label="Zoom out" disabled={zoom <= 25} onClick={() => setZoom(z => Math.max(25, z - 10))}><IconMinus size={16} /></IconButton><button className="zoom-value" title="Reset view" onClick={resetView}>{zoom}%</button><IconButton label="Zoom in" disabled={zoom >= 200} onClick={() => setZoom(z => Math.min(200, z + 10))}><IconPlus size={16} /></IconButton><span className="control-divider" /><IconButton label="Reset view" onClick={resetView}><IconZoomScan size={17} /></IconButton></Toolbar><Toolbar label="History" className="history-control"><IconButton label="Undo (Ctrl+Z)" disabled={!history.length} onClick={undo}><IconArrowBackUp size={18} /></IconButton><IconButton label="Redo (Ctrl+Shift+Z)" disabled={!future.length} onClick={redo}><IconArrowForwardUp size={18} /></IconButton></Toolbar></div>
      <div className="canvas-bottom-right"><IconLock size={12} />Just you and your next big idea.</div>
    </main>
    <FloatingPanel title="Properties" icon={<IconPalette size={15} />} className={`properties-window ${active || tool !== 'select' ? 'show-tool-settings' : ''}`} open={rightOpen} onClose={() => setRightOpen(false)} side="right" width={286} active={frontPanel === 'properties'} onActivate={() => setFrontPanel('properties')}>
      <div className="selection-label"><span className="selection-icon"><ActiveShapeIcon size={18} /></span><div><strong>{propertyTitle}</strong><span>{active ? '1 element selected' : 'For your next creation'}</span></div></div>
      {active && <PropertyField label={active.connection ? "Connection label (Yes / No)" : "Text"}><input aria-label="Element text" className="property-input" value={active.text} onChange={e => updateStyle({ text: e.target.value })} placeholder="Add a label..." /></PropertyField>}
      {!isTextTool && (active || !['select', 'hand'].includes(tool)) && <div className="brush-settings"><div className="brush-preview"><svg viewBox="0 0 230 62" aria-label="ตัวอย่างเส้น" style={{ color: current.stroke, opacity: current.opacity / 100 }}><g transform="translate(15 30)"><BrushStroke points="0,10 20,-12 45,-15 70,10 95,15 120,-12 145,-15 170,10 200,0" width={current.width} brush={current.brush} /></g></svg><span>ตัวอย่างเส้น · {current.width} px</span></div><div className="brush-grid" role="group" aria-label="ชนิดหัวแปรง">{brushes.map(brush => <button key={brush.value} aria-pressed={(current.brush ?? 'pen') === brush.value} className="brush-option" onClick={() => updateStyle({ brush: brush.value })}><svg viewBox="0 0 90 28" aria-hidden="true"><g transform="translate(6 14)"><BrushStroke points="0,4 15,-5 30,-5 45,5 60,5 76,-3" width={brush.value === 'highlighter' ? 5 : 3} brush={brush.value} /></g></svg><strong>{brush.label}</strong><small>{brush.description}</small></button>)}</div></div>}
      <div className="property-section-heading">สีและลักษณะเส้น<span>ขอบคม · Vector</span></div>
      <PropertyField label={isTextTool ? "สีข้อความ" : "สีเส้น"}><ColorPicker label="Stroke" colors={['#3b3948', '#e28087', '#6e9e85', '#6d9dd1', '#68618d']} value={current.stroke} onChange={stroke => updateStyle({ stroke })} /></PropertyField>
      {!isLineTool && <PropertyField label="Background"><ColorPicker label="Background" colors={['none', '#fbe3e4', '#e4f2ec', '#e5effb', '#eeebfa']} value={current.fill} onChange={fill => updateStyle({ fill })} /></PropertyField>}
      {!isTextTool && <PropertyField label={isBrushTool ? 'ขนาดหัวแปรง' : 'ความหนาเส้น'} trailing={<span>{current.width} px</span>}><input aria-label="ความหนาเส้น" className="opacity-slider" type="range" min="1" max="24" step="1" value={current.width} onChange={e => updateStyle({ width: Number(e.target.value) })} /><div className="stroke-presets">{[1, 2, 4, 8, 16, 24].map(width => <button key={width} aria-label={`ความหนา ${width} px`} aria-pressed={current.width === width} onClick={() => updateStyle({ width })}>{width}</button>)}</div></PropertyField>}
      {!isBrushTool && !isTextTool && (!current.brush || current.brush === 'pen') && <PropertyField label="ปลายเส้น"><SegmentedControl label="Line cap" options={[{ value: 'round', label: 'Round', content: <span style={{ fontSize: 14 }}>●</span> }, { value: 'butt', label: 'Butt', content: <span style={{ fontSize: 14 }}>■</span> }]} value={current.lineCap ?? 'round'} onChange={lineCap => updateStyle({ lineCap: lineCap as Shape['lineCap'] })} /></PropertyField>}
      {!isBrushTool && !isTextTool && <PropertyField label="รูปแบบเส้น"><SegmentedControl label="Stroke style" options={[{ value: 'solid', label: 'Solid stroke', content: '━━' }, { value: 'dashed', label: 'Dashed stroke', content: '┄┄┄' }]} value={current.dashed ? 'dashed' : 'solid'} onChange={v => updateStyle({ dashed: v === 'dashed' })} /></PropertyField>}
      <div className="property-section-heading">การแสดงผล</div>
      <PropertyField label="ความทึบ" trailing={<span>{current.opacity}%</span>}><input aria-label="Opacity" className="opacity-slider" type="range" min="10" max="100" value={current.opacity} onChange={e => updateStyle({ opacity: Number(e.target.value) })} /><div className="range-labels"><span>10</span><span>100</span></div></PropertyField>
      {active && <PropertyField label="Arrange"><div className="arrange-actions"><IconButton label="Send to back" onClick={() => reorder(false)}><IconArrowDown size={17} /></IconButton><IconButton label="Bring to front" onClick={() => reorder(true)}><IconArrowUp size={17} /></IconButton><IconButton label="Duplicate (Ctrl+D)" disabled={!!active.connection} onClick={duplicate}><IconCopy size={17} /></IconButton><IconButton label="Delete" onClick={remove}><IconTrash size={17} /></IconButton></div></PropertyField>}
      <div className="canvas-settings"><div className="settings-heading"><IconSettings size={15} />Canvas</div><div className="setting-row"><span>Background</span><span className="background-preview" /><span className="hex-value">{themeTokens['--canvas'].toUpperCase()}</span></div><div className="setting-row"><span>Dot grid</span><Toggle label="Dot grid" checked={grid} onChange={setGrid} /></div></div>
      <div className="properties-footer"><IconMousePointer2 size={16} /><p>{active ? 'Every detail, just how you like it.' : 'Select an element on the canvas to fine-tune its properties.'}</p></div>
    </FloatingPanel>
    </div>
    <StatusBar className="statusbar" start={<><span className="status-dot" /><span>All systems ready</span><span className="status-separator" /><IconDeviceFloppy size={13} /><span>{storageOk ? 'Changes saved to this browser' : 'Storage unavailable — export to save'}</span></>} end={<><span>{shapes.length} elements</span><span className="status-separator" /><span>{active ? '1 selected' : 'Nothing selected'}</span><span className="status-separator" /><button onClick={() => setHelp(true)}>Keyboard shortcuts ↗</button></>} />
    {toast && <div className="toast" role="status"><IconCheck size={16} />{toast}</div>}
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section ref={modalRef} tabIndex={-1} className="shortcuts-modal" role="dialog" aria-modal="true" aria-labelledby="shortcut-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); modalRef.current?.querySelector('button')?.focus() } }}><div className="modal-heading"><h2 id="shortcut-title">A shortcut to your next idea</h2><IconButton label="Close shortcuts" onClick={() => setHelp(false)}><IconX size={20} /></IconButton></div><p>Keep your hands on the keyboard and your ideas moving.</p><div className="shortcut-list">{toolItems.map(t => <div key={t.id}><t.icon size={18} /><span>{t.label}</span><kbd>{t.key}</kbd></div>)}<div><IconArrowBackUp size={18} /><span>Undo / Redo</span><kbd>Ctrl + (Shift) + Z</kbd></div><div><IconCopy size={18} /><span>Duplicate</span><kbd>Ctrl + D</kbd></div><div><IconTrash size={18} /><span>Delete selected</span><kbd>Delete</kbd></div></div><p className="modal-note">Your canvas saves automatically in this browser. Export an SVG to take it with you.</p></section></div>}
  </div>
}
