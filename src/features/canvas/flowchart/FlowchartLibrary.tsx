import { IconArrowRight, IconPlus } from '@tabler/icons-react'
import type { FlowNodeKind } from '../model'
import { flowNodeOptions } from '.'
import { FlowchartShape } from './FlowchartShape'
import './flowchart.css'

export function FlowchartLibrary({ selectedKind, connecting, onChoose, onConnect, onTemplate }: { selectedKind: FlowNodeKind | null; connecting: boolean; onChoose: (kind: FlowNodeKind) => void; onConnect: () => void; onTemplate: () => void }) {
  return <section className="flow-library" aria-label="Flowchart tools">
    <div className="flow-library-heading"><strong>Flowchart</strong><span>BUILD A FLOW</span></div>
    <p>เลือกรูปทรง แล้วคลิกบน Canvas เพื่อวาง</p>
    {[...new Set(flowNodeOptions.map(option => option.group))].map(group => <div className="flow-symbol-group" key={group}><h3>{group}</h3><div className="flow-node-grid">{flowNodeOptions.filter(option => option.group === group).map(option => <button type="button" key={option.kind} aria-pressed={selectedKind === option.kind} className={selectedKind === option.kind ? 'active' : ''} onClick={() => onChoose(option.kind)}><svg className="flow-node-preview" viewBox="-3 -3 196 94" aria-hidden="true"><g stroke="currentColor" strokeWidth="4" fill="var(--accent-soft)" strokeLinejoin="round"><FlowchartShape kind={option.kind} width={190} height={88} /></g></svg><strong>{option.name}</strong><small>{option.description}</small></button>)}</div></div>)}
    <button type="button" className={`flow-connect-button ${connecting ? 'active' : ''}`} aria-pressed={connecting} onClick={onConnect}><IconArrowRight size={18} /><span>เชื่อมโหนด</span><kbd>C</kbd></button>
    <p>คลิกโหนดต้นทาง → ปลายทาง หรือคลิกจุดเชื่อมบนขอบโหนด<br />ดับเบิลคลิกข้อความเพื่อแก้ไข</p>
    <button type="button" className="flow-template-button" onClick={onTemplate}><IconPlus size={16} />เพิ่ม Flowchart ตัวอย่าง</button>
  </section>
}
