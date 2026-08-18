// backend/src/index.js — Swish Auth Backend Entry Point
import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import { connectDB } from './config/db.js'
import authRoutes from './routes/auth.routes.js'

const app  = express()
const PORT = process.env.PORT || 3001

// ── CORS ──────────────────────────────────────────────────────────────────────
// Must allow credentials (cookies) for httpOnly cookie auth to work.
app.use(cors({
  origin:      process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true,
}))

// ── Body & Cookie parsing ─────────────────────────────────────────────────────
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

// ── Health check ──────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'swish-backend', timestamp: new Date().toISOString() })
})

// ── Auth routes ───────────────────────────────────────────────────────────────
app.use('/api/auth', authRoutes)

// ── 404 catch-all ─────────────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Route not found.' })
})

// ── Global error handler ──────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err)
  res.status(500).json({ ok: false, error: 'Internal server error.' })
})

// ── Start ─────────────────────────────────────────────────────────────────────
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀  Swish backend running at http://localhost:${PORT}`)
    console.log(`   Health: http://localhost:${PORT}/api/health`)
  })
})
