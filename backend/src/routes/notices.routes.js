// backend/src/routes/notices.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// Notice management routes for College Admin module
//
// College Admin can only access notices belonging to their college
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import multer from 'multer'

import Notice from '../models/Notice.js'
import College from '../models/College.js'
import User from '../models/User.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import { createNotification } from '../services/notification.service.js'
import { logActivity } from '../services/activity-log.service.js'
import { uploadDocument, isCloudinaryConfigured } from '../services/cloudinary.service.js'

const router = Router()

// Multer configuration for notice attachments (PDF, DOC, DOCX, images)
const attachmentStorage = multer.memoryStorage()
const attachmentUpload = multer({
  storage: attachmentStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp'
    ]
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(pdf|doc|docx|jpg|jpeg|png|gif|webp)$/i)) {
      cb(null, true)
    } else {
      cb(new Error('Only PDF, DOC, DOCX, and image files are allowed.'), false)
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit per file
})

// Multer for multiple attachments
const attachmentsUpload = attachmentUpload.array('attachments', 5) // Max 5 attachments

async function notifyNoticeAudience(notice, senderId) {
  const filter = {
    collegeId: notice.collegeId,
    _id: { $ne: senderId },
    deactivated: false,
  }
  if (notice.targetAudience === 'students') filter.role = 'student'
  if (notice.targetAudience === 'faculty') filter.role = 'faculty'
  if (notice.targetAudience === 'department') {
    filter.dept = notice.department
  }

  const isUrgent = notice.priority === 'urgent'
  const isHigh = notice.priority === 'high'
  const notifText = isUrgent
    ? '🚨 URGENT Notice posted'
    : isHigh
    ? '⚠️ Important Notice posted'
    : 'posted a new campus announcement'

  const recipients = await User.find(filter).select('_id')
  await Promise.all(recipients.map(user => createNotification({
    recipient: user._id,
    sender: senderId,
    type: 'event',
    notice: notice._id,
    text: notifText,
    subtext: notice.title,
  })))
}

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// Middleware to ensure user can only access their college's notices
async function requireCollegeAccess(req, res, next) {
  if (req.user.role === 'admin' || req.user.role === 'main_admin') {
    // Super admin can access all
    return next()
  }
  if (req.user.role === 'college_admin' || req.user.role === 'faculty') {
    // College admin or faculty can access notices for their own college
    let targetCollegeId = req.user.collegeId
    if (!targetCollegeId && req.user.college) {
      const col = await College.findOne({ name: req.user.college })
      if (col) targetCollegeId = col._id
    }
    if (!targetCollegeId) {
      return res.status(403).json({ ok: false, error: 'Access denied: User has no associated college.' })
    }
    req.collegeId = targetCollegeId
    let collegeName = req.user.college
    if (!collegeName || collegeName === targetCollegeId.toString()) {
      const col = await College.findById(targetCollegeId)
      if (col) collegeName = col.name
    }
    req.collegeName = collegeName || ''
    return next()
  }
  return res.status(403).json({ ok: false, error: 'Access denied.' })
}

// ── GET /api/notices ─────────────────────────────────────────────────────────
// Get all notices for college admin (drafts + published)
router.get('/', requireAuth, requireRole('admin', 'college_admin', 'faculty'), requireCollegeAccess, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { collegeId: req.collegeId }
    const notices = await Notice.find(filter)
      .populate('createdBy', 'name email designation role')
      .sort({ pinned: -1, createdAt: -1 })
      .lean()
    // Sort by pinned first, then priority hierarchy, then date
    const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 }
    notices.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      const pDiff = (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2)
      if (pDiff !== 0) return pDiff
      return new Date(b.createdAt) - new Date(a.createdAt)
    })

    // Deduplicate notices by ID to guarantee clean list
    const seenNoticeIds = new Set()
    const uniqueNotices = []
    for (const n of notices) {
      const idStr = n._id.toString()
      if (!seenNoticeIds.has(idStr)) {
        seenNoticeIds.add(idStr)
        uniqueNotices.push({ ...n, id: idStr, _id: undefined, __v: undefined })
      }
    }

    return res.status(200).json({ ok: true, notices: uniqueNotices })
  } catch (err) {
    console.error('[GET /notices]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch notices.' })
  }
})

