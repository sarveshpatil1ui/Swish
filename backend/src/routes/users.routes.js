import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import User from '../models/User.js'

const router = Router()

// ── GET /api/users ────────────────────────────────────────────────────────────
// Fetch all users. Restricted to admins and faculty.
router.get('/', requireAuth, requireRole('admin', 'faculty'), async (req, res) => {
  try {
    const users = await User.find({}).sort({ createdAt: -1 })
    res.json({ ok: true, users })
  } catch (err) {
    console.error('[GET /api/users] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch users.' })
  }
})

// ── PATCH /api/users/:id/status ───────────────────────────────────────────────
// Toggle suspended status. Restricted to admins and faculty.
router.patch('/:id/status', requireAuth, requireRole('admin', 'faculty'), async (req, res) => {
  try {
    const { id } = req.params
    
    // Prevent self-suspension
    if (id === req.user.id) {
      return res.status(403).json({ ok: false, error: 'You cannot suspend your own account.' })
    }

    const targetUser = await User.findById(id)
    if (!targetUser) {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }

    // Faculty cannot suspend other faculty or admins
    if (req.user.role === 'faculty' && targetUser.role !== 'student') {
      return res.status(403).json({ ok: false, error: 'Faculty can only manage student accounts.' })
    }

    // Admin cannot suspend other admins (optional rule, but good practice)
    if (req.user.role === 'admin' && targetUser.role === 'admin') {
      return res.status(403).json({ ok: false, error: 'Admins cannot suspend other admins.' })
    }

    // Toggle suspended state
    targetUser.suspended = !targetUser.suspended
    await targetUser.save()

    res.json({ ok: true, user: targetUser })
  } catch (err) {
    console.error('[PATCH /api/users/:id/status] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to update user status.' })
  }
})

export default router
