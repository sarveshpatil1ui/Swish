import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import College from '../models/College.js'

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
