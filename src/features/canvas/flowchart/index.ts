import type { Connection, DrawingStyle, FlowNodeKind, Port, Shape } from '../model'

export type FlowNodeOption = { kind: FlowNodeKind; name: string; description: string; group: 'Basic' | 'Data & documents' | 'Storage' | 'Manual & special' | 'Connectors & logic' }
export type FlowTemplateId = 'simple' | 'decision' | 'data'
export const flowTemplateOptions: { id: FlowTemplateId; name: string; description: string; kinds: FlowNodeKind[] }[] = [
  { id: 'simple', name: 'Simple process', description: 'เริ่มต้น → ขั้นตอน → จบ', kinds: ['terminator', 'process', 'terminator'] },
  { id: 'decision', name: 'Decision flow', description: 'มีเงื่อนไข Yes / No', kinds: ['terminator', 'process', 'decision', 'terminator', 'terminator'] },
  { id: 'data', name: 'Data workflow', description: 'รับข้อมูล → ประมวลผล → เก็บ → แสดง', kinds: ['manual-input', 'process', 'database', 'display'] },
]
export const flowNodeOptions: FlowNodeOption[] = [
  { kind: 'terminator', name: 'Start / End', description: 'จุดเริ่มต้นหรือสิ้นสุด', group: 'Basic' }, { kind: 'process', name: 'Process', description: 'ขั้นตอนการทำงาน', group: 'Basic' },
  { kind: 'decision', name: 'Decision', description: 'เงื่อนไขและทางเลือก', group: 'Basic' }, { kind: 'input-output', name: 'Input / Output', description: 'รับหรือส่งข้อมูล', group: 'Basic' },
  { kind: 'document', name: 'Document', description: 'เอกสารหนึ่งรายการ', group: 'Data & documents' }, { kind: 'multiple-documents', name: 'Multiple Documents', description: 'เอกสารหลายรายการ', group: 'Data & documents' },
  { kind: 'display', name: 'Display', description: 'แสดงผลบนหน้าจอ', group: 'Data & documents' }, { kind: 'database', name: 'Database', description: 'ฐานข้อมูล', group: 'Storage' },
  { kind: 'stored-data', name: 'Stored Data', description: 'ข้อมูลที่จัดเก็บ', group: 'Storage' }, { kind: 'internal-storage', name: 'Internal Storage', description: 'หน่วยเก็บข้อมูลภายใน', group: 'Storage' },
  { kind: 'predefined-process', name: 'Predefined Process', description: 'กระบวนการย่อย', group: 'Storage' }, { kind: 'manual-input', name: 'Manual Input', description: 'ป้อนข้อมูลด้วยผู้ใช้', group: 'Manual & special' },
  { kind: 'manual-operation', name: 'Manual Operation', description: 'การทำงานด้วยผู้ใช้', group: 'Manual & special' }, { kind: 'preparation', name: 'Preparation', description: 'เตรียมการหรือกำหนดค่า', group: 'Manual & special' },
  { kind: 'delay', name: 'Delay', description: 'หน่วงเวลาหรือรอ', group: 'Manual & special' }, { kind: 'connector', name: 'On-page Connector', description: 'เชื่อมต่อในหน้าเดียวกัน', group: 'Connectors & logic' },
  { kind: 'off-page-connector', name: 'Off-page Connector', description: 'เชื่อมต่อไปหน้าอื่น', group: 'Connectors & logic' }, { kind: 'merge', name: 'Merge', description: 'รวมหลายเส้นทาง', group: 'Connectors & logic' },
  { kind: 'extract', name: 'Extract', description: 'แยกหรือดึงข้อมูล', group: 'Connectors & logic' }, { kind: 'sort', name: 'Sort', description: 'จัดเรียงข้อมูล', group: 'Connectors & logic' },
  { kind: 'summing-junction', name: 'Summing Junction', description: 'รวมอินพุตหลายทาง', group: 'Connectors & logic' }, { kind: 'or', name: 'Or', description: 'ทางเลือกอย่างน้อยหนึ่งทาง', group: 'Connectors & logic' },
  { kind: 'annotation', name: 'Annotation', description: 'หมายเหตุประกอบ', group: 'Connectors & logic' },
]
export const ports: Port[] = ['top', 'right', 'bottom', 'left']
export function isFlowNode(shape: Shape) { return !!shape.flowKind }
const compactKinds = new Set<FlowNodeKind>(['connector', 'merge', 'extract', 'sort', 'summing-junction', 'or'])
export function createFlowNode(kind: FlowNodeKind, center: { x: number; y: number }, style: DrawingStyle): Shape {
  const compact = compactKinds.has(kind); const decision = kind === 'decision'
  const w = compact ? 76 : kind === 'off-page-connector' ? 105 : decision ? 180 : kind === 'annotation' ? 180 : 190
  const h = compact ? 76 : decision ? 130 : kind === 'terminator' || kind === 'off-page-connector' ? 70 : 88
  const option = flowNodeOptions.find(item => item.kind === kind)!
  return { id: crypto.randomUUID(), type: kind === 'decision' || kind === 'sort' ? 'diamond' : kind === 'connector' || kind === 'summing-junction' || kind === 'or' ? 'ellipse' : kind === 'terminator' ? 'terminator' : kind === 'input-output' ? 'input-output' : 'rectangle', flowKind: kind, x: center.x - w / 2, y: center.y - h / 2, w, h, ...style, text: option.name }
}
export function portPoint(shape: Shape, port: Port) { switch (port) { case 'top': return { x: shape.x + shape.w / 2, y: shape.y }; case 'bottom': return { x: shape.x + shape.w / 2, y: shape.y + shape.h }; case 'left': return { x: shape.x, y: shape.y + shape.h / 2 }; case 'right': return { x: shape.x + shape.w, y: shape.y + shape.h / 2 } } }
export function resolveConnection(shape: Shape, shapes: Shape[]): Shape {
  if (!shape.connection) return shape
  const source = shapes.find(node => node.id === shape.connection!.from), target = shapes.find(node => node.id === shape.connection!.to)
  if (!source || !target) return shape
  const dx = target.x + target.w / 2 - source.x - source.w / 2, dy = target.y + target.h / 2 - source.y - source.h / 2, horizontal = Math.abs(dx) > Math.abs(dy)
  const fromPort = shape.connection.fromPort ?? (horizontal ? dx >= 0 ? 'right' : 'left' : dy >= 0 ? 'bottom' : 'top'), toPort = shape.connection.toPort ?? (horizontal ? dx >= 0 ? 'left' : 'right' : dy >= 0 ? 'top' : 'bottom')
  const start = portPoint(source, fromPort), end = portPoint(target, toPort), vectors = { top: [0, -1], right: [1, 0], bottom: [0, 1], left: [-1, 0] }
  const a = { x: start.x + vectors[fromPort][0] * 24, y: start.y + vectors[fromPort][1] * 24 }, b = { x: end.x + vectors[toPort][0] * 24, y: end.y + vectors[toPort][1] * 24 }
  const fromHorizontal = fromPort === 'left' || fromPort === 'right', toHorizontal = toPort === 'left' || toPort === 'right'
  const bends = fromHorizontal === toHorizontal ? fromHorizontal ? [{ x: (a.x + b.x) / 2, y: a.y }, { x: (a.x + b.x) / 2, y: b.y }] : [{ x: a.x, y: (a.y + b.y) / 2 }, { x: b.x, y: (a.y + b.y) / 2 }] : [fromHorizontal ? { x: b.x, y: a.y } : { x: a.x, y: b.y }]
  const route = shape.route && shape.route.length >= 2 ? [start, ...shape.route.slice(1, -1), end] : [start, a, ...bends, b, end]
  const points = route.map(point => `${point.x - start.x},${point.y - start.y}`).join(' ')
  return { ...shape, route, x: start.x, y: start.y, w: end.x - start.x, h: end.y - start.y, points }
}
export function createConnection(connection: Connection, shapes: Shape[], style: DrawingStyle): Shape | null {
  if (connection.from === connection.to || ![connection.from, connection.to].every(id => shapes.some(shape => shape.id === id && isFlowNode(shape)))) return null
  if (shapes.some(shape => shape.connection?.from === connection.from && shape.connection.to === connection.to && shape.connection.fromPort === connection.fromPort && shape.connection.toPort === connection.toPort)) return null
  return { id: crypto.randomUUID(), type: 'arrow', x: 0, y: 0, w: 0, h: 0, ...style, fill: 'none', text: '', connection }
}
export function removeFlowItem(shapes: Shape[], id: string) { return shapes.filter(shape => shape.id !== id && shape.connection?.from !== id && shape.connection?.to !== id) }
export function createFlowTemplate(origin: { x: number; y: number }, style: DrawingStyle, template: FlowTemplateId = 'decision'): Shape[] {
  const templates: Record<FlowTemplateId, { centers: number[][]; kinds: FlowNodeKind[]; labels: string[]; edges: [number, number, string][] }> = {
    simple: { centers: [[280, 0], [280, 145], [280, 290]], kinds: ['terminator', 'process', 'terminator'], labels: ['Start', 'Do something', 'Done'], edges: [[0, 1, ''], [1, 2, '']] },
    decision: { centers: [[280, 0], [280, 130], [280, 300], [70, 480], [490, 480]], kinds: ['terminator', 'process', 'decision', 'terminator', 'terminator'], labels: ['Start', 'Do something', 'Ready?', 'Done', 'Try again'], edges: [[0, 1, ''], [1, 2, ''], [2, 3, 'Yes'], [2, 4, 'No']] },
    data: { centers: [[280, 0], [280, 145], [280, 290], [280, 435]], kinds: ['manual-input', 'process', 'database', 'display'], labels: ['Enter data', 'Process data', 'Store data', 'Show result'], edges: [[0, 1, ''], [1, 2, ''], [2, 3, '']] },
  }
  const { centers, kinds, labels, edges: links } = templates[template]
  const nodes = kinds.map((kind, index) => ({ ...createFlowNode(kind, { x: origin.x + centers[index][0], y: origin.y + centers[index][1] }, style), text: labels[index] }))
  const edges = links.map(([from, to, text]) => ({ ...createConnection({ from: nodes[from].id, to: nodes[to].id }, nodes, style)!, text }))
  return [...edges, ...nodes]
}
