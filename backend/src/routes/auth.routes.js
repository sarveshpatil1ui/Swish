import crypto from 'crypto'
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import rateLimit from 'express-rate-limit'

import User from '../models/User.js'
import College from '../models/College.js'
import Department from '../models/Department.js'
import Session from '../models/Session.js'
import {
  createSession,
  setSessionCookies,
  clearSessionCookies,
  rotateSessionToken,
  listUserSessions,
  revokeSession,
  revokeOtherSessions,
  hashToken,
} from '../services/session.service.js'
import { requireAuth, isCollegeActive } from '../middleware/auth.middleware.js'
import { sendOtpEmail, sendPasswordResetOtpEmail, sendPasswordChangedEmail } from '../services/email.service.js'
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  otpExpiresAt,
  isOtpResendOnCooldown,
} from '../services/otp.service.js'
import { requireTurnstile } from '../middleware/turnstile.middleware.js'

const isDev = process.env.NODE_ENV !== 'production'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many authentication attempts. Please try again in 15 minutes.' },
})

// Dedicated strict limiter for login endpoint (10 attempts per 15-minute window in production)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many login attempts from this IP. Please try again after 15 minutes.' },
})

const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isDev ? 1000 : 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many verification attempts. Please wait 10 minutes.' },
})

// Stricter limiter specifically for resend-otp (3 requests per 10-minute window)
const resendOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: isDev ? 1000 : 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many resend requests. Please wait 10 minutes before requesting another code.' },
})

// Per-user resend cooldown setting (in seconds)
const OTP_RESEND_COOLDOWN_S = Number(process.env.OTP_RESEND_COOLDOWN_S) || 60

const changePasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many password change attempts. Please try again in 15 minutes.' },
})

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many password reset requests. Please try again in 15 minutes.' },
})

const verifyResetOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many verification attempts. Please wait 10 minutes.' },
})

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 8,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many password reset attempts. Please try again in 15 minutes.' },
})

// In-memory per-email request tracker for OTP generation across auth actions
const _emailSendTracker = new Map()

export function checkEmailSendLimit(email, action = 'general') {
  const normalized = (email || '').trim().toLowerCase()
  const key = `${normalized}:${action}`
  const now = Date.now()
  const windowMs = 15 * 60 * 1000
  const maxPerWindow = 4
  const cooldownMs = OTP_RESEND_COOLDOWN_S * 1000

  // Periodic memory cleanup if tracker grows large
  if (_emailSendTracker.size > 2000) {
    for (const [k, hist] of _emailSendTracker.entries()) {
      if (hist.every(ts => now - ts > windowMs)) {
        _emailSendTracker.delete(k)
      }
    }
  }

  const history = (_emailSendTracker.get(key) || []).filter(ts => now - ts < windowMs)
  const lastTs = history[history.length - 1]

  if (lastTs && now - lastTs < cooldownMs) {
    const retryAfter = Math.ceil((cooldownMs - (now - lastTs)) / 1000)
    return {
      allowed: false,
      cooldown: true,
      retryAfter,
      error: `Please wait ${retryAfter} seconds before requesting another verification code.`,
    }
  }

  if (history.length >= maxPerWindow) {
    return {
      allowed: false,
      cooldown: false,
      error: 'Too many verification requests for this email address. Please try again in 15 minutes.',
    }
  }

  history.push(now)
  _emailSendTracker.set(key, history)
  return { allowed: true }
}

const router = Router()
const BCRYPT_ROUNDS = 10

function computeInitials(name) {
  return name
    .trim()
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function avatarColorForRole(role) {
  if (role === 'faculty') return '#10b981'
  if (role === 'admin' || role === 'main_admin') return '#ef4444'
  return '#6366f1'
}

/**
 * Issue a JWT and set it as an httpOnly cookie on the response.
 * @param {import('express').Response} res
 * @param {import('mongoose').Document} user Mongoose user document
 * @param {string|null} sessionId
 */
function setAuthCookie(res, user, sessionId = null) {
  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role, ...(sessionId ? { sid: sessionId.toString() } : {}) },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  )

  const maxAge = 7 * 24 * 60 * 60 * 1000 // 7 days in ms

  res.cookie('swish_token', token, {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production', // HTTPS-only in prod
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path:     '/',
    maxAge,
  })

  return token
}

