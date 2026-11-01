// backend/src/services/session.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Admin & User Session Management Service
//
// Provides secure token generation, hashing, device parsing, rotation,
// and session revocation capabilities.
// ─────────────────────────────────────────────────────────────────────────────
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import Session from '../models/Session.js'

// In-memory throttling map to prevent excessive database writes for lastActivity
const _lastActivityThrottle = new Map()
const ACTIVITY_THROTTLE_MS = 60_000 // at most once per minute per session

/**
 * Computes a standard SHA-256 hex digest for any token.
 * Raw tokens are never persisted to the database.
 */
export function hashToken(token) {
  if (!token || typeof token !== 'string') return ''
  return crypto.createHash('sha256').update(token).digest('hex')
}

/**
 * Parses user-agent and request metadata to extract device, OS, browser, and IP.
 */
export function parseClientInfo(req) {
  const ua = req.headers['user-agent'] || ''
  const forwarded = req.headers['x-forwarded-for']
  let ip = forwarded ? forwarded.split(',')[0].trim() : (req.socket?.remoteAddress || req.ip || '127.0.0.1')
  if (ip.startsWith('::ffff:')) {
    ip = ip.replace('::ffff:', '')
  }

  // Determine Browser
  let browser = 'Modern Browser'
  if (ua.includes('Edg/')) browser = 'Microsoft Edge'
  else if (ua.includes('OPR/') || ua.includes('Opera/')) browser = 'Opera'
  else if (ua.includes('Chrome/') && !ua.includes('Chromium')) browser = 'Google Chrome'
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Apple Safari'
  else if (ua.includes('Firefox/')) browser = 'Mozilla Firefox'
  else if (ua.includes('MSIE') || ua.includes('Trident/')) browser = 'Internet Explorer'

  // Determine Operating System (mobile OS checked before macOS/Linux)
  let os = 'Unknown OS'
  if (ua.includes('iPhone')) os = 'iOS (iPhone)'
  else if (ua.includes('iPad')) os = 'iPadOS'
  else if (ua.includes('Android')) os = 'Android'
  else if (ua.includes('Windows NT 10.0') || ua.includes('Windows NT 11.0')) os = 'Windows 10/11'
  else if (ua.includes('Windows')) os = 'Windows'
  else if (ua.includes('Mac OS X') || ua.includes('Macintosh')) os = 'macOS'
  else if (ua.includes('Linux')) os = 'Linux'

  // Determine Device Type
  let deviceType = 'desktop'
  if (/iPad|Tablet|PlayBook|Silk/i.test(ua)) {
    deviceType = 'tablet'
  } else if (/Mobi|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) {
    deviceType = 'mobile'
  } else if (/Windows|Macintosh|Linux/i.test(ua)) {
    deviceType = 'desktop'
  } else {
    deviceType = 'unknown'
  }

  const deviceName = `${browser} on ${os}`

  // Determine coarse location description
  let location = 'Campus / Localhost'
  if (ip === '127.0.0.1' || ip === '::1' || ip === 'localhost') {
    location = 'Localhost'
  } else if (ip.startsWith('10.') || ip.startsWith('192.168.') || ip.startsWith('172.16.')) {
    location = 'Private Campus Network'
  } else if (req.headers['cf-ipcity'] || req.headers['cf-ipcountry']) {
    const city = req.headers['cf-ipcity'] || ''
    const country = req.headers['cf-ipcountry'] || ''
    location = [city, country].filter(Boolean).join(', ') || 'Remote Network'
  } else {
    location = 'External Network'
  }

  return {
    ipAddress: ip,
    userAgent: ua.slice(0, 500),
    browser,
    os,
    deviceType,
    deviceName,
    location,
  }
}

/**
 * Sets dual authentication cookies (swish_token & swish_refresh_token).
 */
export function setSessionCookies(res, token, refreshToken = null) {
  const isProd = process.env.NODE_ENV === 'production'
  const tokenMaxAge = 7 * 24 * 60 * 60 * 1000 // 7 days in ms

  res.cookie('swish_token', token, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
    maxAge: tokenMaxAge,
  })

  if (refreshToken) {
    const refreshMaxAge = 30 * 24 * 60 * 60 * 1000 // 30 days in ms
    res.cookie('swish_refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/api/auth',
      maxAge: refreshMaxAge,
    })
  }
}

/**
 * Clears authentication cookies upon logout or session revocation.
 */
export function clearSessionCookies(res) {
  const isProd = process.env.NODE_ENV === 'production'
  const options = {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  }
  res.clearCookie('swish_token', options)
  res.clearCookie('swish_refresh_token', { ...options, path: '/api/auth' })
}

/**
 * Creates and registers a new active Session for the authenticated user.
 * Generates an access JWT and a cryptographically random refresh token.
 */
