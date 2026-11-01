// backend/src/routes/broadcasts.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// Broadcast messaging routes for College Admin module
//
// College Admin can send broadcast messages to users in their college
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express'
import { body, validationResult } from 'express-validator'

import Broadcast from '../models/Broadcast.js'
import User from '../models/User.js'
import College from '../models/College.js'
import Notification from '../models/Notification.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import { emitToUser } from '../services/socket.service.js'
import { createNotification } from '../services/notification.service.js'
import { logActivity } from '../services/activity-log.service.js'

const router = Router()

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

// ── GET /api/broadcasts ───────────────────────────────────────────────────────
// List broadcasts with pagination and filtering
router.get('/', requireAuth, requireRole('admin', 'college_admin'), async (req, res) => {
  try {
    const collegeId = req.user.collegeId
    if (!collegeId && req.user.role === 'college_admin') {
      return res.status(403).json({ ok: false, error: 'College admin has no associated college.' })
    }

    const targetCollegeId = req.user.role === 'admin' ? (req.query.collegeId || collegeId) : collegeId
    if (!targetCollegeId) {
      return res.status(400).json({ ok: false, error: 'College ID is required.' })
    }

    const { status, targetAudience, limit = 50, skip = 0 } = req.query

    const filter = { collegeId: targetCollegeId }
    if (status) filter.status = status
    if (targetAudience) filter.targetAudience = targetAudience

    const broadcasts = await Broadcast.find(filter)
      .populate('sentBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean()

    const total = await Broadcast.countDocuments(filter)

    res.json({
      ok: true,
      broadcasts: broadcasts.map(b => ({
        ...b,
        id: b._id.toString()
      })),
      total,
      limit: Number(limit),
      skip: Number(skip)
    })
  } catch (err) {
    console.error('[GET /api/broadcasts] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch broadcasts.' })
  }
})

// ── POST /api/broadcasts ────────────────────────────────────────────────────────
// Create a new broadcast
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'college_admin'),
  [
    body('title').trim().notEmpty().withMessage('Title is required.'),
    body('message').trim().notEmpty().withMessage('Message is required.'),
    body('targetAudience').isIn(['all', 'students', 'faculty', 'college_admin']).withMessage('Invalid target audience.'),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority.'),
    body('deliveryMethod').optional().isIn(['in_app', 'email', 'both']).withMessage('Invalid delivery method.'),
    body('scheduledFor').optional().isISO8601().withMessage('Invalid schedule date.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { title, message, targetAudience, priority, deliveryMethod, scheduledFor, expiresAt } = req.body

      const collegeId = req.user.collegeId
      if (!collegeId && req.user.role === 'college_admin') {
        return res.status(403).json({ ok: false, error: 'College admin has no associated college.' })
      }

      const targetCollegeId = req.user.role === 'admin' ? (req.body.collegeId || collegeId) : collegeId
      if (!targetCollegeId) {
        return res.status(400).json({ ok: false, error: 'College ID is required.' })
      }

      const college = await College.findById(targetCollegeId)
      if (!college) {
        return res.status(404).json({ ok: false, error: 'College not found.' })
      }

      // Validate scheduled date is in the future
      if (scheduledFor) {
        const scheduleDate = new Date(scheduledFor)
        if (scheduleDate <= new Date()) {
          return res.status(400).json({ ok: false, error: 'Scheduled date must be in the future.' })
        }
      }

      // Validate expiresAt is in the future if provided
      if (expiresAt) {
        const expiryDate = new Date(expiresAt)
        if (expiryDate <= new Date()) {
          return res.status(400).json({ ok: false, error: 'Expiration date must be in the future.' })
        }
      }

      // Count recipients
      const recipientFilter = { collegeId: targetCollegeId, deactivated: false }
      if (targetAudience !== 'all') {
        recipientFilter.role = targetAudience
      }
      const totalRecipients = await User.countDocuments(recipientFilter)

      const status = scheduledFor ? 'scheduled' : 'draft'

      const broadcast = await Broadcast.create({
        collegeId: targetCollegeId,
        college: college.name,
        sentBy: req.user._id,
        sentByName: req.user.name,
        sentByRole: req.user.role,
        title: title.trim(),
        message: message.trim(),
        targetAudience,
        priority: priority || 'medium',
        deliveryMethod: deliveryMethod || 'in_app',
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        sentAt: !scheduledFor ? new Date() : null,
        status: !scheduledFor ? 'sent' : status,
        totalRecipients,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      })

      // If immediate broadcast, send notifications
      if (!scheduledFor) {
        await sendBroadcastNotifications(broadcast, targetCollegeId, targetAudience)
      }

      // Log the action
      await logActivity({
        adminId: req.user._id,
        adminName: req.user.name,
        adminRole: req.user.role,
        collegeId: targetCollegeId,
        college: college.name,
        actionType: scheduledFor ? 'broadcast_scheduled' : 'broadcast_sent',
        resourceType: 'broadcast',
        resourceId: broadcast._id,
        resourceName: title,
        details: `${scheduledFor ? 'Scheduled' : 'Sent'} broadcast to ${targetAudience} (${totalRecipients} recipients)`,
        ipAddress: req.ip,
      })

      res.status(201).json({
        ok: true,
        broadcast: broadcast.toJSON()
      })
    } catch (err) {
      console.error('[POST /api/broadcasts] Error:', err)
      res.status(500).json({ ok: false, error: 'Failed to create broadcast.' })
    }
  }
)

