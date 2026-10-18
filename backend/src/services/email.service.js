// backend/src/services/email.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Transactional email delivery via Google Gmail API (HTTPS REST) using OAuth 2.0.
//
// Architecture:
//   Swish Backend → Gmail REST API (v1 / users.messages.send) → Recipient Inbox
//
// Security & Reliability Rules:
//   • Pure HTTPS over port 443 — no SMTP ports (25, 465, 587) used.
//   • Authentication via OAuth 2.0 refresh tokens (GMAIL_REFRESH_TOKEN).
//   • Automatic token refresh managed by official googleapis OAuth2 client.
//   • RFC 2822 MIME multipart/alternative (plain-text + HTML) with base64url encoding.
//   • Authorized dedicated Gmail sender identity (GMAIL_SENDER_EMAIL).
//   • Strict bounded timeouts (default 12 seconds) to avoid blocking requests.
//   • Uncertain delivery state handled gracefully on timeout (no blind resends).
//   • Privacy-safe structured logging: OTPs, passwords, refresh tokens, and
//     client secrets are NEVER logged or exposed.
//   • Zero fallback to Resend, Brevo, Mailgun, or legacy SMTP.
// ─────────────────────────────────────────────────────────────────────────────

import { google } from 'googleapis'

// ── Bounded Request Timeout Helper ───────────────────────────────────────────
function requestTimeoutMs() {
  return Number(process.env.GMAIL_REQUEST_TIMEOUT_MS || process.env.EMAIL_REQUEST_TIMEOUT_MS) || 12000
}

