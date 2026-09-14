import { useLayoutEffect, useRef } from 'react'
import type { ReactNode } from 'react'
import type { Brush } from './model'

/** Preserve the original SVG geometry and fill; build ink along its exact outline. */
export function BrushOutline({ children, brush, width, color, dashed }: { children: ReactNode; brush?: Brush; width: number; color: string; dashed?: boolean }) {
  const source = useRef<SVGGElement>(null)
  const ink = useRef<SVGGElement>(null)
  const enabled = !!brush && brush !== 'pen'
  useLayoutEffect(() => {
    const target = ink.current
    if (!target) return
    target.replaceChildren()
    if (!enabled || !source.current) return
    const namespace = 'http://www.w3.org/2000/svg'
    source.current.querySelectorAll<SVGGeometryElement>('path, rect, ellipse, circle, polygon, polyline, line').forEach(geometry => {
      if (['transparent', 'none'].includes(geometry.getAttribute('stroke') ?? '')) return
      const length = geometry.getTotalLength()
      if (!Number.isFinite(length) || length <= 0) return
      const matrix = source.current!.getCTM()?.inverse().multiply(geometry.getCTM()!)
      const result = document.createElementNS(namespace, 'path')
      const pieces: string[] = []
      const first = geometry.getPointAtLength(0); const last = geometry.getPointAtLength(length)
      const closed = Math.hypot(first.x - last.x, first.y - last.y) < .01
      // Dense overlapping disks are a single nonzero fill, so corners and
      // self-intersections remain solid even at reduced opacity.
      const steps = Math.ceil(length / Math.min(.5, width / 4))
      for (let i = 0; i <= steps; i++) {
        const distance = length * i / steps
        if (dashed && distance % (width * 5 + 8) > width * 3 + 4) continue
        const p = geometry.getPointAtLength(distance)
        const t = i / steps
        const radius = brush === 'brush'
          ? width * (closed ? .55 + .25 * Math.sin(2 * Math.PI * t) : .12 + .85 * Math.sin(Math.PI * t) ** .6)
          : width * (brush === 'highlighter' ? 1.5 : .9)
        pieces.push(`M ${p.x + radius} ${p.y} a ${radius} ${radius} 0 1 0 ${-2 * radius} 0 a ${radius} ${radius} 0 1 0 ${2 * radius} 0 Z`)
      }
      result.setAttribute('d', pieces.join(' '))
      result.setAttribute('fill', color)
      result.setAttribute('stroke', 'none')
      if (matrix) result.setAttribute('transform', `matrix(${matrix.a} ${matrix.b} ${matrix.c} ${matrix.d} ${matrix.e} ${matrix.f})`)
      target.append(result)
    })
  }, [children, enabled, brush, width, color, dashed])
  return <><g ref={source} stroke={enabled ? 'transparent' : undefined}>{children}</g><g ref={ink} opacity={brush === 'highlighter' ? .35 : 1} pointerEvents="none" /></>
}
