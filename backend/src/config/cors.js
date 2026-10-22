// backend/src/config/cors.js
// ─────────────────────────────────────────────────────────────────────────────
// Unified CORS configuration shared by Express and Socket.IO
// ─────────────────────────────────────────────────────────────────────────────

const HARDCODED_ORIGINS = new Set([
  'https://swish2-six.vercel.app',
  'https://swish1.onrender.com',
  'http://localhost:5173',
  'http://localhost:3000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:3000',
])

// Merge CLIENT_ORIGIN environment variable if present
const envOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map(s => s.trim().replace(/\/+$/, ''))
  .filter(Boolean)

envOrigins.forEach(o => HARDCODED_ORIGINS.add(o))

export function isOriginAllowed(origin) {
  if (!origin) return true // Allow non-browser requests (curl, mobile, server-to-server)
  const normalized = origin.replace(/\/+$/, '')
  if (HARDCODED_ORIGINS.has(normalized)) return true
  if (/^https?:\/\/localhost(:\d+)?$/.test(normalized)) return true
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(normalized)) return true
  return false
}

export function getAllowedOrigins() {
  return [...HARDCODED_ORIGINS]
}

export const corsOptions = {
  origin: (origin, cb) => {
    if (isOriginAllowed(origin)) {
      cb(null, true)
    } else {
      console.warn('[CORS] Blocked origin:', origin)
      cb(null, false)
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 204,
}
