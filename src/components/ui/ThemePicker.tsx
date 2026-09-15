import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { IconCheck, IconMoon, IconPalette, IconSettings, IconSun } from '@tabler/icons-react'
import { useTheme } from '../../theme/useTheme'
import { themes } from '../../theme/themes'
import { useLanguage } from '../../i18n/LanguageProvider'
import './theme-picker.css'

export function ThemePicker() {
  const { preference, setMode, setTheme, storageAvailable } = useTheme()
  const { tr } = useLanguage()
  const [open, setOpen] = useState(false)
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const popover = useRef<HTMLElement>(null)
  const [position, setPosition] = useState({ left: 8, top: 8 })
  const id = useId()
  const selected = themes.find(theme => theme.id === preference.theme)!
  useEffect(() => {
    if (!open) return
    const outside = (event: PointerEvent) => { if (!container.current?.contains(event.target as Node) && !popover.current?.contains(event.target as Node)) setOpen(false) }
    const escape = (event: KeyboardEvent) => { if (event.key === 'Escape') { event.stopPropagation(); setOpen(false); trigger.current?.focus() } }
    document.addEventListener('pointerdown', outside)
    document.addEventListener('keydown', escape, true)
    return () => { document.removeEventListener('pointerdown', outside); document.removeEventListener('keydown', escape, true) }
  }, [open])
  useLayoutEffect(() => {
    if (!open || !trigger.current) return
    const rect = trigger.current.getBoundingClientRect(); const width = 292; const height = 520
    const below = rect.bottom + 13 + height <= window.innerHeight
    setPosition({ left: Math.max(8, Math.min(window.innerWidth - width - 8, rect.right - width)), top: below ? rect.bottom + 13 : Math.max(8, rect.top - height - 13) })
  }, [open])
  return <div className="theme-picker" ref={container} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null) && !popover.current?.contains(event.relatedTarget as Node | null)) setOpen(false) }}>
    <button ref={trigger} type="button" className="theme-trigger" aria-label={tr('หน้าตา / ธีม', 'Appearance / theme')} aria-expanded={open} aria-controls={open ? id : undefined} onClick={() => setOpen(!open)} title={tr('หน้าตา / ธีม', 'Appearance / theme')}><IconSettings size={17} /><span>{selected.name}</span><span className="theme-trigger-dot" style={{ background: selected.accent[preference.mode === 'dark' ? 1 : 0] }} /></button>
    {open && createPortal(<section ref={popover} id={id} className="theme-popover theme-popover-portal" style={{ left: position.left, top: position.top }} aria-label={tr('การตั้งค่าหน้าตา', 'Appearance settings')}>
      <div className="theme-heading"><IconPalette size={18} /><div><strong>{tr('ปรับให้เป็นพื้นที่ของคุณ', 'Make it your space')}</strong><p>{tr('เลือกบรรยากาศที่ใช่สำหรับคุณ', 'Choose the atmosphere that feels right.')}</p></div></div>
      <div className="theme-mode" role="group" aria-label={tr('โหมดสี', 'Color mode')}>{([{ value: 'light', thai: 'สว่าง', english: 'Light', icon: IconSun }, { value: 'dark', thai: 'มืด', english: 'Dark', icon: IconMoon }] as const).map(mode => <button key={mode.value} type="button" aria-pressed={preference.mode === mode.value} className={preference.mode === mode.value ? 'is-active' : ''} onClick={() => setMode(mode.value)}><mode.icon size={16} />{tr(mode.thai, mode.english)}</button>)}</div>
      <div className="theme-section-label">{tr('ธีมสี', 'COLOR THEME')} <span>{tr('ดั้งเดิม + 5 ธีม', 'Original + 5 themes')}</span></div>
      <div className="theme-options" role="group" aria-label={tr('ธีมสี', 'Color theme')}>{themes.map(theme => <button key={theme.id} type="button" className={`theme-option ${preference.theme === theme.id ? 'is-active' : ''}`} aria-pressed={preference.theme === theme.id} onClick={() => setTheme(theme.id)}><span className="theme-sample" style={{ background: theme.canvas[preference.mode === 'dark' ? 1 : 0], borderColor: theme.accent[preference.mode === 'dark' ? 1 : 0] }}><span style={{ background: theme.accent[preference.mode === 'dark' ? 1 : 0] }} /></span><span><strong>{theme.name}</strong><small>{theme.description}</small></span>{preference.theme === theme.id && <IconCheck size={15} />}</button>)}</div>
      <p className="theme-footnote" role="status">{storageAvailable ? tr('จดจำธีมที่เลือกไว้ในเบราว์เซอร์นี้', 'Theme choice is saved in this browser.') : tr('ใช้ธีมได้ แต่เบราว์เซอร์ไม่อนุญาตให้บันทึกค่า', 'Theme can be used, but this browser cannot save the choice.')}</p>
    </section>, document.body)}
  </div>
}
