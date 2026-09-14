import type { Shape } from './model'
import { useTheme } from '../../theme/useTheme'
import { getThemeTokens } from '../../theme/themes'
import { displayColor } from './displayColor'
import { textAppearance } from './textAppearance'
import { FlowchartShape } from './flowchart/FlowchartShape'

function smoothFreehandPath(value?: string) {
  const points = (value || '').trim().split(/\s+/).map(point => point.split(',').map(Number)).filter(point => point.length === 2 && point.every(Number.isFinite))
  if (!points.length) return ''
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`
  let path = `M ${points[0][0]} ${points[0][1]}`
  for (let i = 1; i < points.length - 1; i += 1) {
    const midpoint = [(points[i][0] + points[i + 1][0]) / 2, (points[i][1] + points[i + 1][1]) / 2]
    path += ` Q ${points[i][0]} ${points[i][1]} ${midpoint[0]} ${midpoint[1]}`
  }
  const last = points[points.length - 1]; path += ` Q ${last[0]} ${last[1]} ${last[0]} ${last[1]}`
  return path
}
function freehandPoints(value?: string) {
  return (value || '').trim().split(/\s+/).map(point => point.split(',').map(Number)).filter(point => point.length === 2 && point.every(Number.isFinite))
}

export function ShapeView({ shape: s, selected, interactive, editing = false }: { shape: Shape; selected: boolean; interactive: boolean; editing?: boolean }) {
  const { preference } = useTheme()
  const tokens = getThemeTokens(preference)
  const stroke = displayColor(s.stroke, preference.mode, 'stroke')
  const fill = displayColor(s.fill, preference.mode, 'fill')
  const appearance = textAppearance(s)
  const route = s.connection && s.points ? s.points.split(' ').map(point => point.split(',').map(Number)) : null
  const previousPoint = route?.[route.length - 2] ?? [0, 0]
  const arrowAngle = Math.atan2(s.h - previousPoint[1], s.w - previousPoint[0]) * 180 / Math.PI
  const linePath = route ? `M ${route.map(point => point.join(' ')).join(' L ')}` : `M 0 0 L ${s.w} ${s.h}`
  const polygonPoints = (sides: number, rotation = -Math.PI / 2) => Array.from({ length: sides }, (_, i) => { const angle = rotation + i * Math.PI * 2 / sides; return `${s.w / 2 + Math.cos(angle) * s.w / 2},${s.h / 2 + Math.sin(angle) * s.h / 2}` }).join(' ')
  return <g data-shape={s.id} transform={`translate(${s.x} ${s.y})`} opacity={s.opacity / 100} style={{ cursor: interactive ? 'move' : undefined }}>
    <g stroke={stroke} strokeWidth={s.width} fill={fill} strokeDasharray={s.dashed ? '8 6' : undefined} strokeLinecap={s.lineCap ?? 'round'} strokeLinejoin="round" filter={s.sloppiness ? `url(#sloppy-${s.sloppiness})` : undefined}>
      {s.flowKind ? <FlowchartShape kind={s.flowKind} width={s.w} height={s.h} /> : <>
        {s.type === 'rectangle' && <rect width={s.w} height={s.h} rx="10" />}
        {s.type === 'terminator' && <rect width={s.w} height={s.h} rx={s.h / 2} />}
        {s.type === 'input-output' && <polygon points={`${s.w * .18},0 ${s.w},0 ${s.w * .82},${s.h} 0,${s.h}`} />}
        {s.type === 'ellipse' && <ellipse cx={s.w / 2} cy={s.h / 2} rx={s.w / 2} ry={s.h / 2} />}
        {s.type === 'diamond' && <polygon points={`${s.w / 2},0 ${s.w},${s.h / 2} ${s.w / 2},${s.h} 0,${s.h / 2}`} />}
        {s.type === 'star' && <polygon points={Array.from({ length: 10 }, (_, i) => { const angle = -Math.PI / 2 + i * Math.PI / 5; const radius = i % 2 ? .43 : .5; return `${s.w / 2 + Math.cos(angle) * s.w * radius},${s.h / 2 + Math.sin(angle) * s.h * radius}` }).join(' ')} />}
        {s.type === 'pentagon' && <polygon points={polygonPoints(5)} />}
        {s.type === 'hexagon' && <polygon points={polygonPoints(6)} />}
        {s.type === 'octagon' && <polygon points={polygonPoints(8, Math.PI / 8)} />}
        {s.type === 'parallelogram' && <polygon points={`${s.w * .2},0 ${s.w},0 ${s.w * .8},${s.h} 0,${s.h}`} />}
        {s.type === 'heart' && <path d={`M ${s.w / 2} ${s.h} C ${s.w * .12} ${s.h * .68} 0 ${s.h * .42} ${s.w * .2} ${s.h * .18} C ${s.w * .34} 0 ${s.w * .5} ${s.h * .16} ${s.w / 2} ${s.h * .3} C ${s.w * .5} ${s.h * .16} ${s.w * .66} 0 ${s.w * .8} ${s.h * .18} C ${s.w} ${s.h * .42} ${s.w * .88} ${s.h * .68} ${s.w / 2} ${s.h}`} />}
        {s.type === 'cloud' && <path d={`M ${s.w * .18} ${s.h * .72} C ${s.w * .02} ${s.h * .64} ${s.w * .08} ${s.h * .4} ${s.w * .27} ${s.h * .4} C ${s.w * .3} ${s.h * .12} ${s.w * .68} ${s.h * .08} ${s.w * .73} ${s.h * .38} C ${s.w * .98} ${s.h * .32} ${s.w * 1.02} ${s.h * .72} ${s.w * .8} ${s.h * .76} L ${s.w * .18} ${s.h * .76} Z`} />}
      </>}
      {(s.type === 'arrow' || s.type === 'line' || s.type === 'elbow' || s.type === 'curve' || s.type === 'double-arrow') && <>{s.type === 'elbow' ? <path d={`M 0 0 L ${s.w / 2} 0 L ${s.w / 2} ${s.h} L ${s.w} ${s.h}`} fill="none" /> : s.type === 'curve' ? <path d={`M 0 0 Q ${s.w / 2} ${s.h / 2 - Math.abs(s.w + s.h) * .12} ${s.w} ${s.h}`} fill="none" /> : <path d={linePath} fill="none" />}<path d={s.type === 'elbow' ? `M 0 0 L ${s.w / 2} 0 L ${s.w / 2} ${s.h} L ${s.w} ${s.h}` : s.type === 'curve' ? `M 0 0 Q ${s.w / 2} ${s.h / 2 - Math.abs(s.w + s.h) * .12} ${s.w} ${s.h}` : linePath} fill="none" stroke="transparent" strokeWidth="16" />{(s.type === 'arrow' || s.type === 'double-arrow') && <path d="M -10 -5 L 0 0 L -10 5" transform={`translate(${s.w} ${s.h}) rotate(${arrowAngle})`} fill="none" />}{s.type === 'double-arrow' && <path d="M 10 -5 L 0 0 L 10 5" transform={`rotate(${arrowAngle + 180})`} fill="none" />}</>}
      {s.type === 'draw' && <>{freehandPoints(s.points).length > 1 ? freehandPoints(s.points).slice(0, -1).map((from, index) => { const to = freehandPoints(s.points)[index + 1]; const distance = Math.hypot(to[0] - from[0], to[1] - from[1]); const weight = Math.max(.62, Math.min(1.45, 1.35 - distance / 34)); return <path key={index} d={`M ${from[0]} ${from[1]} Q ${(from[0] + to[0]) / 2} ${(from[1] + to[1]) / 2} ${to[0]} ${to[1]}`} fill="none" strokeWidth={s.width * weight} /> }) : <path d={smoothFreehandPath(s.points)} fill="none" />}</>}
      {s.type === 'text' && <rect width={s.w} height={s.h} fill="transparent" stroke="none" />}
    </g>
    {s.connection && s.text && !editing && <rect x={s.w / 2 - s.text.length * 6 - 7} y={s.h / 2 - 16} width={s.text.length * 12 + 14} height="32" rx="5" fill={tokens['--canvas']} />}
    {s.text && !editing && <text data-item-text="true" x={s.w / 2} y={s.h / 2} textAnchor="middle" dominantBaseline="central" fill={stroke} {...appearance} style={{ cursor: interactive ? 'text' : undefined }}>{s.text}</text>}
    {selected && interactive && <g data-editor-only="true" pointerEvents="none" stroke={tokens['--accent']} strokeWidth="1" fill={tokens['--surface']}><rect x={Math.min(0, s.w) - 7} y={Math.min(0, s.h) - 7} width={Math.abs(s.w) + 14} height={Math.abs(s.h) + 14} fill="none" strokeDasharray="4 3" />{[[Math.min(0, s.w) - 7, Math.min(0, s.h) - 7], [Math.max(0, s.w) + 7, Math.min(0, s.h) - 7], [Math.min(0, s.w) - 7, Math.max(0, s.h) + 7], [Math.max(0, s.w) + 7, Math.max(0, s.h) + 7]].map(([x, y], i) => <rect key={i} x={x - 3} y={y - 3} width="6" height="6" rx="1" />)}</g>}
  </g>
}
