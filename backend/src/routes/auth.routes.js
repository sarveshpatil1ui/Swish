import crypto from 'crypto'
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import rateLimit from 'express-rate-limit'

import User from '../models/User.js'
import College from '../models/College.js'
import { requireAuth, isCollegeActive } from '../middleware/auth.middleware.js'
import { sendOtpEmail, sendPasswordResetOtpEmail, sendPasswordChangedEmail } from '../services/email.service.js'
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  otpExpiresAt,
  isOtpResendOnCooldown,
} from '../services/otp.service.js'

const isDev = process.env.NODE_ENV !== 'production'

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isDev ? 1000 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many authentication attempts. Please try again in 15 minutes.' },
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

// In-memory per-email request tracker for forgot-password
const _forgotPasswordEmailRequests = new Map()
function checkEmailSendLimit(email) {
  const now = Date.now()
  const windowMs = 15 * 60 * 1000
  const maxPerWindow = 4
  const cooldownMs = OTP_RESEND_COOLDOWN_S * 1000

  const history = (_forgotPasswordEmailRequests.get(email) || []).filter(ts => now - ts < windowMs)
  const lastTs = history[history.length - 1]

  if (lastTs && now - lastTs < cooldownMs) {
    const retryAfter = Math.ceil((cooldownMs - (now - lastTs)) / 1000)
    return { allowed: false, cooldown: true, retryAfter, error: `Please wait ${retryAfter} seconds before requesting another code.` }
  }

  if (history.length >= maxPerWindow) {
    return { allowed: false, cooldown: false, error: 'Too many password reset requests for this email. Please try again in 15 minutes.' }
  }

  history.push(now)
  _forgotPasswordEmailRequests.set(email, history)
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
 */
function setAuthCookie(res, user) {
  const token = jwt.sign(
    { sub: user._id.toString(), role: user.role },
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
      } = req.body

      const normalizedEmail = email.trim().toLowerCase()

      const existing = await User.findOne({ email: normalizedEmail })
      if (existing) {
        if (!existing.isEmailVerified && !existing.isDemo) {
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

      const token = setAuthCookie(res, user)

      return res.status(200).json({
        ok: true,
        token,
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

      // Per-user cooldown: prevent spamming resend within the cooldown window
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
  authLimiter,
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

      // Timing-safe: always run bcrypt even if user not found (to prevent timing attacks)
      const fakeHash = '$2b$10$invalidhashfortimingprotectiononly1234567890123456'
      const passwordToCheck = user ? user.passwordHash : fakeHash
      const isPasswordValid = await bcrypt.compare(password, passwordToCheck)

      if (!user || !isPasswordValid) {
        return res.status(401).json({ ok: false, error: 'Invalid email or password.' })
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

        return res.status(403).json({
          ok: false,
          pendingVerification: true,
          email: normalizedEmail,
          error: 'Please verify your email before logging in. A new code has been sent.',
        })
      }

      const token = setAuthCookie(res, user)

      return res.status(200).json({
        ok: true,
        token,
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

router.post('/logout', (_req, res) => {
  res.clearCookie('swish_token', {
    httpOnly: true,
    secure:   process.env.NODE_ENV === 'production',
    // MUST match the sameSite value used in setAuthCookie:
    // 'none' in production (cross-origin Firebase→Render), 'lax' in dev.
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    path:     '/',
  })
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
      user.mustChangePassword = false
      user.isDemo = false
      await user.save()

      return res.status(200).json({ ok: true, message: 'Password changed successfully.' })
    } catch (err) {
      console.error('[POST /change-password]', err)
      res.status(500).json({ ok: false, error: 'Failed to change password.' })
    }
  }
)

// ── FORGOT PASSWORD (STEP 1: Request OTP) ────────────────────────────────────
router.post(
  '/forgot-password',
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
