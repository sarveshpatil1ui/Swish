import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

import User from '../models/User.js'
import College from '../models/College.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { sendOtpEmail } from '../services/email.service.js'
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  otpExpiresAt,
} from '../services/otp.service.js'

const router = Router()
const BCRYPT_ROUNDS = 12

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
  if (role === 'admin')   return '#ef4444'
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
    sameSite: 'lax',
    maxAge,
  })

  return token
}

/** Returns the role-specific post-login path. */
function redirectPathForRole(role) {
  if (role === 'admin')   return '/admin'
  if (role === 'faculty') return '/faculty'
  return '/home'
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
      if (!isAdminEmail) {
        const college = await College.findOne({ domain: emailDomain, active: true })
        if (!college) {
          return res.status(403).json({
            ok: false,
            error: 'This email domain is not registered with Swish. Contact your campus admin.',
          })
        }
        collegeName = college.name || ''
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

      setAuthCookie(res, user)

      return res.status(200).json({
        ok: true,
        user: user.toJSON(),
        redirectTo: redirectPathForRole(user.role),
      })
    } catch (err) {
      console.error('[POST /verify-otp]', err)
      res.status(500).json({ ok: false, error: 'Verification failed. Please try again.' })
    }
  }
)

router.post(
  '/resend-otp',
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

      // Regenerate OTP
      const otp    = generateOtp()
      const hashed = await hashOtp(otp)
      user.otpHash      = hashed
      user.otpExpiresAt = otpExpiresAt()
      user.otpAttempts  = 0
      await user.save()

      try {
        await sendOtpEmail(normalizedEmail, user.name, otp)
      } catch (mErr) {
        console.error('[sendOtpEmail failed]', mErr.message)
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

router.post(
  '/login',
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
      const fakeHash = '$2b$12$invalidhashfortimingprotectiononly1234567890123456'
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

      if (!user.isEmailVerified) {
        const otp    = generateOtp()
        const hashed = await hashOtp(otp)
        user.otpHash      = hashed
        user.otpExpiresAt = otpExpiresAt()
        user.otpAttempts  = 0
        await user.save()
        await sendOtpEmail(normalizedEmail, user.name, otp)

        return res.status(403).json({
          ok: false,
          pendingVerification: true,
          email: normalizedEmail,
          error: 'Please verify your email before logging in. A new code has been sent.',
        })
      }

      setAuthCookie(res, user)

      return res.status(200).json({
        ok: true,
        user: user.toJSON(),
        redirectTo: redirectPathForRole(user.role),
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
    sameSite: 'lax',
  })
  return res.status(200).json({ ok: true, message: 'Logged out successfully.' })
})

export default router
