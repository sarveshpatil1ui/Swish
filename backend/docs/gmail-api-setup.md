# Swish — Gmail API OAuth 2.0 Email Delivery Setup Guide

This guide documents the setup, authorization, and deployment workflow for sending Swish transactional emails (account verification OTPs and administrator credentials) via the **Google Gmail REST API over HTTPS** using OAuth 2.0.

---

## Architecture Overview

```
┌─────────────────────────┐       ┌──────────────────────────┐       ┌───────────────────────┐       ┌─────────────────┐
│  Swish React Frontend   │ ───►  │  Express Backend API     │ ───►  │   Google Gmail API    │ ───►  │ Recipient Inbox │
│  (Vite / React Router)  │       │  (Node.js / googleapis)  │ HTTPS │  (users.messages.send)│       │  (@campus.edu)  │
└─────────────────────────┘       └──────────────────────────┘       └───────────────────────┘       └─────────────────┘
```

### Why Gmail API instead of SMTP or third-party providers?
- **No Outbound Port Restrictions:** Cloud hosting platforms (such as Render Free Web Services) block outbound TCP ports `25`, `465`, and `587`. The Gmail REST API communicates strictly over standard HTTPS (port `443`), bypassing all network filtering.
- **No Purchased Domain Requirement:** Uses a dedicated Gmail address (e.g. `swishh.project@gmail.com`) as the authorized sender identity, eliminating custom domain and DNS verification prerequisites.
- **Reliable Deliverability:** Direct delivery through Google infrastructure without third-party email service quotas, rate locks, or vendor lock-in.

---

## Step-by-Step Setup Instructions

