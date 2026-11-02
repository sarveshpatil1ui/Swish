import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import User from '../models/User.js'
import College from '../models/College.js'
import Session from '../models/Session.js'
import { hashToken, touchSession, parseClientInfo, createSession } from '../services/session.service.js'
import { getPlatformConfig } from '../services/platform-config.service.js'

// In-process TTL cache: domain -> { active, expiresAt }
const _collegeCache = new Map()
const COLLEGE_CACHE_TTL_MS = 60_000 // 1 minute

export async function isCollegeActive(domain) {
  if (!domain) return true
  const normDomain = domain.toLowerCase()
  const now = Date.now()
  const cached = _collegeCache.get(normDomain)
  if (cached && cached.expiresAt > now) {
    return cached.active
  }

  const college = await College.findOne({ domain: normDomain }).lean()
  const active = college ? Boolean(college.active) : true // unknown domain defaults to not blocking
  _collegeCache.set(normDomain, { active, expiresAt: now + COLLEGE_CACHE_TTL_MS })
  return active
}

export function invalidateCollegeCache(domain) {
  if (domain) {
    _collegeCache.delete(domain.toLowerCase())
  } else {
    _collegeCache.clear()
  }
}

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const token = req.cookies?.swish_token || bearerToken
    if (!token) {
      return res.status(401).json({ ok: false, error: 'Not authenticated. Please log in.' })
    }

    let payload
    try {
      payload = jwt.verify(token, process.env.JWT_SECRET)
    } catch (err) {
      const msg = err.name === 'TokenExpiredError'
        ? 'Session expired. Please log in again.'
        : 'Invalid session. Please log in again.'
      return res.status(401).json({ ok: false, error: msg })
    }

    // ── Session Revocation & Expiration Check ────────────────────────────────
    let session = null
    if (payload.sid) {
      session = await Session.findById(payload.sid)
      if (session && !session.isActive) {
        return res.status(401).json({
          ok: false,
          error: 'Session has been revoked. Please log in again.',
          revoked: true,
        })
      }
      if (session && session.expiresAt && session.expiresAt < new Date()) {
        return res.status(401).json({
          ok: false,
          error: 'Session expired. Please log in again.',
          expired: true,
        })
      }
      if (session) {
        req.sessionId = payload.sid
        req.session = session
        touchSession(payload.sid, req).catch(() => {})
      }
      // If no session found in DB for a valid JWT with sid, it will be created
      // retroactively below after user is fetched (handles server restart / DB wipe scenarios)
    } else {
      // Synthetic or legacy token without payload.sid: check tokenHash in DB
      const tokenHash = hashToken(token)
      session = await Session.findOne({ tokenHash })
      if (session) {
        if (!session.isActive) {
          return res.status(401).json({
            ok: false,
            error: 'Session has been revoked. Please log in again.',
            revoked: true,
          })
        }
        if (session.expiresAt && session.expiresAt < new Date()) {
          return res.status(401).json({
            ok: false,
            error: 'Session expired. Please log in again.',
            expired: true,
          })
        }
        req.sessionId = session._id.toString()
        req.session = session
        touchSession(session._id, req).catch(() => {})
      }
    }

    const user = await User.findById(payload.sub)
    if (!user) {
      return res.status(401).json({ ok: false, error: 'User not found.' })
    }
    if (user.deactivated) {
      return res.status(401).json({ ok: false, error: 'This account has been deactivated.' })
    }
    if (user.suspended) {
      return res.status(403).json({ ok: false, error: 'This account has been suspended.' })
    }

    // Invalidate JWTs issued before password change
    if (user.passwordChangedAt && payload.iat) {
      const passwordChangedSec = Math.floor(new Date(user.passwordChangedAt).getTime() / 1000)
      if (payload.iat < passwordChangedSec) {
        return res.status(401).json({
          ok: false,
          error: 'Password was recently changed. Please log in again.',
        })
      }
    }

    // Check platform maintenance mode for non-admin users
    if (user.role !== 'admin' && user.role !== 'main_admin') {
      const config = await getPlatformConfig()
      if (config?.maintenance?.enabled) {
        return res.status(503).json({
          ok: false,
          maintenance: true,
          error: 'Platform is currently undergoing scheduled maintenance.',
          maintenanceInfo: {
            note: config.maintenance.note || '',
            expectedBack: config.maintenance.expectedBack || '',
          },
        })
      }
    }

    // Check institution active status for non-admin users
    if (user.role !== 'admin' && user.role !== 'main_admin' && user.email) {
      const emailDomain = user.email.split('@')[1]
      if (emailDomain) {
        const active = await isCollegeActive(emailDomain)
        if (!active) {
          return res.status(403).json({
            ok: false,
            error: 'Your institution access is currently inactive. Please contact support.',
          })
        }
      }
    }

    req.user = user

    // ── Retroactive session creation ──────────────────────────────────────────
    // If the JWT is valid but no session record exists in DB (e.g. token was issued
    // before session management was deployed, or after a DB migration), create one
    // now so the user's device appears in the Active Sessions panel immediately.
    if (!req.sessionId && (user.role === 'college_admin' || user.role === 'admin' || user.role === 'main_admin')) {
      try {
        const token = req.cookies?.swish_token || (req.headers.authorization?.startsWith('Bearer ') ? req.headers.authorization.slice(7) : null)
        if (token) {
          const tokenHash = hashToken(token)
          // Use findOneAndUpdate with upsert to prevent race conditions and duplicate sessions
          const session = await Session.findOneAndUpdate(
            { tokenHash, isActive: true },
            {
              $setOnInsert: {
                userId: user._id,
                userName: user.name || 'User',
                userRole: user.role,
                collegeId: user.collegeId || null,
                ...parseClientInfo(req),
                tokenHash,
                refreshTokenHash: null,
                isActive: true,
                lastActivity: new Date(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
              }
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
          )
          req.sessionId = session._id.toString()
          req.session = session
        }
      } catch (retroErr) {
        // Non-fatal: session tracking is best-effort; don't block the request
        console.warn('[requireAuth] Retroactive session creation skipped:', retroErr.message)
      }
    }

    next()
  } catch (err) {
    console.error('[requireAuth] Unexpected error:', err)
    res.status(500).json({ ok: false, error: 'Internal server error.' })
  }
}

/**
 * Role-based access guard. Must be used AFTER requireAuth.
 *
 * Usage:
 *   router.get('/admin/stats', requireAuth, requireRole('admin'), handler)
 *   router.get('/faculty/reports', requireAuth, requireRole('faculty', 'admin'), handler)
 *
 * @param {...string} roles — one or more allowed roles
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ ok: false, error: 'Not authenticated.' })
    }
    const userRole = req.user.role
    const isAllowed = roles.includes(userRole) || (roles.includes('admin') && userRole === 'main_admin')
    if (!isAllowed) {
      return res.status(403).json({
        ok: false,
        error: `Access denied. Required role: ${roles.join(' or ')}.`,
      })
    }
    next()
  }
}
