import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { hasEmailProvider, sendOtpEmail } from '../src/services/email.service.js'

describe('Email Service & Provider Fallback', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  test('hasEmailProvider identifies active providers', () => {
    delete process.env.RESEND_API_KEY
    delete process.env.BREVO_API_KEY
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASS

    assert.equal(hasEmailProvider(), false)

    process.env.RESEND_API_KEY = 're_test_123'
    assert.equal(hasEmailProvider(), true)

    delete process.env.RESEND_API_KEY
    process.env.BREVO_API_KEY = 'xkeysib-test-123'
    assert.equal(hasEmailProvider(), true)

    delete process.env.BREVO_API_KEY
    process.env.SMTP_USER = 'realuser@gmail.com'
    process.env.SMTP_PASS = 'realpassword123'
    assert.equal(hasEmailProvider(), true)
  })

  test('sendOtpEmail throws in production if no email provider is configured', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.RESEND_API_KEY
    delete process.env.BREVO_API_KEY
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASS

    await assert.rejects(
      async () => {
        await sendOtpEmail('student@test.edu', 'Student', '123456')
      },
      {
        message: /Email delivery service is unavailable/,
      },
      'In production with no provider, sendOtpEmail MUST throw an error'
    )
  })

  test('sendOtpEmail logs in development without throwing if no provider is configured', async () => {
    process.env.NODE_ENV = 'development'
    delete process.env.RESEND_API_KEY
    delete process.env.BREVO_API_KEY
    delete process.env.SMTP_USER
    delete process.env.SMTP_PASS

    const result = await sendOtpEmail('dev@test.edu', 'Dev User', '654321')
    assert.deepEqual(result, { ok: true, devMode: true })
  })
})
