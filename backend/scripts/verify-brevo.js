// backend/scripts/verify-brevo.js
// ─────────────────────────────────────────────────────────────────────────────
// Diagnostic CLI tool to verify Brevo REST API configuration and live dispatch.
// Usage: node scripts/verify-brevo.js [optional_test_recipient_email]
// ─────────────────────────────────────────────────────────────────────────────

import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

dotenv.config({ path: path.resolve(__dirname, '../.env') })

const apiKey = (process.env.BREVO_API_KEY || '').trim()
const senderEmail = (process.env.BREVO_SENDER_EMAIL || process.env.GMAIL_SENDER_EMAIL || 'swishh.project@gmail.com').trim()
const senderName = (process.env.BREVO_SENDER_NAME || 'Swish Campus').trim()

console.log('────────────────────────────────────────────────────────────')
console.log('🔍 Swish Brevo Email Delivery Diagnostic Tool')
console.log('────────────────────────────────────────────────────────────')
console.log(`• Sender Email:  ${senderEmail}`)
console.log(`• Sender Name:   ${senderName}`)
console.log(`• API Key:       ${apiKey ? `${apiKey.slice(0, 14)}...` : '❌ Missing'}`)
console.log('────────────────────────────────────────────────────────────')

if (!apiKey || apiKey.startsWith('your-')) {
  console.error('\n❌ ERROR: BREVO_API_KEY in backend/.env is missing or set to a placeholder.')
  console.error('Add your Brevo API key to backend/.env: BREVO_API_KEY=xkeysib-...')
  process.exit(1)
}

const testRecipient = process.argv[2] || senderEmail
console.log(`\nDispatching test email to: ${testRecipient}...`)

try {
  const subject = 'Swish Brevo API Test Delivery'
  const htmlContent = `
    <div style="font-family: sans-serif; padding: 24px; max-width: 500px; margin: auto; border: 1px solid #e2e8f0; border-radius: 12px;">
      <h2 style="color: #4f46e5; margin-top: 0;">⚡ Swish — Brevo Active</h2>
      <p style="color: #334155; line-height: 1.6;">Hello!</p>
      <p style="color: #334155; line-height: 1.6;">
        Your Brevo email delivery is configured properly and ready to send verification OTPs.
      </p>
      <div style="background: #f8fafc; border-left: 4px solid #4f46e5; padding: 12px 16px; margin: 16px 0;">
        <strong style="color: #1e293b;">Timestamp:</strong> ${new Date().toISOString()}
      </div>
      <p style="color: #64748b; font-size: 13px;">This is an automated test from Swish backend.</p>
    </div>
  `.trim()

  const textContent = `Hello!\n\nYour Brevo email delivery is configured properly and ready to send verification OTPs.\n\nSent at: ${new Date().toISOString()}`

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      'accept': 'application/json',
      'api-key': apiKey,
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      sender: { name: senderName, email: senderEmail },
      to: [{ email: testRecipient }],
      subject,
      htmlContent,
      textContent,
    }),
  })

  const data = await res.json().catch(() => ({}))

  if (res.ok) {
    console.log(`\n🎉 SUCCESS! Test email dispatched successfully via Brevo.`)
    console.log(`• Message ID: ${data?.messageId || 'accepted'}`)
    console.log(`• Recipient:  ${testRecipient}`)
    console.log(`\nCheck your inbox (and spam/promotions folder) for the test email.\n`)
  } else {
    console.error(`\n❌ Failed to dispatch email (HTTP ${res.status}):`)
    console.error('Error Details:', data)
    if (res.status === 401 || res.status === 403) {
      console.log('\nTroubleshooting:')
      console.log('1. Verify that your BREVO_API_KEY is active and copied correctly from your Brevo dashboard.')
    } else if (res.status === 400 && data?.message?.toLowerCase().includes('sender')) {
      console.log('\nTroubleshooting:')
      console.log(`1. The sender email "${senderEmail}" must be added to your Brevo account.`)
      console.log('2. Go to Brevo Dashboard -> Senders, Domains & Dedicated IPs -> Senders.')
      console.log(`3. Click "Add a Sender" and enter ${senderEmail}. Check your inbox for Brevo\'s confirmation code.`)
    }
    process.exit(1)
  }
} catch (err) {
  console.error('\n❌ Request error:', err.message)
  process.exit(1)
}
