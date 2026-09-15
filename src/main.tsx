import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './theme/ThemeProvider'
import { LanguageProvider } from './i18n/LanguageProvider'
import { applyTheme, readTheme } from './theme/themes'

applyTheme(readTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LanguageProvider><ThemeProvider><App /></ThemeProvider></LanguageProvider>
  </StrictMode>,
)
