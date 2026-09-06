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

const app  = express()
const PORT = process.env.PORT || 3001

// ── CORS: allow localhost (any port) + any origin in CLIENT_ORIGIN env var ────
// CLIENT_ORIGIN can be comma-separated, e.g.:
//   CLIENT_ORIGIN=https://swish-45zj.onrender.com,https://myapp.vercel.app
const envOrigins = new Set(
  (process.env.CLIENT_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean)
)

function isOriginAllowed(origin) {
  if (!origin) return true   // curl / Postman / server-to-server
  if (envOrigins.has(origin)) return true
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true
  return false
}

app.use(cors({
  origin:      (origin, cb) => isOriginAllowed(origin) ? cb(null, true) : cb(new Error('CORS: origin not allowed')),
  credentials: true,
}))

app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'swish-backend', timestamp: new Date().toISOString() })
})

app.use('/api/auth',     authRoutes)
app.use('/api/users',    usersRoutes)
app.use('/api/posts',    postsRoutes)
app.use('/api/messages', messagesRoutes)

app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Route not found.' })
})
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err)
  res.status(500).json({ ok: false, error: 'Internal server error.' })
})

// ── Boot ──────────────────────────────────────────────────────────────────────
connectDB().then(() => {
  const httpServer = initSocket(app)
  httpServer.listen(PORT, () => {
    console.log(`🚀  Swish backend running at http://localhost:${PORT}`)
    console.log(`   Health: http://localhost:${PORT}/api/health`)
    console.log(`   Socket: ws://localhost:${PORT}`)
  })
})
