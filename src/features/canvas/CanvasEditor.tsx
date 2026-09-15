import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ChangeEvent, MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from 'react'
import { IconSitemap, IconArrowDown, IconArrowRight, IconArrowUp, IconArrowsLeftRight, IconChartLine, IconCheck, IconChevronDown, IconCircle, IconCopy, IconDownload, IconGridDots, IconHandStop, IconHelp, IconAdjustmentsHorizontal, IconLayersIntersect, IconLine, IconLink, IconMinus, IconPointer2 as IconMousePointer2, IconPencil, IconPlus, IconRoute, IconSearch, IconSettings, IconPalette, IconSquare, IconTrash, IconTypography, IconArrowBackUp, IconArrowForwardUp, IconShape, IconX, IconZoomScan, IconEye, IconEyeOff, IconEraser, IconSun, IconMoon, IconStar, IconPentagon, IconHexagon, IconOctagon, IconHeart, IconCloud, IconMenu2, IconFolderOpen, IconGripVertical, IconLanguage } from '@tabler/icons-react'
import { Button, IconButton, FloatingPanel, FloatingToolbar, Toolbar, PropertyField, ColorPicker, SegmentedControl, Toggle } from '../../components/ui'
import { defaultStyle, isTableFlowKind, normalizeTableData, readBoard } from './model'
import type { DrawingStyle, FlowNodeKind, LayerGroup, Port, Shape, Tool } from './model'
import { resizeShape, shapeBounds } from './resize'
import { BrushStroke } from './BrushStroke'
import { eraseFreehand } from './eraser'
import { ShapeView } from './ShapeView'
import { InlineTextEditor } from './InlineTextEditor'
import { FlowchartLibrary } from './flowchart/FlowchartLibrary'
import { createConnection, createFlowNode, createFlowTemplate, isFlowNode, portPoint, ports, removeFlowItem, resolveConnection } from './flowchart'
import type { FlowTemplateId } from './flowchart'
import { useTheme } from '../../theme/useTheme'
import { ApplicationMenu } from '../../components/ui/ApplicationMenu'
import { getThemeTokens, themes } from '../../theme/themes'
import { useLanguage } from '../../i18n/LanguageProvider'

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
  { id: 'eraser', label: 'Eraser', key: 'X', icon: IconEraser },
  { id: 'text', label: 'Text', key: 'T', icon: IconTypography },
  { id: 'flowchart', label: 'Flowchart', key: 'F', icon: IconSitemap },
  { id: 'connect', label: 'Connect nodes', key: 'C', icon: IconLine },
] as const
const thaiToolLabels: Record<(typeof toolItems)[number]['id'], string> = { hand: 'เลื่อนพื้นที่', select: 'เลือก', rectangle: 'สี่เหลี่ยม', diamond: 'สี่เหลี่ยมข้าวหลามตัด', ellipse: 'วงรี', arrow: 'ลูกศร', line: 'เส้นตรง', elbow: 'เส้นข้อศอก', curve: 'เส้นโค้ง', 'double-arrow': 'ลูกศรสองทาง', draw: 'วาด', eraser: 'ยางลบ', text: 'ข้อความ', flowchart: 'ผังงาน', connect: 'เชื่อมโหนด' }
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
const extraToolKeys = { star: 'Q', pentagon: 'W', hexagon: 'G', octagon: 'J', heart: 'K', cloud: 'N', parallelogram: 'I' } as const
type ExportCanvasOptions = { background?: string | null; padding?: number; includeGrid?: boolean }
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
    if (value && typeof value.stroke === 'string' && typeof value.fill === 'string' && Number.isFinite(value.width) && Number.isFinite(value.opacity)) return { ...defaultStyle, stroke: value.stroke, fill: value.fill, width: value.width, opacity: value.opacity, ...(value.lineCap && ['round', 'butt', 'square'].includes(value.lineCap) ? { lineCap: value.lineCap } : {}), ...(value.brush && ['pen', 'brush', 'marker', 'highlighter'].includes(value.brush) ? { brush: value.brush } : {}), ...(typeof value.dashed === 'boolean' ? { dashed: value.dashed } : {}), ...(Number.isInteger(value.sloppiness) && value.sloppiness >= 0 && value.sloppiness <= 5 ? { sloppiness: value.sloppiness } : {}) }
  } catch { /* Storage may be unavailable. */ }
  return defaultStyle
}
function drawingStyleOnly(source: DrawingStyle): DrawingStyle {
  return { stroke: source.stroke, fill: source.fill, width: source.width, opacity: source.opacity, lineCap: source.lineCap, brush: source.brush, dashed: source.dashed, sloppiness: source.sloppiness }
}
function savedCanvasBackground() {
  try {
    const value = JSON.parse(localStorage.getItem('devcanvas-canvas-background') || 'null')
    if (typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value)) return value
  } catch { /* Storage may be unavailable. */ }
  return null
}
function ExportChecklist({ title, value, options, onChange }: { title: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <fieldset className="export-checklist-group"><legend>{title}</legend>{options.map(option => <label key={option.value} className="export-check-option"><input type="checkbox" checked={value === option.value} onChange={() => onChange(option.value)} /><span>{option.label}</span></label>)}</fieldset>
}
function ExportImageDialog({ open, onClose, previewMarkup, background, format, setFormat, theme, setTheme, backgroundColor, setBackgroundColor, padding, setPadding, includeBackground, setIncludeBackground, includeGrid, setIncludeGrid, onExport }: { open: boolean; onClose: () => void; previewMarkup: string; background: string; format: 'png' | 'jpg' | 'svg'; setFormat: (value: 'png' | 'jpg' | 'svg') => void; theme: 'current' | 'light' | 'dark'; setTheme: (value: 'current' | 'light' | 'dark') => void; backgroundColor: string; setBackgroundColor: (value: string) => void; padding: number; setPadding: (value: number) => void; includeBackground: boolean; setIncludeBackground: (value: boolean) => void; includeGrid: boolean; setIncludeGrid: (value: boolean) => void; onExport: () => void }) {
  const { tr } = useLanguage()
  if (!open) return null
  return <div className="export-dialog-layer" role="presentation" onPointerDown={event => event.stopPropagation()}><section className="export-dialog" role="dialog" aria-modal="true" aria-labelledby="export-dialog-title"><div className="export-dialog-heading"><div><span>{tr('ส่งออก', 'EXPORT')}</span><h2 id="export-dialog-title">{tr('ส่งออกภาพ', 'Export Image')}</h2></div><IconButton label={tr('ปิดหน้าต่างส่งออก', 'Close export dialog')} onClick={onClose}><IconX size={17} /></IconButton></div><div className="export-dialog-preview" style={{ background: includeBackground ? background : 'repeating-conic-gradient(#e7e7ec 0% 25%, #fff 0% 50%) 50% / 12px 12px' }} dangerouslySetInnerHTML={{ __html: previewMarkup }} /><div className="export-dialog-checklists"><ExportChecklist title={tr('รูปแบบไฟล์', 'Format')} value={format} options={[{ value: 'png', label: 'PNG' }, { value: 'jpg', label: 'JPG' }, { value: 'svg', label: 'SVG' }]} onChange={value => setFormat(value as 'png' | 'jpg' | 'svg')} /><ExportChecklist title={tr('ธีม', 'Theme')} value={theme} options={[{ value: 'current', label: tr('Canvas ปัจจุบัน', 'Current canvas') }, { value: 'light', label: tr('ธีมสว่าง', 'Light theme') }, { value: 'dark', label: tr('ธีมมืด', 'Dark theme') }]} onChange={value => setTheme(value as 'current' | 'light' | 'dark')} /></div><div className="export-dialog-settings"><div className="export-setting"><label>{tr('สีพื้นหลัง', 'Background color')}</label><ColorPicker label={tr('สีพื้นหลังสำหรับส่งออก', 'Export background color')} colors={['#ffffff', '#faf9fc', '#202126', '#f7faff', '#f7fbf8']} value={backgroundColor} onChange={setBackgroundColor} /></div><div className="export-setting"><label>{tr('ระยะขอบ', 'Padding')} <span>{padding}px</span></label><input className="opacity-slider" type="range" min="0" max="120" step="4" value={padding} onChange={event => setPadding(Number(event.target.value))} /></div><label className="export-check"><input type="checkbox" checked={includeBackground} onChange={event => setIncludeBackground(event.target.checked)} />{tr('รวมพื้นหลัง', 'Include background')}</label><label className="export-check"><input type="checkbox" checked={includeGrid} onChange={event => setIncludeGrid(event.target.checked)} />{tr('รวมจุดกริด', 'Include dot grid')}</label></div><Button variant="primary" icon={<IconDownload size={15} />} onClick={onExport}>{tr('ส่งออก', 'Export')} {format.toUpperCase()}</Button></section></div>
}
function ResetCanvasDialog({ open, count, onCancel, onConfirm }: { open: boolean; count: number; onCancel: () => void; onConfirm: () => void }) {
  const { tr } = useLanguage()
  if (!open) return null
  return <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}><section className="reset-canvas-dialog" role="dialog" aria-modal="true" aria-labelledby="reset-canvas-title" onMouseDown={event => event.stopPropagation()}><div className="reset-canvas-icon"><IconTrash size={20} /></div><div><h2 id="reset-canvas-title">{tr('ล้างพื้นที่วาดหรือไม่?', 'Reset canvas?')}</h2><p>{tr(`การดำเนินการนี้จะลบ ${count} ${count === 1 ? 'รายการ' : 'รายการ'} จากพื้นที่วาดปัจจุบัน และคุณสามารถเลิกทำได้ภายหลัง.`, `This will remove ${count} ${count === 1 ? 'element' : 'elements'} from the current canvas. You can undo this action afterwards.`)}</p></div><div className="reset-canvas-actions"><Button onClick={onCancel}>{tr('ยกเลิก', 'Cancel')}</Button><Button variant="primary" className="reset-canvas-confirm" icon={<IconTrash size={15} />} onClick={onConfirm}>{tr('ล้างพื้นที่วาด', 'Reset canvas')}</Button></div></section></div>
}

