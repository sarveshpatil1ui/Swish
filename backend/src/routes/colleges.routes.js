// backend/src/routes/colleges.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// College management routes:
//
//   GET    /api/colleges                  List all colleges (public)
//   POST   /api/colleges                  Add a new college (admin only)
//   PATCH  /api/colleges/:id/toggle       Toggle active/inactive (admin only)
//   GET    /api/colleges/check-domain     Check if a domain is registered & active
//
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express'
import { body, query, validationResult } from 'express-validator'

import College from '../models/College.js'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireRole } from '../middleware/auth.middleware.js'

const router = Router()

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Sends a validation-errors 422 response. */
function handleValidationErrors(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({
      ok: false,
      error: errors.array()[0].msg,
      errors: errors.array(),
    })
  }
  return null
}

// ── GET /api/colleges ────────────────────────────────────────────────────────
// Public — returns all colleges (admin page lists them, signup uses for display)
router.get('/', async (_req, res) => {
  try {
    const colleges = await College.find().sort({ name: 1 })
    return res.status(200).json({ ok: true, colleges: colleges.map(c => c.toJSON()) })
  } catch (err) {
    console.error('[GET /colleges]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch colleges.' })
  }
})

// ── GET /api/colleges/check-domain ───────────────────────────────────────────
// Public — used by signup form to check if a domain is registered & active
router.get(
  '/check-domain',
  [
    query('domain')
      .trim()
      .notEmpty().withMessage('Domain query parameter is required.')
      .isLength({ min: 3 }).withMessage('Invalid domain.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const domain = req.query.domain.trim().toLowerCase()

      // Hardcoded admin bypass
      if (domain === 'swish.com') {
        return res.status(200).json({ ok: true, approved: true, college: 'Swish Admin' })
      }

      const college = await College.findOne({ domain, active: true })
      if (college) {
        return res.status(200).json({ ok: true, approved: true, college: college.name })
      }

      return res.status(200).json({ ok: true, approved: false })
    } catch (err) {
      console.error('[GET /colleges/check-domain]', err)
      res.status(500).json({ ok: false, error: 'Domain check failed.' })
    }
  }
)

// ── POST /api/colleges ───────────────────────────────────────────────────────
// Admin only — add a new college
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  [
    body('name').trim().notEmpty().withMessage('College name is required.'),
    body('code').trim().notEmpty().withMessage('College code is required.'),
    body('domain')
      .trim().notEmpty().withMessage('Email domain is required.')
      .isLength({ min: 3 }).withMessage('Domain too short.'),
    body('location').optional().trim(),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { name, code, domain, location } = req.body
      const normalizedDomain = domain.trim().toLowerCase()

      // Check for duplicate domain
      const existing = await College.findOne({ domain: normalizedDomain })
      if (existing) {
        return res.status(409).json({
          ok: false,
          error: `A college with domain "${normalizedDomain}" already exists.`,
        })
      }

      const college = await College.create({
        name:     name.trim(),
        code:     code.trim().toUpperCase(),
        domain:   normalizedDomain,
        location: (location || '').trim(),
        active:   true,
      })

      return res.status(201).json({ ok: true, college: college.toJSON() })
    } catch (err) {
      console.error('[POST /colleges]', err)
      res.status(500).json({ ok: false, error: 'Failed to add college.' })
    }
  }
)

// ── PATCH /api/colleges/:id/toggle ───────────────────────────────────────────
// Admin only — toggle active/inactive
router.patch(
  '/:id/toggle',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const college = await College.findById(req.params.id)
      if (!college) {
        return res.status(404).json({ ok: false, error: 'College not found.' })
      }

      college.active = !college.active
      await college.save()

      return res.status(200).json({ ok: true, college: college.toJSON() })
    } catch (err) {
      console.error('[PATCH /colleges/:id/toggle]', err)
      res.status(500).json({ ok: false, error: 'Failed to toggle college status.' })
    }
  }
)

export default router
