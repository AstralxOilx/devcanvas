import type { Shape } from './model'

export function textAppearance(shape: Shape) {
  const flowFontSize = shape.flowKind ? Math.min(17, Math.max(9, shape.w / Math.max(5, shape.text.length * .58))) : undefined
  return {
    fontSize: flowFontSize ?? (shape.id === 'heading' ? 29 : shape.id === 'subtitle' ? 14 : shape.id === 'note' ? 18 : 21),
    fontFamily: shape.id === 'subtitle' ? 'Segoe UI, sans-serif' : 'Segoe Print, Comic Sans MS, cursive',
  }
}
