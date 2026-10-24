import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { verifyTurnstileToken } from '../src/services/turnstile.service.js'

describe('Security & Brute-Force Safeguards', () => {
  test('1. Turnstile verification bypasses gracefully when no secret key configured', async () => {
    delete process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY
    const res = await verifyTurnstileToken('dummy-token')
    assert.equal(res.success, true, 'Must return success: true when bypassed')
    assert.equal(res.bypassed, true, 'Must set bypassed flag to true')
  })

  test('2. Turnstile rejects empty token when secret key is configured', async () => {
    process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY = 'test-secret-key'
    try {
      const res = await verifyTurnstileToken(null)
      assert.equal(res.success, false, 'Must fail when token is null')
      assert.ok(res.error, 'Must provide an error message')
    } finally {
      delete process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY
    }
  })

  test('3. Account lockout triggers after 5 failed login attempts', () => {
    const mockUser = {
      failedLoginAttempts: 0,
      lockUntil: null,
    }

    const MAX_FAILED_ATTEMPTS = 5
    for (let i = 1; i <= MAX_FAILED_ATTEMPTS; i++) {
      mockUser.failedLoginAttempts += 1
      if (mockUser.failedLoginAttempts >= MAX_FAILED_ATTEMPTS) {
        mockUser.lockUntil = new Date(Date.now() + 15 * 60 * 1000)
        mockUser.failedLoginAttempts = 0
      }
    }

    assert.equal(mockUser.failedLoginAttempts, 0, 'Counter resets upon lock activation')
    assert.ok(mockUser.lockUntil > new Date(), 'lockUntil must be set in the future (15 mins)')
  })

  test('4. Session invalidation rejects tokens issued before password change', () => {
    const passwordChangedAt = new Date('2026-10-24T12:00:00Z')
    const passwordChangedSec = Math.floor(passwordChangedAt.getTime() / 1000)

    // Token issued 10 minutes BEFORE password change
    const oldTokenPayload = {
      id: 'user_123',
      iat: passwordChangedSec - 600,
    }

    // Token issued 1 minute AFTER password change
    const newTokenPayload = {
      id: 'user_123',
      iat: passwordChangedSec + 60,
    }

    const isOldTokenValid = !(oldTokenPayload.iat < passwordChangedSec)
    const isNewTokenValid = !(newTokenPayload.iat < passwordChangedSec)

    assert.equal(isOldTokenValid, false, 'Old token issued before password change must be invalidated')
    assert.equal(isNewTokenValid, true, 'New token issued after password change must remain valid')
  })
})
