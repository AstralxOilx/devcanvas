import { useState } from 'react'
import { IconCheck, IconLine, IconSitemap } from '@tabler/icons-react'
import type { FlowNodeKind } from '../model'
import { flowNodeOptions, flowTemplateOptions } from '.'
import type { FlowTemplateId } from '.'
import { FlowchartShape } from './FlowchartShape'
import { useLanguage } from '../../../i18n/LanguageProvider'
import './flowchart.css'

const diagramShapeGroups: { name: string; shapes: { kind: FlowNodeKind; name: string; description: string }[] }[] = [
  { name: 'ER Diagram shapes', shapes: [
    { kind: 'table', name: 'Table', description: 'ตารางข้อมูลพร้อมคอลัมน์' },
    { kind: 'view', name: 'View', description: 'ตารางเสมือนสำหรับอ่านข้อมูล' },
    { kind: 'join-table', name: 'Join Table', description: 'ตารางเชื่อมความสัมพันธ์' },
    { kind: 'pivot-table', name: 'Pivot Table', description: 'ตารางสรุปข้อมูล' },
    { kind: 'database', name: 'Entity', description: 'ตารางหรือเอนทิตี' },
    { kind: 'document', name: 'Attribute', description: 'ฟิลด์หรือแอตทริบิวต์' },
    { kind: 'decision', name: 'Relationship', description: 'ความสัมพันธ์ระหว่างตาราง' },
    { kind: 'annotation', name: 'Primary key', description: 'คีย์หลักและคำอธิบาย' },
  ] },
  { name: 'System Architecture shapes', shapes: [
    { kind: 'terminator', name: 'Client', description: 'ผู้ใช้หรือไคลเอนต์' },
    { kind: 'process', name: 'API Gateway', description: 'จุดรับคำขอ' },
    { kind: 'predefined-process', name: 'Service', description: 'บริการหรือโมดูลระบบ' },
    { kind: 'database', name: 'Data Store', description: 'ฐานข้อมูลหลัก' },
    { kind: 'stored-data', name: 'Queue', description: 'คิวหรือ message broker' },
  ] },
  { name: 'API Diagram shapes', shapes: [
    { kind: 'input-output', name: 'Endpoint', description: 'เส้นทาง API' },
    { kind: 'manual-input', name: 'Request', description: 'คำขอจากไคลเอนต์' },
    { kind: 'process', name: 'Middleware', description: 'ตัวกลางประมวลผล' },
    { kind: 'display', name: 'Response', description: 'ผลลัพธ์ที่ส่งกลับ' },
    { kind: 'decision', name: 'Auth check', description: 'ตรวจสอบสิทธิ์' },
  ] },
  { name: 'Sequence Diagram shapes', shapes: [
    { kind: 'terminator', name: 'Actor', description: 'ผู้เริ่มต้นการทำงาน' },
    { kind: 'process', name: 'Lifeline', description: 'องค์ประกอบที่รับส่งข้อความ' },
    { kind: 'input-output', name: 'Message', description: 'ข้อความ request' },
    { kind: 'predefined-process', name: 'Call', description: 'การเรียกใช้ฟังก์ชัน' },
    { kind: 'delay', name: 'Async wait', description: 'รอการตอบกลับ' },
  ] },
  { name: 'UML shapes', shapes: [
    { kind: 'process', name: 'Class', description: 'คลาสและเมธอด' },
    { kind: 'predefined-process', name: 'Interface', description: 'อินเทอร์เฟซของระบบ' },
    { kind: 'terminator', name: 'Actor', description: 'ผู้ใช้งานหรือระบบภายนอก' },
    { kind: 'connector', name: 'Use Case', description: 'กรณีการใช้งาน' },
    { kind: 'stored-data', name: 'Component', description: 'คอมโพเนนต์ของระบบ' },
  ] },
]
const relationshipLines = [
  ['Association', 'ความสัมพันธ์ระหว่าง Entity', 'solid', 'arrow'], ['Dependency', 'ความสัมพันธ์แบบพึ่งพา', 'dashed', 'arrow'],
  ['Composition', 'ส่วนประกอบที่ขาดไม่ได้', 'solid', 'diamond'], ['Aggregation', 'กลุ่มที่ประกอบกัน', 'solid', 'hollow-diamond'],
  ['1 : 1', 'หนึ่งต่อหนึ่ง', 'solid', 'one'], ['1 : N', 'หนึ่งต่อหลาย', 'solid', 'many'], ['N : M', 'หลายต่อหลาย', 'solid', 'many-many'],
  ['Request', 'คำขอไปยัง API', 'solid', 'arrow'], ['Response', 'ผลลัพธ์จาก API', 'dashed', 'arrow'], ['Async message', 'ข้อความแบบไม่รอผลลัพธ์', 'dashed', 'open'],
] as const

