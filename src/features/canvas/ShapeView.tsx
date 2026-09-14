import { isEndpointShape, shapeBounds } from './resize'
import { BrushOutline } from './BrushOutline'
import { BrushStroke } from './BrushStroke'
import type { Shape } from './model'
import { useTheme } from '../../theme/useTheme'
import { getThemeTokens } from '../../theme/themes'
import { displayColor } from './displayColor'
import { textAppearance } from './textAppearance'
import { FlowchartShape } from './flowchart/FlowchartShape'

export function ShapeView({ shape: s, selected, interactive, editing = false }: { shape: Shape; selected: boolean; interactive: boolean; editing?: boolean }) {
  const { preference } = useTheme()
  const tokens = getThemeTokens(preference)
  const stroke = displayColor(s.stroke, preference.mode, 'stroke')
  const fill = displayColor(s.fill, preference.mode, 'fill')
  const appearance = textAppearance(s)
  const bounds = shapeBounds(s)
  const bx = bounds.x - s.x; const by = bounds.y - s.y
  const handles = isEndpointShape(s) ? [[0, 0], [s.w, s.h]] : [[bx, by], [bx + bounds.w, by], [bx, by + bounds.h], [bx + bounds.w, by + bounds.h]]
  const route = s.connection && s.points ? s.points.split(' ').map(point => point.split(',').map(Number)) : null
  const previousPoint = route?.[route.length - 2] ?? [0, 0]
  const arrowAngle = Math.atan2(s.h - previousPoint[1], s.w - previousPoint[0]) * 180 / Math.PI
  const linePath = route ? `M ${route.map(point => point.join(' ')).join(' L ')}` : `M 0 0 L ${s.w} ${s.h}`
  const polygonPoints = (sides: number, rotation = -Math.PI / 2) => Array.from({ length: sides }, (_, i) => { const angle = rotation + i * Math.PI * 2 / sides; return `${s.w / 2 + Math.cos(angle) * s.w / 2},${s.h / 2 + Math.sin(angle) * s.h / 2}` }).join(' ')
  return <g data-shape={s.id} transform={`translate(${s.x} ${s.y})`} opacity={s.opacity / 100} style={{ cursor: interactive ? 'move' : undefined }}>
    {!isEndpointShape(s) && s.type !== 'draw' && <rect x={bx} y={by} width={bounds.w} height={bounds.h} fill="transparent" stroke="none" />}
    <g stroke={stroke} strokeWidth={s.width} fill={fill} strokeDasharray={s.type !== 'draw' && s.dashed ? `${s.width * 3 + 4} ${s.width * 2 + 4}` : undefined} strokeLinecap={s.lineCap ?? 'round'} strokeLinejoin="round" shapeRendering="geometricPrecision">
      <BrushOutline brush={s.type === 'draw' || s.type === 'text' ? 'pen' : s.brush} width={s.width} color={stroke} dashed={s.dashed}>
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
      </BrushOutline>
      {s.type === 'draw' && <g color={stroke}><BrushStroke points={s.points} width={s.width} brush={s.brush} /><path d={`M ${(s.points || '0,0').replaceAll(' ', ' L ')}`} fill="none" stroke="transparent" strokeWidth={Math.max(16, s.width * 3)} /></g>}
      {s.type === 'text' && <rect width={s.w} height={s.h} fill="transparent" stroke="none" />}
    </g>
    {s.connection && s.text && !editing && <rect x={s.w / 2 - s.text.length * 6 - 7} y={s.h / 2 - 16} width={s.text.length * 12 + 14} height="32" rx="5" fill={tokens['--canvas']} />}
    {s.text && !editing && <text data-item-text="true" x={s.w / 2} y={s.h / 2} textAnchor="middle" dominantBaseline="central" fill={stroke} {...appearance} style={{ cursor: interactive ? 'text' : undefined }}>{s.text}</text>}
    {selected && interactive && !s.connection && <g data-editor-only="true" stroke={tokens['--accent']} strokeWidth="1" fill={tokens['--surface']}><rect x={bx - 7} y={by - 7} width={bounds.w + 14} height={bounds.h + 14} fill="none" strokeDasharray="4 3" pointerEvents="none" />{handles.map(([x, y], i) => <rect key={i} data-resize-shape={s.id} data-resize-handle={i} x={x - 5} y={y - 5} width="10" height="10" rx="2" style={{ cursor: isEndpointShape(s) ? 'crosshair' : i === 0 || i === 3 ? 'nwse-resize' : 'nesw-resize' }}><title>{isEndpointShape(s) ? 'ลากเพื่อปรับปลายเส้น' : 'ลากเพื่อปรับขนาด · Shift เพื่อล็อกสัดส่วน'}</title></rect>)}</g>}
  </g>
}
