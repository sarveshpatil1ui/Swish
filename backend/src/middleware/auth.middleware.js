import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import College from '../models/College.js'

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
    if (user.role !== 'admin' && user.email) {
      const emailDomain = user.email.split('@')[1]
      if (emailDomain) {
        const college = await College.findOne({ domain: emailDomain.toLowerCase() })
        if (college && !college.active) {
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
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        ok: false,
        error: `Access denied. Required role: ${roles.join(' or ')}.`,
      })
    }
    next()
  }
}
