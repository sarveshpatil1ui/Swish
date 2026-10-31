// backend/src/routes/onboarding.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// College Onboarding routes:
//   POST /api/onboarding/request-otp  - Send OTP to official email
//   POST /api/onboarding/verify-otp   - Verify OTP and return short-lived token
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import crypto from 'crypto'
import rateLimit from 'express-rate-limit'

import CollegeOnboardingOtp from '../models/CollegeOnboardingOtp.js'
import CollegeOnboardingRequest from '../models/CollegeOnboardingRequest.js'
import AdminNotification from '../models/AdminNotification.js'
import { emitToAdmin } from '../services/socket.service.js'
import College from '../models/College.js'
import User from '../models/User.js'
import { sendOtpEmail } from '../services/email.service.js'
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  otpExpiresAt,
  isOtpResendOnCooldown,
} from '../services/otp.service.js'
import { createProofUploadSignature } from '../services/cloudinary.service.js'
import { requireTurnstile } from '../middleware/turnstile.middleware.js'
import { getPlatformConfig } from '../services/platform-config.service.js'

const onboardingOtpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 6,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests. Please wait 10 minutes.' },
})

const router = Router()

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

// ── POST /api/onboarding/request-otp ─────────────────────────────────────────
router.post(
  '/request-otp',
  requireTurnstile,
  onboardingOtpLimiter,
  [
    body('officialEmail')
      .trim().normalizeEmail()
      .trim()
      .isEmail().withMessage('Please enter a valid official email address.'),
    body('adminName')
      .optional().trim(),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const platformConfig = await getPlatformConfig()
      if (platformConfig?.features?.allowRegistration === false || platformConfig?.maintenance?.enabled) {
        return res.status(503).json({
          ok: false,
          error: 'New college onboarding registrations are temporarily paused by platform administration.',
        })
      }
      const { officialEmail, emailDomain, collegeName, collegeCode, adminName, hp_field } = req.body

      // ── Honeypot bot protection ───────────────────────────────────────────
      if (hp_field) {
        console.warn(`[Bot Detected] Honeypot triggered on onboarding request-otp: ${officialEmail}`)
        return res.status(200).json({
          ok: true,
          message: `Verification code sent to ${(officialEmail || '').trim().toLowerCase()}.`,
        })
      }

      const normalizedEmail = officialEmail.trim().toLowerCase()
      const emailDomainPart = normalizedEmail.split('@')[1] || ''

      // ── 1. Strict Domain Match: Official email must belong to entered emailDomain ──
      if (emailDomain && typeof emailDomain === 'string') {
        const cleanDomain = emailDomain.trim().toLowerCase().replace(/^@/, '')
        if (cleanDomain && emailDomainPart !== cleanDomain) {
          return res.status(422).json({
            ok: false,
            error: 'Official email domain (@' + (emailDomainPart || 'unknown') + ') does not match the college domain entered (@' + cleanDomain + '). Please use an official email ending with @' + cleanDomain + '.',
          })
        }
      }

      // ── 2. Duplicate Checks: Domain already registered in College ───────────
      const existingCollegeByDomain = await College.findOne({ domain: emailDomainPart })
      if (existingCollegeByDomain) {
        return res.status(409).json({
          ok: false,
          error: 'The institution domain "@' + emailDomainPart + '" is already registered on Swish for "' + existingCollegeByDomain.name + '". Another registration request cannot be created.',
        })
      }

      // ── 3. Duplicate Checks: Domain already PENDING review ───────────────────
      const pendingDomainRequest = await CollegeOnboardingRequest.findOne({
        status: 'PENDING',
        emailDomain: emailDomainPart,
      })
      if (pendingDomainRequest) {
        return res.status(409).json({
          ok: false,
          error: 'An onboarding request for domain "@' + emailDomainPart + '" (' + pendingDomainRequest.collegeName + ') has already been submitted and is currently pending review by Swish Admin.',
        })
      }

      // ── 4. Duplicate Checks: Official Email already PENDING review ──────────
      const pendingEmailRequest = await CollegeOnboardingRequest.findOne({
        status: 'PENDING',
        officialEmail: normalizedEmail,
      })
      if (pendingEmailRequest) {
        return res.status(409).json({
          ok: false,
          error: 'An onboarding request from official email "' + normalizedEmail + '" has already been submitted and is currently pending review by Swish Admin.',
        })
      }

      // ── 5. Duplicate Checks: User account already exists with this email ────
      const existingUser = await User.findOne({ email: normalizedEmail })
      if (existingUser) {
        return res.status(409).json({
          ok: false,
          error: 'An account with email "' + normalizedEmail + '" already exists on Swish. Please log in or use your official institutional email.',
        })
      }

      // ── 6. Duplicate Checks: College Name if provided ──────────────────────
      if (collegeName && typeof collegeName === 'string' && collegeName.trim()) {
        const escapedName = collegeName.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const nameRegex = new RegExp('^' + escapedName + '$', 'i')
        const existingCollegeByName = await College.findOne({ name: nameRegex })
        if (existingCollegeByName) {
          return res.status(409).json({
            ok: false,
            error: 'A college named "' + collegeName.trim() + '" is already registered on Swish.',
          })
        }
        const pendingCollegeByName = await CollegeOnboardingRequest.findOne({
          status: 'PENDING',
          collegeName: nameRegex,
        })
        if (pendingCollegeByName) {
          return res.status(409).json({
            ok: false,
            error: 'An onboarding request for "' + collegeName.trim() + '" has already been submitted and is pending review by Swish Admin.',
          })
        }
      }

      // ── 7. Duplicate Checks: College Code if provided ──────────────────────
      if (collegeCode && typeof collegeCode === 'string' && collegeCode.trim()) {
        const cleanCode = collegeCode.trim().toUpperCase()
        const existingCollegeByCode = await College.findOne({ code: cleanCode })
        if (existingCollegeByCode) {
          return res.status(409).json({
            ok: false,
            error: 'College code "' + cleanCode + '" is already registered for "' + existingCollegeByCode.name + '".',
          })
        }
        const pendingCollegeByCode = await CollegeOnboardingRequest.findOne({
          status: 'PENDING',
          collegeCode: cleanCode,
        })
        if (pendingCollegeByCode) {
          return res.status(409).json({
            ok: false,
            error: 'An onboarding request with college code "' + cleanCode + '" has already been submitted and is pending review.',
          })
        }
      }

      let otpRecord = await CollegeOnboardingOtp.findOne({ email: normalizedEmail })

      // ── Cooldown check: prevent rapid spamming of OTP requests ────────────
      if (otpRecord && isOtpResendOnCooldown(otpRecord)) {
        return res.status(429).json({
          ok: false,
          error: 'Please wait 60 seconds before requesting another verification code.',
          retryAfter: 60,
        })
      }

      const otp = generateOtp()
      const hashed = await hashOtp(otp)

      if (otpRecord) {
        otpRecord.otpHash = hashed
        otpRecord.otpExpiresAt = otpExpiresAt()
        otpRecord.otpAttempts = 0
        otpRecord.isVerified = false
        otpRecord.verificationTokenHash = null
        otpRecord.verificationTokenExpiresAt = null
        await otpRecord.save()
      } else {
        otpRecord = await CollegeOnboardingOtp.create({
          email: normalizedEmail,
          otpHash: hashed,
          otpExpiresAt: otpExpiresAt(),
          otpAttempts: 0,
          isVerified: false,
        })
      }

      try {
        await sendOtpEmail(
          normalizedEmail,
          adminName && adminName.trim() ? adminName.trim() : 'Campus Administrator',
          otp
        )
      } catch (mErr) {
        console.error('[onboarding sendOtpEmail failed]', mErr.message)
        return res.status(502).json({
          ok: false,
          error: 'Failed to deliver verification code. Please check your official email address or try again shortly.',
        })
      }

      return res.status(200).json({
        ok: true,
        message: `Verification code sent to ${normalizedEmail}.`,
      })
    } catch (err) {
      console.error('[POST /api/onboarding/request-otp]', err)
      return res.status(500).json({ ok: false, error: 'Failed to send verification code. Please try again.' })
    }
  }
)

