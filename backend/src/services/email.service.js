// backend/src/services/email.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Sends transactional emails via Gmail SMTP (Nodemailer).
// In development, if SMTP credentials are not set, logs the OTP to console
// so you can test without configuring email.
// ─────────────────────────────────────────────────────────────────────────────
import nodemailer from 'nodemailer'

let _transporter = null

function getTransporter() {
  if (_transporter) return _transporter

  const isDev = process.env.NODE_ENV !== 'production'
  const hasCredentials = process.env.SMTP_USER && process.env.SMTP_PASS &&
    !process.env.SMTP_USER.includes('your-gmail')

  if (!hasCredentials) {
    // No credentials: use a no-op transporter that logs instead of sending
    if (isDev) {
      console.warn(
        '⚠️  [Email] SMTP credentials not set. Emails will be logged to console.\n' +
        '   Set SMTP_USER and SMTP_PASS in backend/.env to send real emails.'
      )
    }
    _transporter = null
    return null
  }

  _transporter = nodemailer.createTransport({
    host:   process.env.SMTP_HOST   || 'smtp.gmail.com',
    port:   Number(process.env.SMTP_PORT) || 587,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  })

  return _transporter
}

/**
 * Sends the OTP email.
 * If SMTP is not configured, logs the OTP to the console instead.
 *
 * @param {string} to    - recipient email address
 * @param {string} name  - recipient display name
 * @param {string} otp   - 6-digit plain-text OTP (before it's hashed in DB)
 */
export async function sendOtpEmail(to, name, otp) {
  const transporter = getTransporter()

  if (!transporter) {
    // Dev fallback — log to console
    console.log(`\n📬  [DEV EMAIL — OTP not actually sent]`)
    console.log(`  To:   ${to}`)
    console.log(`  Name: ${name}`)
    console.log(`  OTP:  ${otp}`)
    console.log(`  (Expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes)\n`)
    return
  }

  const from = process.env.EMAIL_FROM || '"Swish Campus 🎓" <noreply@swish.com>'

  const html = `
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
        <table width="520" cellpadding="0" cellspacing="0"
               style="background:#ffffff;border-radius:20px;overflow:hidden;
                      box-shadow:0 4px 24px rgba(0,0,0,0.08);">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5 0%,#7c3aed 100%);
                        padding:32px 40px;text-align:center;">
              <span style="font-size:28px;font-weight:900;color:#fff;
                           letter-spacing:-0.5px;">⚡ Swish</span>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.75);font-size:13px;">
                Campus Social Network
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h2 style="margin:0 0 8px;font-size:22px;font-weight:700;
                         color:#1e293b;letter-spacing:-0.3px;">
                Verify your email address
              </h2>
              <p style="margin:0 0 28px;color:#64748b;font-size:15px;line-height:1.6;">
                Hi <strong>${name}</strong>, welcome to Swish! 🎉<br/>
                Use the one-time code below to verify your campus email and
                activate your account.
              </p>

              <!-- OTP Box -->
              <div style="background:#f8fafc;border:2px dashed #e2e8f0;
                          border-radius:16px;padding:28px;text-align:center;
                          margin-bottom:28px;">
                <p style="margin:0 0 8px;color:#94a3b8;font-size:12px;
                           font-weight:600;text-transform:uppercase;letter-spacing:1px;">
                  Your verification code
                </p>
                <span style="font-size:42px;font-weight:900;letter-spacing:10px;
                             color:#4f46e5;font-family:'Courier New',monospace;">
                  ${otp}
                </span>
                <p style="margin:12px 0 0;color:#94a3b8;font-size:13px;">
                  Expires in <strong>${process.env.OTP_EXPIRES_MINUTES || 10} minutes</strong>
                </p>
              </div>

              <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.6;">
                If you didn't create a Swish account, you can safely ignore this email.
                Do not share this code with anyone.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #f1f5f9;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
                © ${new Date().getFullYear()} Swish Campus Network · For your campus only
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

  await transporter.sendMail({
    from,
    to,
    subject: `${otp} is your Swish verification code`,
    html,
    text: `Your Swish verification code is: ${otp}\nIt expires in ${process.env.OTP_EXPIRES_MINUTES || 10} minutes.`,
  })
}
