// backend/src/middleware/auth.middleware.js
// ─────────────────────────────────────────────────────────────────────────────
// requireAuth   — reads JWT from httpOnly cookie, verifies it, attaches req.user
// requireRole   — factory: requireRole('admin') | requireRole('faculty','admin')
// ─────────────────────────────────────────────────────────────────────────────
import jwt from 'jsonwebtoken'
import User from '../models/User.js'

/**
 * Verifies the JWT stored in the httpOnly 'swish_token' cookie.
 * On success: attaches req.user (full Mongoose doc, minus sensitive fields).
 * On failure: returns 401.
 */
export async function requireAuth(req, res, next) {
  try {
    const token = req.cookies?.swish_token
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

    // Fetch fresh user from DB (ensures deactivated/suspended users are caught immediately)
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
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        error: `Access denied. Required role: ${roles.join(' or ')}.`,
      })
    }
    next()
  }
}
