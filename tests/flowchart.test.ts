import assert from 'node:assert/strict'
import test from 'node:test'
import { createConnection, createFlowNode, createFlowTemplate, flowNodeOptions, flowTemplateOptions, portPoint, removeFlowItem, resolveConnection } from '../src/features/canvas/flowchart/index.ts'
import { defaultStyle, readBoard } from '../src/features/canvas/model.ts'

test('connectors follow moved nodes without mutating stored geometry', () => {
  const a = createFlowNode('process', { x: 100, y: 100 }, defaultStyle)
  const b = createFlowNode('decision', { x: 400, y: 100 }, defaultStyle)
  const edge = createConnection({ from: a.id, to: b.id }, [a, b], defaultStyle)!
  const original = structuredClone(edge)
  const first = resolveConnection(edge, [a, b])
  assert.deepEqual({ x: first.x, y: first.y }, portPoint(a, 'right'))
  assert.deepEqual({ x: first.x + first.w, y: first.y + first.h }, portPoint(b, 'left'))
  const moved = { ...b, x: b.x + 80, y: b.y + 50 }
  const next = resolveConnection(edge, [a, moved])
  assert.equal(next.x + next.w, portPoint(moved, 'left').x)
  assert.equal(next.y + next.h, portPoint(moved, 'left').y)
  assert.deepEqual(edge, original)
})

test('explicit ports produce orthogonal segments and correct endpoint anchors', () => {
  const a = createFlowNode('input-output', { x: 100, y: 100 }, defaultStyle)
  const b = createFlowNode('terminator', { x: 400, y: 350 }, defaultStyle)
  const edge = createConnection({ from: a.id, to: b.id, fromPort: 'bottom', toPort: 'left' }, [a, b], defaultStyle)!
  const rendered = resolveConnection(edge, [a, b])
  assert.deepEqual({ x: rendered.x, y: rendered.y }, portPoint(a, 'bottom'))
  assert.deepEqual({ x: rendered.x + rendered.w, y: rendered.y + rendered.h }, portPoint(b, 'left'))
  const points = rendered.points!.split(' ').map(point => point.split(',').map(Number))
  for (let i = 1; i < points.length; i++) assert.ok(points[i][0] === points[i - 1][0] || points[i][1] === points[i - 1][1])
})

test('self, duplicate, and missing-node connections are rejected', () => {
  const a = createFlowNode('process', { x: 100, y: 100 }, defaultStyle)
  const b = createFlowNode('process', { x: 400, y: 100 }, defaultStyle)
  const edge = createConnection({ from: a.id, to: b.id }, [a, b], defaultStyle)!
  assert.equal(createConnection({ from: a.id, to: a.id }, [a], defaultStyle), null)
  assert.equal(createConnection({ from: a.id, to: 'missing' }, [a], defaultStyle), null)
  assert.equal(createConnection({ from: a.id, to: b.id }, [a, b, edge], defaultStyle), null)
})

test('deleting a node removes its incident edges while preserving the undo snapshot', () => {
  const board = createFlowTemplate({ x: 100, y: 100 }, defaultStyle)
  const snapshot = structuredClone(board)
  const decision = board.find(shape => shape.flowKind === 'decision')!
  const next = removeFlowItem(board, decision.id)
  assert.equal(next.length, board.length - 4)
  assert.ok(next.every(shape => shape.id !== decision.id && shape.connection?.from !== decision.id && shape.connection?.to !== decision.id))
  assert.deepEqual(board, snapshot)
})

test('flowchart saves and reloads all node types and branch labels, excluding dangling edges', () => {
  const board = createFlowTemplate({ x: 100, y: 100 }, defaultStyle)
  board.push(createFlowNode('input-output', { x: 700, y: 100 }, defaultStyle))
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
  const dangling = { ...board[0], id: 'dangling', connection: { from: 'missing', to: 'missing' } }
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => JSON.stringify({ title: 'My flow', shapes: [...board, dangling] }) } })
  try {
    const loaded = readBoard()
    assert.equal(loaded.title, 'My flow')
    assert.deepEqual(loaded.shapes, board)
    assert.ok(loaded.shapes.some(shape => shape.connection && shape.text === 'Yes'))
    assert.ok(loaded.shapes.some(shape => shape.connection && shape.text === 'No'))
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor)
    else Reflect.deleteProperty(globalThis, 'localStorage')
  }
})

test('the complete symbol library creates unique, valid connectable nodes', () => {
  assert.equal(flowNodeOptions.length, 23)
  assert.equal(new Set(flowNodeOptions.map(option => option.kind)).size, flowNodeOptions.length)
  const nodes = flowNodeOptions.map((option, index) => createFlowNode(option.kind, { x: index * 220, y: 100 }, defaultStyle))
  assert.deepEqual(nodes.map(node => node.flowKind), flowNodeOptions.map(option => option.kind))
  assert.ok(nodes.every(node => node.w > 0 && node.h > 0 && node.text.length > 0))
  for (let index = 1; index < nodes.length; index++) assert.ok(createConnection({ from: nodes[index - 1].id, to: nodes[index].id }, nodes, defaultStyle))
})

test('each flowchart example creates valid nodes and linked edges', () => {
  assert.deepEqual(flowTemplateOptions.map(template => template.id), ['simple', 'decision', 'data'])
  for (const template of flowTemplateOptions) {
    const board = createFlowTemplate({ x: 100, y: 100 }, defaultStyle, template.id)
    const nodes = board.filter(shape => shape.flowKind)
    const edges = board.filter(shape => shape.connection)
    assert.deepEqual(nodes.map(node => node.flowKind), template.kinds)
    assert.equal(edges.length, nodes.length - (template.id === 'decision' ? 1 : 1))
    assert.ok(edges.every(edge => resolveConnection(edge, board).points))
  }
})
