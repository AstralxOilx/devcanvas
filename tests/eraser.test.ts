import assert from 'node:assert/strict'
import test from 'node:test'
import { eraseFreehand } from '../src/features/canvas/eraser.ts'
import { defaultStyle } from '../src/features/canvas/model.ts'
import type { Shape } from '../src/features/canvas/model.ts'

const stroke: Shape = { id: 'ink', type: 'draw', x: 100, y: 100, w: 40, h: 0, points: '0,0 10,0 20,0 30,0 40,0', text: '', ...defaultStyle, width: 2 }

test('eraser cuts a freehand stroke into separate pieces at its actual radius', () => {
  const pieces = eraseFreehand(stroke, { x: 120, y: 100 }, 3)!
  assert.equal(pieces.length, 2)
  assert.deepEqual(pieces.map(piece => piece.points), ['0,0 10,0', '30,0 40,0'])
  assert.ok(pieces.every(piece => piece.id !== stroke.id))
})

test('freehand outside the eraser radius remains untouched', () => {
  assert.equal(eraseFreehand(stroke, { x: 120, y: 130 }, 3), null)
})