/** Returns the role-specific post-login path. */
function redirectPathForRole(role) {
  if (role === 'admin' || role === 'main_admin') return '/admin'
  if (role === 'college_admin') return '/college-admin'
  if (role === 'faculty')       return '/faculty'
  return '/home'
}

/** Role-based path, but routes first-login college admins to the password reset. */
function redirectPathForUser(user) {
  if (user.role === 'college_admin' && user.mustChangePassword) return '/first-login'
  return redirectPathForRole(user.role)
}

/** Sends a validation-errors 422 response. */
function handleValidationErrors(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({
      ok: false,
      error: errors.array()[0].msg,
      errors: errors.array(),
    })
  }
  return null
}

router.post(
  '/register',
  requireTurnstile,
  authLimiter,
  [
    body('name')
      .trim().notEmpty().withMessage('Full name is required.')
      .isLength({ max: 100 }).withMessage('Name too long.'),
    body('email')
      .trim().normalizeEmail()
      .isEmail().withMessage('Please enter a valid email address.'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('role')
      .isIn(['student', 'faculty']).withMessage('Role must be student or faculty.'),
    body('dept')
      .trim().notEmpty().withMessage('Department is required.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const {
        name, email, password, role, dept,
        year, studentId,       // student-only
        designation, employeeId, // faculty-only
        hp_field,               // Honeypot field for bot detection
      } = req.body

      // ── Honeypot bot protection: automated crawlers fill hidden fields ────
      if (hp_field) {
        console.warn(`[Bot Detected] Honeypot field triggered in /register: ${email}`)
        return res.status(200).json({
          ok: true,
          pendingVerification: true,
          email: (email || '').trim().toLowerCase(),
          message: 'Verification code sent. Please check your inbox.',
        })
      }

      const normalizedEmail = email.trim().toLowerCase()

      // ── Enforce per-email send rate limiting and cooldown ─────────────────
      const sendLimit = checkEmailSendLimit(normalizedEmail, 'register')
      if (!sendLimit.allowed) {
        return res.status(429).json({
          ok: false,
          error: sendLimit.error,
          ...(sendLimit.retryAfter ? { retryAfter: sendLimit.retryAfter } : {}),
        })
      }

      const existing = await User.findOne({ email: normalizedEmail })
      if (existing) {
        if (!existing.isEmailVerified && !existing.isDemo) {
          // Enforce per-user resend cooldown
          if (isOtpResendOnCooldown(existing)) {
            return res.status(429).json({
              ok: false,
              error: `Please wait ${OTP_RESEND_COOLDOWN_S} seconds before requesting another code.`,
              retryAfter: OTP_RESEND_COOLDOWN_S,
              pendingVerification: true,
              email: normalizedEmail,
            })
          }

          const otp    = generateOtp()
          const hashed = await hashOtp(otp)
          existing.otpHash      = hashed
          existing.otpExpiresAt = otpExpiresAt()
          existing.otpAttempts  = 0
          await existing.save()

          try {
            await sendOtpEmail(normalizedEmail, existing.name, otp)
          } catch (mErr) {
            console.error('[sendOtpEmail failed]', mErr.message)
            return res.status(502).json({
              ok: false,
              error: 'Failed to deliver verification code. Please check your email or try again shortly.',
            })
          }

          return res.status(200).json({
            ok: true,
            pendingVerification: true,
            email: normalizedEmail,
            message: 'A new verification code has been sent to your email.',
          })
        }
        return res.status(409).json({
          ok: false,
          error: 'An account with this email already exists.',
        })
      }

      // ── Domain verification — check MongoDB for active college ────────────────
      const emailDomain = normalizedEmail.split('@')[1]
      const isAdminEmail = normalizedEmail === 'admin@swish.com'
      let collegeName = ''
      let collegeId = null
      if (!isAdminEmail) {
        const college = await College.findOne({ domain: emailDomain, active: true })
        if (!college) {
          return res.status(403).json({
            ok: false,
            error: 'This email domain is not registered with Swish. Contact your campus admin.',
          })
        }
        collegeName = college.name || ''
        collegeId = college._id
      } else {
        collegeName = 'Swish Admin'
      }

      // ── Department lookup — validate and store departmentId ───────────────────
      let departmentId = null
      if (collegeId && dept) {
        const department = await Department.findOne({
          collegeId,
          name: dept,
          active: true
        })
        if (department) {
          departmentId = department._id
        }
      }

      // ── Build username (name → lowercase dot-separated) ─────────────────────
      let baseUsername = name.trim().toLowerCase().replace(/\s+/g, '.')
      // Ensure unique username
      let username = baseUsername
      let suffix = 1
      while (await User.findOne({ username })) {
        username = `${baseUsername}${suffix++}`
      }

      const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)

      const otp     = generateOtp()
      const otpHash = await hashOtp(otp)

      const user = await User.create({
        name:         name.trim(),
        username,
        initials:     computeInitials(name),
        avatarColor:  avatarColorForRole(role),
        email:        normalizedEmail,
        passwordHash,
        role,
        dept,
        departmentId,
        college:      collegeName,
        collegeId:    collegeId,
        isEmailVerified: false,
        otpHash,
        otpExpiresAt:    otpExpiresAt(),
        otpAttempts:     0,
        ...(role === 'student' && {
          year:      year ?? null,
          studentId: studentId ?? null,
        }),
        ...(role === 'faculty' && {
          designation: designation ?? null,
          employeeId:  employeeId ?? null,
        }),
      })

      try {
        await sendOtpEmail(normalizedEmail, user.name, otp)
      } catch (mErr) {
        console.error('[sendOtpEmail failed]', mErr.message)
        return res.status(502).json({
          ok: false,
          error: 'Account created, but failed to deliver verification email. Please use resend code to try again.',
          pendingVerification: true,
          email: normalizedEmail,
        })
      }

      return res.status(201).json({
        ok: true,
        pendingVerification: true,
        email: normalizedEmail,
        message: `Verification code sent to ${normalizedEmail}. Please check your inbox.`,
      })
    } catch (err) {
      console.error('[POST /register]', err)
      res.status(500).json({ ok: false, error: 'Registration failed. Please try again.' })
    }
  }
)

