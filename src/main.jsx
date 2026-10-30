import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Suppress known third-party library & browser dev warnings in dev console
const shouldSuppress = (arg) => {
  if (typeof arg !== 'string') return false
  return (
    arg.includes('Support for defaultProps will be removed from function components') ||
    arg.includes('Tracking Prevention blocked access to storage')
  )
}

const originalError = console.error
console.error = (...args) => {
  if (shouldSuppress(args[0])) return
  originalError(...args)
}

const originalWarn = console.warn
console.warn = (...args) => {
  if (shouldSuppress(args[0])) return
  originalWarn(...args)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