const thaiLabels: Record<string, string> = {
  'Basic': 'พื้นฐาน', 'Data & documents': 'ข้อมูลและเอกสาร', 'Storage': 'ที่เก็บข้อมูล', 'Manual & special': 'ด้วยมือและแบบพิเศษ', 'Connectors & logic': 'ตัวเชื่อมและตรรกะ',
  'Start / End': 'เริ่มต้น / สิ้นสุด', 'Process': 'กระบวนการ', 'Decision': 'เงื่อนไข', 'Input / Output': 'ข้อมูลเข้า / ออก', 'Document': 'เอกสาร', 'Multiple Documents': 'เอกสารหลายรายการ', 'Display': 'การแสดงผล', 'Database': 'ฐานข้อมูล', 'Stored Data': 'ข้อมูลที่จัดเก็บ', 'Internal Storage': 'หน่วยเก็บข้อมูลภายใน', 'Predefined Process': 'กระบวนการย่อย', 'Manual Input': 'ป้อนข้อมูลด้วยมือ', 'Manual Operation': 'ดำเนินการด้วยมือ', 'Preparation': 'การเตรียมการ', 'Delay': 'หน่วงเวลา', 'On-page Connector': 'ตัวเชื่อมในหน้า', 'Off-page Connector': 'ตัวเชื่อมไปหน้าอื่น', 'Merge': 'รวมเส้นทาง', 'Extract': 'แยกข้อมูล', 'Sort': 'เรียงลำดับ', 'Summing Junction': 'จุดรวมอินพุต', 'Or': 'หรือ', 'Annotation': 'หมายเหตุ',
  'ER Diagram shapes': 'รูปทรงแผนภาพ ER', 'System Architecture shapes': 'รูปทรงสถาปัตยกรรมระบบ', 'API Diagram shapes': 'รูปทรงแผนภาพ API', 'Sequence Diagram shapes': 'รูปทรงแผนภาพลำดับ', 'UML shapes': 'รูปทรง UML',
  'Table': 'ตาราง', 'View': 'มุมมอง', 'Join Table': 'ตารางเชื่อม', 'Pivot Table': 'ตารางสรุป', 'Entity': 'เอนทิตี', 'Attribute': 'แอตทริบิวต์', 'Relationship': 'ความสัมพันธ์', 'Primary key': 'คีย์หลัก', 'Client': 'ไคลเอนต์', 'API Gateway': 'เกตเวย์ API', 'Service': 'บริการ', 'Data Store': 'แหล่งเก็บข้อมูล', 'Queue': 'คิว', 'Endpoint': 'ปลายทาง API', 'Request': 'คำขอ', 'Middleware': 'มิดเดิลแวร์', 'Response': 'การตอบกลับ', 'Auth check': 'ตรวจสอบสิทธิ์', 'Actor': 'ผู้ดำเนินการ', 'Lifeline': 'เส้นชีวิต', 'Message': 'ข้อความ', 'Call': 'การเรียกใช้', 'Async wait': 'รอแบบไม่ประสานเวลา', 'Class': 'คลาส', 'Interface': 'อินเทอร์เฟซ', 'Use Case': 'กรณีใช้งาน', 'Component': 'คอมโพเนนต์',
  'Association': 'ความสัมพันธ์', 'Dependency': 'การพึ่งพา', 'Composition': 'ส่วนประกอบ', 'Aggregation': 'การรวมกลุ่ม', 'Async message': 'ข้อความไม่ประสานเวลา', 'Simple process': 'กระบวนการอย่างง่าย', 'Decision flow': 'ผังงานเงื่อนไข', 'Data workflow': 'ขั้นตอนข้อมูล',
}
function thaiLabel(label: string) { return thaiLabels[label] ?? label }