router.post(
  '/verify-otp',
  otpLimiter,
  [
    body('email').trim().normalizeEmail().isEmail().withMessage('Valid email required.'),
    body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { email, otp } = req.body
      const normalizedEmail = email.trim().toLowerCase()

      const user = await User.findOne({ email: normalizedEmail })
      if (!user) {
        return res.status(404).json({ ok: false, error: 'No account found for this email.' })
      }
      if (user.isEmailVerified) {
        return res.status(400).json({ ok: false, error: 'This account is already verified.' })
      }

      const maxAttempts = Number(process.env.OTP_MAX_ATTEMPTS) || 5
      if (user.otpAttempts >= maxAttempts) {
        return res.status(429).json({
          ok: false,
          error: 'Too many incorrect attempts. Please request a new verification code.',
        })
      }

      if (!user.otpExpiresAt || new Date() > user.otpExpiresAt) {
        return res.status(400).json({
          ok: false,
          error: 'Verification code has expired. Please request a new one.',
          expired: true,
        })
      }

      const isValid = user.otpHash ? await verifyOtp(otp, user.otpHash) : false

      if (!isValid) {
        user.otpAttempts += 1
        await user.save()
        const remaining = maxAttempts - user.otpAttempts
        return res.status(400).json({
          ok: false,
          error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        })
      }

      user.isEmailVerified = true
      user.otpHash         = null
      user.otpExpiresAt    = null
      user.otpAttempts     = 0
      await user.save()

      const { session, token, refreshToken } = await createSession(user, req)
      setSessionCookies(res, token, refreshToken)

      return res.status(200).json({
        ok: true,
        token,
        refreshToken,
        sessionId: session._id.toString(),
        user: user.toJSON(),
        redirectTo: redirectPathForUser(user),
      })
    } catch (err) {
      console.error('[POST /verify-otp]', err)
      res.status(500).json({ ok: false, error: 'Verification failed. Please try again.' })
    }
  }
)

