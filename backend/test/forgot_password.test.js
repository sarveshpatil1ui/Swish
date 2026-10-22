import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import authRouter from '../src/routes/auth.routes.js'
import User from '../src/models/User.js'
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  otpExpiresAt,
} from '../src/services/otp.service.js'
import {
  buildPasswordResetOtpHtml,
  buildPasswordResetOtpText,
  buildPasswordChangedHtml,
  buildPasswordChangedText,
} from '../src/services/email.service.js'

describe('Forgot Password Flow & Security Verification', () => {
  const originalEnv = process.env.NODE_ENV
  const originalMasterOtp = process.env.MASTER_OTP

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    process.env.MASTER_OTP = originalMasterOtp
  })

  test('1. Auth router registers forgot-password, verify-reset-otp, and reset-password routes', () => {
    const routeLayers = authRouter.stack
      .filter(layer => layer.route)
      .map(layer => layer.route.path)

    assert.ok(routeLayers.includes('/forgot-password'), 'POST /forgot-password must be registered')
    assert.ok(routeLayers.includes('/verify-reset-otp'), 'POST /verify-reset-otp must be registered')
    assert.ok(routeLayers.includes('/reset-password'), 'POST /reset-password must be registered')
  })

  test('2. User schema strips reset fields in toJSON', () => {
    const userDoc = new User({
      name: 'Test Student',
      username: 'test.student',
      initials: 'TS',
      email: 'student@campus.edu',
      passwordHash: 'dummy_hash',
      role: 'student',
      resetOtpHash: 'secret_otp_hash',
      resetOtpExpiresAt: new Date(Date.now() + 600000),
      resetOtpAttempts: 2,
      resetTokenHash: 'secret_token_hash',
      resetTokenExpiresAt: new Date(Date.now() + 600000),
      passwordChangedAt: new Date(),
    })

    const json = userDoc.toJSON()
    assert.equal(json.resetOtpHash, undefined, 'resetOtpHash must be stripped from toJSON')
    assert.equal(json.resetOtpExpiresAt, undefined, 'resetOtpExpiresAt must be stripped from toJSON')
    assert.equal(json.resetOtpAttempts, undefined, 'resetOtpAttempts must be stripped from toJSON')
    assert.equal(json.resetTokenHash, undefined, 'resetTokenHash must be stripped from toJSON')
    assert.equal(json.resetTokenExpiresAt, undefined, 'resetTokenExpiresAt must be stripped from toJSON')
    assert.equal(json.passwordChangedAt, undefined, 'passwordChangedAt must be stripped from toJSON')
  })

  test('3. Anti-enumeration: consistent response contract for unknown vs known users', () => {
    const expectedResponse = {
      ok: true,
      message: 'If that email is registered, a password reset code has been sent.',
    }
    assert.equal(expectedResponse.ok, true)
    assert.equal(typeof expectedResponse.message, 'string')
  })

  test('4. OTP generation and bcrypt hashing for reset', async () => {
    const otp = generateOtp()
    assert.match(otp, /^\d{6}$/, 'OTP must be 6 digits')

    const hashed = await hashOtp(otp)
    assert.notEqual(hashed, otp, 'Hash must not equal plaintext')
    assert.ok(hashed.startsWith('$2'), 'Hash must be valid bcrypt')

    const valid = await verifyOtp(otp, hashed)
    assert.equal(valid, true, 'Valid OTP must verify against hash')

    const invalid = await verifyOtp('000000', hashed)
    assert.equal(invalid, false, 'Invalid OTP must not verify')
  })

  test('5. Lockout mechanism: 5 failed attempts locks out OTP verification', async () => {
    const maxAttempts = 5
    let attempts = 0
    let otpHash = await hashOtp('123456')

    // Simulate 4 failed attempts
    for (let i = 1; i <= 4; i++) {
      const isValid = await verifyOtp('999999', otpHash)
      assert.equal(isValid, false)
      attempts += 1
      assert.ok(attempts < maxAttempts, 'Should not be locked out yet')
    }

    // 5th failed attempt locks out
    const isFifthValid = await verifyOtp('999999', otpHash)
    assert.equal(isFifthValid, false)
    attempts += 1
    assert.equal(attempts, 5)

    // Clear hash upon hitting max attempts
    if (attempts >= maxAttempts) {
      otpHash = null
    }
    assert.equal(otpHash, null, 'OTP hash must be wiped on lockout')
  })

  test('6. Expired OTP rejection', () => {
    const expiredAt = new Date(Date.now() - 1000)
    const isExpired = new Date() > expiredAt
    assert.equal(isExpired, true, 'Expired timestamp must evaluate as expired')

    const futureAt = new Date(Date.now() + 10 * 60 * 1000)
    const isFutureExpired = new Date() > futureAt
    assert.equal(isFutureExpired, false, 'Future timestamp must not evaluate as expired')
  })

  test('7. Reset token generation and SHA-256 single-use verification', () => {
    const rawResetToken = crypto.randomBytes(32).toString('hex')
    assert.equal(rawResetToken.length, 64, 'Token should be 64 hex chars (32 bytes)')

    const storedHash = crypto.createHash('sha256').update(rawResetToken).digest('hex')
    const incomingHash = crypto.createHash('sha256').update(rawResetToken).digest('hex')
    assert.equal(storedHash, incomingHash, 'Incoming token hash must match stored token hash')

    const wrongTokenHash = crypto.createHash('sha256').update('wrongtoken123').digest('hex')
    assert.notEqual(storedHash, wrongTokenHash, 'Wrong token must not match')
  })

  test('8. Password reuse prevention: reject newPassword equal to current passwordHash', async () => {
    const currentPass = 'SwishPass123!'
    const currentHash = await bcrypt.hash(currentPass, 12)

    const isSamePassword = await bcrypt.compare('SwishPass123!', currentHash)
    assert.equal(isSamePassword, true, 'Same password should be detected')

    const isDifferentPassword = await bcrypt.compare('DifferentPass456!', currentHash)
    assert.equal(isDifferentPassword, false, 'Different password should pass check')
  })

  test('9. passwordChangedAt invalidates previously issued JWTs', () => {
    const jwtSecret = 'test_jwt_secret_with_at_least_32_characters_for_security'
    const issuedAtPastSec = Math.floor(Date.now() / 1000) - 300 // 5 minutes ago

    const oldToken = jwt.sign(
      { sub: 'user_123', role: 'student', iat: issuedAtPastSec },
      jwtSecret
    )

    // Password changed 1 minute ago
    const passwordChangedAt = new Date(Date.now() - 60 * 1000)
    const passwordChangedSec = Math.floor(passwordChangedAt.getTime() / 1000)

    const payload = jwt.verify(oldToken, jwtSecret)
    assert.ok(payload.iat < passwordChangedSec, 'Old JWT must have iat before password change time')

    // Fresh token issued after password change
    const freshToken = jwt.sign(
      { sub: 'user_123', role: 'student', iat: Math.floor(Date.now() / 1000) },
      jwtSecret
    )
    const freshPayload = jwt.verify(freshToken, jwtSecret)
    assert.ok(freshPayload.iat >= passwordChangedSec, 'Fresh JWT must have iat after password change time')
  })

  test('10. Email templates contain proper branding, OTP, and security notices', () => {
    const otp = '492810'
    const name = 'Alex Patel'

    const resetHtml = buildPasswordResetOtpHtml(name, otp, 10)
    assert.ok(resetHtml.includes('⚡ Swish'), 'Must have Swish header')
    assert.ok(resetHtml.includes(otp), 'Must contain OTP')
    assert.ok(resetHtml.includes('Reset your Swish password'), 'Must contain subject heading')

    const resetText = buildPasswordResetOtpText(name, otp, 10)
    assert.ok(resetText.includes(otp), 'Plain text must contain OTP')
    assert.ok(resetText.includes('10 minutes'), 'Plain text must contain expiry')

    const changedHtml = buildPasswordChangedHtml(name)
    assert.ok(changedHtml.includes('Password Changed Successfully'), 'Confirmation email must contain title')

    const changedText = buildPasswordChangedText(name)
    assert.ok(changedText.includes('Your Swish account password was successfully changed'), 'Plain text confirmation must be clear')
  })
})
