// backend/test/environment_security.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Production Security & Environment Hardening Regression Tests
// ─────────────────────────────────────────────────────────────────────────────

import { test, describe, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'

import { validateEnvironment } from '../src/config/env.js'
import { verifyOtp, hashOtp } from '../src/services/otp.service.js'
import { hasEmailProvider, sendOtpEmail } from '../src/services/email.service.js'
import { isCloudinaryConfigured, uploadPostImage } from '../src/services/cloudinary.service.js'

describe('Environment Security & Production Hardening', () => {
  const originalEnv = { ...process.env }

  beforeEach(() => {
    // Reset to clean test baseline
    process.env = { ...originalEnv }
  })

  afterEach(() => {
    process.env = { ...originalEnv }
  })

  // ── 1. Production Secret & JWT Validation ──────────────────────────────────
  test('validateEnvironment throws if JWT_SECRET is missing', () => {
    delete process.env.JWT_SECRET
    assert.throws(
      () => validateEnvironment({ ...process.env, JWT_SECRET: '' }),
      /Missing required environment variable: JWT_SECRET/
    )
  })

  test('validateEnvironment refuses short (<32 chars) JWT_SECRET in production', () => {
    const prodEnv = {
      NODE_ENV: 'production',
      MONGO_URI: 'mongodb://localhost:27017/swish',
      JWT_SECRET: 'short_secret_27_characters!',
    }
    assert.throws(
      () => validateEnvironment(prodEnv),
      /JWT_SECRET is too short for production/
    )
  })

  test('validateEnvironment refuses placeholder or template JWT_SECRET in production', () => {
    const prodEnv = {
      NODE_ENV: 'production',
      MONGO_URI: 'mongodb://localhost:27017/swish',
      JWT_SECRET: 'your-random-jwt-secret-at-least-64-characters-long',
    }
    assert.throws(
      () => validateEnvironment(prodEnv),
      /Insecure or placeholder JWT_SECRET detected in production/
    )

    const devPlaceholderEnv = {
      NODE_ENV: 'production',
      MONGO_URI: 'mongodb://localhost:27017/swish',
      JWT_SECRET: 'swish_local_dev_secret_change_me_to_at_least_64_characters_random_string_2026',
    }
    assert.throws(
      () => validateEnvironment(devPlaceholderEnv),
      /Insecure or placeholder JWT_SECRET detected in production/
    )
  })

  test('validateEnvironment accepts valid high-entropy JWT_SECRET in production', () => {
    const validProdEnv = {
      NODE_ENV: 'production',
      MONGO_URI: 'mongodb+srv://user:pass@cluster.mongodb.net/swish',
      JWT_SECRET: 'a98f12b7c6e4d5f30918273645e5d4c3b2a1908f7e6d5c4b3a291807f6e5d4c3',
    }
    assert.equal(validateEnvironment(validProdEnv), true)
  })

  test('validateEnvironment requires MONGO_URI in production', () => {
    const prodEnvWithoutDb = {
      NODE_ENV: 'production',
      MONGO_URI: '',
      JWT_SECRET: 'a98f12b7c6e4d5f30918273645e5d4c3b2a1908f7e6d5c4b3a291807f6e5d4c3',
    }
    assert.throws(
      () => validateEnvironment(prodEnvWithoutDb),
      /Missing required environment variable in production: MONGO_URI/
    )
  })

  // ── 2. Master OTP Production Hardening ─────────────────────────────────────
  test('MASTER_OTP is strictly ignored in production even when matched', async () => {
    process.env.NODE_ENV = 'production'
    process.env.MASTER_OTP = '654321'

    const realOtpHash = await hashOtp('111222')

    // Attacking with MASTER_OTP in production MUST fail
    const isMasterBypassed = await verifyOtp('654321', realOtpHash)
    assert.equal(isMasterBypassed, false, 'MASTER_OTP must never bypass in production')

    // Real OTP must still verify correctly
    const isRealValid = await verifyOtp('111222', realOtpHash)
    assert.equal(isRealValid, true, 'Real OTP hash verification must still function')
  })

  test('MASTER_OTP with whitespace or blank value never bypasses in development', async () => {
    process.env.NODE_ENV = 'development'
    process.env.MASTER_OTP = '   '

    const realOtpHash = await hashOtp('111222')
    assert.equal(await verifyOtp('   ', realOtpHash), false)
    assert.equal(await verifyOtp('', realOtpHash), false)
  })

  // ── 3. Gmail API Placeholder Detection & Safety ───────────────────────────
  test('hasEmailProvider returns false if placeholder values from .env.example are present', () => {
    process.env.GMAIL_CLIENT_ID = 'your-google-oauth-client-id'
    process.env.GMAIL_CLIENT_SECRET = 'your-google-oauth-client-secret'
    process.env.GMAIL_REFRESH_TOKEN = 'your-google-oauth-refresh-token'
    process.env.GMAIL_SENDER_EMAIL = 'your-dedicated-gmail-address'

    assert.equal(hasEmailProvider(), false, 'Template placeholders must not be recognized as active provider')
  })

  test('hasEmailProvider returns true only with non-placeholder credentials', () => {
    process.env.GMAIL_CLIENT_ID = '123456789.apps.googleusercontent.com'
    process.env.GMAIL_CLIENT_SECRET = 'GOCSPX-secret123'
    process.env.GMAIL_REFRESH_TOKEN = '1//0g-valid-token'
    process.env.GMAIL_SENDER_EMAIL = 'swish.auth@gmail.com'

    assert.equal(hasEmailProvider(), true)
  })

  test('sendOtpEmail throws controlled error in production if Gmail API is unconfigured', async () => {
    process.env.NODE_ENV = 'production'
    delete process.env.GMAIL_CLIENT_ID

    await assert.rejects(
      () => sendOtpEmail('user@campus.edu', 'User', '123456'),
      /Email delivery service is unavailable/
    )
  })

  // ── 4. Cloudinary Placeholder Detection ────────────────────────────────────
  test('isCloudinaryConfigured returns false when template placeholders are present', () => {
    process.env.CLOUDINARY_CLOUD_NAME = 'your-cloudinary-cloud-name'
    process.env.CLOUDINARY_API_KEY = 'your-cloudinary-api-key'
    process.env.CLOUDINARY_API_SECRET = 'your-cloudinary-api-secret'

    assert.equal(isCloudinaryConfigured(), false, 'Cloudinary placeholders must be detected as unconfigured')
  })

  test('uploadPostImage throws clear error without leaking credentials if Cloudinary is unconfigured', async () => {
    delete process.env.CLOUDINARY_CLOUD_NAME

    await assert.rejects(
      () => uploadPostImage(Buffer.from('fake-image-data')),
      /Cloudinary is not configured/
    )
  })
})
