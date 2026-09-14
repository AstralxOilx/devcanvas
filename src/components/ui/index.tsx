import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import './ui.css'
export { ThemePicker } from './ThemePicker'
export { FloatingPanel } from './FloatingPanel'
export { FloatingToolbar } from './FloatingToolbar'

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'ghost'; icon?: ReactNode }
export function Button({ variant = 'secondary', icon, className = '', children, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={`ui-button ui-button--${variant} ${className}`} {...props}>{icon}{children}</button>
}
export function IconButton({ label, active = false, children, className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; active?: boolean }) {
  return <button type="button" title={label} aria-label={label} aria-pressed={active} className={`ui-icon-button ${active ? 'is-active' : ''} ${className}`} {...props}>{children}</button>
}
export function Panel({ title, action, children, className = '', ...props }: HTMLAttributes<HTMLElement> & { title: string; action?: ReactNode }) {
  return <aside className={`ui-panel ${className}`} {...props}><div className="ui-panel-heading"><span>{title}</span>{action}</div>{children}</aside>
}
export function Toolbar({ label, children, className = '', ...props }: HTMLAttributes<HTMLDivElement> & { label: string }) {
  return <div role="toolbar" aria-label={label} className={`ui-toolbar ${className}`} {...props}>{children}</div>
}
export function Tabs<T extends string>({ items, value, onChange }: { items: { value: T; label: string; icon?: ReactNode; count?: number }[]; value: T; onChange: (value: T) => void }) {
  return <div className="ui-tabs" aria-label="Panel sections">{items.map(item => <button type="button" key={item.value} aria-pressed={item.value === value} className={value === item.value ? 'is-active' : ''} onClick={() => onChange(item.value)}>{item.icon}{item.label}{item.count !== undefined && <span className="ui-badge">{item.count}</span>}</button>)}</div>
}
export function PropertyField({ label, trailing, children }: { label: string; trailing?: ReactNode; children: ReactNode }) {
  return <div className="ui-property-field"><div className="ui-property-label"><span>{label}</span>{trailing}</div>{children}</div>
}
export function ColorPicker({ label, colors, value, onChange }: { label: string; colors: string[]; value: string; onChange: (value: string) => void }) {
  return <div className="ui-colors" role="group" aria-label={label}>{colors.map(color => <button type="button" key={color} aria-label={`${label}: ${color === 'none' ? 'transparent' : color}`} aria-pressed={value === color} className={`ui-swatch ${value === color ? 'is-selected' : ''} ${color === 'none' ? 'is-transparent' : ''}`} style={{ backgroundColor: color === 'none' ? 'white' : color }} onClick={() => onChange(color)} />)}<span className="ui-color-divider" /><label className="ui-custom-color" style={{ background: value === 'none' ? 'white' : value }}><input aria-label={`Custom ${label.toLowerCase()}`} type="color" value={value === 'none' ? '#ffffff' : value} onChange={e => onChange(e.target.value)} /></label></div>
}
export function SegmentedControl<T extends string | number>({ label, options, value, onChange }: { label: string; options: { value: T; label: string; content: ReactNode }[]; value: T; onChange: (value: T) => void }) {
  return <div className="ui-segmented" role="group" aria-label={label}>{options.map(option => <IconButton key={option.value} label={option.label} active={value === option.value} onClick={() => onChange(option.value)}>{option.content}</IconButton>)}</div>
}
export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <button type="button" role="switch" aria-label={label} aria-checked={checked} className={`ui-toggle ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)}><span /></button>
}
export function Select<T extends string | number>({ label, options, value, onChange }: { label: string; options: { value: T; label: string }[]; value: T; onChange: (value: T) => void }) {
  return <select aria-label={label} className="ui-select" value={String(value)} onChange={event => { const option = options.find(item => String(item.value) === event.target.value); if (option) onChange(option.value) }}>{options.map(option => <option key={String(option.value)} value={String(option.value)}>{option.label}</option>)}</select>
}
export function StatusBar({ start, end, className = '' }: { start: ReactNode; end?: ReactNode; className?: string }) {
  return <footer className={`ui-statusbar ${className}`}><div>{start}</div><div>{end}</div></footer>
}
