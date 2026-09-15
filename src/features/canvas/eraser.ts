import type { Shape } from './model'

type Point = [number, number]

function pointsOf(shape: Shape): Point[] {
  return (shape.points ?? '').trim().split(/\s+/).map(pair => pair.split(',').map(Number) as Point).filter(point => point.length === 2 && point.every(Number.isFinite))
}
function distanceToSegment(point: Point, start: Point, end: Point) {
  const dx = end[0] - start[0]; const dy = end[1] - start[1]
  const length = dx * dx + dy * dy
  const ratio = length ? Math.max(0, Math.min(1, ((point[0] - start[0]) * dx + (point[1] - start[1]) * dy) / length)) : 0
  return Math.hypot(point[0] - (start[0] + ratio * dx), point[1] - (start[1] + ratio * dy))
}

/** Splits a freehand stroke around the circular eraser; untouched strokes return null. */
export function eraseFreehand(shape: Shape, at: { x: number; y: number }, radius: number): Shape[] | null {
  if (shape.type !== 'draw') return null
  const points = pointsOf(shape)
  if (!points.length) return null
  const local: Point = [at.x - shape.x, at.y - shape.y]
  const reach = radius + shape.width / 2
  const inside = (point: Point) => Math.hypot(point[0] - local[0], point[1] - local[1]) <= reach
  if (points.length === 1) return inside(points[0]) ? [] : null
  const pieces: Point[][] = []; let piece: Point[] = []; let changed = false
  points.forEach((point, index) => {
    const erased = inside(point)
    const crosses = index > 0 && distanceToSegment(local, points[index - 1], point) <= reach
    if (erased || crosses) {
      changed = true
      if (piece.length > 1) pieces.push(piece)
      piece = erased ? [] : [point]
    } else piece.push(point)
  })
  if (piece.length > 1) pieces.push(piece)
  if (!changed) return null
  return pieces.map(points => ({ ...shape, id: crypto.randomUUID(), points: points.map(point => point.join(',')).join(' ') }))
}