// ── GET /api/notices/college ─────────────────────────────────────────────────
// Get published, active notices for the authenticated student/faculty/college_admin
// Strict server-enforced college isolation using req.user.collegeId
router.get('/college', requireAuth, async (req, res) => {
  try {
    // Determine user's college strictly from backend authenticated session
    const userCollegeId = req.user.collegeId
    if (!userCollegeId) {
      return res.status(200).json({ ok: true, notices: [] })
    }

    const now = new Date()

    // Base filter: strictly authenticated user's college, published, and not expired
    const filter = {
      collegeId: userCollegeId,
      published: true,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: now } }
      ]
    }

    // Role-based target audience filtering
    if (req.user.role === 'student') {
      const audienceOr = [
        { targetAudience: 'all' },
        { targetAudience: 'students' },
        { targetAudience: null },
        { targetAudience: { $exists: false } },
      ]
      if (req.user.dept) {
        audienceOr.push({ targetAudience: 'department', department: req.user.dept })
      }
      filter.$and = [{ $or: audienceOr }]
    } else if (req.user.role === 'faculty') {
      const audienceOr = [
        { targetAudience: 'all' },
        { targetAudience: 'faculty' },
        { targetAudience: null },
        { targetAudience: { $exists: false } },
      ]
      if (req.user.dept) {
        audienceOr.push({ targetAudience: 'department', department: req.user.dept })
      }
      filter.$and = [{ $or: audienceOr }]
    }

    const notices = await Notice.find(filter)
      .populate('createdBy', 'name email designation role')
      .sort({ createdAt: -1 })
      .lean()

    // Sort by pinned status first, then priority, then date descending
    const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 }
    notices.sort((a, b) => {
      // Pinned notices always come first
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1

      const pDiff = (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2)
      if (pDiff !== 0) return pDiff
      return new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt)
    })

    // Add expiration status to each notice
    const noticesWithStatus = notices.map(n => ({
      ...n,
      id: n._id.toString(),
      isExpiringSoon: n.expiresAt && (new Date(n.expiresAt) - now) < (7 * 24 * 60 * 60 * 1000), // Expiring within 7 days
      daysUntilExpiry: n.expiresAt ? Math.ceil((new Date(n.expiresAt) - now) / (24 * 60 * 60 * 1000)) : null,
    }))

    // Deduplicate notices by ID
    const seenIds = new Set()
    const uniqueNotices = []
    for (const n of noticesWithStatus) {
      const idStr = n.id || n._id?.toString()
      if (idStr && !seenIds.has(idStr)) {
        seenIds.add(idStr)
        uniqueNotices.push(n)
      }
    }

    return res.status(200).json({
      ok: true,
      notices: uniqueNotices
    })
  } catch (err) {
    console.error('[GET /api/notices/college]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch college notices.' })
  }
})

