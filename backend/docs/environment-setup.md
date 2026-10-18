# Swish Backend — Environment Configuration Guide

This guide provides a comprehensive reference for configuring environment variables for the Swish backend in both local development and production (Render) environments.

---

## 1. Quick Start: Local Setup

In your terminal, navigate to the `backend/` directory:

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` in your editor. The default `.env` template is pre-populated with safe local development values:
- `PORT=3001`
- `NODE_ENV=development`
- `CLIENT_ORIGIN=http://localhost:5173`
- `MONGO_URI=mongodb://127.0.0.1:27017/swish`
- `MASTER_OTP=123456` (allows bypassing live email delivery in development)

---

## 2. Environment Variables Specification

### Core System Configuration (Required)

| Variable | Required? | Default / Example | Purpose & Source |
| :--- | :--- | :--- | :--- |
| `PORT` | Optional | `3001` | Local port number the HTTP server listens on. (Render sets this dynamically). |
| `NODE_ENV` | **Required** | `development` / `production` | Execution mode. Controls cookie security (`SameSite=None`, `Secure=true`), Master OTP gating, and error serialization. |
| `CLIENT_ORIGIN` | **Required** | `http://localhost:5173` | Comma-separated list of allowed frontend web app origins for CORS and Socket.IO. |
| `MONGO_URI` | **Required** | `mongodb://127.0.0.1:27017/swish` | MongoDB connection URI. In production, use MongoDB Atlas connection string. |
| `JWT_SECRET` | **Required** | *Random string (64+ chars)* | Secret key used for signing and verifying JSON Web Tokens. Generate with: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`. |
| `JWT_EXPIRES_IN` | Optional | `7d` | Lifetime of authentication sessions. |

---

### OTP & Authentication Security

| Variable | Required? | Default | Purpose & Source |
| :--- | :--- | :--- | :--- |
| `OTP_EXPIRES_MINUTES` | Optional | `10` | Lifetime in minutes before an OTP expires. |
| `OTP_MAX_ATTEMPTS` | Optional | `5` | Maximum failed verification attempts before an account/request is locked out. |
| `OTP_RESEND_COOLDOWN_S`| Optional | `60` | Cooldown period in seconds before a user can request another OTP code. |
| `MASTER_OTP` | Dev-only | `123456` | Static bypass code for local development. **Strictly blocked in production (`NODE_ENV=production`)**. |
| `ADMIN_PASSWORD` | Dev-only | `SwishAdmin@2026` | Default administrator login password in development environments. |

---

### Google Gmail API — OAuth 2.0 (Required for Live Email Delivery)

All transactional emails (OTPs, campus invites) are sent via Google Gmail REST API over HTTPS (`googleapis`).
See [gmail-api-setup.md](file:///c:/Users/Dhruv%20Nayak/Desktop/Coding/Ongoing%20project%20+%20Contributor/Swissh/backend/docs/gmail-api-setup.md) for full setup instructions.

| Variable | Required? | Format / Placeholder | Source |
| :--- | :--- | :--- | :--- |
| `GMAIL_CLIENT_ID` | **Prod Required** | `your-google-oauth-client-id` | Google Cloud Console → APIs & Services → Credentials. |
| `GMAIL_CLIENT_SECRET` | **Prod Required** | `your-google-oauth-client-secret` | Google Cloud Console → APIs & Services → Credentials. |
| `GMAIL_REFRESH_TOKEN` | **Prod Required** | `your-google-oauth-refresh-token` | Generated via Google OAuth 2.0 Playground. |
| `GMAIL_SENDER_EMAIL` | **Prod Required** | `your-dedicated-gmail-address` | The dedicated Gmail account that authorized the OAuth refresh token. |
| `GMAIL_SENDER_NAME` | Optional | `"Swish Campus"` | Display name shown in recipient inboxes. |
| `GMAIL_REQUEST_TIMEOUT_MS`| Optional | `12000` | Timeout in milliseconds before timing out Gmail API network calls. |

> [!NOTE]
> In local development (`NODE_ENV=development`), if Gmail API keys are left unconfigured, Swish logs simulated OTPs to the console rather than failing. In production (`NODE_ENV=production`), missing credentials throw a controlled error.

---

### Cloudinary Media Storage (Optional for Core Auth; Required for Media Uploads)

Used for uploading and hosting images for post attachments, stories, user avatars, and institution proof documents.

| Variable | Required? | Purpose & Source |
| :--- | :--- | :--- |
| `CLOUDINARY_CLOUD_NAME` | Optional* | Cloud name from Cloudinary Dashboard. (*Required for photo/media uploads). |
| `CLOUDINARY_API_KEY` | Optional* | API Key from Cloudinary Dashboard. |
| `CLOUDINARY_API_SECRET` | Optional* | API Secret from Cloudinary Dashboard. |
| `CLOUDINARY_POSTS_FOLDER` | Optional | Custom upload folder for posts (default: `swish/posts`). |
| `CLOUDINARY_STORIES_FOLDER`| Optional | Custom upload folder for stories (default: `swish/stories`). |
| `CLOUDINARY_AVATARS_FOLDER`| Optional | Custom upload folder for avatars (default: `swish/avatars`). |

---

### Third-Party Services NOT Used by Swish

The following services are **NOT** used by Swish and must not be configured:
- **Redis / BullMQ:** Real-time messaging and status updates run via in-memory Socket.IO directly on the HTTP server.
- **Razorpay / Stripe:** Swish does not currently process payments.
- **Resend / Brevo / Mailgun / Nodemailer SMTP:** Deprecated and removed in favor of Gmail API HTTPS REST.

---

## 3. Render Production Deployment Configuration

When deploying the Swish backend Web Service on Render:

1. Open the **Render Dashboard** → Select **Swish Backend Web Service**.
2. Go to **Environment** in the left sidebar.
3. Configure the following environment variables:
   ```env
   NODE_ENV=production
   CLIENT_ORIGIN=https://swishh-5b494.web.app,https://swishh-5b494.firebaseapp.com
   MONGO_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/swish?retryWrites=true&w=majority
   JWT_SECRET=<secure_random_string_min_64_chars>
   GMAIL_CLIENT_ID=<your_google_client_id>
   GMAIL_CLIENT_SECRET=<your_google_client_secret>
   GMAIL_REFRESH_TOKEN=<your_google_refresh_token>
   GMAIL_SENDER_EMAIL=<your_dedicated_gmail_address>
   GMAIL_SENDER_NAME="Swish Campus"
   CLOUDINARY_CLOUD_NAME=<your_cloud_name>
   CLOUDINARY_API_KEY=<your_api_key>
   CLOUDINARY_API_SECRET=<your_api_secret>
   ```
4. Save Changes. Render automatically triggers a zero-downtime redeploy.

---

## 4. Verification and Safe Testing

To test your configuration locally without leaking secrets:

```bash
# 1. Run all backend unit and security tests (runs completely in-memory with mocks)
cd backend
npm test

# 2. Check JavaScript syntax across all backend files
node --check src/index.js
```
