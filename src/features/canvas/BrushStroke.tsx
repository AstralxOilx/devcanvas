import type { Shape } from './model'

export function BrushStroke({ points = '0,0', width, brush = 'pen' }: Pick<Shape, 'points' | 'width' | 'brush'>) {
  const samples = points.trim().split(/\s+/).map(pair => pair.split(',').map(Number)).filter(p => p.length === 2 && p.every(Number.isFinite)).filter((p, i, all) => i === 0 || Math.hypot(p[0] - all[i - 1][0], p[1] - all[i - 1][1]) > .01)
  if (!samples.length) return null
  const size = width * (brush === 'highlighter' ? 3 : brush === 'marker' ? 1.8 : 1)
  if (samples.length === 1) return <circle cx={samples[0][0]} cy={samples[0][1]} r={size / 2} fill="currentColor" stroke="none" />
  let path = `M ${samples[0].join(' ')}`
  const smooth = [samples[0]]
  let start = samples[0]
  for (let i = 1; i < samples.length; i++) {
    const control = samples[i]
    const end = i === samples.length - 1 ? control : [(control[0] + samples[i + 1][0]) / 2, (control[1] + samples[i + 1][1]) / 2]
    path += ` Q ${control.join(' ')} ${end.join(' ')}`
    const steps = Math.max(2, Math.ceil((Math.hypot(control[0] - start[0], control[1] - start[1]) + Math.hypot(end[0] - control[0], end[1] - control[1])) / .75))
    for (let j = 1; j <= steps; j++) {
      const t = j / steps
      smooth.push([0, 1].map(axis => (1 - t) ** 2 * start[axis] + 2 * (1 - t) * t * control[axis] + t * t * end[axis]))
    }
    start = end
  }
  if (brush !== 'brush') return <path d={path} fill="none" stroke="currentColor" strokeWidth={size} strokeLinecap={brush === 'highlighter' ? 'butt' : 'round'} strokeLinejoin="round" opacity={brush === 'highlighter' ? .35 : 1} />
  // Overlapping, consistently wound outlines form one solid fill. Unlike a
  // single offset ribbon, tight turns cannot fold over and cut holes in the ink.
  const outline: string[] = []
  const distances = [0]
  for (let i = 1; i < smooth.length; i++) distances.push(distances[i - 1] + Math.hypot(smooth[i][0] - smooth[i - 1][0], smooth[i][1] - smooth[i - 1][1]))
  const radii = distances.map(distance => width * (.12 + .85 * Math.sin(Math.PI * distance / (distances[distances.length - 1] || 1)) ** .6))
  smooth.forEach((p, i) => {
    const radius = radii[i]
    outline.push(`M ${p[0] + radius} ${p[1]} a ${radius} ${radius} 0 1 0 ${-2 * radius} 0 a ${radius} ${radius} 0 1 0 ${2 * radius} 0 Z`)
    if (!i) return
    const before = smooth[i - 1]; const previousRadius = radii[i - 1]
    const dx = p[0] - before[0]; const dy = p[1] - before[1]; const length = Math.hypot(dx, dy)
    if (length < .001) return
    const nx = -dy / length; const ny = dx / length
    outline.push(`M ${before[0] + nx * previousRadius} ${before[1] + ny * previousRadius} L ${p[0] + nx * radius} ${p[1] + ny * radius} L ${p[0] - nx * radius} ${p[1] - ny * radius} L ${before[0] - nx * previousRadius} ${before[1] - ny * previousRadius} Z`)
  })
  return <path d={outline.join(' ')} fill="currentColor" fillRule="nonzero" stroke="none" />
}