// ── HTML Entity Escaper for Template Safety ──────────────────────────────────
export function escapeHtml(str) {
  if (!str) return ''
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

// ── Privacy-Safe Structured Logger ───────────────────────────────────────────
function _log(level, event, extra = {}) {
  const entry = {
    ts:       new Date().toISOString(),
    svc:      'email',
    provider: 'gmail_api',
    event,
    ...extra,
  }
  // Guarantee sensitive credentials and bodies are never logged
  delete entry.apiKey
  delete entry.otp
  delete entry.password
  delete entry.temporaryPassword
  delete entry.refreshToken
  delete entry.clientSecret
  delete entry.clientId
  delete entry.html
  delete entry.text
  delete entry.raw

  if (level === 'error') console.error('[Email]', JSON.stringify(entry))
  else if (level === 'warn') console.warn('[Email]', JSON.stringify(entry))
  else console.log('[Email]', JSON.stringify(entry))
}

// ─────────────────────────────────────────────────────────────────────────────
// hasEmailProvider
// Returns true if all required Gmail API OAuth 2.0 credentials are configured.
const UNCONFIGURED_GMAIL_PLACEHOLDERS = new Set([
  'your-google-oauth-client-id',
  'your-google-oauth-client-secret',
  'your-google-oauth-refresh-token',
  'your-dedicated-gmail-address',
  'your-google-oauth2-client-id.apps.googleusercontent.com',
  'gocspx-your-google-oauth2-client-secret',
  '1//0g-your-google-oauth2-refresh-token',
])

export function hasEmailProvider() {
  const clientId     = (process.env.GMAIL_CLIENT_ID || '').trim()
  const clientSecret = (process.env.GMAIL_CLIENT_SECRET || '').trim()
  const refreshToken = (process.env.GMAIL_REFRESH_TOKEN || '').trim()
  const senderEmail  = (process.env.GMAIL_SENDER_EMAIL || '').trim()

  if (!clientId || !clientSecret || !refreshToken || !senderEmail) {
    return false
  }

  const values = [clientId, clientSecret, refreshToken, senderEmail]
  const isPlaceholder = values.some(
    v => UNCONFIGURED_GMAIL_PLACEHOLDERS.has(v.toLowerCase()) || v.toLowerCase().startsWith('your-')
  )
  return !isPlaceholder
}

// ─────────────────────────────────────────────────────────────────────────────
// createOAuth2Client
// Initializes a googleapis OAuth2 client with the refresh token.
// ─────────────────────────────────────────────────────────────────────────────
export function createOAuth2Client() {
  const clientId     = process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN

  if (!clientId || !clientSecret || !refreshToken) {
    return null
  }

  const oauth2Client = new google.auth.OAuth2(
    clientId.trim(),
    clientSecret.trim()
  )

  oauth2Client.setCredentials({
    refresh_token: refreshToken.trim(),
  })

  return oauth2Client
}

// ─────────────────────────────────────────────────────────────────────────────
// buildMimeMessage
// Constructs a compliant RFC 2822 multipart/alternative email message with
// plain-text and HTML components, UTF-8 subject encoding, and standard boundaries.
// ─────────────────────────────────────────────────────────────────────────────
export function buildMimeMessage({ to, from, subject, text, html }) {
  const boundary = `swish_boundary_${Date.now()}_${Math.random().toString(36).slice(2)}`
  const utf8Subject = `=?utf-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`

  const lines = [
    `From: ${from}`,
    `To: ${Array.isArray(to) ? to.join(', ') : to}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(text, 'utf-8').toString('base64'),
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(html, 'utf-8').toString('base64'),
    '',
    `--${boundary}--`,
  ]

  return lines.join('\r\n')
}

// ─────────────────────────────────────────────────────────────────────────────
// encodeBase64Url
// Encodes a string into URL-safe base64 (RFC 4648 §5) as required by Gmail API.
// ─────────────────────────────────────────────────────────────────────────────
export function encodeBase64Url(str) {
  return Buffer.from(str, 'utf-8').toString('base64url')
}

// ─────────────────────────────────────────────────────────────────────────────
// dispatchEmail
// Sends an email using the Gmail REST API (v1 / users.messages.send).
// ─────────────────────────────────────────────────────────────────────────────
export async function dispatchEmail({ to, subject, html, text }) {
  const startedAt = Date.now()
  const senderEmail = (process.env.GMAIL_SENDER_EMAIL || '').trim()

  if (!hasEmailProvider()) {
    _log('error', 'dispatch_failed_missing_config')
    throw new Error(
      'Gmail API is not configured. Missing required environment variables: ' +
      'GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN, GMAIL_SENDER_EMAIL.'
    )
  }

  const senderName = (process.env.GMAIL_SENDER_NAME || 'Swish Campus').trim()
  const from = `"${senderName}" <${senderEmail}>`

  const mimeMessage = buildMimeMessage({
    to,
    from,
    subject,
    text,
    html,
  })

  const raw = encodeBase64Url(mimeMessage)

  const auth = createOAuth2Client()
  const gmail = google.gmail({ version: 'v1', auth })

  _log('info', 'dispatch_start', { recipient: Array.isArray(to) ? to[0] : to })

  const timeoutMs = requestTimeoutMs()

  try {
    const res = await gmail.users.messages.send(
      {
        userId: 'me',
        requestBody: { raw },
      },
      {
        timeout: timeoutMs,
      }
    )

    const durationMs = Date.now() - startedAt
    const messageId = res?.data?.id

    if (res?.status >= 200 && res?.status < 300) {
      _log('info', 'accepted', {
        messageId,
        durationMs,
      })
      return { ok: true, provider: 'gmail_api', messageId }
    }

    _log('warn', 'rejected', {
      status: res?.status,
      durationMs,
    })
    throw new Error(`Gmail API returned status ${res?.status}`)
  } catch (err) {
    const durationMs = Date.now() - startedAt

    // Timeout detection (Axios/Gaxios ECONNABORTED, ETIMEDOUT, or AbortError)
    const isTimeout =
      err.code === 'ECONNABORTED' ||
      err.code === 'ETIMEDOUT' ||
      err.name === 'AbortError' ||
      err.message?.toLowerCase().includes('timeout')

    if (isTimeout) {
      _log('warn', 'timeout', { timeoutMs, durationMs })
      const timeoutErr = new Error('Email delivery timed out; delivery status is uncertain.')
      timeoutErr.category = 'uncertain'
      timeoutErr.uncertain = true
      throw timeoutErr
    }

    // Google API HTTP status code classification
    const status = err.response?.status || err.status
    if (status === 401 || status === 403) {
      _log('error', 'auth_failure', { status, durationMs })
      throw new Error(`Gmail API authentication failed (${status}): check client credentials and refresh token.`)
    }

    if (status === 429) {
      _log('warn', 'rate_limit', { status, durationMs })
      throw new Error('Gmail API rate limit exceeded. Please retry after a brief delay.')
    }

    _log('error', 'dispatch_error', {
      errCode: err.code,
      status,
      durationMs,
    })
    throw new Error(err.message || 'Failed to dispatch email via Gmail API.')
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// sendOtpEmail
// Primary entrypoint for OTP delivery across registration, resend, and onboarding.
// Supports both signature styles:
//   - sendOtpEmail(to, name, otp)
//   - sendOtpEmail({ to, name, otp, expiresInMinutes })
// ─────────────────────────────────────────────────────────────────────────────
export async function sendOtpEmail(toOrOptions, maybeName, maybeOtp) {
  let to, name, otp, expiresInMinutes

  if (typeof toOrOptions === 'object' && toOrOptions !== null) {
    to = toOrOptions.to
    name = toOrOptions.name || 'Swish User'
    otp = toOrOptions.otp
    expiresInMinutes = toOrOptions.expiresInMinutes || process.env.OTP_EXPIRES_MINUTES || 10
  } else {
    to = toOrOptions
    name = maybeName || 'Swish User'
    otp = maybeOtp
    expiresInMinutes = process.env.OTP_EXPIRES_MINUTES || 10
  }

  if (!hasEmailProvider()) {
    if (process.env.NODE_ENV === 'production') {
      _log('error', 'production_no_email_provider')
      throw new Error('Email delivery service is unavailable. Please contact system administrator.')
    }
    // Development fallback: safe diagnostic log (raw OTP value redacted for security)
    console.log('\n📬  [DEV EMAIL — OTP not actually sent]')
    console.log(`  To:   ${to}`)
    console.log(`  Name: ${name}`)
    console.log(`  OTP:  [redacted — check MASTER_OTP or sendOtpEmail caller for local testing]`)
    console.log(`  (Expires in ${expiresInMinutes} minutes)\n`)
    return { ok: true, devMode: true }
  }

  const html = buildOtpHtml(name, otp, expiresInMinutes)
  const text = buildOtpText(name, otp, expiresInMinutes)

  return dispatchEmail({
    to,
    subject: `${otp} is your Swish verification code`,
    html,
    text,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// OTP Email Templates
// ─────────────────────────────────────────────────────────────────────────────
export function buildOtpHtml(name, otp, expiresMinutes) {
  const safeName = escapeHtml(name)

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Verify your Swish account</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#6366f1 0%,#8b5cf6 100%);padding:32px 40px;text-align:center;">
              <span style="font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">⚡ Swish</span>
              <p style="margin:6px 0 0;color:rgba(255,255,255,0.8);font-size:13px;">Campus Social Network</p>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#1e293b;">Verify your email address</h2>
              <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
                Hi ${safeName},<br/><br/>
                Use the verification code below to complete your registration.
              </p>

              <!-- OTP Box -->
              <div style="background:#f8fafc;border:2px dashed #cbd5e1;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                <span style="font-family:'Courier New',Courier,monospace;font-size:38px;font-weight:900;color:#4f46e5;letter-spacing:10px;display:inline-block;">
                  ${otp}
                </span>
                <p style="margin:12px 0 0;color:#94a3b8;font-size:13px;">
                  Expires in <strong>${expiresMinutes} minutes</strong>
                </p>
              </div>

              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                If you didn't create a Swish account, you can safely ignore this email.
                <strong>Do not share this code with anyone.</strong>
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:18px 40px;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">
                © ${new Date().getFullYear()} Swish Campus Network · Sent securely via Gmail API
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()
}

export function buildOtpText(name, otp, expiresMinutes) {
  return `
Hi ${name},

Your Swish verification code is: ${otp}

This code expires in ${expiresMinutes} minutes.

Do not share this code with anyone. If you did not create a Swish account, you can safely ignore this email.

— Swish Campus Network
  `.trim()
}

// ─────────────────────────────────────────────────────────────────────────────
// sendCollegeAdminCredentialsEmail
// Sends College Admin account credentials upon approval by Main Admin.
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCollegeAdminCredentialsEmail(
  to,
  name,
  collegeName,
  loginId,
  temporaryPassword
) {
  if (!hasEmailProvider()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email delivery service is unavailable. Please contact system administrator.')
    }
    console.log('\n📬 [DEV EMAIL — CREDENTIALS not actually sent]')
    console.log(`  To:                 ${to}`)
    console.log(`  Name:               ${name}`)
    console.log(`  College:            ${collegeName}`)
    console.log(`  Login ID:           ${loginId}`)
    console.log(`  Temporary Password: [redacted]`)
    console.log(`  First login:        Password change required\n`)
    return { ok: true, devMode: true }
  }

  const safeName = escapeHtml(name)
  const safeCollegeName = escapeHtml(collegeName)
  const safeLoginId = escapeHtml(loginId)

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Your Swish College Admin Account</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);padding:32px 40px;text-align:center;">
              <span style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px;">⚡ Swish</span>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Campus Social Network</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#1e293b;">College Registration Approved</h2>
              <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
                Hi <strong>${safeName}</strong>,<br/><br/>
                Your registration request for <strong>${safeCollegeName}</strong> has been approved. Below are your administrator login credentials:
              </p>
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:16px;padding:24px;margin-bottom:24px;">
                <p style="margin:0 0 8px;font-size:14px;color:#475569;"><strong>Login ID:</strong> <code>${safeLoginId}</code></p>
                <p style="margin:0;font-size:14px;color:#475569;"><strong>Temporary Password:</strong> <code>${temporaryPassword}</code></p>
              </div>
              <p style="margin:0;color:#ef4444;font-size:13px;line-height:1.6;">
                <strong>Important:</strong> You must change your temporary password upon your first login.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} Swish Campus Network</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const text = `
Hello ${name},

Your registration request for ${collegeName} has been approved by the Swish Administration.

Login ID: ${loginId}
Temporary Password: ${temporaryPassword}

IMPORTANT: You must change your password upon your first login.

Regards,
Swish Administration
  `.trim()

  return dispatchEmail({
    to,
    subject: `Welcome to SWISH — College Registration Approved`,
    html,
    text,
  })
}

// ─────────────────────────────────────────────────────────────────────────────
// sendCollegeRegistrationRejectedEmail
// Sends notification when a college onboarding request is rejected.
// ─────────────────────────────────────────────────────────────────────────────
export async function sendCollegeRegistrationRejectedEmail(
  to,
  name,
  collegeName,
  reason
) {
  if (!hasEmailProvider()) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('Email delivery service is unavailable. Please contact system administrator.')
    }
    console.log('\n📬 [DEV EMAIL — REJECTION not actually sent]')
    console.log(`  To:       ${to}`)
    console.log(`  Name:     ${name}`)
    console.log(`  College:  ${collegeName}`)
    console.log(`  Reason:   ${reason}\n`)
    return { ok: true, devMode: true }
  }

  const safeName = escapeHtml(name)
  const safeCollegeName = escapeHtml(collegeName)
  const safeReason = escapeHtml(reason)

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Swish College Registration Update</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:#334155;padding:32px 40px;text-align:center;">
              <span style="font-size:28px;font-weight:900;color:#fff;letter-spacing:-0.5px;">⚡ Swish</span>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">Campus Social Network</p>
            </td>
          </tr>
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 10px;font-size:22px;font-weight:700;color:#1e293b;">College Registration Update</h2>
              <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.6;">
                Hi <strong>${safeName}</strong>,<br/><br/>
                Thank you for your interest in joining Swish. After reviewing the registration request for
                <strong>${safeCollegeName}</strong>, the Swish Administration has decided not to approve the request at this time.
              </p>
              <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:16px;padding:24px;margin-bottom:24px;">
                <p style="margin:0 0 8px;color:#9a3412;font-size:12px;font-weight:700;text-transform:uppercase;">Reason for Rejection</p>
                <p style="margin:0;color:#7c2d12;font-size:14px;line-height:1.7;">${safeReason}</p>
              </div>
              <p style="margin:0;color:#64748b;font-size:13px;line-height:1.6;">
                If you believe this decision was made in error, please contact the Swish administration team.
              </p>
            </td>
          </tr>
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #f1f5f9;text-align:center;">
              <p style="margin:0;color:#94a3b8;font-size:12px;">© ${new Date().getFullYear()} Swish Campus Network</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim()

  const text = `
Hello ${name},

Thank you for your interest in joining Swish.
After reviewing the registration request for ${collegeName}, the Swish Administration has decided not to approve the request at this time.

Reason for rejection:
${reason}

If you believe this decision was made in error, please contact the Swish administration team.

Regards,
Swish Administration
  `.trim()

  return dispatchEmail({
    to,
    subject: `Update regarding your ${collegeName} registration request`,
    html,
    text,
  })
}