router.post(
  '/resend-otp',
  requireTurnstile,
  resendOtpLimiter,
  [
    body('email').trim().normalizeEmail().isEmail().withMessage('Valid email required.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { email } = req.body
      const normalizedEmail = email.trim().toLowerCase()

      const user = await User.findOne({ email: normalizedEmail })
      if (!user) {
        // Don't reveal existence: send generic success to prevent email enumeration
        return res.status(200).json({
          ok: true,
          message: 'If that email is registered, a new code has been sent.',
        })
      }
      if (user.isEmailVerified) {
        return res.status(400).json({ ok: false, error: 'This account is already verified.' })
      }

      // Per-user cooldown and email send limit
      const sendLimit = checkEmailSendLimit(normalizedEmail, 'resend')
      if (!sendLimit.allowed) {
        return res.status(429).json({
          ok: false,
          error: sendLimit.error,
          ...(sendLimit.retryAfter ? { retryAfter: sendLimit.retryAfter } : {}),
        })
      }

      if (isOtpResendOnCooldown(user)) {
        return res.status(429).json({
          ok: false,
          error: `Please wait ${OTP_RESEND_COOLDOWN_S} seconds before requesting a new code.`,
          retryAfter: OTP_RESEND_COOLDOWN_S,
        })
      }

      // Regenerate OTP — single OTP generated here, same OTP used regardless of provider
      const otp    = generateOtp()
      const hashed = await hashOtp(otp)
      user.otpHash      = hashed
      user.otpExpiresAt = otpExpiresAt()
      user.otpAttempts  = 0
      await user.save()

      try {
        await sendOtpEmail(normalizedEmail, user.name, otp)
      } catch (mErr) {
        console.error('[resend-otp sendOtpEmail failed]', mErr.message)
        return res.status(502).json({
          ok: false,
          error: 'Failed to deliver verification code. Please check your email or try again shortly.',
        })
      }

      return res.status(200).json({
        ok: true,
        message: 'A new verification code has been sent to your email.',
      })
    } catch (err) {
      console.error('[POST /resend-otp]', err)
      res.status(500).json({ ok: false, error: 'Failed to resend code. Please try again.' })
    }
  }
)
// NOTE: The change-password route is defined below after /login and /me.

router.post(
  '/login',
  loginLimiter,
  [
    body('email').trim().normalizeEmail().isEmail().withMessage('Valid email required.'),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { email, password } = req.body
      const normalizedEmail = email.trim().toLowerCase()


      const user = await User.findOne({ email: normalizedEmail })

      // Check account lockout due to consecutive failed attempts (brute-force defense)
      if (user && user.lockUntil) {
        if (user.lockUntil > new Date()) {
          const remainingMinutes = Math.ceil((user.lockUntil.getTime() - Date.now()) / (60 * 1000))
          return res.status(423).json({
            ok: false,
            error: `Account is temporarily locked due to consecutive failed login attempts. Please try again in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}.`,
          })
        } else {
          // Lock duration expired; reset lock
          user.lockUntil = null
          user.failedLoginAttempts = 0
          await user.save()
        }
      }

      // Timing-safe: always run bcrypt even if user not found (to prevent timing attacks)
      const fakeHash = '$2b$10$invalidhashfortimingprotectiononly1234567890123456'
      const passwordToCheck = user ? user.passwordHash : fakeHash
      const isPasswordValid = await bcrypt.compare(password, passwordToCheck)

      if (!user || !isPasswordValid) {
        if (user) {
          user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1
          if (user.failedLoginAttempts >= 5) {
            user.lockUntil = new Date(Date.now() + 15 * 60 * 1000)
            user.failedLoginAttempts = 0
            await user.save()
            return res.status(423).json({
              ok: false,
              error: 'Account temporarily locked due to 5 consecutive failed login attempts. Please try again in 15 minutes.',
            })
          }
          await user.save()
        }
        return res.status(401).json({ ok: false, error: 'Invalid email or password.' })
      }

      // Reset failed attempts & lock on successful login
      if (user.failedLoginAttempts > 0 || user.lockUntil) {
        user.failedLoginAttempts = 0
        user.lockUntil = null
        await user.save()
      }

      if (user.deactivated) {
        return res.status(401).json({ ok: false, error: 'This account has been deactivated.' })
      }
      if (user.suspended) {
        return res.status(403).json({ ok: false, error: 'This account has been suspended. Please contact support.' })
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

      if (!user.isEmailVerified) {
        // Enforce cooldown so repeated login attempts don't blast emails repeatedly
        if (!isOtpResendOnCooldown(user)) {
          const otp    = generateOtp()
          const hashed = await hashOtp(otp)
          user.otpHash      = hashed
          user.otpExpiresAt = otpExpiresAt()
          user.otpAttempts  = 0
          await user.save()

          try {
            await sendOtpEmail(normalizedEmail, user.name, otp)
          } catch (mErr) {
            console.error('[login sendOtpEmail failed]', mErr.message)
          }
        }

        return res.status(403).json({
          ok: false,
          pendingVerification: true,
          email: normalizedEmail,
          error: 'Please verify your email before logging in. A verification code has been sent.',
        })
      }

      const { session, token, refreshToken } = await createSession(user, req)
      setSessionCookies(res, token, refreshToken)

      return res.status(200).json({
        ok: true,
        token,
        refreshToken,
        sessionId: session._id.toString(),
        user: user.toJSON(),
        mustChangePassword: user.mustChangePassword,
        redirectTo: redirectPathForUser(user),
      })
    } catch (err) {
      console.error('[POST /login]', err)
      res.status(500).json({ ok: false, error: 'Login failed. Please try again.' })
    }
  }
)