export function CanvasEditor() {
  const { preference, setMode, setTheme } = useTheme()
  const { language, setLanguage, tr } = useLanguage()
  const themeTokens = getThemeTokens(preference)
  const [customCanvasBackground, setCustomCanvasBackground] = useState<string | null>(savedCanvasBackground)
  const canvasBackground = customCanvasBackground ?? themeTokens['--canvas']
  const [saved] = useState(readBoard)
  const [shapes, setShapes] = useState<Shape[]>(saved.shapes)
  const [groups, setGroups] = useState<LayerGroup[]>(saved.groups)
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
  const [relationshipLine, setRelationshipLine] = useState<string | null>(null)
  const [marquee, setMarquee] = useState<{ x: number; y: number; w: number; h: number } | null>(null)
  const [connectionCursor, setConnectionCursor] = useState<{ x: number; y: number } | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [editingSession, setEditingSession] = useState<{ shape: Shape; isNew: boolean } | null>(null)
  const [editingValue, setEditingValue] = useState('')
  const editingSessionRef = useRef<typeof editingSession>(null)
  const editingId = editingSession?.shape.id
  const [style, setStyle] = useState<DrawingStyle>(savedDrawingStyle)
  const [eraserSize, setEraserSize] = useState(18)
  const [eraserCursor, setEraserCursor] = useState<{ x: number; y: number } | null>(null)
  const [zoom, setZoom] = useState(100)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [grid, setGrid] = useState(true)
  const [leftOpen, setLeftOpen] = useState(() => savedPanelState('devcanvas-workspace-open'))
  const [rightOpen, setRightOpen] = useState(() => savedPanelState('devcanvas-properties-open'))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [filesOpen, setFilesOpen] = useState(false)
  const [exportFormat, setExportFormat] = useState<'svg' | 'png' | 'jpg' | 'project'>('png')
  const [exportImageOpen, setExportImageOpen] = useState(false)
  const [exportBackground, setExportBackground] = useState(true)
  const [exportBackgroundColor, setExportBackgroundColor] = useState(canvasBackground)
  const [exportTheme, setExportTheme] = useState<'current' | 'light' | 'dark'>('current')
  const [exportPadding, setExportPadding] = useState(24)
  const [exportGrid, setExportGrid] = useState(false)
  const [exportPreviewMarkup, setExportPreviewMarkup] = useState('')
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false)
  const [settingsTab, setSettingsTab] = useState<'appearance' | 'canvas' | 'language'>('appearance')
  const [frontPanel, setFrontPanel] = useState<'workspace' | 'library' | 'properties' | 'settings' | 'files' | 'toolbar'>('workspace')
  const [libraryOpen, setLibraryOpen] = useState(false)
  const [canvasLayersOpen, setCanvasLayersOpen] = useState(true)
  const [workspaceAddOpen, setWorkspaceAddOpen] = useState(false)
  const [draggedLayerId, setDraggedLayerId] = useState<string | null>(null)
  const [dropLayerId, setDropLayerId] = useState<string | null>(null)
  const [layerSelection, setLayerSelection] = useState<Set<string>>(new Set())
  const [groupSelection, setGroupSelection] = useState<Set<string>>(new Set())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const [renamingLayerId, setRenamingLayerId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renamingGroupId, setRenamingGroupId] = useState<string | null>(null)
  const [groupRenameValue, setGroupRenameValue] = useState('')
  const [query, setQuery] = useState('')
  const [history, setHistory] = useState<Shape[][]>([])
  const [future, setFuture] = useState<Shape[][]>([])
  const [help, setHelp] = useState(false)
  const [toast, setToast] = useState('')
  const [, setStorageOk] = useState(true)
  const svgRef = useRef<SVGSVGElement>(null)
  const modalRef = useRef<HTMLElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const gesture = useRef<{ kind: 'move' | 'draw' | 'pan' | 'route' | 'resize' | 'erase' | 'marquee'; handle?: number; id?: string; routeIndex?: number; erasedIds?: Set<string>; additive?: boolean; x: number; y: number; original?: Shape; groupOriginals?: Shape[]; before: Shape[]; pan: { x: number; y: number }; moved: boolean } | null>(null)
  const connectionDrag = useRef<{ pointerId: number; sourceId: string; sourcePort?: Port; x: number; y: number; moved: boolean } | null>(null)
  const renderShapes = shapes.filter(shape => !shape.hidden).map(shape => resolveConnection(shape, shapes))
  // An item is editable only in Selection mode. This prevents an old table
  // selection from leaking its cells and style into a newly chosen tool.
  const active = tool === 'select' ? renderShapes.find(s => s.id === selected) : undefined
  const current = active ?? style
  const selectedTool = toolItems.find(item => item.id === tool) ?? extraToolItems.find(item => item.id === tool)
  const MoreToolIcon = extraToolItems.find(item => item.id === tool)?.icon ?? IconPlus
  const ActiveShapeIcon = toolItems.find(item => item.id === active?.type)?.icon ?? extraToolItems.find(item => item.id === active?.type)?.icon ?? selectedTool?.icon ?? IconAdjustmentsHorizontal
  const propertyTitle = active ? active.type.charAt(0).toUpperCase() + active.type.slice(1) : selectedTool?.label ?? 'Drawing style'
  const propertyType = active?.type ?? tool
  const isBrushTool = propertyType === 'draw'
  const isTextTool = propertyType === 'text'
  const isUtilityTool = !active && ['select', 'hand', 'connect', 'flowchart', 'eraser'].includes(tool)
  const isLineTool = isBrushTool || ['arrow', 'line', 'elbow', 'curve', 'double-arrow', 'connect', 'text'].includes(propertyType) || !!active?.connection
  const activeTableData = active && isTableFlowKind(active.flowKind) ? active.tableData : undefined

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try { localStorage.setItem('devcanvas-board', JSON.stringify({ shapes, groups, title })); setStorageOk(true) }
      catch { setStorageOk(false) }
    }, 150)
    return () => window.clearTimeout(timer)
  }, [shapes, groups, title])
  useEffect(() => {
    try { localStorage.setItem('devcanvas-workspace-open', String(leftOpen)); localStorage.setItem('devcanvas-properties-open', String(rightOpen)) } catch { /* Storage may be unavailable. */ }
  }, [leftOpen, rightOpen])
  useEffect(() => {
    try { localStorage.setItem('devcanvas-drawing-style', JSON.stringify(style)) } catch { /* Storage may be unavailable. */ }
  }, [style])
  useEffect(() => {
    try { localStorage.setItem('devcanvas-canvas-background', JSON.stringify(customCanvasBackground)) } catch { /* Storage may be unavailable. */ }
  }, [customCanvasBackground])
  useEffect(() => { if (!toast) return; const id = window.setTimeout(() => setToast(''), 2800); return () => window.clearTimeout(id) }, [toast])
  useEffect(() => {
    if (!exportImageOpen) return
    const background = exportBackground ? (exportTheme === 'current' ? exportBackgroundColor : exportTheme === 'dark' ? '#202126' : '#ffffff') : null
    const frame = window.requestAnimationFrame(() => setExportPreviewMarkup(canvasSvgMarkup({ background, padding: exportPadding, includeGrid: exportGrid }) ?? ''))
    return () => window.cancelAnimationFrame(frame)
  }, [exportImageOpen, exportBackground, exportBackgroundColor, exportTheme, exportPadding, exportGrid, shapes, selected, pan, zoom, grid])
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
  const remove = useCallback(() => {
    if (layerSelection.size || groupSelection.size) { removeSelectedLayers(); return }
    if (selected) { commit(removeFlowItem(shapes, selected)); setSelected(null); setConnectionStart(null) }
  }, [commit, selected, shapes, layerSelection, groupSelection])
  const duplicate = useCallback(() => {
    if (layerSelection.size || groupSelection.size) { duplicateSelectedLayers(); return }
    const original = shapes.find(shape => shape.id === selected)
    if (!original || original.connection) return
    const copy = { ...original, id: crypto.randomUUID(), x: original.x + 24, y: original.y + 24 }
    commit([...shapes, copy]); setSelected(copy.id)
  }, [selected, commit, shapes, layerSelection, groupSelection])
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const code = e.code
      if (e.key === 'Escape') {
        if (exportImageOpen) { setExportImageOpen(false); return }
        if (resetConfirmOpen) { setResetConfirmOpen(false); return }
        if (help) { setHelp(false); return }
        setSelected(null); setTool('select'); setShapeMenuOpen(false); setConnectionStart(null); setConnectionCursor(null); return
      }
      if (help || exportImageOpen || resetConfirmOpen || editingSessionRef.current || (e.target as HTMLElement).closest('input, textarea, select, [contenteditable]')) return
      if (e.key === 'Enter' && tool === 'select' && active) { e.preventDefault(); beginTextEditing(active); return }
      if ((e.ctrlKey || e.metaKey) && code === 'KeyZ') { e.preventDefault(); if (e.shiftKey) redo(); else undo(); return }
      if ((e.ctrlKey || e.metaKey) && code === 'KeyD') { e.preventDefault(); duplicate(); return }
      if (e.ctrlKey || e.metaKey) {
        if (code === 'KeyO') { e.preventDefault(); importInputRef.current?.click(); return }
        if (code === 'KeyS') { e.preventDefault(); exportProject(); return }
        if (code === 'KeyE') { e.preventDefault(); setExportImageOpen(true); return }
        if (code === 'KeyA') { e.preventDefault(); setLayerSelection(new Set(shapes.map(shape => shape.id))); setGroupSelection(new Set()); return }
        if (code === 'KeyG') { e.preventDefault(); setGrid(value => !value); return }
        if (code === 'Comma') { e.preventDefault(); setSettingsOpen(true); setRightOpen(false); setFilesOpen(false); setFrontPanel('settings'); return }
        if (code === 'KeyL') { e.preventDefault(); setLibraryOpen(open => !open); setFrontPanel('library'); return }
        if (code === 'KeyP') { e.preventDefault(); setRightOpen(open => !open); setSettingsOpen(false); setFilesOpen(false); setFrontPanel('properties'); return }
      }
      if (e.altKey) {
        if (code === 'Digit1') { e.preventDefault(); setFilesOpen(open => !open); setFrontPanel('files'); return }
        if (code === 'Digit2') { e.preventDefault(); setLeftOpen(open => !open); setFrontPanel('workspace'); return }
        if (code === 'Digit3') { e.preventDefault(); setRightOpen(open => !open); setFrontPanel('properties'); return }
        if (code === 'Digit4') { e.preventDefault(); setSettingsOpen(open => !open); setFrontPanel('settings'); return }
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return
      if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove() }
      if (code === 'Equal' || code === 'NumpadAdd') { e.preventDefault(); setZoom(value => Math.min(200, value + 10)); return }
      if (code === 'Minus' || code === 'NumpadSubtract') { e.preventDefault(); setZoom(value => Math.max(25, value - 10)); return }
      if (code === 'Digit0' || code === 'Numpad0') { e.preventDefault(); resetView(); return }
      const match = toolItems.find((t, index) => code === `Key${t.key}` || (index < 9 && code === `Digit${index + 1}`))
      if (match) {
        setTool(match.id); setSelected(null); setSettingsOpen(false); setFilesOpen(false); setRightOpen(true); setFrontPanel('properties'); setFlowchartOneShot(false); setConnectionStart(null); setConnectionCursor(null)
        if (match.id === 'flowchart') { setLibraryOpen(true); setFrontPanel('library') }
      }
      const extraMatch = Object.entries(extraToolKeys).find(([, key]) => code === `Key${key}`)
      if (extraMatch) {
        setTool(extraMatch[0] as Tool); setSelected(null); setSettingsOpen(false); setFilesOpen(false); setRightOpen(true); setFrontPanel('properties'); setShapeMenuOpen(false); setConnectionStart(null); setConnectionCursor(null)
      }
      if (code === 'Slash') setHelp(true)
    }
    window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey)
  }, [undo, redo, remove, duplicate, help, exportImageOpen, resetConfirmOpen, active, tool, beginTextEditing])
  function updateStyle(patch: Partial<Shape>) {
    const stylePatch: Partial<DrawingStyle> = {}
    if (patch.stroke !== undefined) stylePatch.stroke = patch.stroke
    if (patch.fill !== undefined) stylePatch.fill = patch.fill
    if (patch.width !== undefined) stylePatch.width = patch.width
    if (patch.opacity !== undefined) stylePatch.opacity = patch.opacity
    if (patch.lineCap !== undefined) stylePatch.lineCap = patch.lineCap
    if (patch.brush !== undefined) stylePatch.brush = patch.brush
    if (patch.dashed !== undefined) stylePatch.dashed = patch.dashed
    if (patch.sloppiness !== undefined) stylePatch.sloppiness = patch.sloppiness
    setStyle(s => drawingStyleOnly({ ...s, ...stylePatch }))
    if (active) commit(shapes.map(s => s.id === selected ? { ...s, ...patch } : s))
  }
  function updateTableCell(row: number, column: number, value: string) {
    if (!active?.tableData) return
    const tableData = active.tableData.map(cells => [...cells]); tableData[row][column] = value
    updateStyle({ tableData })
  }
  function addTableRow() {
    if (!active?.tableData) return
    const columns = Math.max(...active.tableData.map(row => row.length), 1)
    updateStyle({ tableData: [...active.tableData, Array(columns).fill('')] })
  }
  function addTableColumn() {
    if (!active?.tableData) return
    updateStyle({ tableData: active.tableData.map((row, index) => [...row, index === 0 ? `Column ${row.length + 1}` : '']) })
  }
  function point(e: ReactPointerEvent<SVGSVGElement> | ReactMouseEvent<SVGSVGElement>) {
    const svg = svgRef.current!; const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY
    const local = p.matrixTransform(svg.getScreenCTM()!.inverse())
    return { x: (local.x - 500 - pan.x) / (zoom / 100) + 500, y: (local.y - 350 - pan.y) / (zoom / 100) + 350 }
  }
  function eraseAt(at: { x: number; y: number }, targetId: string | null | undefined, erasedIds: Set<string>) {
    setShapes(items => {
      let changed = false
      let next = items.flatMap(shape => {
        const pieces = eraseFreehand(shape, at, eraserSize / 2)
        if (pieces === null) return [shape]
        changed = true; erasedIds.add(shape.id)
        return pieces
      })
      const target = targetId && next.find(shape => shape.id === targetId)
      if (target && target.type !== 'draw') {
        changed = true; erasedIds.add(target.id)
        next = removeFlowItem(next, target.id)
      }
      return changed ? next : items
    })
    setSelected(null)
  }
  function connectionRoutePoints(shape: Shape) {
    if (!shape.connection || !shape.points) return []
    return shape.points.split(' ').map(pair => { const [x, y] = pair.split(',').map(Number); return { x: shape.x + x, y: shape.y + y } })
  }
  function belongsToGroup(groupId: string | undefined, ancestorId: string): boolean {
    const seen = new Set<string>()
    while (groupId && !seen.has(groupId)) {
      if (groupId === ancestorId) return true
      seen.add(groupId)
      groupId = groups.find(group => group.id === groupId)?.parentId
    }
    return false
  }
  function transformGroupId(shape: Shape) {
    const selectedGroupId = groupSelection.size === 1 ? [...groupSelection][0] : undefined
    return selectedGroupId && belongsToGroup(shape.groupId, selectedGroupId) ? selectedGroupId : shape.groupId
  }
  function originalsForGroup(shape: Shape) {
    if (layerSelection.size > 1 && layerSelection.has(shape.id)) return shapes.filter(item => layerSelection.has(item.id) && !item.connection)
    const groupId = transformGroupId(shape)
    return groupId ? shapes.filter(item => belongsToGroup(item.groupId, groupId) && !item.connection) : [shape]
  }
  function resizeGroup(originals: Shape[], handle: number, cursor: { x: number; y: number }, shift: boolean) {
    const minX = Math.min(...originals.map(item => item.x)); const minY = Math.min(...originals.map(item => item.y))
    const maxX = Math.max(...originals.map(item => item.x + item.w)); const maxY = Math.max(...originals.map(item => item.y + item.h))
    const bounds: Shape = { ...originals[0], x: minX, y: minY, w: maxX - minX, h: maxY - minY }
    const resized = resizeShape(bounds, handle, cursor, shift)
    const sx = bounds.w ? resized.w / bounds.w : 1; const sy = bounds.h ? resized.h / bounds.h : 1
    return originals.map(item => ({ ...item, x: resized.x + (item.x - bounds.x) * sx, y: resized.y + (item.y - bounds.y) * sy, w: item.w * sx, h: item.h * sy }))
  }
  function pointerDown(e: ReactPointerEvent<SVGSVGElement>) {
    if (e.button === 1) {
      e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
      const p = point(e); gesture.current = { kind: 'pan', ...p, before: shapes, pan, moved: false }
      return
    }
    if (e.button !== 0) return
    if (editingSessionRef.current) { finishTextEditing(true); return }
    setShapeMenuOpen(false)
    const p = point(e); const eventTarget = e.target as Element
    const selectionAction = eventTarget.closest('[data-selection-action]')?.getAttribute('data-selection-action')
    if (selectionAction) {
      e.preventDefault()
      if (selectionAction === 'select-all') { setLayerSelection(new Set(shapes.map(shape => shape.id))); setGroupSelection(new Set()); return }
      if (selectionAction === 'duplicate') hasCombinedSelection ? duplicateSelectedLayers() : duplicate()
      if (selectionAction === 'delete') hasCombinedSelection ? removeSelectedLayers() : remove()
      return
    }
    const nodeActionTarget = eventTarget.closest('[data-node-action]')
    const nodeAction = nodeActionTarget?.getAttribute('data-node-action')
    const nodeActionSource = shapes.find(shape => shape.id === nodeActionTarget?.closest('[data-node-toolbar]')?.getAttribute('data-node-toolbar'))
    if (nodeActionSource && isFlowNode(nodeActionSource) && nodeAction) {
      e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
      if (nodeAction === 'connect') {
        setTool('connect'); setSelected(null); setConnectionStart({ id: nodeActionSource.id }); setConnectionCursor(null); setFlowchartOneShot(false)
        setToast('เลือกจุดเชื่อมบนโหนดปลายทางเพื่อสร้างเส้นเชื่อม')
      } else if (nodeAction === 'edit') {
        setTool('select'); setSelected(nodeActionSource.id); beginTextEditing(nodeActionSource)
      } else if (nodeAction === 'duplicate') {
        const copy = { ...nodeActionSource, id: crypto.randomUUID(), x: nodeActionSource.x + 24, y: nodeActionSource.y + 24 }
        commit([...shapes, copy]); setSelected(copy.id); setToast('ทำสำเนา Node แล้ว')
      } else if (nodeAction === 'delete') {
        commit(removeFlowItem(shapes, nodeActionSource.id)); setSelected(null); setConnectionStart(null); setToast('ลบ Node แล้ว')
      }
      return
    }
    const resizeTarget = eventTarget.closest('[data-resize-shape]')
    if (resizeTarget) {
      const original = shapes.find(s => s.id === resizeTarget.getAttribute('data-resize-shape'))
      const handle = Number(resizeTarget.getAttribute('data-resize-handle'))
      if (original && !original.connection && Number.isInteger(handle) && handle >= 0 && handle <= 3) {
        e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
        setTool('select'); setSelected(original.id)
        gesture.current = { kind: 'resize', id: original.id, handle, ...p, original, groupOriginals: originalsForGroup(original), before: shapes, pan, moved: false }
        return
      }
    }
    const selectionBoundsTarget = eventTarget.closest('[data-selection-bounds]')
    if (tool === 'select' && selectionBoundsTarget && selectionTransformMembers.length > 1) {
      const original = selectionTransformMembers[0]
      e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
      setSelected(original.id)
      gesture.current = { kind: 'move', id: original.id, ...p, original, groupOriginals: selectionTransformMembers, before: shapes, pan, moved: false }
      return
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
    const portTarget = eventTarget.closest('[data-port]')
    if (tool === 'eraser') {
      e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
      const erasedIds = new Set<string>()
      setEraserCursor(p)
      gesture.current = { kind: 'erase', erasedIds, ...p, before: shapes, pan, moved: false }
      eraseAt(p, targetId, erasedIds)
      return
    }
    if (tool === 'connect' && !portTarget) {
      e.preventDefault()
      if (!targetId) {
        setTool('select'); setSelected(null); setConnectionStart(null); setConnectionCursor(null); setRelationshipLine(null)
        setToast('ออกจากโหมดเชื่อมโหนดแล้ว')
      } else setToast('เลือกจุดเชื่อมบนขอบโหนดเพื่อเริ่มหรือจบเส้น')
      return
    }
    if (clickedNode && isFlowNode(clickedNode) && tool !== 'hand' && tool !== 'draw' && !e.altKey && !portTarget) {
      e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
      setSelected(clickedNode.id)
      setSettingsOpen(false); setFilesOpen(false); setRightOpen(true); setFrontPanel('properties'); setFlowchartOneShot(false)
      connectionDrag.current = null
      gesture.current = { kind: 'move', id: clickedNode.id, ...p, original: clickedNode, groupOriginals: originalsForGroup(clickedNode), before: shapes, pan, moved: false }
      return
    }
    const connecting = tool === 'connect'
    if (clickedNode && !clickedNode.connection && tool !== 'hand' && tool !== 'draw' && !connecting && !e.altKey) {
      e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId)
      setTool('select'); setSelected(clickedNode.id)
      setSettingsOpen(false); setFilesOpen(false); setRightOpen(true); setFrontPanel('properties'); setFlowchartOneShot(false)
      setConnectionStart(null); setConnectionCursor(null); connectionDrag.current = null
      gesture.current = { kind: 'move', id: clickedNode.id, ...p, original: clickedNode, groupOriginals: originalsForGroup(clickedNode), before: shapes, pan, moved: false }
      return
    }
    if (tool === 'flowchart') {
      const node = createFlowNode(flowKind, p, drawingStyleOnly(style))
      commit([...shapes, node]); setSelected(node.id)
      if (flowchartOneShot) { setTool('select'); setFlowchartOneShot(false) }
      return
    }
    if (tool === 'connect') {
      const node = shapes.find(shape => shape.id === targetId)
      if (!node || !isFlowNode(node)) { setConnectionStart(null); setConnectionCursor(null); return }
      const candidatePort = portTarget?.getAttribute('data-port')
      const port = ports.find(item => item === candidatePort)
      e.currentTarget.setPointerCapture(e.pointerId)
      connectionDrag.current = { pointerId: e.pointerId, sourceId: node.id, sourcePort: port, x: p.x, y: p.y, moved: false }
      if (!connectionStart || !shapes.some(shape => shape.id === connectionStart.id)) {
        setConnectionStart({ id: node.id, port }); setConnectionCursor(p); setSelected(node.id)
      } else {
        const edge = createConnection({ from: connectionStart.id, to: node.id, fromPort: connectionStart.port, toPort: port }, shapes, relationshipLine && ['Dependency', 'Response', 'Async message'].includes(relationshipLine) ? { ...drawingStyleOnly(style), dashed: true } : drawingStyleOnly(style))
        if (edge) { const decorated = relationshipLine ? { ...edge, relationship: relationshipLine, text: relationshipLine } : edge; commit([...shapes, decorated]); setSelected(edge.id); setConnectionStart(null); setConnectionCursor(null) }
        else setToast('เลือกโหนดปลายทางอื่น หรือเส้นเชื่อมนี้มีอยู่แล้ว')
      }
      return
    }
    if (tool === 'text') {
      e.preventDefault()
      const target = renderShapes.find(shape => shape.id === targetId)
      if (target) beginTextEditing(target)
      else beginTextEditing({ id: crypto.randomUUID(), type: 'text', ...p, w: 220, h: 44, ...drawingStyleOnly(style), fill: 'none', text: '' }, true)
      return
    }
    e.currentTarget.setPointerCapture(e.pointerId)
    if (tool === 'hand') { gesture.current = { kind: 'pan', ...p, before: shapes, pan, moved: false }; return }
    if (tool === 'select') {
      setSelected(targetId || null)
      const original = shapes.find(s => s.id === targetId)
      if (original && !original.connection) gesture.current = { kind: 'move', id: original.id, ...p, original, before: shapes, pan, moved: false }
      else if (!targetId) { gesture.current = { kind: 'marquee', additive: e.shiftKey, ...p, before: shapes, pan, moved: false }; setMarquee({ x: p.x, y: p.y, w: 0, h: 0 }); if (!e.shiftKey) { setLayerSelection(new Set()); setGroupSelection(new Set()) } }
      return
    }
    const shape: Shape = { id: crypto.randomUUID(), type: tool, ...p, w: 0, h: 0, ...drawingStyleOnly(style), width: style.width, text: '', points: tool === 'draw' ? '0,0' : undefined }
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
    const p = point(e)
    if (tool === 'eraser') setEraserCursor(p)
    const g = gesture.current; if (!g) return
    const dx = p.x - g.x; const dy = p.y - g.y
    if (Math.hypot(dx, dy) * zoom / 100 > 4) g.moved = true
    if (g.kind === 'move' && !g.moved) return
    if (g.kind === 'move') { setTool('select'); setConnectionStart(null); setConnectionCursor(null) }
    if (g.kind === 'pan') { setPan({ x: pan.x + dx * zoom / 100, y: pan.y + dy * zoom / 100 }); return }
    if (g.kind === 'marquee') { setMarquee({ x: Math.min(g.x, p.x), y: Math.min(g.y, p.y), w: Math.abs(dx), h: Math.abs(dy) }); return }
    if (g.kind === 'erase') {
      const hit = document.elementFromPoint(e.clientX, e.clientY)
      const id = hit?.closest('[data-shape]')?.getAttribute('data-shape')
      eraseAt(p, id, g.erasedIds!)
      return
    }
    if (g.kind === 'route') {
      setShapes(items => items.map(s => s.id === g.id ? { ...s, route: g.original!.route!.map((point, index) => index === g.routeIndex ? { x: p.x, y: p.y } : point) } : s))
      return
    }
    setShapes(items => items.map(s => {
      const grouped = g.groupOriginals && g.groupOriginals.length > 1
      if (s.id !== g.id && !(grouped && g.groupOriginals!.some(item => item.id === s.id))) return s
      if (g.kind === 'resize') return grouped ? resizeGroup(g.groupOriginals!, g.handle!, p, e.shiftKey).find(item => item.id === s.id) ?? s : resizeShape(g.original!, g.handle!, p, e.shiftKey)
      if (g.kind === 'move') { const original = grouped ? g.groupOriginals!.find(item => item.id === s.id) : g.original; return { ...s, x: original!.x + dx, y: original!.y + dy } }
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
        const edge = target && targetPort && isFlowNode(target) ? createConnection({ from: drag.sourceId, to: target.id, fromPort: drag.sourcePort, toPort: targetPort }, shapes, relationshipLine && ['Dependency', 'Response', 'Async message'].includes(relationshipLine) ? { ...drawingStyleOnly(style), dashed: true } : drawingStyleOnly(style)) : null
        if (edge) { const decorated = relationshipLine ? { ...edge, relationship: relationshipLine, text: relationshipLine } : edge; commit([...shapes, decorated]); setSelected(edge.id) }
        else setToast('ลากไปยังโหนดปลายทางเพื่อสร้างเส้นเชื่อม')
        setConnectionStart(null); setConnectionCursor(null)
      }
      connectionDrag.current = null
      if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      return
    }
    const g = gesture.current; if (!g) return
    if (g.kind === 'marquee') {
      if (!cancel && g.moved) {
        const left = Math.min(g.x, event?.clientX === undefined ? g.x : point(event).x), right = Math.max(g.x, event?.clientX === undefined ? g.x : point(event).x)
        const top = Math.min(g.y, event?.clientY === undefined ? g.y : point(event).y), bottom = Math.max(g.y, event?.clientY === undefined ? g.y : point(event).y)
        const ids = shapes.filter(shape => !shape.hidden && Math.max(shape.x, shape.x + shape.w) >= left && Math.min(shape.x, shape.x + shape.w) <= right && Math.max(shape.y, shape.y + shape.h) >= top && Math.min(shape.y, shape.y + shape.h) <= bottom).map(shape => shape.id)
        setLayerSelection(current => g.additive ? new Set([...current, ...ids]) : new Set(ids)); setSelected(ids[0] ?? null); setGroupSelection(new Set())
      }
      setMarquee(null); gesture.current = null
      if (event?.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
      return
    }
    if (cancel || (g.kind === 'draw' && !g.moved)) { setShapes(g.before); if (g.kind !== 'route') setSelected(null) }
    else if (g.kind === 'erase' && g.erasedIds?.size) {
      setHistory(h => [...h.slice(-49), g.before]); setFuture([])
      setToast(`ลบ ${g.erasedIds.size} รายการแล้ว`)
    } else if (g.kind !== 'pan' && g.moved) {
      setHistory(h => [...h.slice(-49), g.before]); setFuture([])
      if (g.kind === 'draw' && g.original?.type !== 'draw') setTool('select')
    }
    if (event?.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    gesture.current = null
  }
  function wheel(event: ReactWheelEvent<SVGSVGElement>) {
    if (!event.shiftKey) return
    event.preventDefault()
    const amount = event.deltaY < 0 ? 10 : -10
    setZoom(value => Math.max(25, Math.min(200, value + amount)))
  }
  function exportSvg(options?: ExportCanvasOptions) {
    const markup = canvasSvgMarkup(options)
    if (!markup) return
    downloadFile(new Blob([markup], { type: 'image/svg+xml' }), 'svg')
    setToast('Exported SVG')
  }
  function safeFileName() {
    return (title.trim() || 'Untitled canvas').replace(/[\\\\/:*?"<>|]+/g, '-').slice(0, 80)
  }
  function downloadFile(blob: Blob, extension: string) {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a'); link.href = url; link.download = `${safeFileName()}.${extension}`; link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
  function canvasSvgMarkup(options: ExportCanvasOptions = {}) {
    if (!svgRef.current) return null
    const clone = svgRef.current.cloneNode(true) as SVGSVGElement
    clone.querySelectorAll('[data-editor-only]').forEach(el => el.remove())
    const padding = Math.max(0, options.padding ?? 0)
    // Use rendered connections so exported links follow their current nodes, and
    // use real shape bounds to retain freehand paths and reversed line endpoints.
    const exportItems = renderShapes.filter(shape => !shape.hidden)
    const bounds = exportItems.length ? exportItems.reduce((box, shape) => {
      const pathBounds = shape.connection && shape.route?.length ? {
        x: Math.min(...shape.route.map(point => point.x)), y: Math.min(...shape.route.map(point => point.y)),
        w: Math.max(...shape.route.map(point => point.x)) - Math.min(...shape.route.map(point => point.x)), h: Math.max(...shape.route.map(point => point.y)) - Math.min(...shape.route.map(point => point.y)),
      } : shapeBounds(shape)
      const strokePadding = Math.max(1, shape.width / 2)
      return {
        minX: Math.min(box.minX, pathBounds.x - strokePadding),
        minY: Math.min(box.minY, pathBounds.y - strokePadding),
        maxX: Math.max(box.maxX, pathBounds.x + pathBounds.w + strokePadding),
        maxY: Math.max(box.maxY, pathBounds.y + pathBounds.h + strokePadding),
      }
    }, { minX: Number.POSITIVE_INFINITY, minY: Number.POSITIVE_INFINITY, maxX: Number.NEGATIVE_INFINITY, maxY: Number.NEGATIVE_INFINITY }) : { minX: 0, minY: 0, maxX: 1000, maxY: 700 }
    const width = Math.max(1, bounds.maxX - bounds.minX)
    const height = Math.max(1, bounds.maxY - bounds.minY)
    const exportX = bounds.minX - padding; const exportY = bounds.minY - padding
    const exportWidth = width + padding * 2; const exportHeight = height + padding * 2
    // Only remove the viewport transform. Nested transforms position each item
    // on the canvas, so clearing all transformed groups stacks everything at 0,0.
    Array.from(clone.children).find(child => child.tagName.toLowerCase() === 'g' && child.hasAttribute('transform'))?.removeAttribute('transform')
    const backgroundRect = clone.querySelector('rect[width="1000"][height="700"]')
    if (options.background === null) backgroundRect?.remove()
    else if (backgroundRect) { backgroundRect.setAttribute('x', `${exportX}`); backgroundRect.setAttribute('y', `${exportY}`); backgroundRect.setAttribute('width', `${exportWidth}`); backgroundRect.setAttribute('height', `${exportHeight}`); if (options.background) backgroundRect.setAttribute('fill', options.background) }
    const gridRect = clone.querySelector('rect[fill="url(#dots)"]')
    if (options.includeGrid === false) gridRect?.remove()
    else if (gridRect) { gridRect.setAttribute('x', `${exportX}`); gridRect.setAttribute('y', `${exportY}`); gridRect.setAttribute('width', `${exportWidth}`); gridRect.setAttribute('height', `${exportHeight}`) }
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg'); clone.setAttribute('viewBox', `${exportX} ${exportY} ${exportWidth} ${exportHeight}`); clone.setAttribute('width', `${Math.ceil(exportWidth * 2)}`); clone.setAttribute('height', `${Math.ceil(exportHeight * 2)}`)
    return new XMLSerializer().serializeToString(clone)
  }
  function exportProject() {
    downloadFile(new Blob([JSON.stringify({ version: 2, title, canvasBackground: customCanvasBackground, groups, shapes }, null, 2)], { type: 'application/json' }), 'devcanvas.json')
    setToast('Exported project file')
  }
  function requestResetCanvas() {
    if (!shapes.length) { setToast('Canvas is already empty'); return }
    setResetConfirmOpen(true)
  }
  function resetCanvas() {
    setHistory(h => [...h.slice(-49), shapes]); setFuture([]); setShapes([]); setGroups([]); setLayerSelection(new Set()); setSelected(null); setEditingSession(null); setConnectionStart(null); setConnectionCursor(null); setTool('select'); setResetConfirmOpen(false); setFilesOpen(false); setToast('Canvas reset — Ctrl+Z to undo')
  }
  function exportRaster(format: 'png' | 'jpg', options?: ExportCanvasOptions) {
    const markup = canvasSvgMarkup(options)
    if (!markup) return
    const svgUrl = URL.createObjectURL(new Blob([markup], { type: 'image/svg+xml' }))
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas'); canvas.width = image.naturalWidth || 2000; canvas.height = image.naturalHeight || 1400
      const context = canvas.getContext('2d')
      if (!context) return
      if (options?.background) { context.fillStyle = options.background; context.fillRect(0, 0, canvas.width, canvas.height) }
      context.drawImage(image, 0, 0, canvas.width, canvas.height)
      canvas.toBlob(blob => { if (blob) { downloadFile(blob, format); setToast(`Exported ${format.toUpperCase()}`) }; URL.revokeObjectURL(svgUrl) }, format === 'png' ? 'image/png' : 'image/jpeg', .92)
    }
    image.onerror = () => { URL.revokeObjectURL(svgUrl); setToast('Could not export this image') }
    image.src = svgUrl
  }
  function exportSelectedFormat() {
    const background = exportBackground ? (exportTheme === 'current' ? exportBackgroundColor : exportTheme === 'dark' ? '#202126' : '#ffffff') : null
    const options = { background, padding: exportPadding, includeGrid: exportGrid }
    if (exportFormat === 'svg') exportSvg(options)
    else if (exportFormat === 'project') exportProject()
    else exportRaster(exportFormat, options)
  }
  function importProject(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const value = JSON.parse(String(reader.result))
        if (!value || !Array.isArray(value.shapes) || !value.shapes.every((shape: unknown) => typeof shape === 'object' && shape !== null && typeof (shape as Shape).id === 'string' && typeof (shape as Shape).type === 'string')) throw new Error('Invalid project')
        const importedGroups = Array.isArray(value.groups) ? value.groups.filter((group: unknown): group is LayerGroup => !!group && typeof group === 'object' && typeof (group as LayerGroup).id === 'string' && typeof (group as LayerGroup).name === 'string' && ((group as LayerGroup).parentId === undefined || typeof (group as LayerGroup).parentId === 'string')) : []
        const importedGroupIds = new Set(importedGroups.map((group: LayerGroup) => group.id))
        setShapes((value.shapes as Shape[]).map(shape => {
          const tableData = normalizeTableData(shape.flowKind, shape.tableData)
          const { tableData: _staleTableData, ...shapeWithoutTableData } = shape
          const normalized = tableData ? { ...shapeWithoutTableData, tableData } : shapeWithoutTableData
          return normalized.groupId && !importedGroupIds.has(normalized.groupId) ? { ...normalized, groupId: undefined } : normalized
        })); setGroups(importedGroups.map((group: LayerGroup) => group.parentId && !importedGroupIds.has(group.parentId) ? { ...group, parentId: undefined } : group)); setTitle(typeof value.title === 'string' && value.title.trim() ? value.title : 'Untitled canvas')
        setCustomCanvasBackground(typeof value.canvasBackground === 'string' && /^#[0-9a-f]{6}$/i.test(value.canvasBackground) ? value.canvasBackground : null)
        setSelected(null); setHistory([]); setFuture([]); setTool('select'); setToast('Imported project file')
      } catch { setToast('This is not a valid Devcanvas project') }
    }
    reader.readAsText(file)
  }
  function addWorkspaceShape(type: typeof workspaceShapeItems[number]['id']) {
    const labels: Record<typeof type, string> = { rectangle: 'New idea', diamond: 'Decision', ellipse: 'Start', star: 'New star', pentagon: 'New pentagon', hexagon: 'New hexagon', heart: 'New heart', cloud: 'New cloud', parallelogram: 'New shape' }
    const shape: Shape = { id: crypto.randomUUID(), type, x: 410, y: 380, w: 160, h: 100, ...drawingStyleOnly(style), text: labels[type] }
    commit([...shapes, shape]); setSelected(shape.id); setTool('select')
  }
  function insertFlowTemplate(template: FlowTemplateId) {
    const rightmost = shapes.length ? Math.max(...shapes.map(shape => shape.x + Math.max(0, shape.w))) : -150
    const origin = { x: rightmost + 180, y: 110 }
    const items = createFlowTemplate(origin, drawingStyleOnly(style), template)
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
  function moveLayer(draggedId: string, targetId: string) {
    if (draggedId === targetId) return
    const sourceIndex = shapes.findIndex(shape => shape.id === draggedId)
    const targetIndex = shapes.findIndex(shape => shape.id === targetId)
    if (sourceIndex < 0 || targetIndex < 0) return
    const target = shapes[targetIndex]
    const next = [...shapes]
    const [dragged] = next.splice(sourceIndex, 1)
    const targetIndexAfterRemoval = next.findIndex(shape => shape.id === targetId)
    // Dropping a grouped item on a root-layer row explicitly takes it out of its group.
    // Drops inside a group keep membership intact, so rows can still be reordered safely.
    const moved = dragged.groupId && !target.groupId ? { ...dragged, groupId: undefined } : dragged
    next.splice(targetIndexAfterRemoval + 1, 0, moved)
    commit(next)
    setSelected(draggedId)
    setTool('select')
    setToast(dragged.groupId && !target.groupId ? 'Item moved out of group' : 'Layer order updated')
  }
  function moveGroup(groupId: string, targetId: string) {
    const members = shapes.filter(shape => belongsToGroup(shape.groupId, groupId))
    const memberIds = new Set(members.map(shape => shape.id))
    const target = shapes.find(shape => shape.id === targetId)
    if (!members.length || !target || memberIds.has(targetId)) return
    const remaining = shapes.filter(shape => !memberIds.has(shape.id))
    const targetIndex = remaining.findIndex(shape => shape.id === targetId)
    remaining.splice(targetIndex + 1, 0, ...members)
    commit(remaining)
    setToast('Group order updated')
  }
  function moveLayerIntoGroup(layerId: string, groupId: string) {
    const layer = shapes.find(shape => shape.id === layerId)
    if (!layer || layer.groupId === groupId) return
    commit(shapes.map(shape => shape.id === layerId ? { ...shape, groupId } : shape))
    setToast('Item added to group')
  }
  function moveGroupIntoGroup(sourceId: string, targetId: string) {
    if (sourceId === targetId || belongsToGroup(targetId, sourceId)) return
    let parent = groups.find(group => group.id === targetId)
    while (parent?.parentId) { if (parent.parentId === sourceId) return; parent = groups.find(group => group.id === parent!.parentId) }
    setGroups(current => current.map(group => group.id === sourceId ? { ...group, parentId: targetId } : group))
    setToast('Group nested successfully')
  }
  function moveGroupOut(groupId: string) { setGroups(current => current.map(group => group.id === groupId ? { ...group, parentId: undefined } : group)); setToast('Group moved to Canvas') }
  function moveLayerOut(layerId: string) { const layer = shapes.find(shape => shape.id === layerId); if (!layer?.groupId) return; commit(shapes.map(shape => shape.id === layerId ? { ...shape, groupId: undefined } : shape)); setToast('Item moved out of group') }
  function toggleLayerSelection(id: string) { setLayerSelection(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  function createGroup() {
    if (layerSelection.size < 2) return
    const group: LayerGroup = { id: crypto.randomUUID(), name: tr(`กลุ่ม ${groups.length + 1}`, `Group ${groups.length + 1}`) }
    setGroups(current => [...current, group])
    commit(shapes.map(shape => layerSelection.has(shape.id) ? { ...shape, groupId: group.id } : shape))
    setLayerSelection(new Set())
    setToast('Created layer group')
  }
  function removeSelectedLayers() {
    const ids = new Set([...layerSelection, ...shapes.filter(shape => [...groupSelection].some(id => belongsToGroup(shape.groupId, id))).map(shape => shape.id)])
    if (!ids.size && !groupSelection.size) return
    const remaining = shapes.filter(shape => !ids.has(shape.id))
    const remainingIds = new Set(remaining.map(shape => shape.id))
    commit(remaining.filter(shape => !shape.connection || (remainingIds.has(shape.connection.from) && remainingIds.has(shape.connection.to))))
    setGroups(current => current.filter(group => ![...groupSelection].some(id => belongsToGroup(group.id, id))))
    setLayerSelection(new Set()); setGroupSelection(new Set()); setToast(`Removed ${ids.size} layer${ids.size === 1 ? '' : 's'}`)
  }
  function duplicateSelectedLayers() {
    const selectedIds = new Set([
      ...layerSelection,
      ...shapes.filter(shape => [...groupSelection].some(id => belongsToGroup(shape.groupId, id))).map(shape => shape.id),
    ])
    const originals = shapes.filter(shape => selectedIds.has(shape.id))
    if (!originals.length) return
    const ids = new Map(originals.map(shape => [shape.id, crypto.randomUUID()]))
    const copies = originals.flatMap(shape => {
      if (shape.connection && (!ids.has(shape.connection.from) || !ids.has(shape.connection.to))) return []
      return [{ ...shape, id: ids.get(shape.id)!, x: shape.x + 24, y: shape.y + 24, ...(shape.connection ? { connection: { ...shape.connection, from: ids.get(shape.connection.from)!, to: ids.get(shape.connection.to)! } } : {}) }]
    })
    if (!copies.length) return
    commit([...shapes, ...copies])
    setLayerSelection(new Set(copies.map(shape => shape.id)))
    setGroupSelection(new Set())
    setSelected(copies[0].id)
    setToast(tr(`ทำสำเนา ${copies.length} รายการ`, `Duplicated ${copies.length} item${copies.length === 1 ? '' : 's'}`))
  }
  function saveLayerName(id: string) {
    const name = renameValue.trim()
    commit(shapes.map(shape => shape.id === id ? { ...shape, name: name || undefined } : shape))
    setRenamingLayerId(null)
  }
  function ungroup(groupId: string) {
    const parentId = groups.find(group => group.id === groupId)?.parentId
    commit(shapes.map(shape => shape.groupId === groupId ? { ...shape, groupId: parentId } : shape))
    setGroups(current => current.filter(group => group.id !== groupId).map(group => group.parentId === groupId ? { ...group, parentId } : group))
    setGroupSelection(current => { const next = new Set(current); next.delete(groupId); return next })
    setCollapsedGroups(current => { const next = new Set(current); next.delete(groupId); return next })
    setToast('Group removed')
  }
  function toggleGroupSelection(id: string) {
    const memberIds = shapes.filter(shape => belongsToGroup(shape.groupId, id)).map(shape => shape.id)
    const deselect = groupSelection.has(id)
    const nextGroups = new Set(groupSelection)
    if (deselect) nextGroups.delete(id); else nextGroups.add(id)
    setGroupSelection(nextGroups)
    setLayerSelection(current => {
      const next = new Set(current)
      for (const memberId of memberIds) { if (deselect) next.delete(memberId); else next.add(memberId) }
      return next
    })
    setSelected(deselect ? null : memberIds[0] ?? null)
    setTool('select')
  }
  function toggleGroupVisibility(id: string) {
    const members = shapes.filter(shape => belongsToGroup(shape.groupId, id))
    const hide = members.some(shape => !shape.hidden)
    commit(shapes.map(shape => belongsToGroup(shape.groupId, id) ? { ...shape, hidden: hide } : shape))
    setSelected(null)
  }
  function toggleGroupCollapsed(id: string) { setCollapsedGroups(current => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next }) }
  function saveGroupName(id: string) { const name = groupRenameValue.trim(); if (name) setGroups(current => current.map(group => group.id === id ? { ...group, name } : group)); setRenamingGroupId(null) }
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
  const filtered = [...shapes].reverse().filter(s => `${s.name ?? ''} ${s.text} ${s.type}`.toLowerCase().includes(query.toLowerCase()))
  type TreeEntry = { s: Shape; group?: LayerGroup; depth: number; heading: boolean }
  const treeEntries: TreeEntry[] = []
  const visitedGroups = new Set<string>()
  const knownGroupIds = new Set(groups.map(group => group.id))
  function appendTree(parentId: string | undefined, depth: number) {
    const childGroups = groups.filter(group => (group.parentId && knownGroupIds.has(group.parentId) ? group.parentId : undefined) === parentId && !visitedGroups.has(group.id))
    const direct = [...shapes].reverse().filter(shape => shape.groupId === parentId)
    const entries = [
      ...childGroups.map(group => ({ group, shape: undefined as Shape | undefined, rank: Math.max(-1, ...shapes.map((shape, index) => belongsToGroup(shape.groupId, group.id) ? index : -1)) })),
      ...direct.map(shape => ({ group: undefined as LayerGroup | undefined, shape, rank: shapes.indexOf(shape) })),
    ].sort((a, b) => b.rank - a.rank)
    for (const entry of entries) {
      if (entry.group) {
        const group = entry.group
        visitedGroups.add(group.id)
        const members = shapes.filter(shape => belongsToGroup(shape.groupId, group.id))
        if (query && !group.name.toLowerCase().includes(query.toLowerCase()) && !members.some(shape => filtered.includes(shape))) continue
        const placeholder: Shape = { ...defaultStyle, id: group.id, type: 'rectangle', text: '', x: 0, y: 0, w: 0, h: 0 }
        treeEntries.push({ s: placeholder, group, depth, heading: true })
        if (!collapsedGroups.has(group.id) || query) appendTree(group.id, depth + 1)
      } else if (entry.shape && (!query || filtered.includes(entry.shape))) treeEntries.push({ s: entry.shape, group: groups.find(group => group.id === parentId), depth, heading: false })
    }
  }
  appendTree(undefined, 0)
  for (const group of groups) {
    if (!visitedGroups.has(group.id)) {
      visitedGroups.add(group.id)
      const placeholder: Shape = { ...defaultStyle, id: group.id, type: 'rectangle', text: '', x: 0, y: 0, w: 0, h: 0 }
      treeEntries.push({ s: placeholder, group: { ...group, parentId: undefined }, depth: 0, heading: true })
      if (!collapsedGroups.has(group.id) || query) appendTree(group.id, 1)
    }
  }
  const outlinedGroupId = groupSelection.size === 1 ? [...groupSelection][0] : active?.groupId ?? null
  const outlinedGroupMembers = outlinedGroupId ? shapes.filter(shape => belongsToGroup(shape.groupId, outlinedGroupId) && !shape.connection && !shape.hidden) : []
  const multiSelectedMembers = shapes.filter(shape => layerSelection.has(shape.id) && !shape.connection && !shape.hidden)
  const selectionTransformMembers = multiSelectedMembers.length > 1 ? multiSelectedMembers : outlinedGroupMembers
  const selectionTransformBounds = selectionTransformMembers.length ? { x: Math.min(...selectionTransformMembers.map(shape => Math.min(shape.x, shape.x + shape.w))) - 12, y: Math.min(...selectionTransformMembers.map(shape => Math.min(shape.y, shape.y + shape.h))) - 12, w: Math.max(...selectionTransformMembers.map(shape => Math.max(shape.x, shape.x + shape.w))) - Math.min(...selectionTransformMembers.map(shape => Math.min(shape.x, shape.x + shape.w))) + 24, h: Math.max(...selectionTransformMembers.map(shape => Math.max(shape.y, shape.y + shape.h))) - Math.min(...selectionTransformMembers.map(shape => Math.min(shape.y, shape.y + shape.h))) + 24 } : null
  const hasCombinedSelection = selectionTransformMembers.length > 1
  const canvasSelectionBounds = selectionTransformBounds ?? (active ? shapeBounds(active) : null)

  return <div className="editor">
    <ApplicationMenu groups={[
      { label: tr('ไฟล์', 'File'), commands: [
        { label: tr('เปิดโปรเจกต์', 'Open project'), shortcut: 'Ctrl+O', action: () => importInputRef.current?.click() },
        { label: tr('บันทึกไฟล์โปรเจกต์', 'Save project file'), action: exportProject },
        { label: tr('ส่งออกภาพ…', 'Export image…'), action: () => setExportImageOpen(true) },
        { label: tr('ล้างพื้นที่วาด…', 'Reset canvas…'), separator: true, disabled: !shapes.length, action: () => setResetConfirmOpen(true) },
      ] },
      { label: tr('แก้ไข', 'Edit'), commands: [
        { label: tr('เลิกทำ', 'Undo'), shortcut: 'Ctrl+Z', disabled: !history.length, action: undo },
        { label: tr('ทำซ้ำ', 'Redo'), shortcut: 'Ctrl+Shift+Z', disabled: !future.length, action: redo },
        { label: tr('ทำสำเนาวัตถุ', 'Duplicate'), shortcut: 'Ctrl+D', separator: true, disabled: !active || !!active.connection, action: duplicate },
        { label: tr('ลบวัตถุที่เลือก', 'Delete selected'), shortcut: 'Delete', disabled: !active, action: remove },
      ] },
      { label: tr('มุมมอง', 'View'), commands: [
        { label: tr('รูปแบบวัตถุ', 'Properties'), checked: rightOpen, action: () => { setRightOpen(!rightOpen); setSettingsOpen(false); setFilesOpen(false); setFrontPanel('properties') } },
        { label: tr('แสดงจุดกริด', 'Show dot grid'), checked: grid, separator: true, action: () => setGrid(!grid) },
        { label: tr('คืนมุมมอง 100%', 'Reset view to 100%'), action: resetView },
        { label: tr('ตั้งค่า…', 'Settings…'), separator: true, action: () => { setSettingsOpen(true); setRightOpen(false); setFilesOpen(false); setFrontPanel('settings') } },
      ] },
      { label: tr('ไลบรารี', 'Library'), commands: [
        { label: tr('เปิดไลบรารี', 'Open Library'), checked: libraryOpen, action: () => { setLibraryOpen(true); setFrontPanel('library') } },
        { label: tr('ปิดไลบรารี', 'Close Library'), disabled: !libraryOpen, action: () => setLibraryOpen(false) },
        { label: tr('โหมดผังงาน', 'Flowchart mode'), separator: true, action: () => { setTool('flowchart'); setSelected(null); setLibraryOpen(true); setFrontPanel('library') } },
        { label: tr('โหมดเชื่อมต่อโหนด', 'Connect nodes mode'), action: () => { setTool('connect'); setSelected(null); setConnectionStart(null); setLibraryOpen(true); setFrontPanel('library') } },
      ] },
      { label: tr('ช่วยเหลือ', 'Help'), commands: [{ label: tr('วิธีใช้และคีย์ลัด', 'Help and shortcuts'), shortcut: '?', action: () => setHelp(true) }] },
    ]} />
    <div className="editor-workspace">
    <FloatingPanel title={tr('พื้นที่ทำงาน', 'Workspace')} icon={<IconLayersIntersect size={15} />} className="workspace-window" open={leftOpen} onClose={() => setLeftOpen(false)} side="left" width={310} active={frontPanel === 'workspace'} onActivate={() => setFrontPanel('workspace')}>
      <div className="workspace-panel-heading"><IconLayersIntersect size={16} /><span>{tr('เลเยอร์', 'Layers')}</span><small>{shapes.length}</small></div>
      <>
        <div className="workspace-overview"><div><span>{tr('พื้นที่ทำงาน', 'WORKSPACE')}</span><strong>{tr('จัดระเบียบไอเดียของคุณ', 'Organize your ideas')}</strong></div><span>{shapes.length} {tr('รายการ', 'items')}</span></div>
        <label className="layer-search"><IconSearch size={15} /><input aria-label={tr('ค้นหาเลเยอร์', 'Find a layer')} placeholder={tr('ค้นหาเลเยอร์...', 'Find a layer...')} value={query} onChange={e => setQuery(e.target.value)} /></label>
        <div className="layer-section-title" onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move' }} onDrop={event => { event.preventDefault(); const sourceGroupId = event.dataTransfer.getData('application/x-devcanvas-group'); const sourceId = event.dataTransfer.getData('text/plain'); if (sourceGroupId) moveGroupOut(sourceGroupId); else if (sourceId) moveLayerOut(sourceId); setDraggedLayerId(null); setDropLayerId(null) }}><button type="button" className="layer-section-toggle" aria-expanded={canvasLayersOpen} onClick={() => setCanvasLayersOpen(open => !open)}><IconChevronDown size={12} />{tr('พื้นที่วาด', 'CANVAS')} <small>{shapes.length}</small></button><div><IconButton label={tr('เปิดไลบรารี', 'Open Library')} onClick={() => { setTool('flowchart'); setSelected(null); setLibraryOpen(true) }}><IconSitemap size={14} /></IconButton><span ref={workspaceAddRef} className="workspace-add-wrap"><IconButton label={tr('เพิ่มรูปทรง', 'Add shape')} active={workspaceAddOpen} onClick={() => setWorkspaceAddOpen(open => !open)}><IconPlus size={14} /></IconButton></span></div></div>
        <Toolbar label={tr('คำสั่งเลเยอร์', 'Layer actions')} className="layer-bulk-actions"><IconButton label={tr('เลือกทุกเลเยอร์', 'Select all layers')} onClick={() => { setLayerSelection(new Set(shapes.map(shape => shape.id))); setGroupSelection(new Set()) }} disabled={!shapes.length}><IconCheck size={15} /></IconButton><IconButton label={tr('สร้างกลุ่ม (เลือกอย่างน้อยสองรายการ)', 'Create group (select at least two items)')} onClick={createGroup} disabled={layerSelection.size < 2 || groupSelection.size > 0}><IconLayersIntersect size={15} /></IconButton><IconButton label={tr('ลบเลเยอร์ที่เลือก', 'Remove selected layers')} onClick={removeSelectedLayers} disabled={!layerSelection.size && !groupSelection.size}><IconTrash size={15} /></IconButton></Toolbar>
        {(layerSelection.size || groupSelection.size) ? <Toolbar label={tr('คำสั่งสำหรับรายการที่เลือก', 'Selected layer actions')} className="layer-bulk-actions"><IconButton label={tr('ทำสำเนารายการที่เลือกทั้งหมด (Ctrl+D)', 'Duplicate all selected layers (Ctrl+D)')} onClick={duplicateSelectedLayers}><IconCopy size={15} /></IconButton><IconButton label={tr('ลบรายการที่เลือกทั้งหมด (Delete)', 'Delete all selected layers (Delete)')} onClick={removeSelectedLayers}><IconTrash size={15} /></IconButton></Toolbar> : null}
        {canvasLayersOpen && <div className="layer-list" aria-label={tr('เลเยอร์บนพื้นที่วาด', 'Canvas layers')}>
          <div className={`layer-root-dropzone top ${dropLayerId === 'canvas-root-top' ? 'is-drop-target' : ''}`} aria-label="Move to canvas root" onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropLayerId('canvas-root-top') }} onDragLeave={() => { if (dropLayerId === 'canvas-root-top') setDropLayerId(null) }} onDrop={event => { event.preventDefault(); const sourceGroupId = event.dataTransfer.getData('application/x-devcanvas-group'); const sourceId = event.dataTransfer.getData('text/plain') || draggedLayerId; if (sourceGroupId) moveGroupOut(sourceGroupId); else if (sourceId) moveLayerOut(sourceId); setDraggedLayerId(null); setDropLayerId(null) }} />
          {treeEntries.map(({ s, group, depth, heading }) => {
            const ItemIcon = toolItems.find(t => t.id === s.type)?.icon ?? extraToolItems.find(t => t.id === s.type)?.icon ?? IconSquare
            const name = (s.name ?? s.text) || (s.type === 'arrow' ? 'Connection' : s.type.charAt(0).toUpperCase() + s.type.slice(1))
            const groupName = groups.find(group => group.id === s.groupId)?.name
            
            const groupCount = group ? shapes.filter(item => belongsToGroup(item.groupId, group.id)).length : 0
            const groupHidden = group ? shapes.filter(item => belongsToGroup(item.groupId, group.id)).every(item => item.hidden) : false
            const showGroupHeader = heading && !!group
            return <div key={`${heading ? "group" : "item"}-${s.id}`} style={{ marginLeft: depth * 14 }}>{showGroupHeader && <div draggable className={`layer-group-heading ${groupSelection.has(group.id) ? 'selected' : ''} ${draggedLayerId === group.id ? 'is-dragging' : ''} ${groupHidden ? 'is-hidden' : ''}`} onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('application/x-devcanvas-group', group.id); setDraggedLayerId(group.id) }} onDragEnd={() => { setDraggedLayerId(null); setDropLayerId(null) }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropLayerId(group.id) }} onDrop={event => { event.preventDefault(); const sourceGroupId = event.dataTransfer.getData('application/x-devcanvas-group'); const sourceId = event.dataTransfer.getData('text/plain'); if (sourceGroupId) moveGroupIntoGroup(sourceGroupId, group.id); else if (sourceId) moveLayerIntoGroup(sourceId, group.id); setDraggedLayerId(null); setDropLayerId(null) }}><IconButton label={`${groupHidden ? 'Show' : 'Hide'} ${group.name}`} onClick={() => toggleGroupVisibility(group.id)}>{groupHidden ? <IconEyeOff size={14} /> : <IconEye size={14} />}</IconButton><input className="layer-group-select" type="checkbox" aria-label={`Select group ${group.name}`} checked={groupSelection.has(group.id)} onChange={() => toggleGroupSelection(group.id)} onClick={event => event.stopPropagation()} /><button type="button" className="group-collapse" aria-label={collapsedGroups.has(group.id) ? `Expand ${group.name}` : `Collapse ${group.name}`} onClick={event => { event.stopPropagation(); toggleGroupCollapsed(group.id) }}><IconChevronDown size={13} /></button><IconFolderOpen size={16} />{renamingGroupId === group.id ? <input className="group-name-input" autoFocus value={groupRenameValue} aria-label="Group name" onChange={event => setGroupRenameValue(event.target.value)} onBlur={() => saveGroupName(group.id)} onKeyDown={event => { if (event.key === 'Enter') saveGroupName(group.id); if (event.key === 'Escape') setRenamingGroupId(null) }} onClick={event => event.stopPropagation()} /> : <><span title="Double-click to rename" onDoubleClick={event => { event.stopPropagation(); setRenamingGroupId(group.id); setGroupRenameValue(group.name) }}>{group.name} <small>{groupCount}</small></span><button type="button" className="group-rename" aria-label={`Rename ${group.name}`} onClick={event => { event.stopPropagation(); setRenamingGroupId(group.id); setGroupRenameValue(group.name) }}><IconPencil size={11} /></button></>}<button type="button" onClick={event => { event.stopPropagation(); ungroup(group.id) }}>Ungroup</button></div>}{!heading && <div draggable className={`layer-row ${group ? 'group-member' : ''} ${selected === s.id ? 'selected' : ''} ${s.hidden ? 'is-hidden' : ''} ${draggedLayerId === s.id ? 'is-dragging' : ''} ${dropLayerId === s.id && draggedLayerId !== s.id ? 'is-drop-target' : ''}`} onDragStart={event => { event.dataTransfer.effectAllowed = 'move'; event.dataTransfer.setData('text/plain', s.id); setDraggedLayerId(s.id) }} onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropLayerId(s.id) }} onDragLeave={() => { if (dropLayerId === s.id) setDropLayerId(null) }} onDrop={event => { event.preventDefault(); const sourceGroupId = event.dataTransfer.getData('application/x-devcanvas-group'); const sourceId = event.dataTransfer.getData('text/plain') || draggedLayerId; if (sourceGroupId) moveGroup(sourceGroupId, s.id); else if (sourceId) moveLayer(sourceId, s.id); setDraggedLayerId(null); setDropLayerId(null) }} onDragEnd={() => { setDraggedLayerId(null); setDropLayerId(null) }}>
              <span className="layer-drag-handle" aria-hidden="true" title="Drag to arrange"><IconGripVertical size={15} /></span>
              <input className="layer-select" type="checkbox" aria-label={`Select ${name}`} checked={layerSelection.has(s.id)} onChange={() => toggleLayerSelection(s.id)} onClick={event => event.stopPropagation()} />
              <button className="layer-item" onClick={() => { setSelected(s.id); setTool('select') }} onDoubleClick={event => { event.preventDefault(); setRenamingLayerId(s.id); setRenameValue(s.name ?? name) }}><span className="layer-icon"><ItemIcon size={15} /></span><span>{renamingLayerId === s.id ? <input className="layer-name-input" autoFocus value={renameValue} aria-label="Layer name" onChange={event => setRenameValue(event.target.value)} onBlur={() => saveLayerName(s.id)} onKeyDown={event => { if (event.key === 'Enter') saveLayerName(s.id); if (event.key === 'Escape') setRenamingLayerId(null) }} onClick={event => event.stopPropagation()} /> : <strong title="Double-click to rename">{name}</strong>}<small>{groupName ? `Group · ${groupName}` : s.flowKind ? 'Flowchart node' : s.connection ? 'Connection' : s.type}</small></span></button>
              <IconButton className="layer-visibility" label={s.hidden ? `Show ${name}` : `Hide ${name}`} active={!s.hidden} onClick={() => toggleVisibility(s.id)}>{s.hidden ? <IconEyeOff size={15} /> : <IconEye size={15} />}</IconButton>
            </div>}</div>
          })}
          <div className={`layer-root-dropzone bottom ${dropLayerId === 'canvas-root-bottom' ? 'is-drop-target' : ''}`} aria-label="Move to canvas root" onDragOver={event => { event.preventDefault(); event.dataTransfer.dropEffect = 'move'; setDropLayerId('canvas-root-bottom') }} onDragLeave={() => { if (dropLayerId === 'canvas-root-bottom') setDropLayerId(null) }} onDrop={event => { event.preventDefault(); const sourceGroupId = event.dataTransfer.getData('application/x-devcanvas-group'); const sourceId = event.dataTransfer.getData('text/plain') || draggedLayerId; if (sourceGroupId) moveGroupOut(sourceGroupId); else if (sourceId) moveLayerOut(sourceId); setDraggedLayerId(null); setDropLayerId(null) }} />
          {!filtered.length && <p className="empty-layers">{query ? 'ไม่พบเลเยอร์ที่ตรงกัน' : 'เริ่มวางไอเดียแรกของคุณได้เลย'}</p>}
        </div>}
      </>
      <div className="sidebar-bottom"><button className="help-row" onClick={() => setHelp(true)}><IconHelp size={17} />Help & shortcuts<kbd>?</kbd></button></div>
    </FloatingPanel>
    <FloatingPanel title={tr('ไลบรารี', 'Library')} icon={<IconSitemap size={15} />} className="library-window" open={libraryOpen} onClose={() => setLibraryOpen(false)} side="left" width={330} active={frontPanel === 'library'} onActivate={() => setFrontPanel('library')}>
      <FlowchartLibrary selectedKind={tool === 'flowchart' ? flowKind : null} connecting={tool === 'connect'} onChoose={kind => { setFlowKind(kind); setFlowchartOneShot(true); setTool('flowchart'); setConnectionStart(null); setSelected(null); setRelationshipLine(null) }} onConnect={relationship => { setRelationshipLine(relationship ?? null); setTool('connect'); setFlowchartOneShot(false); setConnectionStart(null); setConnectionCursor(null); setSelected(null) }} onTemplate={insertFlowTemplate} />
    </FloatingPanel>
    <FloatingToolbar label={tr('เครื่องมือวาด', 'Drawing tools')} className="floating-toolbar" active={frontPanel === 'toolbar'} onActivate={() => setFrontPanel('toolbar')} hint={<>{tool === 'flowchart' ? tr('คลิกบนพื้นที่วาดเพื่อวางโหนด · เลือกชนิดจากไลบรารี', 'Click the canvas to place a node · Choose a type in Library') : tool === 'connect' ? connectionStart ? tr(`ปลายทาง ← ต้นทาง · ${relationshipLine ?? 'ความสัมพันธ์'}`, `Destination ← source · ${relationshipLine ?? 'Relationship'}`) : tr(`ต้นทาง → ปลายทาง · ${relationshipLine ?? 'เลือกเส้นความสัมพันธ์'}`, `Source → destination · ${relationshipLine ?? 'Choose a relationship line'}`) : tool === 'eraser' ? tr('คลิกหรือลากผ่านรายการเพื่อลบ · Ctrl+Z เพื่อเรียกคืน', 'Click or drag over an item to erase · Ctrl+Z to restore') : tool === 'select' ? tr('ดับเบิลคลิกข้อความเพื่อแก้ไข ลากรายการเพื่อย้าย', 'Double-click text to edit. Drag an item to move.') : tool === 'hand' ? tr('ลากเพื่อเลื่อนดูพื้นที่วาด', 'Drag anywhere to move around your canvas.') : tool === 'text' ? tr('คลิกข้อความเพื่อแก้ไข หรือคลิกพื้นที่ว่างเพื่อพิมพ์', 'Click text to edit, or click empty space to write.') : tr('คลิกและลากเพื่อวาด', `Click and drag to ${tool === 'draw' ? 'draw freely' : `draw ${tool === 'ellipse' || tool === 'arrow' ? 'an' : 'a'} ${tool}`}.`)}<kbd>Esc</kbd> {tr('เพื่อรีเซ็ต', 'to reset')}</>}>{toolItems.map((item, i) => i >= 7 && i <= 9 || item.id === 'flowchart' || item.id === 'connect' ? null : <IconButton key={item.id} className={`tool-button ${i === 2 ? 'tool-separator' : ''}`} label={`${tr(thaiToolLabels[item.id], item.label)} (${item.key})`} active={tool === item.id} onClick={() => { setTool(item.id); setSelected(null); setSettingsOpen(false); setFilesOpen(false); setRightOpen(true); setFrontPanel('properties'); setShapeMenuOpen(false); setConnectionStart(null); setConnectionCursor(null) }}><item.icon size={20} stroke={1.7} /><span>{i < 9 ? i + 1 : item.key}</span></IconButton>)}<span ref={shapeMoreRef} className="shape-more-wrap"><IconButton className="tool-button" label={tr('เครื่องมือเพิ่มเติม', 'More tools')} active={shapeMenuOpen || extraToolItems.some(item => item.id === tool)} onClick={() => setShapeMenuOpen(open => !open)}><MoreToolIcon size={20} stroke={1.7} /></IconButton></span></FloatingToolbar>
      {shapeMenuOpen && createPortal(<div className="shape-more-menu shape-more-menu-portal" role="menu" style={{ left: shapeMenuPosition.left, top: shapeMenuPosition.top }}>{extraToolGroups.map(group => <div className="tool-group" key={group.label}><div className="tool-group-title">{group.label}</div>{group.items.map(item => <button key={item.id} className={tool === item.id ? 'is-selected' : ''} role="menuitemradio" aria-checked={tool === item.id} onClick={() => { setTool(item.id); setSelected(null); setSettingsOpen(false); setFilesOpen(false); setRightOpen(true); setFrontPanel('properties'); setShapeMenuOpen(false); setConnectionStart(null); setConnectionCursor(null); if (item.id === 'flowchart') { setLibraryOpen(true); setFrontPanel('library') } }}><item.icon size={18} /><span>{item.label}</span>{tool === item.id && <IconCheck size={14} className="tool-check" />}</button>)}</div>)}</div>, document.body)}
      {workspaceAddOpen && createPortal(<div className="workspace-add-menu workspace-add-menu-portal" role="menu" aria-label="Choose a shape" style={{ left: workspaceAddPosition.left, top: workspaceAddPosition.top }}>{workspaceShapeItems.map(item => <button type="button" key={item.id} role="menuitem" onClick={() => { addWorkspaceShape(item.id); setWorkspaceAddOpen(false) }}><item.icon size={16} /><span>{item.label}</span></button>)}</div>, document.body)}
    <main className={`canvas-area tool-${tool} ${grid ? '' : 'grid-hidden'}`} style={{ backgroundColor: canvasBackground }}>
      <IconButton className="panel-toggle file-toggle" label="File manager" active={filesOpen} onClick={() => { setFilesOpen(open => { const next = !open; if (next) { setSettingsOpen(false); setRightOpen(false) }; return next }); setFrontPanel('files') }}><IconMenu2 size={18} /></IconButton>
      <IconButton className="panel-toggle left-toggle" label="Workspace — layers & library" active={leftOpen} onClick={() => { setLeftOpen(!leftOpen); setFrontPanel('workspace') }}><IconLayersIntersect size={18} /></IconButton>
      <div className="canvas-settings-trigger"><IconButton className="panel-toggle" label="Settings" active={settingsOpen} onClick={() => { setSettingsOpen(open => { const next = !open; if (next) { setRightOpen(false); setFilesOpen(false) }; return next }); setFrontPanel('settings') }}><IconSettings size={18} /></IconButton><IconButton className="panel-toggle right-toggle" label="Properties" active={rightOpen} onClick={() => { setSettingsOpen(false); setFilesOpen(false); setRightOpen(!rightOpen); setFrontPanel('properties') }}><IconPalette size={18} /></IconButton></div>
      <svg ref={svgRef} className="drawing-canvas" viewBox="0 0 1000 700" onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={event => pointerUp(event)} onPointerCancel={event => pointerUp(event, true)} onPointerLeave={() => { if (!gesture.current) setEraserCursor(null) }} onWheel={wheel} onDoubleClick={event => {
        if (editingSessionRef.current) return
        const id = (event.target as Element).closest('[data-shape]')?.getAttribute('data-shape') ?? selected
        const shape = renderShapes.find(item => item.id === id)
        if (tool === 'select' && shape?.connection && addConnectionRoutePoint(shape, point(event))) { event.preventDefault(); return }
        if (shape && !shape.connection) { event.preventDefault(); event.stopPropagation(); setTool('select'); beginTextEditing(shape) }
      }} aria-label="Drawing canvas">
        <defs><pattern id="dots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="1" cy="1" r="0.85" fill={themeTokens['--grid']} /></pattern>{[1, 2, 3, 4, 5].map(level => <filter key={level} id={`sloppy-${level}`} x="-5%" y="-5%" width="110%" height="110%"><feTurbulence type="fractalNoise" baseFrequency={0.018 + level * 0.006} numOctaves="1" seed="7" result="noise" /><feDisplacementMap in="SourceGraphic" in2="noise" scale={level * 0.7} /></filter>)}</defs>
        <rect width="1000" height="700" fill={canvasBackground} />
        {grid && <rect width="1000" height="700" fill="url(#dots)" />}
        <g transform={`translate(${500 + pan.x} ${350 + pan.y}) scale(${zoom / 100}) translate(-500 -350)`}>
          {marquee && <rect data-editor-only="true" className="marquee-selection" x={marquee.x} y={marquee.y} width={marquee.w} height={marquee.h} pointerEvents="none" />}
          {layerSelection.size > 1 && shapes.filter(shape => layerSelection.has(shape.id) && !shape.hidden).map(shape => <rect key={`selection-${shape.id}`} data-editor-only="true" className="multi-selection-outline" x={Math.min(shape.x, shape.x + shape.w) - 6} y={Math.min(shape.y, shape.y + shape.h) - 6} width={Math.abs(shape.w) + 12} height={Math.abs(shape.h) + 12} rx="6" pointerEvents="none" />)}
          {selectionTransformBounds && selectionTransformMembers.length > 1 && <g data-editor-only="true" className="group-selection-outline"><rect data-selection-bounds="true" x={selectionTransformBounds.x} y={selectionTransformBounds.y} width={selectionTransformBounds.w} height={selectionTransformBounds.h} rx="8" className="selection-transform-bounds" />{[[selectionTransformBounds.x, selectionTransformBounds.y], [selectionTransformBounds.x + selectionTransformBounds.w, selectionTransformBounds.y], [selectionTransformBounds.x, selectionTransformBounds.y + selectionTransformBounds.h], [selectionTransformBounds.x + selectionTransformBounds.w, selectionTransformBounds.y + selectionTransformBounds.h]].map(([x, y], handle) => <rect key={handle} data-resize-shape={selectionTransformMembers[0].id} data-resize-handle={handle} x={x - 6} y={y - 6} width="12" height="12" rx="2" className="group-resize-handle" style={{ cursor: handle === 0 || handle === 3 ? 'nwse-resize' : 'nesw-resize' }}><title>Resize selection · Shift to lock proportions</title></rect>)}</g>}
          {renderShapes.map(shape => {
            const routePoints = connectionRoutePoints(shape)
            return <g key={shape.id}>
              <ShapeView shape={shape} selected={tool === 'select' && selected === shape.id && editingId !== shape.id && !hasCombinedSelection} interactive={tool === 'select' || tool === 'connect'} editing={editingId === shape.id} />
              {tool === 'select' && selected === shape.id && shape.connection && routePoints.length > 2 && <g data-editor-only="true" className="connection-route-handles">
                {routePoints.slice(1, -1).map((point, index) => <circle key={`${shape.id}-route-${index}`} className="connection-route-handle" data-route-shape={shape.id} data-route-index={index + 1} cx={point.x} cy={point.y} r="6" />)}
              </g>}
            </g>
          })}
          {tool === 'select' && active && isFlowNode(active) && !editingSession && <g data-editor-only="true" data-node-toolbar={active.id} className="node-action-toolbar" transform={`translate(${active.x + active.w / 2} ${Math.min(active.y, active.y + active.h) - 30})`} role="toolbar" aria-label="จัดการ Node"><rect className="node-action-toolbar-frame" x="-72" y="-14" width="144" height="28" rx="8" />{([['edit', IconPencil, 'แก้ไขข้อความ'], ['connect', IconLink, 'เชื่อม Node'], ['duplicate', IconCopy, 'ทำสำเนา Node'], ['delete', IconTrash, 'ลบ Node']] as const).map(([action, ActionIcon, label], index) => <g key={action} data-node-action={action} className={`node-action-button ${action === 'delete' ? 'is-danger' : ''}`} transform={`translate(${-48 + index * 32} -9)`} role="button" aria-label={label} tabIndex={0}><rect width="18" height="18" rx="5" /><ActionIcon x="3" y="3" size={12} stroke={1.9} /><title>{label}</title></g>)}</g>}
          {tool === 'select' && canvasSelectionBounds && (hasCombinedSelection || active) && !editingSession && <g data-editor-only="true" data-selection-toolbar="true" className="node-action-toolbar" transform={`translate(${canvasSelectionBounds.x + canvasSelectionBounds.w / 2} ${canvasSelectionBounds.y - (active && isFlowNode(active) && !hasCombinedSelection ? 62 : 30)})`} role="toolbar" aria-label={tr('คำสั่งสำหรับรายการที่เลือก', 'Selection actions')}><rect className="node-action-toolbar-frame" x="-56" y="-14" width="112" height="28" rx="8" /><g data-selection-action="select-all" className="node-action-button" transform="translate(-44 -9)" role="button" aria-label={tr('เลือกทั้งหมดบนพื้นที่วาด', 'Select all on canvas')} tabIndex={0}><rect width="18" height="18" rx="5" /><IconCheck x="3" y="3" size={12} stroke={1.9} /><title>{tr('เลือกทั้งหมด', 'Select all')}</title></g><g data-selection-action="duplicate" className="node-action-button" transform="translate(-9 -9)" role="button" aria-label={tr('ทำสำเนารายการที่เลือก', 'Duplicate selection')} tabIndex={0}><rect width="18" height="18" rx="5" /><IconCopy x="3" y="3" size={12} stroke={1.9} /><title>{tr('ทำสำเนา', 'Duplicate')}</title></g><g data-selection-action="delete" className="node-action-button is-danger" transform="translate(26 -9)" role="button" aria-label={tr('ลบรายการที่เลือก', 'Delete selection')} tabIndex={0}><rect width="18" height="18" rx="5" /><IconTrash x="3" y="3" size={12} stroke={1.9} /><title>{tr('ลบ', 'Delete')}</title></g></g>}
          {tool === 'eraser' && eraserCursor && <circle data-editor-only="true" className="eraser-cursor" cx={eraserCursor.x} cy={eraserCursor.y} r={eraserSize / 2} fill={themeTokens['--accent']} fillOpacity=".08" stroke={themeTokens['--accent']} strokeWidth="1.5" strokeDasharray="3 3" pointerEvents="none" />}
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
    </main>
    <FloatingPanel title={tr('คุณสมบัติ', 'Properties')} icon={<IconPalette size={15} />} className={`properties-window ${active || !['select', 'hand'].includes(tool) ? 'show-tool-settings' : ''} ${tool === 'eraser' && !active ? 'eraser-settings' : ''}`} open={rightOpen} onClose={() => setRightOpen(false)} side="right" width={286} active={frontPanel === 'properties'} onActivate={() => { setSettingsOpen(false); setFilesOpen(false); setFrontPanel('properties') }}>
      <div className="selection-label"><span className="selection-icon"><ActiveShapeIcon size={18} /></span><div><strong>{propertyTitle}</strong><span>{active ? tr('เลือกแล้ว 1 รายการ', '1 element selected') : tr('สำหรับผลงานชิ้นถัดไปของคุณ', 'For your next creation')}</span></div></div>
      {tool === 'eraser' && !active && <div className="eraser-size"><PropertyField label={tr('ขนาดยางลบ', 'Eraser size')} trailing={<span>{eraserSize} px</span>}><input aria-label={tr('ขนาดยางลบ', 'Eraser size')} className="opacity-slider" type="range" min="6" max="72" step="2" value={eraserSize} onChange={e => setEraserSize(Number(e.target.value))} /><div className="stroke-presets">{[8, 16, 24, 40, 64].map(size => <button key={size} aria-label={tr(`ขนาดยางลบ ${size} px`, `Eraser size ${size} px`)} aria-pressed={eraserSize === size} onClick={() => setEraserSize(size)}>{size}</button>)}</div></PropertyField><p>{tr('ลากผ่านเส้นเพื่อลบตามขนาดที่เลือก', 'Drag over lines to erase at the selected size.')}</p></div>}
      {activeTableData && <PropertyField label={tr('ตาราง', 'Table')}><div className="table-editor-grid" style={{ gridTemplateColumns: `repeat(${Math.max(...activeTableData.map(row => row.length), 1)}, minmax(74px, 1fr))` }}>{activeTableData.map((row, rowIndex) => row.map((cell, columnIndex) => <input key={`${rowIndex}-${columnIndex}`} aria-label={tr(`แถว ${rowIndex + 1} คอลัมน์ ${columnIndex + 1}`, `Row ${rowIndex + 1}, column ${columnIndex + 1}`)} value={cell} onChange={event => updateTableCell(rowIndex, columnIndex, event.target.value)} placeholder={rowIndex === 0 ? tr('หัวตาราง', 'Table heading') : tr('ข้อมูล', 'Data')} />))}</div><div className="table-editor-actions"><Button onClick={addTableRow} icon={<IconPlus size={15} />}>{tr('เพิ่มแถว', 'Add row')}</Button><Button onClick={addTableColumn} icon={<IconPlus size={15} />}>{tr('เพิ่มคอลัมน์', 'Add column')}</Button></div></PropertyField>}
      {active && !activeTableData && <PropertyField label={active.connection ? tr('ป้ายกำกับเส้นเชื่อม (ใช่ / ไม่ใช่)', 'Connection label (Yes / No)') : tr('ข้อความ', 'Text')}><input aria-label={tr('ข้อความของวัตถุ', 'Element text')} className="property-input" value={active.text} onChange={e => updateStyle({ text: e.target.value })} placeholder={tr('เพิ่มป้ายกำกับ...', 'Add a label...')} /></PropertyField>}
      {!isTextTool && !isUtilityTool && <div className="brush-settings"><div className="brush-preview"><svg viewBox="0 0 230 62" aria-label={tr('ตัวอย่างเส้น', 'Stroke preview')} style={{ color: current.stroke, opacity: current.opacity / 100 }}><g transform="translate(15 30)"><BrushStroke points="0,10 20,-12 45,-15 70,10 95,15 120,-12 145,-15 170,10 200,0" width={current.width} brush={current.brush} /></g></svg><span>{tr('ตัวอย่างเส้น', 'Stroke preview')} · {current.width} px</span></div><div className="brush-grid" role="group" aria-label={tr('ชนิดหัวแปรง', 'Brush type')}>{brushes.map(brush => <button key={brush.value} aria-pressed={(current.brush ?? 'pen') === brush.value} className="brush-option" onClick={() => updateStyle({ brush: brush.value })}><svg viewBox="0 0 90 28" aria-hidden="true"><g transform="translate(6 14)"><BrushStroke points="0,4 15,-5 30,-5 45,5 60,5 76,-3" width={brush.value === 'highlighter' ? 5 : 3} brush={brush.value} /></g></svg><strong>{tr(brush.label, { pen: 'Pen', brush: 'Brush', marker: 'Marker', highlighter: 'Highlighter' }[brush.value])}</strong><small>{tr(brush.description, { pen: 'Smooth round line', brush: 'Tapered, weighted stroke', marker: 'Bold solid line', highlighter: 'Flat translucent stroke' }[brush.value])}</small></button>)}</div></div>}
      <div className="property-section-heading">{tr('สีและลักษณะเส้น', 'Colors and strokes')}<span>{tr('ขอบคม · เวกเตอร์', 'Crisp edges · Vector')}</span></div>
      <PropertyField label={isTextTool ? tr('สีข้อความ', 'Text color') : tr('สีเส้น', 'Stroke color')}><ColorPicker label={tr('สีเส้น', 'Stroke color')} colors={['#3b3948', '#e28087', '#6e9e85', '#6d9dd1', '#68618d']} value={current.stroke} onChange={stroke => updateStyle({ stroke })} /></PropertyField>
      {!isLineTool && <PropertyField label={tr('พื้นหลัง', 'Background')}><ColorPicker label={tr('พื้นหลัง', 'Background')} colors={['none', '#fbe3e4', '#e4f2ec', '#e5effb', '#eeebfa']} value={current.fill} onChange={fill => updateStyle({ fill })} /></PropertyField>}
      {!isTextTool && <PropertyField label={isBrushTool ? tr('ขนาดหัวแปรง', 'Brush size') : tr('ความหนาเส้น', 'Stroke width')} trailing={<span>{current.width} px</span>}><input aria-label={tr('ความหนาเส้น', 'Stroke width')} className="opacity-slider" type="range" min="1" max="24" step="1" value={current.width} onChange={e => updateStyle({ width: Number(e.target.value) })} /><div className="stroke-presets">{[1, 2, 4, 8, 16, 24].map(width => <button key={width} aria-label={tr(`ความหนา ${width} px`, `Width ${width} px`)} aria-pressed={current.width === width} onClick={() => updateStyle({ width })}>{width}</button>)}</div></PropertyField>}
      {!isBrushTool && !isTextTool && (!current.brush || current.brush === 'pen') && <PropertyField label={tr('ปลายเส้น', 'Line cap')}><SegmentedControl label={tr('ปลายเส้น', 'Line cap')} options={[{ value: 'round', label: tr('กลม', 'Round'), content: <span style={{ fontSize: 14 }}>●</span> }, { value: 'butt', label: tr('ตัดตรง', 'Butt'), content: <span style={{ fontSize: 14 }}>■</span> }]} value={current.lineCap ?? 'round'} onChange={lineCap => updateStyle({ lineCap: lineCap as Shape['lineCap'] })} /></PropertyField>}
      {!isBrushTool && !isTextTool && <PropertyField label={tr('รูปแบบเส้น', 'Stroke style')}><SegmentedControl label={tr('รูปแบบเส้น', 'Stroke style')} options={[{ value: 'solid', label: tr('เส้นทึบ', 'Solid stroke'), content: '━━' }, { value: 'dashed', label: tr('เส้นประ', 'Dashed stroke'), content: '┄┄┄' }]} value={current.dashed ? 'dashed' : 'solid'} onChange={v => updateStyle({ dashed: v === 'dashed' })} /></PropertyField>}
      <div className="property-section-heading">{tr('การแสดงผล', 'Appearance')}</div>
      <PropertyField label={tr('ความทึบ', 'Opacity')} trailing={<span>{current.opacity}%</span>}><input aria-label={tr('ความทึบ', 'Opacity')} className="opacity-slider" type="range" min="10" max="100" value={current.opacity} onChange={e => updateStyle({ opacity: Number(e.target.value) })} /><div className="range-labels"><span>10</span><span>100</span></div></PropertyField>
      {active && <PropertyField label={tr('จัดลำดับ', 'Arrange')}><div className="arrange-actions"><IconButton label={tr('ส่งไปด้านหลัง', 'Send to back')} onClick={() => reorder(false)}><IconArrowDown size={17} /></IconButton><IconButton label={tr('นำไปด้านหน้า', 'Bring to front')} onClick={() => reorder(true)}><IconArrowUp size={17} /></IconButton><IconButton label={tr('ทำสำเนา (Ctrl+D)', 'Duplicate (Ctrl+D)')} disabled={!!active.connection} onClick={duplicate}><IconCopy size={17} /></IconButton><IconButton label={tr('ลบ', 'Delete')} onClick={remove}><IconTrash size={17} /></IconButton></div></PropertyField>}
      <div className="properties-footer"><IconMousePointer2 size={16} /><p>{tool === 'eraser' && !active ? tr('คลิกหรือลากผ่านเส้นเพื่อลบอย่างแม่นยำ', 'Click or drag over lines to erase precisely.') : active ? tr('ปรับทุกรายละเอียดได้ตามที่คุณต้องการ', 'Every detail, just how you like it.') : tr('เลือกวัตถุบนพื้นที่วาดเพื่อปรับคุณสมบัติ', 'Select an element on the canvas to fine-tune its properties.')}</p></div>
    </FloatingPanel>
    <FloatingPanel title={tr('เมนู', 'Menu')} icon={<IconMenu2 size={15} />} className="files-window" open={filesOpen} onClose={() => setFilesOpen(false)} side="left" width={360} active={frontPanel === 'files'} onActivate={() => { setSettingsOpen(false); setRightOpen(false); setFrontPanel('files') }}>
      <div className="files-menu-content"><section className="file-section" aria-label={tr('คำสั่งไฟล์โปรเจกต์', 'Project file actions')}><button type="button" className="file-action" onClick={() => importInputRef.current?.click()}><span className="file-action-icon"><IconFolderOpen size={17} /></span><span><strong>{tr('เปิดโปรเจกต์', 'Open project')}</strong><small>{tr('เปิดไฟล์ .devcanvas.json', 'Load a .devcanvas.json file')}</small></span></button><button type="button" className="file-action" onClick={exportProject}><span className="file-action-icon"><IconDownload size={17} /></span><span><strong>{tr('บันทึกไฟล์โปรเจกต์', 'Save project file')}</strong><small>{tr('ดาวน์โหลดไฟล์ .devcanvas.json ที่แก้ไขต่อได้', 'Download an editable .devcanvas.json')}</small></span></button></section><section className="file-section file-export-section" aria-label={tr('ส่งออกภาพ', 'Image export')}><button type="button" className="export-image-trigger" onClick={() => { setFilesOpen(false); setExportImageOpen(true) }}><span><IconDownload size={17} /><strong>{tr('ส่งออกภาพ…', 'Export Image…')}</strong></span></button></section></div>
      <div className="menu-reset-section"><button type="button" className="reset-canvas-action" onClick={requestResetCanvas} disabled={!shapes.length}><IconTrash size={15} /><span>{tr('ล้างพื้นที่วาด', 'Reset canvas')}</span><small>{shapes.length ? `${shapes.length} ${tr('รายการ', shapes.length === 1 ? 'element' : 'elements')}` : tr('ยังไม่มีรายการ', 'Already empty')}</small></button></div>
    </FloatingPanel>
    <FloatingPanel title={tr('ตั้งค่า', 'Settings')} icon={<IconSettings size={15} />} className="settings-window" open={settingsOpen} onClose={() => setSettingsOpen(false)} side="right" width={520} active={frontPanel === 'settings'} onActivate={() => { setRightOpen(false); setFilesOpen(false); setFrontPanel('settings') }}>
      <div className="settings-layout"><nav className="settings-nav" aria-label="Settings categories"><button type="button" className={settingsTab === 'appearance' ? 'is-active' : ''} aria-current={settingsTab === 'appearance' ? 'page' : undefined} onClick={() => setSettingsTab('appearance')}><IconPalette size={16} />{tr('หน้าตา', 'Appearance')}</button><button type="button" className={settingsTab === 'canvas' ? 'is-active' : ''} aria-current={settingsTab === 'canvas' ? 'page' : undefined} onClick={() => setSettingsTab('canvas')}><IconGridDots size={16} />Canvas</button><button type="button" className={settingsTab === 'language' ? 'is-active' : ''} aria-current={settingsTab === 'language' ? 'page' : undefined} onClick={() => setSettingsTab('language')}><IconLanguage size={16} />{tr('ภาษา', 'Language')}</button></nav><section className="settings-content" aria-label={`${settingsTab} settings`}>{settingsTab === 'language' ? <><div className="settings-content-heading"><span>LANGUAGE</span><h2>{tr('ภาษา', 'Language')}</h2><p>{tr('เลือกภาษาสำหรับส่วนติดต่อทั้งหมดของ Devcanvas', 'Choose the language used throughout Devcanvas.')}</p></div><div className="settings-card"><div className="settings-mode" role="group" aria-label="Language"><button type="button" className={language === 'th' ? 'is-active' : ''} aria-pressed={language === 'th'} onClick={() => setLanguage('th')}>ไทย</button><button type="button" className={language === 'en' ? 'is-active' : ''} aria-pressed={language === 'en'} onClick={() => setLanguage('en')}>English</button></div></div></> : settingsTab === 'appearance' ? <><div className="settings-content-heading"><span>APPEARANCE</span><h2>{tr('ปรับหน้าตาพื้นที่ทำงาน', 'Customize your workspace')}</h2><p>{tr('เลือกธีมและโทนสีที่สบายตาสำหรับคุณ', 'Choose a theme and colors that feel right.')}</p></div><div className="settings-card"><div className="setting-row"><div><strong>{tr('โหมดสี', 'Color mode')}</strong><small>{tr('เลือกระหว่างโหมดสว่างและมืด', 'Choose light or dark mode.')}</small></div><div className="settings-mode" role="group" aria-label="Color mode"><button type="button" className={preference.mode === 'light' ? 'is-active' : ''} aria-pressed={preference.mode === 'light'} onClick={() => setMode('light')}><IconSun size={15} />{tr('สว่าง', 'Light')}</button><button type="button" className={preference.mode === 'dark' ? 'is-active' : ''} aria-pressed={preference.mode === 'dark'} onClick={() => setMode('dark')}><IconMoon size={15} />{tr('มืด', 'Dark')}</button></div></div><div className="settings-theme-section"><div><strong>{tr('ธีมสี', 'Color theme')}</strong><small>{tr('เลือกธีมจากตัวอย่างด้านล่าง', 'Choose a theme below.')}</small></div><div className="settings-theme-grid" role="group" aria-label="Color theme">{themes.map(theme => { const selected = preference.theme === theme.id; const index = preference.mode === 'dark' ? 1 : 0; return <button type="button" key={theme.id} className={selected ? 'is-active' : ''} aria-pressed={selected} onClick={() => setTheme(theme.id)}><span className="settings-theme-preview" style={{ background: theme.canvas[index], borderColor: theme.accent[index] }}><i style={{ background: theme.accent[index] }} /><i /><i /></span><span>{theme.name}</span>{selected && <IconCheck size={13} />}</button> })}</div></div></div></> : <><div className="settings-content-heading"><span>CANVAS</span><h2>{tr('ตั้งค่าพื้นที่วาด', 'Canvas settings')}</h2><p>{tr('ปรับองค์ประกอบที่ช่วยจัดวางไอเดียของคุณ', 'Adjust the space that supports your ideas.')}</p></div><div className="settings-card"><div className="settings-canvas-color"><div><strong>{tr('พื้นหลัง Canvas', 'Canvas background')}</strong><small>{tr('เลือกสีพื้นหลังของพื้นที่วาด', 'Choose a canvas background color.')}</small></div><ColorPicker label="Canvas background" colors={['#ffffff', '#faf9fc', '#f7faff', '#f7fbf8', '#fff8fa', '#fffbf5', '#f8f9fb']} value={canvasBackground} onChange={setCustomCanvasBackground} /><div className="settings-canvas-color-footer"><span className="background-preview" style={{ background: canvasBackground }} /><span>{canvasBackground.toUpperCase()}</span><button type="button" disabled={!customCanvasBackground} onClick={() => setCustomCanvasBackground(null)}>{tr('ใช้สีตามธีม', 'Use theme color')}</button></div></div><div className="setting-row"><div><strong>{tr('จุดกริด', 'Dot grid')}</strong><small>{tr('แสดงจุดนำสายตาบน Canvas', 'Show alignment dots on the canvas.')}</small></div><Toggle label="Dot grid" checked={grid} onChange={setGrid} /></div></div></>}</section></div>
    </FloatingPanel>
    </div>
    <input ref={importInputRef} type="file" accept="application/json,.json" onChange={importProject} hidden />
    {toast && <div className="toast" role="status"><IconCheck size={16} />{toast}</div>}
    {help && <div className="modal-backdrop" onClick={() => setHelp(false)}><section ref={modalRef} tabIndex={-1} className="shortcuts-modal" role="dialog" aria-modal="true" aria-labelledby="shortcut-title" onClick={e => e.stopPropagation()} onKeyDown={e => { if (e.key === 'Tab') { e.preventDefault(); modalRef.current?.querySelector('button')?.focus() } }}><div className="modal-heading"><h2 id="shortcut-title">{tr('คีย์ลัดสำหรับไอเดียต่อไปของคุณ', 'A shortcut to your next idea')}</h2><IconButton label={tr('ปิดหน้าต่างคีย์ลัด', 'Close shortcuts')} onClick={() => setHelp(false)}><IconX size={20} /></IconButton></div><p>{tr('ใช้คีย์ลัดเพื่อทำงานกับไอเดียได้อย่างต่อเนื่อง', 'Keep your hands on the keyboard and your ideas moving.')}</p><div className="shortcut-list">{toolItems.map(t => <div key={t.id}><t.icon size={18} /><span>{tr(thaiToolLabels[t.id], t.label)}</span><kbd>{t.key}</kbd></div>)}{Object.entries(extraToolKeys).map(([tool, key]) => <div key={tool}><IconShape size={18} /><span>{tr({ star: 'ดาว', pentagon: 'ห้าเหลี่ยม', hexagon: 'หกเหลี่ยม', octagon: 'แปดเหลี่ยม', heart: 'หัวใจ', cloud: 'เมฆ', parallelogram: 'สี่เหลี่ยมด้านขนาน' }[tool]!, { star: 'Star', pentagon: 'Pentagon', hexagon: 'Hexagon', octagon: 'Octagon', heart: 'Heart', cloud: 'Cloud', parallelogram: 'Parallelogram' }[tool]!)}</span><kbd>{key}</kbd></div>)}<div><IconArrowBackUp size={18} /><span>{tr('เลิกทำ / ทำซ้ำ', 'Undo / Redo')}</span><kbd>Ctrl + (Shift) + Z</kbd></div><div><IconCopy size={18} /><span>{tr('ทำสำเนา', 'Duplicate')}</span><kbd>Ctrl + D</kbd></div><div><IconTrash size={18} /><span>{tr('ลบรายการที่เลือก', 'Delete selected')}</span><kbd>Delete</kbd></div><div><IconCheck size={18} /><span>{tr('เลือกทั้งหมด', 'Select all')}</span><kbd>Ctrl + A</kbd></div><div><IconDownload size={18} /><span>{tr('เปิด / บันทึก / ส่งออก', 'Open / Save / Export')}</span><kbd>Ctrl + O / S / E</kbd></div><div><IconSettings size={18} /><span>{tr('ไลบรารี / คุณสมบัติ / ตั้งค่า', 'Library / Properties / Settings')}</span><kbd>Ctrl + L / P / ,</kbd></div><div><IconGridDots size={18} /><span>{tr('สลับจุดกริด', 'Toggle dot grid')}</span><kbd>Ctrl + G</kbd></div><div><IconZoomScan size={18} /><span>{tr('ซูม / คืนมุมมอง', 'Zoom / Reset view')}</span><kbd>+ / − / 0</kbd></div><div><IconMenu2 size={18} /><span>{tr('เมนู / พื้นที่ทำงาน / คุณสมบัติ / ตั้งค่า', 'Menu / Workspace / Properties / Settings')}</span><kbd>Alt + 1 / 2 / 3 / 4</kbd></div></div><p className="modal-note">{tr('กด Esc เพื่อยกเลิกหรือกลับสู่เครื่องมือเลือก คีย์ลัดจะไม่ทำงานขณะกำลังพิมพ์ในช่องข้อความ', 'Press Esc to cancel or return to Select. Shortcuts are paused while typing in a text field.')}</p></section></div>}
    <ExportImageDialog open={exportImageOpen} onClose={() => setExportImageOpen(false)} previewMarkup={exportPreviewMarkup} background={exportTheme === 'current' ? exportBackgroundColor : exportTheme === 'dark' ? '#202126' : '#ffffff'} format={exportFormat === 'project' ? 'png' : exportFormat} setFormat={value => setExportFormat(value)} theme={exportTheme} setTheme={value => setExportTheme(value)} backgroundColor={exportBackgroundColor} setBackgroundColor={value => { setExportBackgroundColor(value); setExportTheme('current') }} padding={exportPadding} setPadding={setExportPadding} includeBackground={exportBackground} setIncludeBackground={setExportBackground} includeGrid={exportGrid} setIncludeGrid={setExportGrid} onExport={exportSelectedFormat} />
    <ResetCanvasDialog open={resetConfirmOpen} count={shapes.length} onCancel={() => setResetConfirmOpen(false)} onConfirm={resetCanvas} />
  </div>
}
