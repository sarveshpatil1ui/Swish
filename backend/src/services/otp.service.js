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

const BCRYPT_ROUNDS = 10
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