// ── POST /api/notices ────────────────────────────────────────────────────────
// Create a new notice (college_admin or admin)
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'college_admin', 'faculty'),
  requireCollegeAccess,
  attachmentsUpload,
  [
    body('title').trim().notEmpty().withMessage('Notice title is required.'),
    body('content').trim().notEmpty().withMessage('Notice content is required.'),
    body('targetAudience').optional().isIn(['all', 'students', 'faculty', 'department']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
    body('expiresAt').optional({ checkFalsy: true }).isISO8601().withMessage('Invalid expiration date format.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { title, content, departmentId, department, targetAudience, priority, published, expiresAt } = req.body

      // Validate expiresAt is in the future if provided
      let validExpiresAt = null
      if (expiresAt && typeof expiresAt === 'string' && expiresAt.trim()) {
        const expiryDate = new Date(expiresAt)
        if (isNaN(expiryDate.getTime()) || expiryDate <= new Date()) {
          return res.status(400).json({ ok: false, error: 'Expiration date must be in the future.' })
        }
        validExpiresAt = expiryDate
      }

      // Never trust client-supplied collegeId: strictly use authenticated admin's collegeId
      const targetCollegeId = (req.user.role === 'admin' || req.user.role === 'main_admin')
        ? (req.body.collegeId || req.collegeId)
        : req.user.collegeId

      if (!targetCollegeId) {
        return res.status(403).json({ ok: false, error: 'Access denied: No associated college found.' })
      }

      let colName = req.collegeName
      if (!colName) {
        const col = await College.findById(targetCollegeId)
        if (col) colName = col.name
      }
      if (!colName) colName = 'College'

      // Extract idempotency key from header or body
      const rawIdempotencyKey = (
        req.headers['x-idempotency-key'] ||
        req.body.idempotencyKey ||
        req.body.clientNoticeId ||
        ''
      ).toString().trim()
      const idempotencyKey = rawIdempotencyKey || null

      // Idempotency check: if an idempotency key was supplied and notice already exists, return it
      if (idempotencyKey) {
        const existingNotice = await Notice.findOne({
          collegeId: targetCollegeId,
          idempotencyKey,
        }).populate('createdBy', 'name email designation role')

        if (existingNotice) {
          return res.status(200).json({
            ok: true,
            notice: existingNotice.toJSON(),
            duplicatePrevented: true,
            message: 'Notice already submitted (idempotent request).'
          })
        }
      }

      // Replay protection: if identical notice was submitted by same user in last 5 seconds, prevent duplicate
      const duplicateThreshold = new Date(Date.now() - 5000)
      const recentDuplicate = await Notice.findOne({
        collegeId: targetCollegeId,
        createdBy: req.user._id,
        title: title.trim(),
        content: content.trim(),
        createdAt: { $gte: duplicateThreshold },
      }).populate('createdBy', 'name email designation role')

      if (recentDuplicate) {
        return res.status(200).json({
          ok: true,
          notice: recentDuplicate.toJSON(),
          duplicatePrevented: true,
          message: 'Duplicate notice submission prevented.'
        })
      }

      // Upload attachments to Cloudinary if provided
      const attachments = []
      if (req.files && req.files.length > 0 && isCloudinaryConfigured()) {
        for (const file of req.files) {
          try {
            const uploadResult = await uploadDocument(file.buffer, {
              folder: `swish/notices/${targetCollegeId}`,
              resource_type: 'auto',
            })
            attachments.push({
              url: uploadResult.secureUrl,
              filename: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              publicId: uploadResult.public_id
            })
          } catch (uploadErr) {
            console.error('[Attachment Upload Error]', uploadErr)
          }
        }
      }

      let notice
      try {
        const noticeData = {
          title: title.trim(),
          content: content.trim(),
          collegeId: targetCollegeId,
          college: colName,
          departmentId: departmentId || null,
          department: department || null,
          targetAudience: targetAudience || 'all',
          priority: priority || 'medium',
          published: Boolean(published),
          publishedAt: published ? new Date() : null,
          expiresAt: validExpiresAt,
          createdBy: req.user._id,
          attachments,
        }
        if (idempotencyKey) {
          noticeData.idempotencyKey = idempotencyKey
        }
        notice = await Notice.create(noticeData)
      } catch (createErr) {
        // Handle concurrent race condition on unique idempotencyKey
        if (idempotencyKey && (createErr.code === 11000 || createErr.name === 'MongoServerError')) {
          const raceNotice = await Notice.findOne({
            collegeId: targetCollegeId,
            idempotencyKey,
          }).populate('createdBy', 'name email designation role')
          if (raceNotice) {
            return res.status(200).json({
              ok: true,
              notice: raceNotice.toJSON(),
              duplicatePrevented: true,
            })
          }
        }
        throw createErr
      }

      if (notice.published) {
        await notifyNoticeAudience(notice, req.user._id)
      }

      // Log the action
      await logActivity({
        adminId: req.user._id,
        adminName: req.user.name,
        adminRole: req.user.role,
        collegeId: req.user.collegeId,
        college: req.user.college,
        actionType: 'notice_created',
        resourceType: 'notice',
        resourceId: notice._id,
        resourceName: title,
        details: `Created notice: ${title}`,
        ipAddress: req.ip,
      })

      await notice.populate('createdBy', 'name email designation role')
      return res.status(201).json({ ok: true, notice: notice.toJSON() })
    } catch (err) {
      console.error('[POST /notices]', err)
      res.status(500).json({ ok: false, error: 'Failed to create notice.' })
    }
  }
)

// ── GET /api/notices/:id ─────────────────────────────────────────────────────
// Get a specific notice (detail view)
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const notice = await Notice.findById(req.params.id)
      .populate('createdBy', 'name email designation role')
    if (!notice) {
      return res.status(404).json({ ok: false, error: 'Notice not found.' })
    }

    // Super admin can access any notice
    if (req.user.role === 'admin' || req.user.role === 'main_admin') {
      return res.status(200).json({ ok: true, notice: notice.toJSON() })
    }

    // Enforce strict college boundary
    if (!req.user.collegeId || !notice.collegeId.equals(req.user.collegeId)) {
      return res.status(403).json({ ok: false, error: 'Access denied: You can only view notices from your college.' })
    }

    // Students can only view published notices
    if (req.user.role === 'student' && !notice.published) {
      return res.status(403).json({ ok: false, error: 'Access denied: Notice is not published.' })
    }

    return res.status(200).json({ ok: true, notice: notice.toJSON() })
  } catch (err) {
    console.error('[GET /notices/:id]', err)
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: 'Notice not found.' })
    }
    res.status(500).json({ ok: false, error: 'Failed to fetch notice.' })
  }
})

