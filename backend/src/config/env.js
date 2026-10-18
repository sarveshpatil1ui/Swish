// backend/src/config/env.js
// ─────────────────────────────────────────────────────────────────────────────
// Production environment validation & security enforcement
// ─────────────────────────────────────────────────────────────────────────────

const KNOWN_PLACEHOLDER_SECRETS = new Set([
  'your-random-jwt-secret-at-least-64-characters-long',
  'replace_with_a_long_random_secret_at_least_64_chars',
  'swish_local_dev_secret_change_me_to_at_least_64_characters_random_string_2026',
  'secret',
  'jwt_secret',
  'changeme',
  'admin',
  '123456',
  'password',
])

export function validateEnvironment(env = process.env) {
  const isProd = env.NODE_ENV === 'production'
  const errors = []

  // 1. JWT_SECRET validation
  const jwtSecret = env.JWT_SECRET ? env.JWT_SECRET.trim() : ''
  if (!jwtSecret) {
    errors.push('Missing required environment variable: JWT_SECRET.')
  } else if (isProd) {
    if (jwtSecret.length < 32) {
      errors.push('JWT_SECRET is too short for production (minimum 32 characters required).')
    }
    const lowerSecret = jwtSecret.toLowerCase()
    if (
      KNOWN_PLACEHOLDER_SECRETS.has(lowerSecret) ||
      lowerSecret.includes('change_me') ||
      lowerSecret.includes('your-random') ||
      lowerSecret.includes('replace_with')
    ) {
      errors.push('Insecure or placeholder JWT_SECRET detected in production. You must configure a secure, unique production secret.')
    }
  }

  // 2. MONGO_URI validation in production
  const mongoUri = env.MONGO_URI ? env.MONGO_URI.trim() : ''
  if (isProd && !mongoUri) {
    errors.push('Missing required environment variable in production: MONGO_URI.')
  }

  // 3. Security logs for development overrides that are ignored in production
  if (isProd) {
    if (env.MASTER_OTP && env.MASTER_OTP.trim()) {
      console.warn('[SECURITY] MASTER_OTP is present in production environment. Master OTP bypass is strictly disabled in production.')
    }
    if (env.ADMIN_PASSWORD && env.ADMIN_PASSWORD.trim()) {
      console.warn('[SECURITY] ADMIN_PASSWORD override is present in production environment. Admin development override is disabled in production.')
    }
  }

  if (errors.length > 0) {
    const errorMsg = `[Environment Configuration Error]\n${errors.map(e => `  • ${e}`).join('\n')}`
    throw new Error(errorMsg)
  }

  return true
}
