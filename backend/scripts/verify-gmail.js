// backend/scripts/verify-gmail.js
// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic CLI tool to verify Gmail API OAuth 2.0 configuration and live dispatch.
// Usage: node scripts/verify-gmail.js [optional_test_recipient_email]
// ─────────────────────────────────────────────────────────────────────────────

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import { google } from 'googleapis'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const clientId = (process.env.GMAIL_CLIENT_ID || '').trim()
const clientSecret = (process.env.GMAIL_CLIENT_SECRET || '').trim()
const refreshToken = (process.env.GMAIL_REFRESH_TOKEN || '').trim()
const senderEmail = (process.env.GMAIL_SENDER_EMAIL || '').trim()

console.log('────────────────────────────────────────────────────────────')
console.log('🔍 Swish Gmail API OAuth 2.0 Diagnostic Tool')
console.log('────────────────────────────────────────────────────────────')
console.log(`• Sender Email:  ${senderEmail || '❌ Missing'}`)
console.log(`• Client ID:     ${clientId ? `${clientId.slice(0, 16)}...` : '❌ Missing'}`)
console.log(`• Client Secret: ${clientSecret ? 'Configured (masked)' : '❌ Missing'}`)
console.log(`• Refresh Token: ${refreshToken.startsWith('1//') ? 'Configured (1//...)' : '❌ Not configured or invalid'}`)
console.log('────────────────────────────────────────────────────────────')

if (!clientId || !clientSecret || !refreshToken || !senderEmail || refreshToken.startsWith('your-')) {
  console.error('\n❌ ERROR: Gmail credentials in backend/.env are incomplete or set to placeholders.')
  process.exit(1)
}

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret)
oauth2Client.setCredentials({ refresh_token: refreshToken })

console.log('\n[1/2] Testing OAuth 2.0 token exchange with Google...')
try {
  const tokenRes = await oauth2Client.getAccessToken()
  if (!tokenRes?.token) {
    throw new Error('Google did not return an access token.')
  }
  console.log('✅ OAuth 2.0 token exchange succeeded! Token generated.')
} catch (err) {
  console.error('\n❌ OAuth 2.0 Token Exchange Failed:')
  console.error('Error Code:', err.code || err.status || err.response?.status)
  console.error('Details:', err.response?.data || err.message)
  console.log('\nTroubleshooting:')
  console.log('1. Make sure the Refresh Token was generated using YOUR Client ID & Secret.')
  console.log('2. Check that your account is added to "Test users" in Google Cloud Console.')
  process.exit(1)
}

const testRecipient = process.argv[2] || senderEmail
console.log(`\n[2/2] Sending test email to: ${testRecipient}...`)

try {
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client })
  const senderName = process.env.GMAIL_SENDER_NAME || 'Swish Campus'
  const subject = 'Swish Gmail API Test Delivery'
  const body = `Hello from Swish!\n\nYour Gmail API OAuth 2.0 delivery is fully functional and ready to send live OTPs.\n\nSent at: ${new Date().toISOString()}`

  const rawMessage = [
    `From: "${senderName}" <${senderEmail}>`,
    `To: ${testRecipient}`,
    `Subject: =?utf-8?B?${Buffer.from(subject, 'utf-8').toString('base64')}?=`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    Buffer.from(body, 'utf-8').toString('base64'),
  ].join('\r\n')

  const encoded = Buffer.from(rawMessage, 'utf-8').toString('base64url')

  const res = await gmail.users.messages.send({
    userId: 'me',
    requestBody: { raw: encoded },
  })

  console.log(`\n🎉 SUCCESS! Test email dispatched successfully.`)
  console.log(`• Message ID: ${res.data.id}`)
  console.log(`• Check your inbox: ${testRecipient}\n`)
} catch (err) {
  console.error('\n❌ Failed to dispatch test email:')
  console.error(err.response?.data || err.message)
  process.exit(1)
}
