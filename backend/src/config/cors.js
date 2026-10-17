// backend/src/config/cors.js
// ─────────────────────────────────────────────────────────────────────────────
// Unified CORS configuration shared by Express and Socket.IO
// ─────────────────────────────────────────────────────────────────────────────

const HARDCODED_ORIGINS = new Set([
  'https://swishh-5b494.web.app',        // Firebase Hosting (production)
  'https://swishh-5b494.firebaseapp.com', // Firebase alternate domain
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:4173',
])

// Merge CLIENT_ORIGIN environment variable if present
const envOrigins = (process.env.CLIENT_ORIGIN || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean)

envOrigins.forEach(o => HARDCODED_ORIGINS.add(o))

export function isOriginAllowed(origin) {
  if (!origin) return true // Allow non-browser requests (curl, mobile, server-to-server)
  if (HARDCODED_ORIGINS.has(origin)) return true
  if (/^https?:\/\/localhost(:\d+)?$/.test(origin)) return true
  if (/^https?:\/\/127\.0\.0\.1(:\d+)?$/.test(origin)) return true
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
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Set-Cookie'],
  optionsSuccessStatus: 204,
}
