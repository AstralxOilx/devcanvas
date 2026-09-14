import type { Shape } from './model.ts'

export const isEndpointShape = (shape: Shape) => ['line', 'arrow', 'double-arrow', 'elbow', 'curve'].includes(shape.type)
export function shapeBounds(shape: Shape) {
  const points = shape.type === 'draw' ? (shape.points ?? '0,0').split(' ').map(p => p.split(',').map(Number)).filter(p => p.length === 2 && p.every(Number.isFinite)) : [[0, 0], [shape.w, shape.h]]
  const x = Math.min(...points.map(p => p[0])); const y = Math.min(...points.map(p => p[1]))
  return { x: shape.x + x, y: shape.y + y, w: Math.max(...points.map(p => p[0])) - x, h: Math.max(...points.map(p => p[1])) - y }
}

export function resizeShape(shape: Shape, handle: number, cursor: { x: number; y: number }, keepRatio = false): Shape {
  if (shape.connection) return shape
  if (isEndpointShape(shape)) return handle === 0
    ? { ...shape, x: cursor.x, y: cursor.y, w: shape.x + shape.w - cursor.x, h: shape.y + shape.h - cursor.y }
    : { ...shape, w: cursor.x - shape.x, h: cursor.y - shape.y }
  const bounds = shapeBounds(shape)
  const left = handle === 0 || handle === 2; const top = handle < 2
  const anchorX = bounds.x + (left ? bounds.w : 0); const anchorY = bounds.y + (top ? bounds.h : 0)
  let w = Math.max(8, (cursor.x - anchorX) * (left ? -1 : 1))
  let h = Math.max(8, (cursor.y - anchorY) * (top ? -1 : 1))
  if (keepRatio || shape.type === 'draw' || shape.type === 'text') {
    const scale = Math.max(bounds.w > .01 ? w / bounds.w : 0, bounds.h > .01 ? h / bounds.h : 0, .01)
    w = Math.max(1, bounds.w) * scale; h = Math.max(1, bounds.h) * scale
  }
  const x = anchorX - (left ? w : 0); const y = anchorY - (top ? h : 0)
  if (shape.type === 'draw') {
    const sx = w / Math.max(1, bounds.w); const sy = h / Math.max(1, bounds.h)
    const points = (shape.points ?? '0,0').split(' ').map(pair => {
      const [px, py] = pair.split(',').map(Number)
      return `${(shape.x + px - bounds.x) * sx},${(shape.y + py - bounds.y) * sy}`
    }).join(' ')
    return { ...shape, x, y, w, h, points }
  }
  return { ...shape, x, y, w, h, ...(shape.type === 'text' ? { fontSize: Math.max(4, (shape.fontSize ?? (shape.id === 'heading' ? 29 : shape.id === 'subtitle' ? 14 : shape.id === 'note' ? 18 : 21)) * w / Math.max(1, bounds.w)) } : {}) }
}
