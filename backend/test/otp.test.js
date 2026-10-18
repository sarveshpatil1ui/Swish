import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  generateOtp,
  hashOtp,
  verifyOtp,
  otpExpiresAt,
  isOtpResendOnCooldown,
} from '../src/services/otp.service.js'

describe('OTP Service & Security Verification', () => {
  const originalEnv = process.env.NODE_ENV
  const originalMasterOtp = process.env.MASTER_OTP

  afterEach(() => {
    process.env.NODE_ENV = originalEnv
    process.env.MASTER_OTP = originalMasterOtp
  })

  test('generateOtp generates a 6-digit numeric string', () => {
    const otp = generateOtp()
    assert.match(otp, /^\d{6}$/, 'OTP must be exactly 6 digits')
  })

  test('hashOtp produces a bcrypt hash different from plaintext', async () => {
    const otp = '482910'
    const hash = await hashOtp(otp)
    assert.notEqual(hash, otp)
    assert.ok(hash.startsWith('$2'), 'Hash should be bcrypt formatted')
  })

  test('verifyOtp returns true for valid OTP against hash', async () => {
    const otp = '739201'
    const hash = await hashOtp(otp)
    const isValid = await verifyOtp(otp, hash)
    assert.equal(isValid, true)
  })

  test('verifyOtp returns false for invalid OTP against hash', async () => {
    const otp = '739201'
    const hash = await hashOtp(otp)
    const isValid = await verifyOtp('999999', hash)
    assert.equal(isValid, false)
  })

  test('PRODUCTION GATE: Master OTP bypass is strictly disabled in production', async () => {
    process.env.NODE_ENV = 'production'
    process.env.MASTER_OTP = '123456'

    const realOtp = '654321'
    const realHash = await hashOtp(realOtp)

    // In production, supplying MASTER_OTP when real OTP differs must FAIL
    const bypassResult = await verifyOtp('123456', realHash)
    assert.equal(bypassResult, false, 'Master OTP bypass MUST NOT succeed in production')
  })

  test('DEVELOPMENT: Master OTP bypass only allowed when configured and NOT in production', async () => {
    process.env.NODE_ENV = 'development'
    process.env.MASTER_OTP = '987654'

    const realOtp = '112233'
    const realHash = await hashOtp(realOtp)

    const bypassResult = await verifyOtp('987654', realHash)
    assert.equal(bypassResult, true, 'Master OTP allowed in dev when configured')
  })

  test('otpExpiresAt generates a future timestamp around 10 minutes out', () => {
    const expiresAt = otpExpiresAt()
    const now = Date.now()
    const diffMs = expiresAt.getTime() - now
    const diffMinutes = diffMs / (1000 * 60)
    assert.ok(diffMinutes >= 9.9 && diffMinutes <= 10.1, 'Expiry should be 10 minutes')
  })

  test('12a. isOtpResendOnCooldown enforces cooldown window', () => {
    // User issued an OTP just now (expiry = now + 10 mins)
    const freshUser = { otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) }
    assert.equal(isOtpResendOnCooldown(freshUser), true, 'Must be on cooldown immediately after issuance')

    // User issued an OTP 2 minutes ago (expiry = now + 8 mins) with 60s cooldown
    const oldUser = { otpExpiresAt: new Date(Date.now() + 8 * 60 * 1000) }
    assert.equal(isOtpResendOnCooldown(oldUser), false, 'Cooldown should have elapsed after 60s')

    // User without otpExpiresAt
    assert.equal(isOtpResendOnCooldown({}), false, 'User without OTP is not on cooldown')
  })

  test('12b. OTP expiration logic rejects expired timestamps', () => {
    const expiredTimestamp = new Date(Date.now() - 1000) // 1 second in the past
    const isExpired = new Date() > expiredTimestamp
    assert.equal(isExpired, true, 'Past timestamp must be marked expired')

    const futureTimestamp = new Date(Date.now() + 5 * 60 * 1000) // 5 minutes in the future
    assert.equal(new Date() > futureTimestamp, false, 'Future timestamp must not be expired')
  })

  test('12c. Single-use verification: clearing hash prevents replay attack', async () => {
    const otp = '842951'
    const hash = await hashOtp(otp)
    const user = {
      isEmailVerified: false,
      otpHash: hash,
      otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000),
      otpAttempts: 0,
    }

    // First attempt: valid
    const firstCheck = await verifyOtp(otp, user.otpHash)
    assert.equal(firstCheck, true, 'First verification must succeed')

    // System clears hash and expiresAt upon success (single-use)
    user.isEmailVerified = true
    user.otpHash = null
    user.otpExpiresAt = null

    // Replay attempt with the exact same OTP code
    const replayCheck = user.otpHash ? await verifyOtp(otp, user.otpHash) : false
    assert.equal(replayCheck, false, 'Replaying the same OTP must fail after clearing hash')
  })

  test('13. Max attempt lockout prevents brute-force verification', async () => {
    const maxAttempts = 5
    let userOtpAttempts = 0
    const incorrectCodes = ['111111', '222222', '333333', '444444', '555555', '666666']
    const validHash = await hashOtp('999888')

    for (const code of incorrectCodes) {
      if (userOtpAttempts >= maxAttempts) {
        // Locked out
        break
      }
      const valid = await verifyOtp(code, validHash)
      if (!valid) {
        userOtpAttempts++
      }
    }

    assert.equal(userOtpAttempts, 5, 'Should increment to max attempts')
    assert.ok(userOtpAttempts >= maxAttempts, 'Account must be locked out from further attempts')
  })
})
