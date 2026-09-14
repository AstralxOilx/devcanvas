import { test } from 'node:test'
import assert from 'node:assert/strict'
import { resizeShape, shapeBounds } from '../src/features/canvas/resize.ts'
import { defaultStyle } from '../src/features/canvas/model.ts'
import type { Shape } from '../src/features/canvas/model.ts'

const base: Shape = { id: 'test', type: 'rectangle', x: 10, y: 20, w: 100, h: 50, text: '', ...defaultStyle }
test('top-left resize anchors opposite corner without mutating the original', () => {
  const result = resizeShape(base, 0, { x: -20, y: 0 })
  assert.deepEqual([result.x, result.y, result.w, result.h], [-20, 0, 130, 70])
  assert.equal(base.w, 100)
})
test('locked proportions and text font size scale together', () => {
  const result = resizeShape({ ...base, type: 'text', fontSize: 20 }, 3, { x: 210, y: 80 })
  assert.deepEqual([result.w, result.h, result.fontSize], [200, 100, 40])
})
test('negative direction arrows keep the opposite endpoint fixed', () => {
  const result = resizeShape({ ...base, type: 'arrow', w: -100, h: -50 }, 0, { x: 30, y: 40 })
  assert.equal(result.x + result.w, -90)
  assert.equal(result.y + result.h, -30)
})
test('freehand uses full point bounds and scales its points proportionally', () => {
  const shape = { ...base, type: 'draw' as const, points: '-20,-10 80,40 0,0', w: 0, h: 0 }
  assert.deepEqual(shapeBounds(shape), { x: -10, y: 10, w: 100, h: 50 })
  const result = resizeShape(shape, 3, { x: 190, y: 110 })
  assert.deepEqual(shapeBounds(result), { x: -10, y: 10, w: 200, h: 100 })
})
test('attached connections cannot be detached by resizing', () => {
  const shape = { ...base, connection: { from: 'a', to: 'b' } }
  assert.equal(resizeShape(shape, 0, { x: 200, y: 200 }), shape)
})