function TemplatePreview({ template }: { template: FlowTemplateId }) {
  const common = { stroke: 'currentColor', strokeWidth: 1.5, fill: 'var(--surface)', strokeLinejoin: 'round' as const }
  if (template === 'architecture') return <svg className="flow-template-preview" viewBox="0 0 120 76" aria-hidden="true"><g {...common}><g transform="translate(4 29)"><FlowchartShape kind="terminator" width={24} height={12} /></g><path d="M28 35h10M56 35h8M80 35v-13M80 41v12M64 35H56" fill="none" /><g transform="translate(38 29)"><FlowchartShape kind="process" width={18} height={12} /></g><g transform="translate(64 29)"><FlowchartShape kind="predefined-process" width={16} height={12} /></g><g transform="translate(70 8)"><FlowchartShape kind="database" width={20} height={12} /></g><g transform="translate(70 53)"><FlowchartShape kind="display" width={20} height={12} /></g></g></svg>
  if (template === 'er-diagram') return <svg className="flow-template-preview" viewBox="0 0 120 76" aria-hidden="true"><g {...common}><g transform="translate(8 10)"><FlowchartShape kind="database" width={30} height={16} /></g><g transform="translate(82 10)"><FlowchartShape kind="database" width={30} height={16} /></g><g transform="translate(8 50)"><FlowchartShape kind="database" width={30} height={16} /></g><g transform="translate(82 50)"><FlowchartShape kind="database" width={30} height={16} /></g><path d="M38 18h44M23 26v24M97 26v24M38 58h44" fill="none" /></g></svg>
  if (template === 'api-diagram') return <svg className="flow-template-preview" viewBox="0 0 120 76" aria-hidden="true"><g {...common}><g transform="translate(3 30)"><FlowchartShape kind="terminator" width={24} height={14} /></g><path d="M27 37h12M57 37h10M85 37v-18M85 44v15" fill="none" /><g transform="translate(39 30)"><FlowchartShape kind="process" width={18} height={14} /></g><g transform="translate(67 30)"><FlowchartShape kind="predefined-process" width={18} height={14} /></g><g transform="translate(75 54)"><FlowchartShape kind="database" width={20} height={14} /></g></g></svg>
  if (template === 'sequence-diagram') return <svg className="flow-template-preview" viewBox="0 0 120 76" aria-hidden="true"><g {...common}><path d="M20 20v46M60 20v46M100 20v46M20 34h40M60 48h40M20 60h40" fill="none" strokeDasharray="3 2" /><g transform="translate(8 8)"><FlowchartShape kind="terminator" width={24} height={12} /></g><g transform="translate(48 8)"><FlowchartShape kind="process" width={24} height={12} /></g><g transform="translate(88 8)"><FlowchartShape kind="process" width={24} height={12} /></g></g></svg>
  if (template === 'uml-diagram') return <svg className="flow-template-preview" viewBox="0 0 120 76" aria-hidden="true"><g {...common}><g transform="translate(8 9)"><FlowchartShape kind="process" width={38} height={18} /></g><g transform="translate(74 9)"><FlowchartShape kind="predefined-process" width={38} height={18} /></g><g transform="translate(40 50)"><FlowchartShape kind="connector" width={38} height={16} /></g><path d="M27 27v16l35 7M93 27v16L62 50" fill="none" /></g></svg>
  if (template === 'decision') return <svg className="flow-template-preview" viewBox="0 0 120 76" aria-hidden="true"><g {...common}><g transform="translate(46 2)"><FlowchartShape kind="terminator" width={28} height={8} /></g><path d="M60 10V16" fill="none" /><g transform="translate(42 16)"><FlowchartShape kind="process" width={36} height={10} /></g><path d="M60 26V33" fill="none" /><g transform="translate(51 33)"><FlowchartShape kind="decision" width={18} height={14} /></g><path d="M51 40H23V54M69 40H97V54" fill="none" /><g transform="translate(9 54)"><FlowchartShape kind="terminator" width={28} height={8} /></g><g transform="translate(83 54)"><FlowchartShape kind="terminator" width={28} height={8} /></g></g><text x="35" y="52" fill="currentColor">Yes</text><text x="77" y="52" fill="currentColor">No</text></svg>
  if (template === 'data') return <svg className="flow-template-preview" viewBox="0 0 120 76" aria-hidden="true"><g {...common}><g transform="translate(42 2)"><FlowchartShape kind="manual-input" width={36} height={10} /></g><path d="M60 12V19" fill="none" /><g transform="translate(42 19)"><FlowchartShape kind="process" width={36} height={10} /></g><path d="M60 29V36" fill="none" /><g transform="translate(42 36)"><FlowchartShape kind="database" width={36} height={10} /></g><path d="M60 46V53" fill="none" /><g transform="translate(42 53)"><FlowchartShape kind="display" width={36} height={10} /></g></g></svg>
  return <svg className="flow-template-preview" viewBox="0 0 120 76" aria-hidden="true"><g {...common}><g transform="translate(46 5)"><FlowchartShape kind="terminator" width={28} height={9} /></g><path d="M60 14V25" fill="none" /><g transform="translate(42 25)"><FlowchartShape kind="process" width={36} height={11} /></g><path d="M60 36V48" fill="none" /><g transform="translate(46 48)"><FlowchartShape kind="terminator" width={28} height={9} /></g></g></svg>
}

