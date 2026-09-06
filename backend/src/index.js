import 'dotenv/config'
import path from 'path'
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

import { connectDB } from './config/db.js'
import authRoutes from './routes/auth.routes.js'
import usersRoutes from './routes/users.routes.js'
import postsRoutes from './routes/posts.routes.js'
const app  = express()
const PORT = process.env.PORT || 3001
app.use(cors({
  origin:      process.env.CLIENT_ORIGIN || 'http://localhost:3001',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')))
app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'swish-backend', timestamp: new Date().toISOString() })
})
app.use('/api/auth', authRoutes)
app.use('/api/users', usersRoutes)
app.use('/api/posts', postsRoutes)
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Route not found.' })
})
app.use((err, _req, res, _next) => {
  console.error('[Unhandled Error]', err)
  res.status(500).json({ ok: false, error: 'Internal server error.' })
})
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`🚀  Swish backend running at http://localhost:${PORT}`)
    console.log(`   Health: http://localhost:${PORT}/api/health`)
  })
})
