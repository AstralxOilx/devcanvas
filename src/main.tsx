import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { ThemeProvider } from './theme/ThemeProvider'
import { applyTheme, readTheme } from './theme/themes'

applyTheme(readTheme())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider><App /></ThemeProvider>
  </StrictMode>,
)
