import { test, describe, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { hasEmailProvider, sendOtpEmail } from '../src/services/email.service.js'

describe('Gmail API Email Service & Configuration', () => {
  const originalEnv = { ...process.env }

  afterEach(() => {
    for (const k of Object.keys(process.env)) {
      if (!(k in originalEnv)) delete process.env[k]
    }
    Object.assign(process.env, originalEnv)
  })

  test('hasEmailProvider identifies when Gmail API is configured vs missing', () => {
    delete process.env.GMAIL_CLIENT_ID
    delete process.env.GMAIL_CLIENT_SECRET
    delete process.env.GMAIL_REFRESH_TOKEN
    delete process.env.GMAIL_SENDER_EMAIL

    assert.equal(hasEmailProvider(), false)

    process.env.GMAIL_CLIENT_ID = 'test-client-id.apps.googleusercontent.com'
    assert.equal(hasEmailProvider(), false, 'Requires all 4 variables')

    process.env.GMAIL_CLIENT_SECRET = 'test-secret'
    assert.equal(hasEmailProvider(), false, 'Requires all 4 variables')

    process.env.GMAIL_REFRESH_TOKEN = '1//test-token'
    assert.equal(hasEmailProvider(), false, 'Requires all 4 variables')

    process.env.GMAIL_SENDER_EMAIL = 'swishh.project@gmail.com'
    assert.equal(hasEmailProvider(), true, 'Returns true when all 4 are set')
  })

  test('sendOtpEmail throws in production if Gmail API is not configured', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.GMAIL_CLIENT_ID
    delete process.env.GMAIL_CLIENT_SECRET
    delete process.env.GMAIL_REFRESH_TOKEN
    delete process.env.GMAIL_SENDER_EMAIL

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
    delete process.env.GMAIL_CLIENT_ID
    delete process.env.GMAIL_CLIENT_SECRET
    delete process.env.GMAIL_REFRESH_TOKEN
    delete process.env.GMAIL_SENDER_EMAIL

    const result = await sendOtpEmail('dev@test.edu', 'Dev User', '654321')
    assert.deepEqual(result, { ok: true, devMode: true })
  })
})
