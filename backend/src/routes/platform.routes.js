// backend/src/routes/platform.routes.js
import { Router } from 'express'
import {
  getPlatformConfig,
  setMaintenanceMode,
  setFeatureFlags,
  setBroadcastBanner,
} from '../services/platform-config.service.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

const router = Router()

// ── GET /api/platform/config ──────────────────────────────────────────────────
// Public configuration endpoint (read-only for all visitors & clients)
router.get('/config', async (_req, res) => {
  try {
    const config = await getPlatformConfig()
    return res.status(200).json({
      ok: true,
      config: {
        maintenance: {
          enabled: Boolean(config.maintenance?.enabled),
          note: config.maintenance?.note || '',
          expectedBack: config.maintenance?.expectedBack || '',
          updatedAt: config.maintenance?.updatedAt || null,
        },
        features: {
          allowRegistration: config.features?.allowRegistration !== false,
          allowPostCreation: config.features?.allowPostCreation !== false,
          allowDirectMessaging: config.features?.allowDirectMessaging !== false,
        },
        broadcast: {
          active: Boolean(config.broadcast?.active),
          title: config.broadcast?.title || '',
          message: config.broadcast?.message || '',
          type: config.broadcast?.type || 'info',
          link: config.broadcast?.link || '',
          dismissible: config.broadcast?.dismissible !== false,
          updatedAt: config.broadcast?.updatedAt || null,
        },
      },
    })
  } catch (err) {
    console.error('[GET /api/platform/config]', err)
    return res.status(500).json({ ok: false, error: 'Failed to retrieve platform configuration.' })
  }
})

// ── ADMIN PROTECTED ENDPOINTS ─────────────────────────────────────────────────

// GET /api/platform/admin/config - Detailed platform config for Main Admin
router.get(
  '/admin/config',
  requireAuth,
  requireRole('admin'),
  async (_req, res) => {
    try {
      const config = await getPlatformConfig(true)
      return res.status(200).json({ ok: true, config })
    } catch (err) {
      console.error('[GET /api/platform/admin/config]', err)
      return res.status(500).json({ ok: false, error: 'Failed to load configuration.' })
    }
  }
)

// PATCH /api/platform/admin/maintenance - Toggle maintenance mode with note and uptime
router.patch(
  '/admin/maintenance',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { enabled, note, expectedBack } = req.body || {}
      if (typeof enabled !== 'boolean') {
        return res.status(400).json({ ok: false, error: 'The enabled boolean field is required.' })
      }

      const updated = await setMaintenanceMode(
        { enabled, note, expectedBack },
        req.user
      )

      return res.status(200).json({
        ok: true,
        message: enabled
          ? 'Platform Maintenance Mode is now ACTIVE. Regular users will see the maintenance screen.'
          : 'Platform Maintenance Mode has been DEACTIVATED. Platform returned to normal.',
        config: updated,
      })
    } catch (err) {
      console.error('[PATCH /api/platform/admin/maintenance]', err)
      return res.status(500).json({ ok: false, error: err?.message || 'Failed to update maintenance mode.' })
    }
  }
)

// PATCH /api/platform/admin/features - Update feature flags
router.patch(
  '/admin/features',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { features } = req.body || {}
      if (!features || typeof features !== 'object') {
        return res.status(400).json({ ok: false, error: 'Features object is required.' })
      }

      const updated = await setFeatureFlags(features)
      return res.status(200).json({
        ok: true,
        message: 'Platform feature flags updated successfully.',
        config: updated,
      })
    } catch (err) {
      console.error('[PATCH /api/platform/admin/features]', err)
      return res.status(500).json({ ok: false, error: err?.message || 'Failed to update feature flags.' })
    }
  }
)

// PATCH /api/platform/admin/broadcast - Update global broadcast banner
router.patch(
  '/admin/broadcast',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { broadcast } = req.body || {}
      if (!broadcast || typeof broadcast !== 'object') {
        return res.status(400).json({ ok: false, error: 'Broadcast object is required.' })
      }

      const updated = await setBroadcastBanner(broadcast)
      return res.status(200).json({
        ok: true,
        message: broadcast.active
          ? 'Global broadcast banner is now active and visible to all users.'
          : 'Global broadcast banner has been deactivated.',
        config: updated,
      })
    } catch (err) {
      console.error('[PATCH /api/platform/admin/broadcast]', err)
      return res.status(500).json({ ok: false, error: err?.message || 'Failed to update broadcast banner.' })
    }
  }
)

export default router

