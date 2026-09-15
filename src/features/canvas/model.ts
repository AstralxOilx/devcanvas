export type Tool = 'select' | 'hand' | 'rectangle' | 'diamond' | 'ellipse' | 'star' | 'pentagon' | 'hexagon' | 'octagon' | 'heart' | 'cloud' | 'parallelogram' | 'arrow' | 'line' | 'elbow' | 'curve' | 'double-arrow' | 'draw' | 'eraser' | 'text' | 'flowchart' | 'connect'
export type FlowNodeKind =
  | 'terminator' | 'process' | 'decision' | 'input-output'
  | 'document' | 'multiple-documents' | 'predefined-process'
  | 'database' | 'stored-data' | 'internal-storage'
  | 'manual-input' | 'manual-operation' | 'preparation' | 'delay' | 'display'
  | 'connector' | 'off-page-connector'
  | 'merge' | 'extract' | 'sort' | 'summing-junction' | 'or' | 'annotation'
  | 'table' | 'view' | 'join-table' | 'pivot-table'
export type Port = 'top' | 'right' | 'bottom' | 'left'
export type Connection = { from: string; to: string; fromPort?: Port; toPort?: Port }
export type Brush = 'pen' | 'brush' | 'marker' | 'highlighter'
export type LayerGroup = { id: string; name: string; parentId?: string }
export type Shape = { id: string; type: Exclude<Tool, 'select' | 'hand' | 'flowchart' | 'connect'> | 'terminator' | 'input-output'; x: number; y: number; w: number; h: number; stroke: string; fill: string; width: number; opacity: number; text: string; name?: string; groupId?: string; hidden?: boolean; fontSize?: number; points?: string; brush?: Brush; dashed?: boolean; lineCap?: 'round' | 'butt' | 'square'; sloppiness?: 0 | 1 | 2 | 3 | 4 | 5; connection?: Connection; relationship?: string; tableData?: string[][]; route?: { x: number; y: number }[]; flowKind?: FlowNodeKind }
export type DrawingStyle = Pick<Shape, 'stroke' | 'fill' | 'width' | 'opacity' | 'lineCap' | 'sloppiness' | 'brush' | 'dashed'>
export const defaultStyle: DrawingStyle = { stroke: '#68618d', fill: 'none', width: 2, opacity: 100, lineCap: 'round', sloppiness: 0, brush: 'pen' }
export const tableFlowKinds = ['table', 'view', 'join-table', 'pivot-table'] as const
export function isTableFlowKind(kind: FlowNodeKind | undefined): kind is typeof tableFlowKinds[number] { return !!kind && tableFlowKinds.includes(kind as typeof tableFlowKinds[number]) }
export function normalizeTableData(kind: FlowNodeKind | undefined, value: unknown): string[][] | undefined {
  if (!isTableFlowKind(kind)) return undefined
  const rows = Array.isArray(value) ? value.filter(Array.isArray) : []
  const fallback = [[kind === 'view' ? 'View' : kind === 'join-table' ? 'Join Table' : kind === 'pivot-table' ? 'Pivot Table' : 'Table', 'Column 1', 'Column 2'], ['', '', ''], ['', '', '']]
  const source = rows.length ? rows : fallback
  const columns = Math.max(...source.map(row => Math.max(0, row.length)), 1)
  return source.map(row => Array.from({ length: columns }, (_, column) => typeof row[column] === 'string' ? row[column] : row[column] == null ? '' : String(row[column])))
}
export const initialShapes: Shape[] = [
  { id: 'heading', type: 'text', x: 160, y: 146, w: 660, h: 55, ...defaultStyle, stroke: '#48414f', fill: 'none', text: 'Good things start with a little idea.' },
  { id: 'subtitle', type: 'text', x: 240, y: 200, w: 500, h: 30, ...defaultStyle, stroke: '#a39aaa', fill: 'none', text: 'Make space to think. Connect the dots. See what happens.' },
  { id: 'connection-1', type: 'arrow', x: 294, y: 357, w: 91, h: 0, ...defaultStyle, stroke: '#a99cb7', fill: 'none', text: '' },
  { id: 'connection-2', type: 'arrow', x: 590, y: 357, w: 91, h: 0, ...defaultStyle, stroke: '#a99cb7', fill: 'none', text: '' },
  { id: 'idea', type: 'rectangle', x: 105, y: 307, w: 186, h: 100, ...defaultStyle, text: 'A little idea' },
  { id: 'explore', type: 'diamond', x: 388, y: 280, w: 200, h: 154, ...defaultStyle, stroke: '#b69a69', fill: '#fff5df', text: 'Explore it' },
  { id: 'create', type: 'rectangle', x: 687, y: 307, w: 186, h: 100, ...defaultStyle, stroke: '#759b8d', fill: '#e8f2ea', text: 'Make it happen' },
  { id: 'note', type: 'text', x: 342, y: 475, w: 294, h: 40, ...defaultStyle, stroke: '#aa9abb', fill: 'none', text: 'a little messy is a good start :)' },
]
export function readBoard(): { shapes: Shape[]; title: string; groups: LayerGroup[] } {
  try {
    const saved = JSON.parse(localStorage.getItem('devcanvas-board') || 'null')
    const types = ['rectangle', 'diamond', 'ellipse', 'star', 'pentagon', 'hexagon', 'octagon', 'heart', 'cloud', 'parallelogram', 'arrow', 'line', 'elbow', 'curve', 'double-arrow', 'draw', 'text', 'terminator', 'input-output']
    const flowKinds: FlowNodeKind[] = ['terminator', 'process', 'decision', 'input-output', 'document', 'multiple-documents', 'predefined-process', 'database', 'stored-data', 'internal-storage', 'manual-input', 'manual-operation', 'preparation', 'delay', 'display', 'connector', 'off-page-connector', 'merge', 'extract', 'sort', 'summing-junction', 'or', 'annotation', 'table', 'view', 'join-table', 'pivot-table']
    const validRoute = (route: unknown) => route === undefined || (Array.isArray(route) && route.length >= 2 && route.every(point => point && typeof point === 'object' && Number.isFinite((point as { x?: unknown }).x) && Number.isFinite((point as { y?: unknown }).y)))
    if (saved && typeof saved.title === 'string' && Array.isArray(saved.shapes) && saved.shapes.every((s: Shape) => s && typeof s.id === 'string' && types.includes(s.type) && (s.hidden === undefined || typeof s.hidden === 'boolean') && (s.flowKind === undefined || flowKinds.includes(s.flowKind)) && (s.lineCap === undefined || ['round', 'butt', 'square'].includes(s.lineCap)) && (s.sloppiness === undefined || Number.isInteger(s.sloppiness) && s.sloppiness >= 0 && s.sloppiness <= 5) && validRoute(s.route) && ['x', 'y', 'w', 'h', 'width', 'opacity'].every(k => Number.isFinite(s[k as keyof Shape])) && typeof s.text === 'string' && typeof s.stroke === 'string' && typeof s.fill === 'string')) {
      const items: Shape[] = saved.shapes.map((item: Shape) => {
        const tableData = normalizeTableData(item.flowKind, item.tableData)
        const { tableData: _staleTableData, ...shapeWithoutTableData } = item
        return tableData ? { ...shapeWithoutTableData, tableData } : shapeWithoutTableData
      })
      const nodeIds = new Set(items.filter(item => !!item.flowKind || ['rectangle', 'diamond', 'ellipse', 'terminator', 'input-output'].includes(item.type)).map(item => item.id))
      const validPort = (port: unknown) => port === undefined || ['top', 'right', 'bottom', 'left'].includes(String(port))
      const parsedGroups = Array.isArray(saved.groups) ? saved.groups.filter((group: unknown): group is LayerGroup => !!group && typeof group === 'object' && typeof (group as LayerGroup).id === 'string' && typeof (group as LayerGroup).name === 'string' && ((group as LayerGroup).parentId === undefined || typeof (group as LayerGroup).parentId === 'string')) : []
      const parsedGroupIds = new Set(parsedGroups.map((group: LayerGroup) => group.id))
      const groups = parsedGroups.map((group: LayerGroup) => group.parentId && !parsedGroupIds.has(group.parentId) ? { ...group, parentId: undefined } : group)
      const groupIds = new Set(groups.map((group: LayerGroup) => group.id))
      return { title: saved.title, groups, shapes: items.filter(item => !item.connection || (item.type === 'arrow' && nodeIds.has(item.connection.from) && nodeIds.has(item.connection.to) && item.connection.from !== item.connection.to && validPort(item.connection.fromPort) && validPort(item.connection.toPort))).map(item => item.groupId && !groupIds.has(item.groupId) ? { ...item, groupId: undefined } : item) }
    }
  } catch { /* Browser storage may be unavailable. */ }
  return { shapes: initialShapes, groups: [], title: 'Untitled canvas' }
}
