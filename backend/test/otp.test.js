import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { generateOtp, hashOtp, verifyOtp, otpExpiresAt } from '../src/services/otp.service.js'

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
})
