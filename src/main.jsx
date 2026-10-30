import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Suppress known third-party Recharts v2 defaultProps deprecation warnings in dev console
const originalError = console.error
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Support for defaultProps will be removed from function components')
  ) {
    return
  }
  originalError(...args)
}

const originalWarn = console.warn
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    args[0].includes('Support for defaultProps will be removed from function components')
  ) {
    return
  }
  originalWarn(...args)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