export async function createSession(user, req, { expiresIn = '7d' } = {}) {
  const sessionId = new mongoose.Types.ObjectId()
  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role, sid: sessionId.toString() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || expiresIn }
  )

  const rawRefreshToken = crypto.randomBytes(40).toString('hex')
  const tokenHash = hashToken(token)
  const refreshTokenHash = hashToken(rawRefreshToken)
  const clientInfo = parseClientInfo(req)

  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const session = await Session.create({
    _id: sessionId,
    userId: user._id,
    userName: user.name || 'User',
    userRole: user.role,
    collegeId: user.collegeId || null,
    ...clientInfo,
    tokenHash,
    refreshTokenHash,
    isActive: true,
    lastActivity: new Date(),
    expiresAt,
  })

  return {
    session,
    token,
    refreshToken: rawRefreshToken,
  }
}

/**
 * Performs secure refresh-token rotation:
 * Validates incoming refresh token hash, revokes old refresh token by rotating,
 * issues fresh access token and fresh refresh token.
 */
export async function rotateSessionToken(rawRefreshToken, req) {
  if (!rawRefreshToken || typeof rawRefreshToken !== 'string') return null

  const refreshTokenHash = hashToken(rawRefreshToken)
  const session = await Session.findOne({
    refreshTokenHash,
    isActive: true,
    expiresAt: { $gt: new Date() },
  })

  if (!session) return null

  const User = mongoose.model('User')
  const user = await User.findById(session.userId)
  if (!user || user.deactivated || user.suspended) {
    session.isActive = false
    session.revokedAt = new Date()
    await session.save()
    return null
  }

  // Issue rotated access and refresh tokens
  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role, sid: session._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

  const newRawRefreshToken = crypto.randomBytes(40).toString('hex')
  const newClientInfo = parseClientInfo(req)

  session.tokenHash = hashToken(token)
  session.refreshTokenHash = hashToken(newRawRefreshToken)
  session.lastActivity = new Date()
  session.expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  session.ipAddress = newClientInfo.ipAddress
  session.userAgent = newClientInfo.userAgent
  session.deviceName = newClientInfo.deviceName
  session.browser = newClientInfo.browser
  session.os = newClientInfo.os
  session.deviceType = newClientInfo.deviceType

  await session.save()

  return {
    session,
    token,
    refreshToken: newRawRefreshToken,
    user,
  }
}

/**
 * Updates a session's lastActivity timestamp, throttled to prevent DB load.
 */
export async function touchSession(sessionId, req = null) {
  if (!sessionId) return
  const idStr = sessionId.toString()
  const now = Date.now()
  const lastTouch = _lastActivityThrottle.get(idStr)

  if (lastTouch && now - lastTouch < ACTIVITY_THROTTLE_MS) {
    return
  }
  _lastActivityThrottle.set(idStr, now)

  // Periodic memory cleanup of throttle map
  if (_lastActivityThrottle.size > 5000) {
    for (const [key, ts] of _lastActivityThrottle.entries()) {
      if (now - ts > ACTIVITY_THROTTLE_MS * 2) {
        _lastActivityThrottle.delete(key)
      }
    }
  }

  try {
    const update = { lastActivity: new Date() }
    if (req) {
      const client = parseClientInfo(req)
      update.ipAddress = client.ipAddress
    }
    await Session.updateOne({ _id: sessionId, isActive: true }, { $set: update })
  } catch (err) {
    console.error('[touchSession] Failed to update activity:', err.message)
  }
}

/**
 * Securely revokes a specific session belonging to the given user.
 * Ensures an admin/user can only revoke their OWN session.
 */
export async function revokeSession(sessionId, userId) {
  const session = await Session.findOne({ _id: sessionId, userId })
  if (!session) return false

  session.isActive = false
  session.revokedAt = new Date()
  await session.save()
  return true
}

/**
 * Revokes all other active sessions for the user, preserving the current session.
 */
export async function revokeOtherSessions(userId, currentSessionId) {
  const filter = {
    userId,
    isActive: true,
  }
  if (currentSessionId) {
    filter._id = { $ne: currentSessionId }
  }

  const result = await Session.updateMany(filter, {
    $set: {
      isActive: false,
      revokedAt: new Date(),
    },
  })

  return result.modifiedCount || 0
}

/**
 * Lists all active sessions for a user, identified with isCurrent flag.
 * Token hashes are NEVER included.
 */
export async function listUserSessions(userId, currentSessionId = null) {
  const sessions = await Session.find({
    userId,
    isActive: true,
    expiresAt: { $gt: new Date() },
  })
    .sort({ lastActivity: -1 })
    .lean()

  return sessions.map((s) => ({
    id: s._id.toString(),
    deviceType: s.deviceType || 'unknown',
    deviceName: s.deviceName || `${s.browser || 'Browser'} on ${s.os || 'OS'}`,
    browser: s.browser || 'Unknown',
    os: s.os || 'Unknown',
    ipAddress: s.ipAddress || '127.0.0.1',
    location: s.location || 'Localhost',
    isActive: s.isActive,
    isCurrent: currentSessionId ? s._id.toString() === currentSessionId.toString() : false,
    lastActivity: s.lastActivity || s.updatedAt || s.createdAt,
    createdAt: s.createdAt,
    expiresAt: s.expiresAt,
  }))
}