// ── POST /api/onboarding/verify-otp ──────────────────────────────────────────
router.post(
  '/verify-otp',
  onboardingOtpLimiter,
  [
    body('officialEmail')
      .trim().normalizeEmail()
      .trim()
      .isEmail().withMessage('Valid official email required.'),
    body('otp')
      .trim()
      .isLength({ min: 6, max: 6 }).withMessage('OTP must be 6 digits.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { officialEmail, otp } = req.body
      const normalizedEmail = officialEmail.trim().toLowerCase()

      const otpRecord = await CollegeOnboardingOtp.findOne({ email: normalizedEmail })
      if (!otpRecord) {
        return res.status(404).json({
          ok: false,
          error: 'No verification code request found for this email. Please request a code first.',
        })
      }

      const maxAttempts = Number(process.env.OTP_MAX_ATTEMPTS) || 5
      if (otpRecord.otpAttempts >= maxAttempts) {
        return res.status(429).json({
          ok: false,
          error: 'Too many incorrect attempts. Please request a new verification code.',
        })
      }

      if (!otpRecord.otpExpiresAt || new Date() > otpRecord.otpExpiresAt) {
        return res.status(400).json({
          ok: false,
          error: 'Verification code has expired. Please request a new one.',
          expired: true,
        })
      }

      const isValid = otpRecord.otpHash ? await verifyOtp(otp, otpRecord.otpHash) : false

      if (!isValid) {
        otpRecord.otpAttempts += 1
        await otpRecord.save()
        const remaining = maxAttempts - otpRecord.otpAttempts
        return res.status(400).json({
          ok: false,
          error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
        })
      }

      // Generate server-verifiable token (32-byte hex)
      const rawVerificationToken = crypto.randomBytes(32).toString('hex')
      const hashedToken = await hashOtp(rawVerificationToken)
      const tokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000) // 15 minutes validity

      otpRecord.isVerified = true
      otpRecord.verificationTokenHash = hashedToken
      otpRecord.verificationTokenExpiresAt = tokenExpiresAt
      otpRecord.otpHash = null
      otpRecord.otpExpiresAt = null
      otpRecord.otpAttempts = 0
      await otpRecord.save()

      return res.status(200).json({
        ok: true,
        message: 'Official email verified successfully.',
        officialEmail: normalizedEmail,
        verificationToken: rawVerificationToken,
      })
    } catch (err) {
      console.error('[POST /api/onboarding/verify-otp]', err)
      return res.status(500).json({ ok: false, error: 'Verification failed. Please try again.' })
    }
  }
)