// ── PUT /api/notices/:id ─────────────────────────────────────────────────────
// Update a notice
router.put(
  '/:id',
  requireAuth,
  requireRole('admin', 'college_admin', 'faculty'),
  requireCollegeAccess,
  attachmentsUpload,
  [
    body('title').optional().trim(),
    body('content').optional().trim(),
    body('targetAudience').optional().isIn(['all', 'students', 'faculty', 'department']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const filter = req.user.role === 'admin'
        ? { _id: req.params.id }
        : { _id: req.params.id, collegeId: req.collegeId }

      const notice = await Notice.findOne(filter)
      if (!notice) {
        return res.status(404).json({ ok: false, error: 'Notice not found.' })
      }

      if (req.user.role === 'faculty' && notice.createdBy.toString() !== req.user._id.toString()) {
        return res.status(403).json({ ok: false, error: 'Access denied: You can only edit your own notices.' })
      }

      const { title, content, departmentId, department, targetAudience, priority, published, expiresAt, removeAttachments } = req.body
      const wasPublished = notice.published

      if (title) notice.title = title.trim()
      if (content) notice.content = content.trim()
      if (departmentId !== undefined) notice.departmentId = departmentId || null
      if (department !== undefined) notice.department = department || null
      if (targetAudience) notice.targetAudience = targetAudience
      if (priority) notice.priority = priority
      if (published !== undefined) {
        notice.published = published
        if (published && !notice.publishedAt) {
          notice.publishedAt = new Date()
        }
      }
      if (expiresAt !== undefined) notice.expiresAt = expiresAt || null

      // Handle new attachments
      if (req.files && req.files.length > 0 && isCloudinaryConfigured()) {
        for (const file of req.files) {
          try {
            const uploadResult = await uploadDocument(file.buffer, {
              folder: `swish/notices/${notice.collegeId}`,
              resource_type: 'auto',
            })
            notice.attachments.push({
              url: uploadResult.secureUrl,
              filename: file.originalname,
              mimeType: file.mimetype,
              size: file.size,
              publicId: uploadResult.public_id
            })
          } catch (uploadErr) {
            console.error('[Attachment Upload Error]', uploadErr)
          }
        }
      }

      // Handle attachment removal
      if (removeAttachments && Array.isArray(removeAttachments)) {
        const { deleteDocument } = await import('../services/cloudinary.service.js')
        for (const publicId of removeAttachments) {
          const index = notice.attachments.findIndex(a => a.publicId === publicId)
          if (index !== -1) {
            await deleteDocument(publicId).catch(err => console.error('[Delete Attachment Error]', err))
            notice.attachments.splice(index, 1)
          }
        }
      }

      await notice.save()

      if (!wasPublished && notice.published) {
        await notifyNoticeAudience(notice, req.user._id)
      }

      // Log the action
      await logActivity({
        adminId: req.user._id,
        adminName: req.user.name,
        adminRole: req.user.role,
        collegeId: req.user.collegeId,
        college: req.user.college,
        actionType: 'notice_edited',
        resourceType: 'notice',
        resourceId: notice._id,
        resourceName: notice.title,
        details: `Updated notice: ${notice.title}`,
        ipAddress: req.ip,
      })

      await notice.populate('createdBy', 'name email designation role')
      return res.status(200).json({ ok: true, notice: notice.toJSON() })
    } catch (err) {
      console.error('[PUT /notices/:id]', err)
      res.status(500).json({ ok: false, error: 'Failed to update notice.' })
    }
  }
)

// ── DELETE /api/notices/:id ───────────────────────────────────────────────────
// Delete a notice
router.delete('/:id', requireAuth, requireRole('admin', 'college_admin', 'faculty'), requireCollegeAccess, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' 
      ? { _id: req.params.id }
      : { _id: req.params.id, collegeId: req.collegeId }
    
    const notice = await Notice.findOne(filter)
    if (!notice) {
      return res.status(404).json({ ok: false, error: 'Notice not found.' })
    }

    if (req.user.role === 'faculty' && notice.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ ok: false, error: 'Access denied: You can only delete your own notices.' })
    }

    // Delete attachments from Cloudinary
    if (notice.attachments && notice.attachments.length > 0 && isCloudinaryConfigured()) {
      const { deleteDocument } = await import('../services/cloudinary.service.js')
      for (const attachment of notice.attachments) {
        await deleteDocument(attachment.publicId).catch(err => console.error('[Delete Attachment Error]', err))
      }
    }

    await Notice.findByIdAndDelete(notice._id)

    // Log the action
    await logActivity({
      adminId: req.user._id,
      adminName: req.user.name,
      adminRole: req.user.role,
      collegeId: req.user.collegeId,
      college: req.user.college,
      actionType: 'notice_deleted',
      resourceType: 'notice',
      resourceId: notice._id,
      resourceName: notice.title,
      details: 'Deleted notice',
      ipAddress: req.ip,
    })

    return res.status(200).json({ ok: true, message: 'Notice deleted successfully.' })
  } catch (err) {
    console.error('[DELETE /notices/:id]', err)
    res.status(500).json({ ok: false, error: 'Failed to delete notice.' })
  }
})

