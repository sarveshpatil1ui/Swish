import { verifyTurnstileToken } from '../services/turnstile.service.js'

/**
 * Express middleware to verify Cloudflare Turnstile CAPTCHA tokens.
 *
 * Checks `req.body['cf-turnstile-response']`, `req.body.turnstileToken`,
 * or `req.headers['x-turnstile-token']`.
 *
 * If CLOUDFLARE_TURNSTILE_SECRET_KEY is unset or NODE_ENV === 'test',
 * it automatically permits the request to pass.
 */
export async function requireTurnstile(req, res, next) {
  // Always skip if secret key is not set or in test environment
  if (!process.env.CLOUDFLARE_TURNSTILE_SECRET_KEY || process.env.NODE_ENV === 'test') {
    return next()
  }

  const token =
    req.body?.['cf-turnstile-response'] ||
    req.body?.turnstileToken ||
    req.headers['x-turnstile-token']

  const clientIp = req.ip || req.connection?.remoteAddress

  const result = await verifyTurnstileToken(token, clientIp)
  if (!result.success) {
    return res.status(400).json({
      ok: false,
      error: result.error || 'Captcha verification failed. Please try again.',
      captchaFailed: true,
    })
  }

  next()
}