export function FlowchartLibrary({ selectedKind, connecting, onChoose, onConnect, onTemplate }: { selectedKind: FlowNodeKind | null; connecting: boolean; onChoose: (kind: FlowNodeKind) => void; onConnect: (relationship?: string) => void; onTemplate: (template: FlowTemplateId) => void }) {
  const { tr } = useLanguage()
  const [selectedRelationship, setSelectedRelationship] = useState<string | null>(null)
  const groups = [...new Set(flowNodeOptions.map(option => option.group))]
  return <section className="flow-library" aria-label={tr('เครื่องมือผังงาน', 'Flowchart tools')}>
    <div className="flow-library-hero"><span className="flow-library-icon"><IconSitemap size={18} /></span><div><span>{tr('ไดอะแกรม', 'DIAGRAMS')}</span><strong>{tr('คลังผังงาน', 'Flowchart library')}</strong><p>{tr('เลือกรูปทรง แล้วคลิกบน Canvas เพื่อวาง', 'Choose a shape, then click the canvas to place it.')}</p></div></div>
    <div className="flow-library-actions"><button type="button" className={`flow-connect-button ${connecting && !selectedRelationship ? 'active' : ''}`} aria-pressed={connecting && !selectedRelationship} onClick={() => { setSelectedRelationship(null); onConnect() }}><IconLine size={17} /><span>{tr('เชื่อมโหนด', 'Connect nodes')}</span>{connecting && !selectedRelationship && <IconCheck size={14} />}</button></div>
    {groups.map(group => { const options = flowNodeOptions.filter(option => option.group === group); return <div className="flow-symbol-group" key={group}><div className="flow-symbol-heading"><h3>{tr(thaiLabel(group), group)}</h3><span>{options.length}</span></div><div className="flow-node-grid">{options.map(option => <button type="button" key={option.kind} aria-pressed={selectedKind === option.kind} className={selectedKind === option.kind ? 'active' : ''} onClick={() => onChoose(option.kind)}><svg className="flow-node-preview" viewBox="-4 -4 198 96" aria-hidden="true"><g stroke="currentColor" strokeWidth="2.25" fill="var(--surface)" strokeLinejoin="round"><FlowchartShape kind={option.kind} width={190} height={88} /></g></svg><span className="flow-node-copy"><strong>{tr(thaiLabel(option.name), option.name)}</strong><small>{tr(option.description, option.name)}</small></span>{selectedKind === option.kind && <IconCheck className="flow-selected-icon" size={13} />}</button>)}</div></div> })}
    <div className="diagram-shape-library"><div className="flow-symbol-heading"><h3>{tr('คลังรูปทรงไดอะแกรม', 'Diagram shape libraries')}</h3><span>{diagramShapeGroups.length}</span></div>{diagramShapeGroups.map(group => <details className="diagram-shape-group" key={group.name}><summary>{tr(thaiLabel(group.name), group.name)}<span>{group.shapes.length}</span></summary><div className="diagram-shape-grid">{group.shapes.map(shape => <button type="button" key={`${group.name}-${shape.name}`} aria-pressed={selectedKind === shape.kind} className={selectedKind === shape.kind ? 'active' : ''} onClick={() => onChoose(shape.kind)}><svg viewBox="-4 -4 198 96" aria-hidden="true"><g stroke="currentColor" strokeWidth="2.25" fill="var(--surface)" strokeLinejoin="round"><FlowchartShape kind={shape.kind} width={190} height={88} /></g></svg><span><strong>{tr(thaiLabel(shape.name), shape.name)}</strong><small>{tr(shape.description, shape.name)}</small></span></button>)}</div></details>)}</div>
    <div className="relationship-line-library"><div className="flow-symbol-heading"><h3>{tr('เส้นความสัมพันธ์', 'Relationship lines')}</h3><span>{relationshipLines.length}</span></div><p className="relationship-orientation-note">{tr('แนวตั้ง: บน ↕ ล่าง · แนวนอน: ซ้าย ↔ ขวา', 'Vertical: top ↕ bottom · Horizontal: left ↔ right')}</p><div className="relationship-line-grid">{relationshipLines.map(([name, description, style, marker]) => <button type="button" key={name} aria-pressed={connecting && selectedRelationship === name} className={connecting && selectedRelationship === name ? 'active' : ''} onClick={() => { setSelectedRelationship(name); onConnect(name) }}><svg viewBox="0 0 80 24" aria-hidden="true"><path d="M8 12h58" fill="none" stroke="currentColor" strokeWidth="2" strokeDasharray={style === 'dashed' ? '5 3' : undefined} />{marker === 'arrow' && <path d="m66 12-7-5m7 5-7 5" fill="none" stroke="currentColor" strokeWidth="2" />}{marker === 'open' && <path d="m66 12-7-5m7 5-7 5" fill="none" stroke="currentColor" strokeWidth="2" />}{marker === 'diamond' && <path d="m8 12 5-5 5 5-5 5z" fill="currentColor" />}{marker === 'hollow-diamond' && <path d="m8 12 5-5 5 5-5 5z" fill="var(--surface)" stroke="currentColor" strokeWidth="2" />}{marker === 'one' && <path d="M8 6v12M66 6v12" stroke="currentColor" strokeWidth="2" />}{marker === 'many' && <path d="M8 6v12M62 7l4 5-4 5M66 7l-4 5 4 5" stroke="currentColor" strokeWidth="2" fill="none" />}{marker === 'many-many' && <path d="M8 7v10M13 7v10M61 7l5 5-5 5M66 7l-5 5 5 5" stroke="currentColor" strokeWidth="2" fill="none" />}</svg><span><strong>{tr(thaiLabel(name), name)}</strong><small>{tr(description, name)}</small></span></button>)}</div></div>
    <div className="flow-template-section"><div className="flow-symbol-heading"><h3>{tr('ตัวอย่าง', 'Examples')}</h3><span>{flowTemplateOptions.length + 5}</span></div><div className="flow-template-picker" aria-label={tr('ตัวอย่างผังงาน', 'Flowchart examples')}>{flowTemplateOptions.map(template => <button type="button" key={template.id} onClick={() => onTemplate(template.id)}><TemplatePreview template={template.id} /><span><strong>{template.name}</strong><small>{template.description}</small></span></button>)}<button type="button" className="flow-template-featured" onClick={() => onTemplate('architecture')}><TemplatePreview template="architecture" /><span><strong>{tr('สถาปัตยกรรมระบบ', 'System Architecture')}</strong><small>Client → API → Service → Database</small></span></button><button type="button" className="flow-template-featured" onClick={() => onTemplate('er-diagram')}><TemplatePreview template="er-diagram" /><span><strong>ER Diagram</strong><small>Users · Orders · Products · Relationships</small></span></button><button type="button" className="flow-template-featured" onClick={() => onTemplate('api-diagram')}><TemplatePreview template="api-diagram" /><span><strong>API Diagram</strong><small>Client · Gateway · Service · Data Store</small></span></button><button type="button" className="flow-template-featured" onClick={() => onTemplate('sequence-diagram')}><TemplatePreview template="sequence-diagram" /><span><strong>Sequence Diagram</strong><small>User · App · API · Authentication</small></span></button><button type="button" className="flow-template-featured" onClick={() => onTemplate('uml-diagram')}><TemplatePreview template="uml-diagram" /><span><strong>UML Diagram</strong><small>Class · Interface · Actor · Use Case</small></span></button></div></div>
    <p className="flow-library-note">{tr('เลือก “เชื่อมโหนด” แล้วคลิกต้นทางและปลายทาง', 'Choose “Connect nodes”, then click a source and destination.')}<br />{tr('ดับเบิลคลิกข้อความเพื่อแก้ไข', 'Double-click text to edit.')}</p>
  </section>
}
