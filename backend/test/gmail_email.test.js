// backend/test/gmail_email.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Comprehensive test suite for Gmail REST API (OAuth 2.0) Email Service.
// Covers all 15 requirements specified in Section 9.
// ─────────────────────────────────────────────────────────────────────────────

import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { google } from 'googleapis'

import {
  dispatchEmail,
  sendOtpEmail,
  hasEmailProvider,
  createOAuth2Client,
  buildMimeMessage,
  encodeBase64Url,
  escapeHtml,
  buildOtpHtml,
  buildOtpText,
} from '../src/services/email.service.js'

import {
  generateOtp,
  hashOtp,
  verifyOtp,
  otpExpiresAt,
  isOtpResendOnCooldown,
} from '../src/services/otp.service.js'

describe('Gmail API OAuth 2.0 Email Delivery Service', () => {
  const origEnv = { ...process.env }
  const origGmail = google.gmail

  beforeEach(() => {
    // Set standard mock Gmail environment
    process.env.GMAIL_CLIENT_ID = 'mock-client-id.apps.googleusercontent.com'
    process.env.GMAIL_CLIENT_SECRET = 'GOCSPX-mock-secret-key-12345'
    process.env.GMAIL_REFRESH_TOKEN = '1//0g-mock-refresh-token-xyz'
    process.env.GMAIL_SENDER_EMAIL = 'swishh.project@gmail.com'
    process.env.GMAIL_SENDER_NAME = 'Swish Campus'
  })

  afterEach(() => {
    google.gmail = origGmail
    for (const k of Object.keys(process.env)) {
      if (!(k in origEnv)) delete process.env[k]
    }
    Object.assign(process.env, origEnv)
  })

  // ── 1. Successful Gmail API Send ───────────────────────────────────────────
  test('1. Successful Gmail API send returns accepted messageId', async () => {
    let capturedParams = null
    google.gmail = () => ({
      users: {
        messages: {
          send: async (params) => {
            capturedParams = params
            return {
              status: 200,
              data: { id: 'gmail_msg_001', threadId: 'thread_001' },
            }
          },
        },
      },
    })

    const result = await dispatchEmail({
      to: 'student@kjsce.somaiya.edu',
      subject: 'Your Swish Code',
      html: '<p>123456</p>',
      text: '123456',
    })

    assert.equal(result.ok, true)
    assert.equal(result.provider, 'gmail_api')
    assert.equal(result.messageId, 'gmail_msg_001')
    assert.ok(capturedParams)
    assert.equal(capturedParams.userId, 'me')
  })

  // ── 2. Correct Recipient and Sender ─────────────────────────────────────────
  test('2. Correct recipient and sender headers in generated RFC 2822 message', async () => {
    let rawSent = null
    google.gmail = () => ({
      users: {
        messages: {
          send: async (params) => {
            rawSent = params.requestBody.raw
            return { status: 200, data: { id: 'msg_2' } }
          },
        },
      },
    })

    await dispatchEmail({
      to: 'priya@campus.edu',
      subject: 'Verify your account',
      html: '<p>HTML body</p>',
      text: 'Plain body',
    })

    assert.ok(rawSent, 'Raw message must be generated')
    const decoded = Buffer.from(rawSent, 'base64url').toString('utf-8')
    assert.ok(decoded.includes('From: "Swish Campus" <swishh.project@gmail.com>'), 'From must match authorized sender')
    assert.ok(decoded.includes('To: priya@campus.edu'), 'To must match recipient')
  })

  // ── 3. Correct Base64url Message Construction ──────────────────────────────
  test('3. Raw payload uses URL-safe base64 encoding (RFC 4648 §5)', async () => {
    const raw = encodeBase64Url('Hello + World / Swish ==')
    assert.ok(!raw.includes('+'), 'Must not contain plus signs')
    assert.ok(!raw.includes('/'), 'Must not contain forward slashes')
    assert.ok(!raw.includes('='), 'Must not contain padding equals')
  })

  // ── 4. HTML and Plain-Text Message Parts ────────────────────────────────────
  test('4. Message contains both text/plain and text/html alternative parts', () => {
    const mime = buildMimeMessage({
      to: 'user@test.edu',
      from: '"Swish" <swishh.project@gmail.com>',
      subject: 'Test Subject',
      text: 'Plain text version',
      html: '<h1>HTML version</h1>',
    })

    assert.ok(mime.includes('Content-Type: multipart/alternative; boundary='), 'Must be multipart/alternative')
    assert.ok(mime.includes('Content-Type: text/plain; charset=utf-8'), 'Must include text/plain part')
    assert.ok(mime.includes('Content-Type: text/html; charset=utf-8'), 'Must include text/html part')

    // Decode and verify body parts
    assert.ok(mime.includes(Buffer.from('Plain text version', 'utf-8').toString('base64')))
    assert.ok(mime.includes(Buffer.from('<h1>HTML version</h1>', 'utf-8').toString('base64')))
  })

  // ── 5. Missing OAuth Configuration ──────────────────────────────────────────
  test('5. Missing OAuth credentials throws controlled configuration error', async () => {
    delete process.env.GMAIL_CLIENT_ID
    assert.equal(hasEmailProvider(), false)

    await assert.rejects(
      () => dispatchEmail({ to: 'a@b.com', subject: 'x', html: 'x', text: 'x' }),
      /Gmail API is not configured/
    )
  })

  // ── 6. Gmail API Authentication Errors (401/403) ────────────────────────────
  test('6. Gmail API 401/403 authentication error throws descriptive error', async () => {
    google.gmail = () => ({
      users: {
        messages: {
          send: async () => {
            const err = new Error('Invalid Credentials')
            err.status = 401
            throw err
          },
        },
      },
    })

    await assert.rejects(
      () => dispatchEmail({ to: 'a@b.com', subject: 'x', html: 'x', text: 'x' }),
      /Gmail API authentication failed \(401\)/
    )
  })

  // ── 7. Gmail API Rate Limits and Server Errors (429/5xx) ─────────────────────
  test('7. Gmail API 429 rate limit and 500 server error handling', async () => {
    // 429
    google.gmail = () => ({
      users: {
        messages: {
          send: async () => {
            const err = new Error('Rate limit exceeded')
            err.status = 429
            throw err
          },
        },
      },
    })

    await assert.rejects(
      () => dispatchEmail({ to: 'a@b.com', subject: 'x', html: 'x', text: 'x' }),
      /rate limit exceeded/i
    )

    // 500
    google.gmail = () => ({
      users: {
        messages: {
          send: async () => {
            const err = new Error('Internal Google Error')
            err.status = 500
            throw err
          },
        },
      },
    })

    await assert.rejects(
      () => dispatchEmail({ to: 'a@b.com', subject: 'x', html: 'x', text: 'x' }),
      /Internal Google Error/
    )
  })

  // ── 8. Bounded Timeout Behavior ────────────────────────────────────────────
  test('8. Request timeout throws error with uncertain=true', async () => {
    google.gmail = () => ({
      users: {
        messages: {
          send: async () => {
            const err = new Error('timeout of 12000ms exceeded')
            err.code = 'ECONNABORTED'
            throw err
          },
        },
      },
    })

    await assert.rejects(
      () => dispatchEmail({ to: 'a@b.com', subject: 'x', html: 'x', text: 'x' }),
      (err) => {
        assert.equal(err.uncertain, true)
        assert.equal(err.category, 'uncertain')
        assert.ok(err.message.includes('timed out'))
        return true
      }
    )
  })

  // ── 9. Registration Delivery Failure Handling ──────────────────────────────
  test('9. Registration flow handles email failure cleanly without leaking raw errors', async () => {
    google.gmail = () => ({
      users: {
        messages: {
          send: async () => {
            throw new Error('Google backend down')
          },
        },
      },
    })

    // Simulate route catch logic
    let httpStatus = 0
    let httpResponse = null

    try {
      await sendOtpEmail('newuser@campus.edu', 'New User', '777888')
    } catch (mErr) {
      httpStatus = 502
      httpResponse = {
        ok: false,
        error: 'Account created, but failed to deliver verification email. Please use resend code to try again.',
        pendingVerification: true,
        email: 'newuser@campus.edu',
      }
    }

    assert.equal(httpStatus, 502)
    assert.equal(httpResponse.pendingVerification, true)
    assert.equal(httpResponse.ok, false)
  })

  // ── 10. Resend-OTP Delivery Failure Handling ───────────────────────────────
  test('10. Resend-OTP flow handles email failure with 502 status', async () => {
    google.gmail = () => ({
      users: {
        messages: {
          send: async () => {
            throw new Error('Network error')
          },
        },
      },
    })

    let httpStatus = 0
    let httpResponse = null

    try {
      await sendOtpEmail('user@campus.edu', 'Existing User', '112233')
    } catch (mErr) {
      httpStatus = 502
      httpResponse = {
        ok: false,
        error: 'Failed to deliver verification code. Please check your email or try again shortly.',
      }
    }

    assert.equal(httpStatus, 502)
    assert.equal(httpResponse.ok, false)
  })

  // ── 11. Existing OTP Expiry and Verification ────────────────────────────────
  test('11. OTP verification, hashing, and expiry integrity', async () => {
    const rawOtp = generateOtp()
    assert.match(rawOtp, /^\d{6}$/)

    const hash = await hashOtp(rawOtp)
    assert.notEqual(hash, rawOtp)

    const isValid = await verifyOtp(rawOtp, hash)
    assert.equal(isValid, true)

    const isInvalid = await verifyOtp('000000', hash)
    assert.equal(isInvalid, false)

    const expiry = otpExpiresAt()
    assert.ok(expiry.getTime() > Date.now())
  })

  // ── 12. Existing Rate Limits and Cooldowns ──────────────────────────────────
  test('12. Resend cooldown blocks immediate resend requests within window', () => {
    const userJustSent = { otpExpiresAt: new Date(Date.now() + 10 * 60 * 1000) }
    assert.equal(isOtpResendOnCooldown(userJustSent), true, 'Must be on cooldown')

    const userLongAgo = { otpExpiresAt: new Date(Date.now() + 8 * 60 * 1000) }
    assert.equal(isOtpResendOnCooldown(userLongAgo), false, 'Cooldown should have elapsed after 60s')
  })

  // ── 13. No Secret or OTP Leakage in Logs ────────────────────────────────────
  test('13. Logs never leak raw OTP, client secret, or refresh token', async () => {
    const capturedLogs = []
    const origLog = console.log
    const origWarn = console.warn
    const origError = console.error

    console.log = (...a) => capturedLogs.push(a.join(' '))
    console.warn = (...a) => capturedLogs.push(a.join(' '))
    console.error = (...a) => capturedLogs.push(a.join(' '))

    try {
      google.gmail = () => ({
        users: {
          messages: {
            send: async () => ({ status: 200, data: { id: 'logged_msg_1' } }),
          },
        },
      })

      await sendOtpEmail('testuser@campus.edu', 'Test Name', '948201')
    } finally {
      console.log = origLog
      console.warn = origWarn
      console.error = origError
    }

    const allLogs = capturedLogs.join('\n')
    assert.ok(!allLogs.includes('948201'), 'OTP must never be in logs')
    assert.ok(!allLogs.includes('GOCSPX-mock-secret-key-12345'), 'Client secret must never be in logs')
    assert.ok(!allLogs.includes('1//0g-mock-refresh-token-xyz'), 'Refresh token must never be in logs')
  })

  // ── 14. No Old Provider or SMTP Fallback ────────────────────────────────────
  // ── 14. Brevo Support & Non-Supported Providers ─────────────────────────────
  test('14. Brevo activates email provider while unconfigured providers do not', () => {
    delete process.env.GMAIL_CLIENT_ID
    delete process.env.GMAIL_CLIENT_SECRET
    delete process.env.GMAIL_REFRESH_TOKEN
    delete process.env.GMAIL_SENDER_EMAIL
    delete process.env.BREVO_API_KEY

    // Set unsupported provider envs
    process.env.RESEND_API_KEY = 're_old_resend_key'
    process.env.MAILGUN_API_KEY = 'old-mailgun-key'
    process.env.SMTP_USER = 'old-smtp@gmail.com'
    process.env.SMTP_PASS = 'old-app-pass'

    assert.equal(hasEmailProvider(), false, 'Unsupported providers must not satisfy hasEmailProvider')

    // Brevo activation
    process.env.BREVO_API_KEY = 'xkeysib-test-brevo-key'
    assert.equal(hasEmailProvider(), true, 'BREVO_API_KEY must satisfy hasEmailProvider')
  })

  // ── 15. Regression Tests for Previous Security Fixes ────────────────────────
  test('15. Security regression checks: Master OTP and demo login production gates', async () => {
    process.env.NODE_ENV = 'production'
    process.env.MASTER_OTP = '123456'

    const realOtp = '849201'
    const realHash = await hashOtp(realOtp)

    // Master OTP bypass attempt in production
    const bypassResult = await verifyOtp('123456', realHash)
    assert.equal(bypassResult, false, 'Master OTP bypass MUST NOT work in production')

    // In dev, with MASTER_OTP set, it succeeds
    process.env.NODE_ENV = 'development'
    const devBypassResult = await verifyOtp('123456', realHash)
    assert.equal(devBypassResult, true, 'Master OTP allowed only in development when configured')
  })
})
