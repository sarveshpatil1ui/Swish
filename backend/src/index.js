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

const allowedOrigins = [
  process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  'http://localhost:3000',
  'http://localhost:3001',
]

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
    cb(new Error('Not allowed by CORS'))
  },
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

// ── Boot: DB first, then HTTP+Socket.io server ────────────────────────────────
connectDB().then(() => {
  const httpServer = initSocket(app)   // wraps express in http.Server + attaches Socket.io
  httpServer.listen(PORT, () => {
    console.log(`🚀  Swish backend running at http://localhost:${PORT}`)
    console.log(`   Health:  http://localhost:${PORT}/api/health`)
    console.log(`   Socket:  ws://localhost:${PORT}`)
  })
})
