// backend/scripts/get-refresh-token.js
// ─────────────────────────────────────────────────────────────────────────────
// Interactive 1-click OAuth 2.0 Authorization Script for Desktop Client ID.
// Opens your browser, receives Google's authorization callback on a local loopback server,
// exchanges the authorization code for a Refresh Token, and updates backend/.env automatically.
// ─────────────────────────────────────────────────────────────────────────────

import http from 'http'
import { exec } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import dotenv from 'dotenv'
import { google } from 'googleapis'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const envPath = path.resolve(__dirname, '../.env')
dotenv.config({ path: envPath })

const clientId = (process.env.GMAIL_CLIENT_ID || '').trim()
const clientSecret = (process.env.GMAIL_CLIENT_SECRET || '').trim()
const senderEmail = (process.env.GMAIL_SENDER_EMAIL || '').trim()

if (!clientId || !clientSecret) {
  console.error('❌ GMAIL_CLIENT_ID or GMAIL_CLIENT_SECRET missing in backend/.env.')
  process.exit(1)
}

const PORT = 8989
const REDIRECT_URI = `http://127.0.0.1:${PORT}`

const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: ['https://www.googleapis.com/auth/gmail.send'],
})

console.log('────────────────────────────────────────────────────────────')
console.log('🚀 Swish Gmail API Desktop OAuth 2.0 Token Authorizer')
console.log('────────────────────────────────────────────────────────────')
console.log('• Client ID:    ', `${clientId.slice(0, 20)}...`)
console.log('• Redirect URI: ', REDIRECT_URI)
console.log('• Sender Email: ', senderEmail || '(from .env)')
console.log('────────────────────────────────────────────────────────────\n')
console.log('Opening your browser to authorize access with Google...')
console.log('If your browser does not open automatically, open this URL:\n')
console.log(authUrl)
console.log('\nWaiting for authorization in browser...\n')

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url, REDIRECT_URI)
    const code = urlObj.searchParams.get('code')
    const error = urlObj.searchParams.get('error')

    if (error) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(`
        <div style="font-family:sans-serif;padding:40px;text-align:center;">
          <h2 style="color:#ef4444;">Authorization Denied or Failed</h2>
          <p>${error}</p>
          <p>Please check your terminal for more details.</p>
        </div>
      `)
      console.error('\n❌ Google returned error:', error)
      setTimeout(() => process.exit(1), 1000)
      return
    }

    if (code) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' })
      res.end(`
        <div style="font-family:sans-serif;padding:40px;text-align:center;">
          <h2 style="color:#10b981;">🎉 Authorization Successful!</h2>
          <p>Google OAuth credentials received and saved.</p>
          <p>You can close this tab and return to your terminal.</p>
        </div>
      `)

      console.log('✅ Authorization code received from Google!')
      console.log('Exchanging code for permanent Refresh Token...')

      const { tokens } = await oauth2Client.getToken(code)
      const refreshToken = tokens.refresh_token

      if (!refreshToken) {
        console.error('⚠️ Google did not return a refresh token. Make sure to revoke prior access or use prompt: consent.')
        setTimeout(() => process.exit(1), 1000)
        return
      }

      console.log('✅ Refresh Token acquired successfully!')

      // Update backend/.env
      let envContent = fs.readFileSync(envPath, 'utf8')
      if (envContent.includes('GMAIL_REFRESH_TOKEN=')) {
        envContent = envContent.replace(
          /GMAIL_REFRESH_TOKEN=.*/,
          `GMAIL_REFRESH_TOKEN=${refreshToken}`
        )
      } else {
        envContent += `\nGMAIL_REFRESH_TOKEN=${refreshToken}\n`
      }
      fs.writeFileSync(envPath, envContent, 'utf8')

      console.log('✅ backend/.env updated with new GMAIL_REFRESH_TOKEN!')
      console.log('────────────────────────────────────────────────────────────')
      console.log('🎉 Gmail API email delivery is now fully configured and active!')
      console.log('You can now restart your backend server with `npm run dev` and send real OTPs.')
      console.log('────────────────────────────────────────────────────────────')

      setTimeout(() => {
        server.close()
        process.exit(0)
      }, 1500)
    }
  } catch (err) {
    console.error('\n❌ Error exchanging authorization code:', err.message)
    setTimeout(() => process.exit(1), 1000)
  }
})

server.listen(PORT, '127.0.0.1', () => {
  // Automatically open browser on Windows
  exec(`start "" "${authUrl}"`, (err) => {
    if (err) {
      console.log('(Could not open browser automatically, please copy and paste the URL above)')
    }
  })
})
