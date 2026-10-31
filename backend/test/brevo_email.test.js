import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import {
  hasBrevoProvider,
  hasEmailProvider,
  dispatchBrevoEmail,
  sendOtpEmail,
} from '../src/services/email.service.js'

describe('Brevo REST API Email Service', () => {
  const originalEnv = { ...process.env }
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    delete process.env.GMAIL_CLIENT_ID
    delete process.env.GMAIL_CLIENT_SECRET
    delete process.env.GMAIL_REFRESH_TOKEN
    delete process.env.GMAIL_SENDER_EMAIL
    delete process.env.BREVO_API_KEY
    delete process.env.BREVO_SENDER_EMAIL
    delete process.env.BREVO_SENDER_NAME
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    for (const k of Object.keys(process.env)) {
      if (!(k in originalEnv)) delete process.env[k]
    }
    Object.assign(process.env, originalEnv)
  })

  test('1. hasBrevoProvider detects valid key and rejects placeholders', () => {
    assert.equal(hasBrevoProvider(), false)

    process.env.BREVO_API_KEY = 'your-brevo-api-key'
    assert.equal(hasBrevoProvider(), false, 'Placeholders must be rejected')

    process.env.BREVO_API_KEY = 'xkeysib-live-test-key-12345'
    assert.equal(hasBrevoProvider(), true, 'Valid API key must be recognized')
    assert.equal(hasEmailProvider(), true, 'hasEmailProvider must return true when Brevo is configured')
  })

  test('2. Successful Brevo dispatch sends correct JSON payload over HTTPS', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-valid-key'
    process.env.BREVO_SENDER_EMAIL = 'swishh.project@gmail.com'
    process.env.BREVO_SENDER_NAME = 'Swish Campus ⚡'

    let capturedUrl = null
    let capturedOptions = null

    globalThis.fetch = async (url, options) => {
      capturedUrl = url
      capturedOptions = options
      return {
        ok: true,
        status: 201,
        json: async () => ({ messageId: '<mock-brevo-msg-id-123>' }),
      }
    }

    const result = await dispatchBrevoEmail({
      to: 'student@somaiya.edu',
      subject: 'Your Swish Code',
      html: '<p>Code: 123456</p>',
      text: 'Code: 123456',
    })

    assert.equal(result.ok, true)
    assert.equal(result.provider, 'brevo')
    assert.equal(result.messageId, '<mock-brevo-msg-id-123>')

    assert.equal(capturedUrl, 'https://api.brevo.com/v3/smtp/email')
    assert.equal(capturedOptions.method, 'POST')
    assert.equal(capturedOptions.headers['api-key'], 'xkeysib-valid-key')

    const body = JSON.parse(capturedOptions.body)
    assert.deepEqual(body.sender, { name: 'Swish Campus ⚡', email: 'swishh.project@gmail.com' })
    assert.deepEqual(body.to, [{ email: 'student@somaiya.edu' }])
    assert.equal(body.subject, 'Your Swish Code')
  })

  test('3. Brevo authentication failure (401/403) throws descriptive error', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-bad-key'

    globalThis.fetch = async () => ({
      ok: false,
      status: 401,
      json: async () => ({ message: 'Key not found' }),
    })

    await assert.rejects(
      () => dispatchBrevoEmail({ to: 'user@test.edu', subject: 'sub', html: 'h', text: 't' }),
      /Brevo API authentication failed/
    )
  })

  test('4. Brevo unverified sender (400) gives actionable error', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-valid-key'
    process.env.BREVO_SENDER_EMAIL = 'unverified@swish.com'

    globalThis.fetch = async () => ({
      ok: false,
      status: 400,
      json: async () => ({ message: 'Sender email not verified' }),
    })

    await assert.rejects(
      () => dispatchBrevoEmail({ to: 'user@test.edu', subject: 'sub', html: 'h', text: 't' }),
      /Brevo sender not verified/
    )
  })

  test('5. sendOtpEmail routes through Brevo and logs never leak API key', async () => {
    process.env.BREVO_API_KEY = 'xkeysib-secret-key-abcdef123456'

    const logs = []
    const originalLog = console.log
    console.log = (...args) => {
      logs.push(args.join(' '))
      originalLog(...args)
    }

    try {
      globalThis.fetch = async () => ({
        ok: true,
        status: 201,
        json: async () => ({ messageId: '<brevo-otp-msg-999>' }),
      })

      const res = await sendOtpEmail('faculty@somaiya.edu', 'Prof. Sharma', '492810')
      assert.equal(res.ok, true)
      assert.equal(res.provider, 'brevo')

      const combinedLogs = logs.join('\n')
      assert.ok(!combinedLogs.includes('xkeysib-secret-key-abcdef123456'), 'BREVO_API_KEY must NEVER appear in logs')
      assert.ok(!combinedLogs.includes('492810'), 'OTP code must NEVER appear in logs')
    } finally {
      console.log = originalLog
    }
  })
})
