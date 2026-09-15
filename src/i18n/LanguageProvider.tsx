import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export type Language = 'th' | 'en'
type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; tr: (thai: string, english: string) => string }
const LanguageContext = createContext<LanguageContextValue | null>(null)
const storageKey = 'devcanvas-language'

function normalize(text: string) {
  if (!/[ÃÂâà]/.test(text)) return text
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(text, character => character.charCodeAt(0)))
  } catch { return text }
}

function readLanguage(): Language {
  try { return localStorage.getItem(storageKey) === 'en' ? 'en' : 'th' } catch { return 'th' }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(readLanguage)
  useEffect(() => { document.documentElement.lang = language === 'th' ? 'th' : 'en'; try { localStorage.setItem(storageKey, language) } catch { /* Persistence is optional. */ } }, [language])
  return <LanguageContext.Provider value={{ language, setLanguage, tr: (thai, english) => normalize(language === 'th' ? thai : english) }}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider')
  return context
}
