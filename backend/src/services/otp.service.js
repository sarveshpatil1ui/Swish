// backend/src/services/otp.service.js
// ─────────────────────────────────────────────────────────────────────────────
// OTP generation and verification helpers.
//
// Security choices:
//   • OTP is 6 cryptographically random digits (crypto.randomInt)
//   • The plain-text OTP is ONLY returned once (to be emailed)
//   • Stored as a bcrypt hash → DB dump doesn't reveal the OTP
//   • Expiry enforced server-side by otpExpiresAt
//   • Attempt counter (otpAttempts) prevents brute-force guessing
// ─────────────────────────────────────────────────────────────────────────────
import { randomInt } from 'crypto'
import bcrypt from 'bcryptjs'

const BCRYPT_ROUNDS = 8  // OTP only: short-lived (10min) + attempt-limited (5 max) — 8 rounds is sufficient
const OTP_LENGTH = 6

/**
 * Generates a cryptographically secure 6-digit OTP.
 * Returns the plain-text OTP string (e.g. "047291").
 */
export function generateOtp() {
  // randomInt(min, max) — max is exclusive, so 999999+1 = 1000000
  const n = randomInt(0, 10 ** OTP_LENGTH)
  return String(n).padStart(OTP_LENGTH, '0')
}

/**
 * Hashes an OTP for storage. bcrypt is used so a DB dump
 * doesn't expose a guessable short secret.
 * @param {string} otp plain-text OTP
 * @returns {Promise<string>} bcrypt hash
 */
export async function hashOtp(otp) {
  return bcrypt.hash(otp, BCRYPT_ROUNDS)
}

/**
 * Verifies a plain-text OTP against its stored hash.
 * @param {string} otp     plain-text OTP from the user's input
 * @param {string} storedHash bcrypt hash from the DB
 * @returns {Promise<boolean>}
 */
export async function verifyOtp(otp, storedHash) {
  if (!otp || !storedHash) return false

  // Master OTP is strictly disallowed in production under all circumstances
  const isProduction = process.env.NODE_ENV === 'production'
  const masterOtp = (process.env.MASTER_OTP || '').trim()
  if (!isProduction && masterOtp && otp === masterOtp) {
    return true
  }

  return bcrypt.compare(otp, storedHash)
}

/**
 * Computes the OTP expiry Date from now.
 * @returns {Date}
 */
export function otpExpiresAt() {
  const minutes = Number(process.env.OTP_EXPIRES_MINUTES) || 10
  return new Date(Date.now() + minutes * 60 * 1000)
}

/**
 * Checks whether an OTP resend request is currently on cooldown.
 * Rejects if the previous OTP was issued less than OTP_RESEND_COOLDOWN_S seconds ago.
 * @param {object} user - User document or object with otpExpiresAt
 * @returns {boolean}
 */
export function isOtpResendOnCooldown(user) {
  if (!user || !user.otpExpiresAt) return false
  const cooldownSeconds = Number(process.env.OTP_RESEND_COOLDOWN_S) || 60
  const expiresMinutes = Number(process.env.OTP_EXPIRES_MINUTES) || 10
  const issuedAt = new Date(new Date(user.otpExpiresAt).getTime() - expiresMinutes * 60 * 1000)
  const secondsSinceIssued = (Date.now() - issuedAt.getTime()) / 1000
  return secondsSinceIssued < cooldownSeconds
}
