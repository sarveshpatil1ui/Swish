// backend/src/routes/onboarding.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// College Onboarding routes:
//   POST /api/onboarding/request-otp  - Send OTP to official email
//   POST /api/onboarding/verify-otp   - Verify OTP and return short-lived token
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import crypto from 'crypto'

import CollegeOnboardingOtp from '../models/CollegeOnboardingOtp.js'
import CollegeOnboardingRequest from '../models/CollegeOnboardingRequest.js'
import College from '../models/College.js'
import { sendOtpEmail } from '../services/email.service.js'
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  otpExpiresAt,
} from '../services/otp.service.js'

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
      const { officialEmail, adminName } = req.body
      const normalizedEmail = officialEmail.trim().toLowerCase()

      const otp = generateOtp()
      const hashed = await hashOtp(otp)

      let otpRecord = await CollegeOnboardingOtp.findOne({ email: normalizedEmail })

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

      await sendOtpEmail(
        normalizedEmail,
        adminName && adminName.trim() ? adminName.trim() : 'Campus Administrator',
        otp
      )

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
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
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
      } = req.body

      const normalizedEmail = officialEmail.trim().toLowerCase()
      const normalizedDomain = emailDomain.trim().toLowerCase().replace(/^@/, '')
      const normalizedCode = collegeCode.trim().toUpperCase()
      const trimmedName = collegeName.trim()

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

      const existingCollegeDomain = await College.findOne({ domain: normalizedDomain, active: true })
      if (existingCollegeDomain) {
        return res.status(409).json({
          ok: false,
          error: `A college with email domain "@${normalizedDomain}" is already registered.`,
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
        status: 'PENDING',
        emailVerified: true,
        verifiedAt: new Date(),
      })

      // 5. Invalidate used OTP verification token
      otpRecord.isVerified = false
      otpRecord.verificationTokenHash = null
      otpRecord.verificationTokenExpiresAt = null
      await otpRecord.save()

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