router.get('/me', requireAuth, async (req, res) => {
  try {
    return res.status(200).json({ ok: true, user: req.user.toJSON() })
  } catch (err) {
    console.error('[GET /me]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch user.' })
  }
})

router.post('/logout', async (req, res) => {
  try {
    const authHeader = req.headers.authorization
    const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null
    const token = req.cookies?.swish_token || bearerToken
    if (token) {
      try {
        const payload = jwt.verify(token, process.env.JWT_SECRET)
        if (payload?.sid) {
          await Session.updateOne({ _id: payload.sid }, { $set: { isActive: false, revokedAt: new Date() } })
        } else {
          const tokenHash = hashToken(token)
          await Session.updateOne({ tokenHash }, { $set: { isActive: false, revokedAt: new Date() } })
        }
      } catch {}
    }
  } catch (err) {
    console.error('[POST /logout]', err)
  }
  clearSessionCookies(res)
  return res.status(200).json({ ok: true, message: 'Logged out successfully.' })
})

router.post(
  '/change-password',
  requireAuth,
  changePasswordLimiter,
  [
    body('currentPassword').notEmpty().withMessage('Current password is required.'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters.'),
    body('confirmPassword').optional().custom((value, { req }) => {
      if (value && value !== req.body.newPassword) {
        throw new Error('Passwords do not match.')
      }
      return true
    }),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { currentPassword, newPassword } = req.body
      const user = await User.findById(req.user._id)

      if (!user) {
        return res.status(404).json({ ok: false, error: 'User not found.' })
      }

      const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!isPasswordValid) {
        return res.status(401).json({ ok: false, error: 'Current password is incorrect.' })
      }

      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
      user.passwordHash = passwordHash
      user.passwordChangedAt = new Date()
      user.mustChangePassword = false
      user.isDemo = false
      await user.save()

      // Invalidate all previous active sessions for security
      await Session.updateMany(
        { userId: user._id, isActive: true },
        { $set: { isActive: false, revokedAt: new Date() } }
      )

      // Create fresh session and refresh token for current client
      const { session, token, refreshToken } = await createSession(user, req)
      setSessionCookies(res, token, refreshToken)

      // Send confirmation email
      try {
        await sendPasswordChangedEmail(user.email, user.name)
      } catch (mErr) {
        console.error('[change-password sendPasswordChangedEmail failed]', mErr.message)
      }

      return res.status(200).json({
        ok: true,
        token,
        refreshToken,
        sessionId: session._id.toString(),
        message: 'Password changed successfully.',
      })
    } catch (err) {
      console.error('[POST /change-password]', err)
      res.status(500).json({ ok: false, error: 'Failed to change password.' })
    }
  }
)

// ── REFRESH TOKEN (Secure Rotation) ──────────────────────────────────────────
router.post('/refresh-token', async (req, res) => {
  try {
    const rawRefreshToken = req.cookies?.swish_refresh_token || req.body?.refreshToken
    if (!rawRefreshToken) {
      return res.status(401).json({ ok: false, error: 'Refresh token is required.' })
    }

    const result = await rotateSessionToken(rawRefreshToken, req)
    if (!result) {
      clearSessionCookies(res)
      return res.status(401).json({ ok: false, error: 'Invalid or expired refresh token. Please log in again.' })
    }

    setSessionCookies(res, result.token, result.refreshToken)

    return res.status(200).json({
      ok: true,
      token: result.token,
      refreshToken: result.refreshToken,
      sessionId: result.session._id.toString(),
      user: result.user.toJSON(),
    })
  } catch (err) {
    console.error('[POST /refresh-token]', err)
    return res.status(500).json({ ok: false, error: 'Failed to refresh token.' })
  }
})

