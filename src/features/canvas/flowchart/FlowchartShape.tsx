import type { FlowNodeKind } from '../model'

export function FlowchartShape({ kind, width: w, height: h, rows = 3, columns = 3 }: { kind: FlowNodeKind; width: number; height: number; rows?: number; columns?: number }) {
  const common = { vectorEffect: 'non-scaling-stroke' as const }
  const rowCount = Math.max(1, Math.floor(rows)); const columnCount = Math.max(1, Math.floor(columns))
  const tableGrid = () => [
    ...Array.from({ length: rowCount - 1 }, (_, index) => `M0 ${h * (index + 1) / rowCount}H${w}`),
    ...Array.from({ length: columnCount - 1 }, (_, index) => `M${w * (index + 1) / columnCount} 0V${h}`),
  ].join('')
  switch (kind) {
    case 'terminator': return <rect width={w} height={h} rx={h / 2} {...common} />
    case 'process': return <rect width={w} height={h} rx="5" {...common} />
    case 'decision': return <polygon points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`} {...common} />
    case 'input-output': return <polygon points={`${w * .16},0 ${w},0 ${w * .84},${h} 0,${h}`} {...common} />
    case 'document': return <path d={`M0 0H${w}V${h * .78} Q${w * .75} ${h * .6} ${w * .5} ${h * .82} Q${w * .25} ${h * 1.04} 0 ${h * .84}Z`} {...common} />
    case 'multiple-documents': return <><path d={`M${w * .1} ${h * .12}H${w}V${h * .78} Q${w * .75} ${h * .61} ${w * .5} ${h * .81} Q${w * .26} ${h} ${w * .1} ${h * .86}Z`} {...common} /><path d={`M0 0H${w * .9}V${h * .12}M0 0V${h * .72}Q${w * .05} ${h * .8} ${w * .1} ${h * .78}`} fill="none" {...common} /></>
    case 'predefined-process': return <><rect width={w} height={h} rx="3" {...common} /><path d={`M${w * .14} 0V${h}M${w * .86} 0V${h}`} fill="none" {...common} /></>
    case 'database': return <><path d={`M0 ${h * .16}C0 0 ${w} 0 ${w} ${h * .16}V${h * .84}C${w} ${h} 0 ${h} 0 ${h * .84}Z`} {...common} /><ellipse cx={w / 2} cy={h * .16} rx={w / 2} ry={h * .16} fill="none" {...common} /></>
    case 'table': return <><rect width={w} height={h} rx="3" {...common} /><path d={tableGrid()} fill="none" {...common} /></>
    case 'view': return <><path d={`M0 ${h * .2}Q${w / 2} 0 ${w} ${h * .2}V${h * .8}Q${w / 2} ${h} 0 ${h * .8}Z`} {...common} /><path d={`${tableGrid()}M0 ${h * .2}Q${w / 2} ${h * .4} ${w} ${h * .2}`} fill="none" {...common} /></>
    case 'join-table': return <><rect width={w} height={h} rx="3" {...common} /><path d={tableGrid()} fill="none" {...common} /></>
    case 'pivot-table': return <><rect width={w} height={h} rx="3" {...common} /><path d={tableGrid()} fill="none" {...common} /><path d={`M${w * .1} ${h / rowCount / 2}H${w * .9}`} strokeWidth={2} fill="none" {...common} /></>
    case 'stored-data': return <path d={`M${w * .12} 0H${w}Q${w * .78} ${h / 2} ${w} ${h}H${w * .12}Q0 ${h / 2} ${w * .12} 0Z`} {...common} />
    case 'internal-storage': return <><rect width={w} height={h} rx="3" {...common} /><path d={`M${w * .16} 0V${h}M0 ${h * .22}H${w}`} fill="none" {...common} /></>
    case 'manual-input': return <polygon points={`${w * .14},${h * .18} ${w},0 ${w},${h} 0,${h}`} {...common} />
    case 'manual-operation': return <polygon points={`0,0 ${w},0 ${w * .82},${h} ${w * .18},${h}`} {...common} />
    case 'preparation': return <polygon points={`${w * .16},0 ${w * .84},0 ${w},${h / 2} ${w * .84},${h} ${w * .16},${h} 0,${h / 2}`} {...common} />
    case 'delay': return <path d={`M0 0H${w * .56}A${h / 2} ${h / 2} 0 0 1 ${w * .56} ${h}H0Z`} {...common} />
    case 'display': return <path d={`M${w * .16} 0H${w * .72}Q${w} ${h / 2} ${w * .72} ${h}H${w * .16}L0 ${h / 2}Z`} {...common} />
    case 'connector': return <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} {...common} />
    case 'off-page-connector': return <polygon points={`0,0 ${w},0 ${w},${h * .65} ${w / 2},${h} 0,${h * .65}`} {...common} />
    case 'merge': return <polygon points={`0,0 ${w},0 ${w / 2},${h}`} {...common} />
    case 'extract': return <polygon points={`${w / 2},0 ${w},${h} 0,${h}`} {...common} />
    case 'sort': return <><polygon points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`} {...common} /><path d={`M${w * .16} ${h / 2}H${w * .84}`} fill="none" {...common} /></>
    case 'summing-junction': return <><ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} {...common} /><path d={`M${w * .2} ${h * .2}L${w * .8} ${h * .8}M${w * .8} ${h * .2}L${w * .2} ${h * .8}`} fill="none" {...common} /></>
    case 'or': return <><ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} {...common} /><path d={`M${w / 2} ${h * .14}V${h * .86}M${w * .14} ${h / 2}H${w * .86}`} fill="none" {...common} /></>
    case 'annotation': return <path d={`M${w * .15} 0H0V${h}H${w * .15}M0 ${h / 2}H${w}`} fill="none" {...common} />
  }
}
