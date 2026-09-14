import { useEffect, useId, useRef, useState } from 'react'
import { IconCheck, IconMoon, IconPalette, IconSettings, IconSun } from '@tabler/icons-react'
import { useTheme } from '../../theme/useTheme'
import { themes } from '../../theme/themes'
import './theme-picker.css'

export function ThemePicker() {
  const { preference, setMode, setTheme, storageAvailable } = useTheme()
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const id = useId()
  const selected = themes.find(theme => theme.id === preference.theme)!

  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); trigger.current?.focus() }
    }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape, true)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true) }
  }, [open])

  return <div className="theme-picker" ref={container} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false) }}>
    <button ref={trigger} type="button" className="theme-trigger" aria-label="Appearance / ธีม" aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)} title="Appearance / ธีม"><IconSettings size={17} /><span>{selected.name}</span><span className="theme-trigger-dot" style={{ background: selected.accent[preference.mode === 'dark' ? 1 : 0] }} /></button>
    {open && <section id={id} className="theme-popover" aria-label="Appearance settings">
      <div className="theme-heading"><IconPalette size={18} /><div><strong>Make it your space</strong><p>เลือกบรรยากาศที่ใช่สำหรับคุณ</p></div></div>
      <div className="theme-mode" role="group" aria-label="Color mode">{([{ value: 'light', label: 'สว่าง', icon: IconSun }, { value: 'dark', label: 'มืด', icon: IconMoon }] as const).map(mode => <button key={mode.value} type="button" aria-pressed={preference.mode === mode.value} className={preference.mode === mode.value ? 'is-active' : ''} onClick={() => setMode(mode.value)}><mode.icon size={16} />{mode.label}</button>)}</div>
      <div className="theme-section-label">COLOR THEME <span>Original + 5 themes</span></div>
      <div className="theme-options" role="group" aria-label="Color theme">{themes.map(theme => <button key={theme.id} type="button" className={`theme-option ${preference.theme === theme.id ? 'is-active' : ''}`} aria-pressed={preference.theme === theme.id} onClick={() => setTheme(theme.id)}><span className="theme-sample" style={{ background: theme.canvas[preference.mode === 'dark' ? 1 : 0], borderColor: theme.accent[preference.mode === 'dark' ? 1 : 0] }}><span style={{ background: theme.accent[preference.mode === 'dark' ? 1 : 0] }} /></span><span><strong>{theme.name}</strong><small>{theme.description}</small></span>{preference.theme === theme.id && <IconCheck size={15} />}</button>)}</div>
      <p className="theme-footnote" role="status">{storageAvailable ? 'จำธีมที่เลือกไว้ในเบราว์เซอร์นี้' : 'ใช้ธีมได้ แต่เบราว์เซอร์ไม่อนุญาตให้บันทึกค่า'}</p>
    </section>}
  </div>
}