// ── SESSIONS MANAGEMENT ──────────────────────────────────────────────────────
router.get('/sessions', requireAuth, async (req, res) => {
  try {
    const sessions = await listUserSessions(req.user._id, req.sessionId)
    return res.status(200).json({ ok: true, sessions })
  } catch (err) {
    console.error('[GET /api/auth/sessions]', err)
    return res.status(500).json({ ok: false, error: 'Failed to retrieve active sessions.' })
  }
})

router.post('/sessions/revoke-others', requireAuth, async (req, res) => {
  try {
    const revokedCount = await revokeOtherSessions(req.user._id, req.sessionId)
    return res.status(200).json({
      ok: true,
      message: 'All other active sessions have been revoked.',
      revokedCount,
    })
  } catch (err) {
    console.error('[POST /api/auth/sessions/revoke-others]', err)
    return res.status(500).json({ ok: false, error: 'Failed to revoke other sessions.' })
  }
})

router.delete('/sessions/:sessionId', requireAuth, async (req, res) => {
  try {
    const { sessionId } = req.params
    const success = await revokeSession(sessionId, req.user._id)
    if (!success) {
      return res.status(404).json({ ok: false, error: 'Session not found or access denied.' })
    }

    if (req.sessionId && req.sessionId.toString() === sessionId.toString()) {
      clearSessionCookies(res)
    }

    return res.status(200).json({ ok: true, message: 'Session revoked successfully.' })
  } catch (err) {
    console.error('[DELETE /api/auth/sessions/:sessionId]', err)
    return res.status(500).json({ ok: false, error: 'Failed to revoke session.' })
  }
})

// ── FORGOT PASSWORD (STEP 1: Request OTP) ────────────────────────────────────
router.post(
  '/forgot-password',
  requireTurnstile,
  forgotPasswordLimiter,
  [
    body('email').trim().normalizeEmail().isEmail().withMessage('Please enter a valid email address.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { email } = req.body
      const normalizedEmail = email.trim().toLowerCase()

      // Enforce per-email rate limiting & resend cooldown uniformly
      const emailLimit = checkEmailSendLimit(normalizedEmail)
      if (!emailLimit.allowed) {
        return res.status(429).json({
          ok: false,
          error: emailLimit.error,
          ...(emailLimit.retryAfter ? { retryAfter: emailLimit.retryAfter } : {}),
        })
      }

      const user = await User.findOne({ email: normalizedEmail })

      // Constant-time mitigation against email enumeration:
      // If user is absent, deactivated, or suspended, perform a dummy hash to normalize response latency
      if (!user || user.deactivated || user.suspended) {
        await hashOtp('000000')
        return res.status(200).json({
          ok: true,
          message: 'If that email is registered, a password reset code has been sent.',
        })
      }

      // Generate secure 6-digit OTP and bcrypt hash
      const otp = generateOtp()
      const otpHash = await hashOtp(otp)

      user.resetOtpHash = otpHash
      user.resetOtpExpiresAt = otpExpiresAt()
      user.resetOtpAttempts = 0
      // Invalidate any previously issued reset token
      user.resetTokenHash = null
      user.resetTokenExpiresAt = null
      await user.save()

      try {
        await sendPasswordResetOtpEmail(normalizedEmail, user.name, otp)
      } catch (mErr) {
        console.error('[forgot-password sendPasswordResetOtpEmail failed]', mErr.message)
        return res.status(502).json({
          ok: false,
          error: 'Failed to deliver reset code. Please check your email or try again shortly.',
        })
      }

      return res.status(200).json({
        ok: true,
        message: 'If that email is registered, a password reset code has been sent.',
      })
    } catch (err) {
      console.error('[POST /forgot-password]', err)
      res.status(500).json({ ok: false, error: 'Failed to process request. Please try again.' })
    }
  }
)

