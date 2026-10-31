# Swish — Brevo REST API Email Delivery Setup Guide

This guide documents the setup and deployment workflow for sending Swish transactional emails (account verification OTPs, password reset codes, and admin notifications) using the **Brevo (formerly Sendinblue) REST API over HTTPS**.

---

## Why Brevo for Swish?

| Feature | Brevo | Google OAuth 2.0 |
| :--- | :--- | :--- |
| **Token Expiration** | **Never (Static API Key)** | Expires every 7 days without custom domain |
| **Custom Domain Required?** | **No** (any verified sender email works) | Yes (for Production OAuth status) |
| **Outbound Port Filtering** | **Bypassed** (Uses HTTPS port 443) | Bypassed (HTTPS port 443) |
| **Free Tier Quota** | **300 emails per day** | 500 emails per day |
| **Works on Render Free Tier?** | **Yes** | Yes |

---

## 3-Minute Setup Instructions

### Step 1: Create a Free Brevo Account
1. Go to [Brevo](https://www.brevo.com/) and click **Sign Up Free**.
2. Complete the initial registration (free plan, no credit card required).

---

### Step 2: Add and Verify Your Sender Email
1. In your Brevo dashboard, click your profile name in the top-right corner.
2. Go to **Senders, Domains & Dedicated IPs** → **Senders** (or visit [app.brevo.com/senders](https://app.brevo.com/senders)).
3. Click **Add a Sender**.
4. Enter:
   - **From Name:** `Swish Campus`
   - **From Email:** `swishh.project@gmail.com` (or your dedicated Gmail address).
5. Brevo will send a 6-digit verification code to that inbox. Enter the code to verify.

---

### Step 3: Generate Your API Key
1. In the top-right menu, select **SMTP & API** (or visit [app.brevo.com/settings/keys/api](https://app.brevo.com/settings/keys/api)).
2. Under the **API Keys** tab, click **Generate a new API key**.
3. Name it `Swish-Backend` and click **Generate**.
4. Copy the key (starts with `xkeysib-...`).

---

### Step 4: Configure Environment Variables

#### Local Development (`backend/.env`)
```env
BREVO_API_KEY=xkeysib-your-copied-api-key-here
BREVO_SENDER_EMAIL=swishh.project@gmail.com
BREVO_SENDER_NAME="Swish Campus"
```

#### Render Production Deployment
1. Open the [Render Dashboard](https://dashboard.render.com).
2. Select your **Swish Web Service** (`swish1`).
3. Click **Environment** in the left menu.
4. Add the environment variable:
   - Key: `BREVO_API_KEY`
   - Value: `xkeysib-your-copied-api-key-here`
5. (Optional) Add `BREVO_SENDER_EMAIL` and `BREVO_SENDER_NAME`.
6. Click **Save Changes**. Render will redeploy automatically with zero downtime.

---

### Step 5: Verify Live Email Delivery

Test your configuration by running the built-in diagnostic tool from `backend/`:

```powershell
node scripts/verify-brevo.js your-personal-email@gmail.com
```

Expected output:
```text
🎉 SUCCESS! Test email dispatched successfully via Brevo.
• Message ID: <...>
• Recipient: your-personal-email@gmail.com
```