// ── PATCH /api/notices/:id/publish ────────────────────────────────────────────
// Publish/unpublish a notice
router.patch('/:id/publish', requireAuth, requireRole('admin', 'college_admin', 'faculty'), requireCollegeAccess, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' 
      ? { _id: req.params.id }
      : {
          _id: req.params.id,
          $or: [
            { collegeId: req.collegeId },
            { collegeId: req.collegeId.toString() }
          ]
        }
    
    const notice = await Notice.findOne(filter)
    if (!notice) {
      return res.status(404).json({ ok: false, error: 'Notice not found.' })
    }

    if (req.user.role === 'faculty' && notice.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ ok: false, error: 'Access denied: You can only publish or unpublish your own notices.' })
    }

    notice.published = !notice.published
    if (notice.published && !notice.publishedAt) {
      notice.publishedAt = new Date()
    }
    await notice.save()

    if (notice.published) {
      await notifyNoticeAudience(notice, req.user._id)
    }

    // Log the action
    await logActivity({
      adminId: req.user._id,
      adminName: req.user.name,
      adminRole: req.user.role,
      collegeId: req.user.collegeId,
      college: req.user.college,
      actionType: 'notice_published',
      resourceType: 'notice',
      resourceId: notice._id,
      resourceName: notice.title,
      details: notice.published ? 'Published notice' : 'Unpublished notice',
      ipAddress: req.ip,
    })

    await notice.populate('createdBy', 'name email designation role')
    return res.status(200).json({ ok: true, notice: notice.toJSON() })
  } catch (err) {
    console.error('[PATCH /notices/:id/publish]', err)
    res.status(500).json({ ok: false, error: 'Failed to toggle notice publish status.' })
  }
})

// ── PATCH /api/notices/:id/pin ────────────────────────────────────────────────────
// Pin/unpin a notice (for official announcements)
// Limit: Maximum 5 pinned notices per college
router.patch('/:id/pin', requireAuth, requireRole('admin', 'college_admin', 'faculty'), requireCollegeAccess, async (req, res) => {
  try {
    const filter = req.user.role === 'admin'
      ? { _id: req.params.id }
      : { _id: req.params.id, collegeId: req.collegeId }

    const notice = await Notice.findOne(filter)
    if (!notice) {
      return res.status(404).json({ ok: false, error: 'Notice not found.' })
    }

    if (req.user.role === 'faculty' && notice.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ ok: false, error: 'Access denied: You can only pin or unpin your own notices.' })
    }

    // If pinning, check if we've reached the limit (max 5 pinned notices per college)
    if (!notice.pinned) {
      const pinnedCount = await Notice.countDocuments({
        collegeId: notice.collegeId,
        pinned: true
      })
      if (pinnedCount >= 5) {
        return res.status(400).json({
          ok: false,
          error: 'Maximum limit reached: You can only pin up to 5 notices. Unpin an existing notice first.'
        })
      }
    }

    notice.pinned = !notice.pinned
    await notice.save()

    // Log the action
    await logActivity({
      adminId: req.user._id,
      adminName: req.user.name,
      adminRole: req.user.role,
      collegeId: req.user.collegeId,
      college: req.user.college,
      actionType: notice.pinned ? 'notice_pinned' : 'notice_unpinned',
      resourceType: 'notice',
      resourceId: notice._id,
      resourceName: notice.title,
      details: notice.pinned ? 'Pinned notice' : 'Unpinned notice',
      ipAddress: req.ip,
    })

    await notice.populate('createdBy', 'name email designation role')
    return res.status(200).json({ ok: true, notice: notice.toJSON() })
  } catch (err) {
    console.error('[PATCH /notices/:id/pin]', err)
    res.status(500).json({ ok: false, error: 'Failed to toggle notice pin status.' })
  }
})

export default router
