import 'dotenv/config'
import path from 'path'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import { connectDB }    from './config/db.js'
import { initSocket }   from './services/socket.service.js'
import authRoutes       from './routes/auth.routes.js'
import usersRoutes      from './routes/users.routes.js'
import postsRoutes      from './routes/posts.routes.js'
import messagesRoutes   from './routes/messages.routes.js'
import collegesRoutes   from './routes/colleges.routes.js'
import departmentsRoutes from './routes/departments.routes.js'
import noticesRoutes    from './routes/notices.routes.js'

const app  = express()
const PORT = process.env.PORT || 3001

// ── Allowed origins ───────────────────────────────────────────────────────────
// These are ALWAYS allowed regardless of env vars:
const HARDCODED_ORIGINS = new Set([
  'https://swishh-5b494.web.app',    // Firebase Hosting (production)
  'https://swishh-5b494.firebaseapp.com', // Firebase alternate domain
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
])

// CLIENT_ORIGIN env var can add more (comma-separated):
//   CLIENT_ORIGIN=https://custom-domain.com,https://another.app
const envOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',').map(s => s.trim()).filter(Boolean)

envOrigins.forEach(o => HARDCODED_ORIGINS.add(o))

function isOriginAllowed(origin) {
  if (!origin) return true  // curl / Postman / server-to-server
  if (HARDCODED_ORIGINS.has(origin)) return true
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true
  return false
}

const corsOptions = {
  origin: (origin, cb) => {
    if (isOriginAllowed(origin)) {
      cb(null, true)
    } else {
      console.warn('[CORS] Blocked origin:', origin)
      // Return false (not an Error) — this sends a response WITHOUT crashing
      // and without adding CORS headers, which is the correct behavior
      cb(null, false)
    }
  },
  credentials:     true,
  methods:         ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders:  ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders:  ['Set-Cookie'],
  optionsSuccessStatus: 204,  // Some browsers choke on 200 for OPTIONS
}

// ── CRITICAL: Handle OPTIONS preflight FIRST, before any routes or auth ───────
// This must come before app.use(cors()) so preflight never hits auth middleware
app.options('*', cors(corsOptions))

// ── Apply CORS to all routes ──────────────────────────────────────────────────
app.use(cors(corsOptions))

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.get('/api/health', (_req, res) => {
  res.json({
    ok:        true,
    service:   'swish-backend',
    timestamp: new Date().toISOString(),
    cors:      [...HARDCODED_ORIGINS],  // helpful for debugging
  })
})

app.use('/api/auth',     authRoutes)
app.use('/api/users',    usersRoutes)
app.use('/api/posts',    postsRoutes)
app.use('/api/messages', messagesRoutes)
app.use('/api/colleges', collegesRoutes)
app.use('/api/departments', departmentsRoutes)
app.use('/api/notices',  noticesRoutes)

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
    console.log(`   Allowed origins: ${[...HARDCODED_ORIGINS].join(', ')}`)
  })
})
