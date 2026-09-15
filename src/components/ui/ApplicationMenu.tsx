import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent } from 'react'
import { IconPencil } from '@tabler/icons-react'
import { useLanguage } from '../../i18n/LanguageProvider'
import './application-menu.css'

type Command = { label: string; action: () => void; shortcut?: string; disabled?: boolean; checked?: boolean; separator?: boolean }
export type ApplicationMenuGroup = { label: string; commands: Command[] }

export function ApplicationMenu({ groups }: { groups: ApplicationMenuGroup[] }) {
  const { tr } = useLanguage()
  const [open, setOpen] = useState<number | null>(null)
  const [focused, setFocused] = useState(0)
  const root = useRef<HTMLElement>(null)
  const id = useId()
  function trigger(index: number) { root.current?.querySelectorAll<HTMLButtonElement>('[data-menu-trigger]')[index]?.focus() }
  function close(restore = false) { if (restore && open !== null) trigger(open); setOpen(null) }
  useEffect(() => {
    if (open === null) return
    const dismiss = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(null) }
    document.addEventListener('pointerdown', dismiss)
    root.current?.querySelector<HTMLButtonElement>('[role="menu"] button:not(:disabled)')?.focus()
    return () => document.removeEventListener('pointerdown', dismiss)
  }, [open])
  function keys(event: KeyboardEvent, index: number, inMenu: boolean) {
    event.stopPropagation()
    const items = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="menu"] button:not(:disabled)') ?? [])
    if (event.key === 'Escape') { event.preventDefault(); close(true) }
    else if (event.key === 'Tab') close()
    else if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault()
      const next = (index + (event.key === 'ArrowRight' ? 1 : -1) + groups.length) % groups.length
      setFocused(next); trigger(next); if (open !== null) setOpen(next)
    } else if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) {
      event.preventDefault()
      if (!inMenu) { setOpen(index); return }
      const current = items.indexOf(document.activeElement as HTMLButtonElement)
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? items.length - 1 : (current + (event.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length
      items[next]?.focus()
    } else if (inMenu && event.key.length === 1 && !event.ctrlKey && !event.metaKey) {
      items.find(item => item.textContent?.trim().toLowerCase().startsWith(event.key.toLowerCase()))?.focus()
    }
  }
  return <nav ref={root} className="workspace-navigation application-menu" aria-label={tr('เมนูแอปพลิเคชัน', 'Application menu')} onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setOpen(null) }}>
    <a className="application-logo" href="./" aria-label={tr('หน้าแรก Devcanvas', 'Devcanvas home')}><span><IconPencil size={16} stroke={2} /></span><strong>devcanvas</strong></a>
    <div role="menubar" aria-label={tr('คำสั่งแอปพลิเคชัน', 'Application commands')} className="application-menubar">
      {groups.map((group, index) => <div className="application-menu-group" key={group.label}>
        <button type="button" role="menuitem" data-menu-trigger id={`${id}-trigger-${index}`} aria-haspopup="menu" aria-expanded={open === index} aria-controls={open === index ? `${id}-menu-${index}` : undefined} tabIndex={focused === index ? 0 : -1} onFocus={() => setFocused(index)} onKeyDown={event => keys(event, index, false)} onClick={() => setOpen(open === index ? null : index)} onPointerEnter={() => { if (open !== null && open !== index) { setFocused(index); setOpen(index) } }}>{group.label}</button>
        {open === index && <div role="menu" id={`${id}-menu-${index}`} aria-labelledby={`${id}-trigger-${index}`} className="application-menu-popup" onKeyDown={event => keys(event, index, true)}>
          {group.commands.map(command => <div role="none" key={command.label}>{command.separator && <div role="separator" className="application-menu-separator" />}<button type="button" role={command.checked === undefined ? 'menuitem' : 'menuitemcheckbox'} aria-checked={command.checked} disabled={command.disabled} tabIndex={-1} onClick={() => { close(true); command.action() }}><span className="application-menu-check" aria-hidden="true">{command.checked ? '✓' : ''}</span><span>{command.label}</span>{command.shortcut && <kbd>{command.shortcut}</kbd>}</button></div>)}
        </div>}
      </div>)}
    </div>
  </nav>
}