// ── VERIFY RESET OTP (STEP 2: Verify OTP -> return single-use reset token) ───
router.post(
  '/verify-reset-otp',
  verifyResetOtpLimiter,
  [
    body('email').trim().normalizeEmail().isEmail().withMessage('Valid email required.'),
    body('otp').trim().isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { email, otp } = req.body
      const normalizedEmail = email.trim().toLowerCase()

      const user = await User.findOne({ email: normalizedEmail })
      if (!user || user.deactivated || user.suspended) {
        return res.status(400).json({ ok: false, error: 'Invalid or expired verification code.' })
      }

      const maxAttempts = Number(process.env.OTP_MAX_ATTEMPTS) || 5
      if (user.resetOtpAttempts >= maxAttempts) {
        return res.status(429).json({
          ok: false,
          error: 'Too many incorrect attempts. Please request a new verification code.',
        })
      }

      if (!user.resetOtpExpiresAt || new Date() > user.resetOtpExpiresAt) {
        return res.status(400).json({
          ok: false,
          error: 'Verification code has expired. Please request a new one.',
          expired: true,
        })
      }

      const isValid = user.resetOtpHash ? await verifyOtp(otp, user.resetOtpHash) : false

      if (!isValid) {
        user.resetOtpAttempts += 1
        if (user.resetOtpAttempts >= maxAttempts) {
          user.resetOtpHash = null
          user.resetOtpExpiresAt = null
        }
        await user.save()

        const remaining = Math.max(0, maxAttempts - user.resetOtpAttempts)
        if (remaining === 0) {
          return res.status(429).json({
            ok: false,
            error: 'Too many incorrect attempts. Please request a new verification code.',
          })
        }
        return res.status(400).json({
          ok: false,
          error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        })
      }

      // Single-use: generate 10-min single-purpose reset token
      const rawResetToken = crypto.randomBytes(32).toString('hex')
      const tokenHash = crypto.createHash('sha256').update(rawResetToken).digest('hex')

      user.resetTokenHash = tokenHash
      user.resetTokenExpiresAt = new Date(Date.now() + 10 * 60 * 1000)
      // Clear OTP so it cannot be reused
      user.resetOtpHash = null
      user.resetOtpExpiresAt = null
      user.resetOtpAttempts = 0
      await user.save()

      return res.status(200).json({
        ok: true,
        resetToken: rawResetToken,
        purpose: 'password-reset',
        message: 'Code verified successfully.',
      })
    } catch (err) {
      console.error('[POST /verify-reset-otp]', err)
      res.status(500).json({ ok: false, error: 'Verification failed. Please try again.' })
    }
  }
)

// ── RESET PASSWORD (STEP 3: Consume reset token -> set new password) ─────────
router.post(
  '/reset-password',
  resetPasswordLimiter,
  [
    body('email').trim().normalizeEmail().isEmail().withMessage('Valid email required.'),
    body('resetToken').trim().notEmpty().withMessage('Reset token is required.'),
    body('newPassword').isLength({ min: 8 }).withMessage('Password must be at least 8 characters.'),
    body('confirmPassword').optional().custom((value, { req }) => {
      if (value && value !== req.body.newPassword) {
        throw new Error('Passwords do not match.')
      }
      return true
    }),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { email, resetToken, newPassword } = req.body
      const normalizedEmail = email.trim().toLowerCase()

      const user = await User.findOne({ email: normalizedEmail })
      if (!user || user.deactivated || user.suspended) {
        return res.status(400).json({ ok: false, error: 'Invalid or expired reset token.' })
      }

      if (!user.resetTokenHash || !user.resetTokenExpiresAt || new Date() > user.resetTokenExpiresAt) {
        return res.status(400).json({
          ok: false,
          error: 'Reset token has expired or is invalid. Please request a new code.',
        })
      }

      const incomingTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex')
      if (user.resetTokenHash !== incomingTokenHash) {
        return res.status(400).json({ ok: false, error: 'Invalid reset token.' })
      }

      // Disallow reusing current password
      const isSamePassword = await bcrypt.compare(newPassword, user.passwordHash)
      if (isSamePassword) {
        return res.status(400).json({
          ok: false,
          error: 'New password cannot be the same as your current password.',
        })
      }

      const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS)
      user.passwordHash = passwordHash
      user.passwordChangedAt = new Date()

      // Single-use: clear all reset OTP & token fields
      user.resetTokenHash = null
      user.resetTokenExpiresAt = null
      user.resetOtpHash = null
      user.resetOtpExpiresAt = null
      user.resetOtpAttempts = 0
      user.mustChangePassword = false
      await user.save()

      // Send confirmation email
      try {
        await sendPasswordChangedEmail(user.email, user.name)
      } catch (mErr) {
        console.error('[reset-password sendPasswordChangedEmail failed]', mErr.message)
      }

      return res.status(200).json({
        ok: true,
        message: 'Password updated successfully. You can now log in with your new password.',
      })
    } catch (err) {
      console.error('[POST /reset-password]', err)
      res.status(500).json({ ok: false, error: 'Failed to reset password. Please try again.' })
    }
  }
)

export default router