### Step 1: Select or Create Google Cloud Project
1. Navigate to the [Google Cloud Console](https://console.cloud.google.com/).
2. Select your existing Google Cloud project or click **New Project** (e.g. `Swish-Campus-Network`).
3. Note the Project ID.

### Step 2: Enable the Gmail API
1. In the Google Cloud Console, open the navigation menu and go to **APIs & Services** → **Library**.
2. Search for **Gmail API**.
3. Click on **Gmail API** and click **Enable**.

### Step 3: Configure the OAuth Consent Screen
1. Go to **APIs & Services** → **OAuth consent screen**.
2. Choose **External** user type and click **Create**.
3. Fill in the required application information:
   - **App name:** `Swish Campus`
   - **User support email:** Your dedicated Gmail address (e.g. `swishh.project@gmail.com`).
   - **Developer contact information:** Your administrator email.
4. On the **Scopes** page, click **Add or Remove Scopes**:
   - Filter and select: `https://www.googleapis.com/auth/gmail.send`
   - Click **Update**.
5. On the **Test users** page:
   - Click **Add Users** and add your dedicated sender Gmail address (e.g. `swishh.project@gmail.com`).
6. Click **Save and Continue**.

### Step 4: OAuth 2.0 Client ID Credentials
*(If you already have a Web Application or Desktop Client ID created in Google Cloud Console, reuse its Client ID and Client Secret).*

If creating a new one:
1. Go to **APIs & Services** → **Credentials**.
2. Click **Create Credentials** → **OAuth client ID**.
3. Application Type:
   - Select **Web application** (recommended if using Google OAuth Playground).
   - Under **Authorized redirect URIs**, add:
     - `https://developers.google.com/oauthplayground` (for generating refresh tokens via OAuth Playground).
     - `http://localhost:3001/oauth2callback` (if using a local callback script).
4. Click **Create** and copy your **Client ID** and **Client Secret**.

### Step 5 & 6: Generate the OAuth 2.0 Refresh Token

#### Method A: Using Google OAuth 2.0 Playground (Fastest & Recommended)
1. Open the [Google OAuth 2.0 Playground](https://developers.google.com/oauthplayground).
2. Click the **Gear icon (OAuth 2.0 configuration)** in the top right:
   - Check **Use your own OAuth credentials**.
   - Enter your **OAuth Client ID**.
   - Enter your **OAuth Client Secret**.
3. In **Step 1 (Select & authorize APIs)** on the left panel:
   - Scroll down to **Gmail API v1**.
   - Check `https://www.googleapis.com/auth/gmail.send`.
   - Click **Authorize APIs**.
4. Log in using your dedicated Gmail account (the one designated as `GMAIL_SENDER_EMAIL`).
   - If prompted with "Google hasn't verified this app", click **Advanced** → **Go to Swish Campus (unsafe)** to grant permissions.
5. In **Step 2 (Exchange authorization code for tokens)**:
   - Click the blue button **Exchange authorization code for tokens**.
6. Copy the resulting **Refresh token** (starts with `1//...`).

---

## OAuth Production Warning: 7-Day Expiration in "Testing" Mode

> [!WARNING]
> **Testing Mode Expiration Limit:**
> Google Cloud projects with an OAuth consent screen set to **Testing** have refresh tokens that **expire after 7 days** if authorized by external users or if the project has not completed app verification.
>
> **For Long-Running Production Deployment:**
> 1. Set the OAuth consent screen publishing status to **In Production** once ready.
> 2. Because `gmail.send` is a restricted scope, Google may require security verification for wide public consumption, OR keep the app internal to a Google Workspace organization if applicable.
> 3. If testing in development/staging, be aware that you may need to re-generate the refresh token every 7 days until the app is published/verified.

---

## Step 7 & 8: Environment Configuration

Configure the 4 required variables in your local `.env` and in your hosting platform.

### Environment Variables Reference

| Variable | Required? | Example Value | Description |
| :--- | :--- | :--- | :--- |
| `GMAIL_CLIENT_ID` | **Yes** | `123456789-abc.apps.googleusercontent.com` | Google Cloud OAuth Client ID |
| `GMAIL_CLIENT_SECRET` | **Yes** | `GOCSPX-xxxxxxxxxxxxxxxx` | Google Cloud OAuth Client Secret |
| `GMAIL_REFRESH_TOKEN` | **Yes** | `1//0gxxxxxxxxxxxxxxxxxx` | Long-lived OAuth 2.0 Refresh Token |
| `GMAIL_SENDER_EMAIL` | **Yes** | `swishh.project@gmail.com` | The exact Gmail address that authorized the OAuth credentials |
| `GMAIL_SENDER_NAME` | Optional | `"Swish Campus"` | Display name shown in email recipient inboxes |
| `GMAIL_REQUEST_TIMEOUT_MS` | Optional | `12000` (12 seconds) | Request abort timeout for Gmail API calls |

### Local Development (`backend/.env`)
```env
GMAIL_CLIENT_ID=your-client-id.apps.googleusercontent.com
GMAIL_CLIENT_SECRET=GOCSPX-your-client-secret
GMAIL_REFRESH_TOKEN=1//0g-your-refresh-token
GMAIL_SENDER_EMAIL=swishh.project@gmail.com
GMAIL_SENDER_NAME="Swish Campus"
```

### Render Production Configuration
1. Open the [Render Dashboard](https://dashboard.render.com).
2. Select your **Swish Backend Web Service**.
3. In the left navigation, click **Environment**.
4. Remove any obsolete keys (`RESEND_API_KEY`, `BREVO_API_KEY`, `MAILGUN_API_KEY`, `SMTP_*`).
5. Add the 4 required Gmail API keys:
   - `GMAIL_CLIENT_ID`
   - `GMAIL_CLIENT_SECRET`
   - `GMAIL_REFRESH_TOKEN`
   - `GMAIL_SENDER_EMAIL`
6. Click **Save Changes**. Render will automatically trigger a zero-downtime redeploy.

---

## Step 9: Verification Checklist

- [ ] Gmail API enabled in Google Cloud project.
- [ ] OAuth consent screen configured with scope `https://www.googleapis.com/auth/gmail.send`.
- [ ] Dedicated Gmail account added as a Test User.
- [ ] OAuth 2.0 Client ID and Secret obtained.
- [ ] Refresh token successfully generated via OAuth exchange.
- [ ] `GMAIL_SENDER_EMAIL` matches the account that granted permissions.
- [ ] All 4 environment variables populated in Render.
- [ ] Automated tests pass (`npm test` in `backend`).
- [ ] Sent test OTP from registration flow and verified delivery in recipient inbox.
- [ ] Verified that Resend, Brevo, Mailgun, and SMTP are completely removed from the delivery path.