// ── POST /api/broadcasts/:id/send ──────────────────────────────────────────────
// Send a scheduled/draft broadcast
router.post('/:id/send', requireAuth, requireRole('admin', 'college_admin'), async (req, res) => {
  try {
    const collegeId = req.user.collegeId
    if (!collegeId && req.user.role === 'college_admin') {
      return res.status(403).json({ ok: false, error: 'College admin has no associated college.' })
    }

    const targetCollegeId = req.user.role === 'admin' ? collegeId : collegeId

    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, collegeId: targetCollegeId }

    const broadcast = await Broadcast.findOne(filter)
    if (!broadcast) {
      return res.status(404).json({ ok: false, error: 'Broadcast not found.' })
    }

    if (broadcast.status === 'sent') {
      return res.status(400).json({ ok: false, error: 'Broadcast has already been sent.' })
    }

    if (broadcast.status === 'cancelled') {
      return res.status(400).json({ ok: false, error: 'Broadcast has been cancelled.' })
    }

    // Update broadcast status
    broadcast.status = 'sent'
    broadcast.sentAt = new Date()

    await broadcast.save()

    // Send notifications
    await sendBroadcastNotifications(broadcast, targetCollegeId, broadcast.targetAudience)

    // Log the action
    await logActivity({
      adminId: req.user._id,
      adminName: req.user.name,
      adminRole: req.user.role,
      collegeId: targetCollegeId,
      college: broadcast.college,
      actionType: 'broadcast_sent',
      resourceType: 'broadcast',
      resourceId: broadcast._id,
      resourceName: broadcast.title,
      details: `Sent broadcast to ${broadcast.targetAudience} (${broadcast.totalRecipients} recipients)`,
      ipAddress: req.ip,
    })

    res.json({ ok: true, broadcast: broadcast.toJSON() })
  } catch (err) {
    console.error('[POST /api/broadcasts/:id/send] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to send broadcast.' })
  }
})

// ── PATCH /api/broadcasts/:id/cancel ────────────────────────────────────────────
// Cancel a scheduled broadcast
router.patch('/:id/cancel', requireAuth, requireRole('admin', 'college_admin'), async (req, res) => {
  try {
    const collegeId = req.user.collegeId
    if (!collegeId && req.user.role === 'college_admin') {
      return res.status(403).json({ ok: false, error: 'College admin has no associated college.' })
    }

    const targetCollegeId = req.user.role === 'admin' ? collegeId : collegeId

    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, collegeId: targetCollegeId }

    const broadcast = await Broadcast.findOne(filter)
    if (!broadcast) {
      return res.status(404).json({ ok: false, error: 'Broadcast not found.' })
    }

    if (broadcast.status === 'sent') {
      return res.status(400).json({ ok: false, error: 'Cannot cancel a sent broadcast.' })
    }

    if (broadcast.status === 'cancelled') {
      return res.status(400).json({ ok: false, error: 'Broadcast is already cancelled.' })
    }

    broadcast.status = 'cancelled'
    await broadcast.save()

    // Log the action
    await logActivity({
      adminId: req.user._id,
      adminName: req.user.name,
      adminRole: req.user.role,
      collegeId: targetCollegeId,
      college: broadcast.college,
      actionType: 'broadcast_cancelled',
      resourceType: 'broadcast',
      resourceId: broadcast._id,
      resourceName: broadcast.title,
      details: 'Cancelled scheduled broadcast',
      ipAddress: req.ip,
    })

    res.json({ ok: true, broadcast: broadcast.toJSON() })
  } catch (err) {
    console.error('[PATCH /api/broadcasts/:id/cancel] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to cancel broadcast.' })
  }
})

// ── GET /api/broadcasts/:id ─────────────────────────────────────────────────────
// Get a specific broadcast
router.get('/:id', requireAuth, requireRole('admin', 'college_admin'), async (req, res) => {
  try {
    const collegeId = req.user.collegeId
    if (!collegeId && req.user.role === 'college_admin') {
      return res.status(403).json({ ok: false, error: 'College admin has no associated college.' })
    }

    const targetCollegeId = req.user.role === 'admin' ? collegeId : collegeId

    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, collegeId: targetCollegeId }

    const broadcast = await Broadcast.findOne(filter)
      .populate('sentBy', 'name email')

    if (!broadcast) {
      return res.status(404).json({ ok: false, error: 'Broadcast not found.' })
    }

    res.json({ ok: true, broadcast: broadcast.toJSON() })
  } catch (err) {
    console.error('[GET /api/broadcasts/:id] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch broadcast.' })
  }
})

// Helper function to send broadcast notifications
async function sendBroadcastNotifications(broadcast, collegeId, targetAudience) {
  try {
    const recipientFilter = { collegeId, deactivated: false }
    if (targetAudience !== 'all') {
      recipientFilter.role = targetAudience
    }

    const recipients = await User.find(recipientFilter).select('_id').lean()
    const recipientIds = recipients.map(r => r._id)

    // Create notifications for all recipients
    const notifications = recipientIds.map(recipientId => ({
      recipient: recipientId,
      sender: broadcast.sentBy,
      type: 'broadcast',
      text: broadcast.title,
      data: {
        broadcastId: broadcast._id.toString(),
        message: broadcast.message,
        priority: broadcast.priority
      }
    }))

    await Notification.insertMany(notifications)

    // Emit real-time notifications
    for (const recipientId of recipientIds) {
      try {
        emitToUser(recipientId.toString(), 'notification:new', {
          type: 'broadcast',
          text: broadcast.title,
          data: {
            broadcastId: broadcast._id.toString(),
            message: broadcast.message,
            priority: broadcast.priority
          }
        })
      } catch (emitErr) {
        console.error('[Emit Error]', emitErr)
      }
    }

    // Update delivered count
    broadcast.deliveredCount = recipientIds.length
    await broadcast.save()
  } catch (err) {
    console.error('[Send Broadcast Notifications Error]', err)
  }
}

export default router