// ── POST /api/onboarding/proof-upload-signature ────────────────────────────
router.post('/proof-upload-signature', async (req, res) => {
  try {
    const { resourceType } = req.body || {}
    const rType = resourceType === 'raw' || resourceType === 'application/pdf' ? 'raw' : 'image'
    const upload = createProofUploadSignature(rType)
    return res.status(200).json({ ok: true, upload })
  } catch (err) {
    console.error('[POST /api/onboarding/proof-upload-signature]', err)
    return res.status(500).json({
      ok: false,
      error: err.message || 'Could not prepare secure proof upload.',
    })
  }
})

// ── POST /api/onboarding/submit ──────────────────────────────────────────────
router.post(
  '/submit',
  [
    body('collegeName').trim().notEmpty().withMessage('College name is required.'),
    body('collegeCode').trim().notEmpty().withMessage('College short code is required.'),
    body('emailDomain').trim().notEmpty().withMessage('Email domain is required.'),
    body('adminName').trim().notEmpty().withMessage('Requester name is required.'),
    body('officialEmail').trim().isEmail().withMessage('Valid official email address is required.'),
    body('verificationToken').trim().notEmpty().withMessage('OTP verification token is required.'),
    body('location').optional().trim(),
    body('campusType').optional().trim(),
    body('campusSize').optional().trim(),
    body('designation').optional().trim(),
    body('phone').optional().trim(),
    body('proofPublicId').optional().trim(),
    body('proofResourceType').optional().trim(),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const platformConfig = await getPlatformConfig()
      if (platformConfig?.features?.allowRegistration === false || platformConfig?.maintenance?.enabled) {
        return res.status(503).json({
          ok: false,
          error: 'New college onboarding registrations are temporarily paused by platform administration.',
        })
      }
      const {
        collegeName,
        collegeCode,
        emailDomain,
        adminName,
        officialEmail,
        verificationToken,
        location,
        campusType,
        campusSize,
        designation,
        phone,
        proofPublicId,
        proofResourceType,
      } = req.body

      const normalizedEmail = officialEmail.trim().toLowerCase()
      const normalizedDomain = emailDomain.trim().toLowerCase().replace(/^@/, '')
      const normalizedCode = collegeCode.trim().toUpperCase()
      const trimmedName = collegeName.trim()

      // ── 0. Strict Domain Match: Official email must belong to entered emailDomain ──
      const submitEmailDomainPart = normalizedEmail.split('@')[1] || ''
      if (submitEmailDomainPart !== normalizedDomain) {
        return res.status(422).json({
          ok: false,
          error: 'Official email domain (@' + (submitEmailDomainPart || 'unknown') + ') does not match the college domain entered (@' + normalizedDomain + '). Please use an official email ending with @' + normalizedDomain + '.',
        })
      }

      // 1. Verify OTP Verification Token State
      const otpRecord = await CollegeOnboardingOtp.findOne({ email: normalizedEmail })
      if (!otpRecord || !otpRecord.isVerified || !otpRecord.verificationTokenHash) {
        return res.status(400).json({
          ok: false,
          error: 'Official email verification missing or invalid. Please verify your email via OTP before submitting.',
        })
      }

      if (!otpRecord.verificationTokenExpiresAt || new Date() > otpRecord.verificationTokenExpiresAt) {
        return res.status(400).json({
          ok: false,
          error: 'Official email verification has expired. Please verify your email again.',
        })
      }

      const isTokenValid = await verifyOtp(verificationToken, otpRecord.verificationTokenHash)
      if (!isTokenValid) {
        return res.status(400).json({
          ok: false,
          error: 'Invalid official email verification token. Please verify your email again.',
        })
      }

      const nameRegex = new RegExp(`^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')

      // 2. Authoritative Duplicate Checks against registered Colleges
      const existingCollegeName = await College.findOne({ name: nameRegex })
      if (existingCollegeName) {
        return res.status(409).json({
          ok: false,
          error: 'A college with this name is already registered.',
        })
      }

      const existingCollegeCode = await College.findOne({ code: normalizedCode })
      if (existingCollegeCode) {
        return res.status(409).json({
          ok: false,
          error: `A college with short code "${normalizedCode}" is already registered.`,
        })
      }

      const existingCollegeDomain = await College.findOne({ domain: normalizedDomain })
      if (existingCollegeDomain) {
        return res.status(409).json({
          ok: false,
          error: 'A college with email domain "@' + normalizedDomain + '" is already registered on Swish ("' + existingCollegeDomain.name + '"). Another registration cannot be created.',
        })
      }

      const existingUserCheck = await User.findOne({ email: normalizedEmail })
      if (existingUserCheck) {
        return res.status(409).json({
          ok: false,
          error: 'A user account with email "' + normalizedEmail + '" already exists on Swish. Please log in or use your official institutional email.',
        })
      }

      // 3. Authoritative Duplicate Checks against pending CollegeOnboardingRequests
      const pendingName = await CollegeOnboardingRequest.findOne({ status: 'PENDING', collegeName: nameRegex })
      if (pendingName) {
        return res.status(409).json({
          ok: false,
          error: 'An onboarding request for this college name is already pending review.',
        })
      }

      const pendingCode = await CollegeOnboardingRequest.findOne({ status: 'PENDING', collegeCode: normalizedCode })
      if (pendingCode) {
        return res.status(409).json({
          ok: false,
          error: `An onboarding request for college code "${normalizedCode}" is already pending review.`,
        })
      }

      const pendingDomain = await CollegeOnboardingRequest.findOne({ status: 'PENDING', emailDomain: normalizedDomain })
      if (pendingDomain) {
        return res.status(409).json({
          ok: false,
          error: `An onboarding request for email domain "@${normalizedDomain}" is already pending review.`,
        })
      }

      const pendingEmail = await CollegeOnboardingRequest.findOne({ status: 'PENDING', officialEmail: normalizedEmail })
      if (pendingEmail) {
        return res.status(409).json({
          ok: false,
          error: `An onboarding request submitted by official email "${normalizedEmail}" is already pending review.`,
        })
      }

      // 4. Create CollegeOnboardingRequest document with status PENDING & emailVerified true
      const onboardingRequest = await CollegeOnboardingRequest.create({
        collegeName: trimmedName,
        collegeCode: normalizedCode,
        emailDomain: normalizedDomain,
        location: location ? location.trim() : '',
        campusType: campusType ? campusType.trim() : '',
        campusSize: campusSize ? campusSize.trim() : '',
        adminName: adminName.trim(),
        designation: designation ? designation.trim() : '',
        phone: phone ? phone.trim() : '',
        officialEmail: normalizedEmail,
        proofPublicId: proofPublicId || null,
        proofResourceType: proofResourceType || null,
        status: 'PENDING',
        emailVerified: true,
        verifiedAt: new Date(),
      })

      // 5. Invalidate used OTP verification token
      otpRecord.isVerified = false
      otpRecord.verificationTokenHash = null
      otpRecord.verificationTokenExpiresAt = null
      await otpRecord.save()

      // 6. Create high-priority Admin Notification and broadcast to Main Admin in real time
      try {
        const notif = await AdminNotification.create({
          type: 'college_request',
          title: 'New College Onboarding Request',
          message: `${onboardingRequest.collegeName} (${onboardingRequest.officialEmail}) has submitted an onboarding request.`,
          data: {
            requestId: onboardingRequest._id.toString(),
            collegeName: onboardingRequest.collegeName,
            officialEmail: onboardingRequest.officialEmail,
            adminName: onboardingRequest.adminName,
            collegeCode: onboardingRequest.collegeCode,
            location: onboardingRequest.location,
          },
          link: `/admin/pending-requests/${onboardingRequest._id.toString()}`,
          priority: 'high',
        })

        emitToAdmin('admin:notification:new', {
          ...notif.toObject(),
          id: notif._id.toString(),
        })
      } catch (notifErr) {
        console.error('[POST /api/onboarding/submit] Failed to create AdminNotification:', notifErr)
      }

      return res.status(201).json({
        ok: true,
        message: 'College onboarding request submitted successfully and is pending review.',
        data: onboardingRequest,
      })
    } catch (err) {
      console.error('[POST /api/onboarding/submit]', err)
      return res.status(500).json({ ok: false, error: 'Failed to submit onboarding request. Please try again.' })
    }
  }
)

export default router
