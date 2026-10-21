import 'dotenv/config'
import path from 'path'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import compression from 'compression'

import { validateEnvironment } from './config/env.js'
import { connectDB } from './config/db.js'

validateEnvironment()
import { initSocket } from './services/socket.service.js'
import { corsOptions, isOriginAllowed, getAllowedOrigins } from './config/cors.js'
import authRoutes from './routes/auth.routes.js'
import usersRoutes from './routes/users.routes.js'
import postsRoutes from './routes/posts.routes.js'
import messagesRoutes from './routes/messages.routes.js'
import collegesRoutes from './routes/colleges.routes.js'
import departmentsRoutes from './routes/departments.routes.js'
import noticesRoutes from './routes/notices.routes.js'
import onboardingRoutes from './routes/onboarding.routes.js'
import adminRoutes from './routes/admin.routes.js'
import storiesRoutes from './routes/stories.routes.js'
import notificationsRoutes from './routes/notifications.routes.js'
import reportsRoutes from './routes/reports.routes.js'
import analyticsRoutes from './routes/analytics.routes.js'

const app = express()
const PORT = process.env.PORT || 3001

// ── Compression middleware: compress all response bodies (gzip / deflate) ────
app.use(compression())

// ── CRITICAL: Handle OPTIONS preflight FIRST, before any routes or auth ───────
// This must come before app.use(cors()) so preflight never hits auth middleware
app.options('*', cors(corsOptions))

// ── Apply CORS to all routes ──────────────────────────────────────────────────
app.use(cors(corsOptions))

app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: false, limit: '10mb' }))
app.use(cookieParser())
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'swish-backend',
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    cors: getAllowedOrigins(),
  })
})

app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/posts', postsRoutes)
app.use('/api/messages', messagesRoutes)
app.use('/api/colleges', collegesRoutes)
app.use('/api/departments', departmentsRoutes)
app.use('/api/notices', noticesRoutes)
app.use('/api/onboarding', onboardingRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/stories', storiesRoutes)
app.use('/api/notifications', notificationsRoutes)
app.use('/api/reports', reportsRoutes)
app.use('/api/analytics', analyticsRoutes)

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Route not found.' })
})

// ── Error handler: MUST set CORS headers even on errors ──────────────────────
app.use((err, req, res, _next) => {
  console.error('[Unhandled Error]', err.message)
  // Re-apply CORS header so the browser can at least read the error
  const origin = req.headers.origin
  if (origin && isOriginAllowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Access-Control-Allow-Credentials', 'true')
  }
  res.status(err.status || 500).json({ ok: false, error: err.message || 'Internal server error.' })
})

// ── Boot ──────────────────────────────────────────────────────────────────────
connectDB().then(() => {
  const httpServer = initSocket(app)
  httpServer.listen(PORT, () => {
    console.log(`🚀  Swish backend running at http://localhost:${PORT}`)
    console.log(`   Health: http://localhost:${PORT}/api/health`)
    console.log(`   Socket: ws://localhost:${PORT}`)
    console.log(`   Allowed origins: ${getAllowedOrigins().join(', ')}`)
  })
})
