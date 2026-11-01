// backend/src/routes/disciplinary-warnings.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// Disciplinary Warning management routes for College Admin module
//
// College Admin can only access warnings belonging to their college
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import multer from 'multer'

import DisciplinaryWarning from '../models/DisciplinaryWarning.js'
import User from '../models/User.js'
import College from '../models/College.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import { createNotification } from '../services/notification.service.js'
import { logActivity } from '../services/activity-log.service.js'
import { uploadDocument, isCloudinaryConfigured, deleteDocument } from '../services/cloudinary.service.js'

const router = Router()

// Multer configuration for warning attachments
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

const attachmentsUpload = attachmentUpload.array('attachments', 5)

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

// ── GET /api/disciplinary-warnings ─────────────────────────────────────────────
// List disciplinary warnings with pagination and filtering
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

    const { status, severity, category, userId, limit = 50, skip = 0 } = req.query

    const filter = { collegeId: targetCollegeId }
    if (status) filter.status = status
    if (severity) filter.severity = severity
    if (category) filter.category = category
    if (userId) filter.userId = userId

    const warnings = await DisciplinaryWarning.find(filter)
      .populate('userId', 'name email rollNumber dept')
      .populate('issuedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean()

    const total = await DisciplinaryWarning.countDocuments(filter)

    res.json({
      ok: true,
      warnings: warnings.map(w => ({
        ...w,
        id: w._id.toString()
      })),
      total,
      limit: Number(limit),
      skip: Number(skip)
    })
  } catch (err) {
    console.error('[GET /api/disciplinary-warnings] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch disciplinary warnings.' })
  }
})

// ── POST /api/disciplinary-warnings ────────────────────────────────────────────
// Create a new disciplinary warning
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'college_admin'),
  attachmentsUpload,
  [
    body('userId').notEmpty().withMessage('User ID is required.'),
    body('warningType').isIn(['verbal', 'written', 'probation', 'suspension']).withMessage('Invalid warning type.'),
    body('severity').isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity.'),
    body('category').isIn(['academic_misconduct', 'behavioral', 'attendance', 'harassment', 'policy_violation', 'other']).withMessage('Invalid category.'),
    body('description').trim().notEmpty().withMessage('Description is required.'),
    body('incidentDate').isISO8601().withMessage('Invalid incident date.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { userId, warningType, severity, category, description, incidentDate, incidentLocation, witnesses, actionTaken, expiresAt } = req.body

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

      const targetUser = await User.findById(userId)
      if (!targetUser) {
        return res.status(404).json({ ok: false, error: 'User not found.' })
      }

      if (!targetUser.collegeId || !targetUser.collegeId.equals(targetCollegeId)) {
        return res.status(403).json({ ok: false, error: 'User does not belong to this college.' })
      }

      if (!['student', 'faculty'].includes(targetUser.role)) {
        return res.status(400).json({ ok: false, error: 'Warnings can only be issued to students or faculty.' })
      }

      // Upload attachments to Cloudinary if provided
      const attachments = []
      if (req.files && req.files.length > 0 && isCloudinaryConfigured()) {
        for (const file of req.files) {
          try {
            const uploadResult = await uploadDocument(file.buffer, {
              folder: `swish/disciplinary-warnings/${targetCollegeId}`,
              resource_type: 'auto',
            })
            attachments.push({
              url: uploadResult.secureUrl,
              filename: file.originalname,
              mimeType: file.mimetype,
              publicId: uploadResult.public_id
            })
          } catch (uploadErr) {
            console.error('[Attachment Upload Error]', uploadErr)
          }
        }
      }

      const warning = await DisciplinaryWarning.create({
        collegeId: targetCollegeId,
        college: college.name,
        userId: targetUser._id,
        userName: targetUser.name,
        userRole: targetUser.role,
        issuedBy: req.user._id,
        issuedByName: req.user.name,
        issuedByRole: req.user.role,
        warningType,
        severity,
        category,
        description: description.trim(),
        incidentDate: new Date(incidentDate),
        incidentLocation: incidentLocation || null,
        witnesses: witnesses || [],
        actionTaken: actionTaken || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        attachments,
      })

      // Log the action
      await logActivity({
        adminId: req.user._id,
        adminName: req.user.name,
        adminRole: req.user.role,
        collegeId: targetCollegeId,
        college: college.name,
        actionType: 'warning_issued',
        resourceType: 'disciplinary_warning',
        resourceId: warning._id,
        resourceName: `${warningType} warning for ${targetUser.name}`,
        details: `Issued ${severity} ${category} warning to ${targetUser.name}`,
        ipAddress: req.ip,
      })

      // Notify the user
      try {
        await createNotification({
          recipient: targetUser._id,
          sender: req.user._id,
          type: 'disciplinary_warning',
          text: `You have received a ${warningType} warning regarding ${category}.`,
        })
      } catch (notifErr) {
        console.error('[Notification Error]', notifErr)
      }

      res.status(201).json({
        ok: true,
        warning: warning.toJSON()
      })
    } catch (err) {
      console.error('[POST /api/disciplinary-warnings] Error:', err)
      res.status(500).json({ ok: false, error: 'Failed to create disciplinary warning.' })
    }
  }
)

// ── GET /api/disciplinary-warnings/:id ─────────────────────────────────────────
// Get a specific disciplinary warning
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

    const warning = await DisciplinaryWarning.findOne(filter)
      .populate('userId', 'name email rollNumber dept')
      .populate('issuedBy', 'name email')
      .populate('resolvedBy', 'name email')

    if (!warning) {
      return res.status(404).json({ ok: false, error: 'Warning not found.' })
    }

    res.json({ ok: true, warning: warning.toJSON() })
  } catch (err) {
    console.error('[GET /api/disciplinary-warnings/:id] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch warning.' })
  }
})

// ── PATCH /api/disciplinary-warnings/:id/resolve ────────────────────────────────
// Resolve a disciplinary warning
router.patch(
  '/:id/resolve',
  requireAuth,
  requireRole('admin', 'college_admin'),
  [
    body('resolutionNotes').trim().notEmpty().withMessage('Resolution notes are required.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const collegeId = req.user.collegeId
      if (!collegeId && req.user.role === 'college_admin') {
        return res.status(403).json({ ok: false, error: 'College admin has no associated college.' })
      }

      const targetCollegeId = req.user.role === 'admin' ? collegeId : collegeId

      const filter = req.user.role === 'admin'
        ? { _id: req.params.id }
        : { _id: req.params.id, collegeId: targetCollegeId }

      const warning = await DisciplinaryWarning.findOne(filter)
      if (!warning) {
        return res.status(404).json({ ok: false, error: 'Warning not found.' })
      }

      if (warning.status !== 'active') {
        return res.status(400).json({ ok: false, error: 'Warning is not active.' })
      }

      const { resolutionNotes } = req.body

      warning.status = 'resolved'
      warning.resolvedAt = new Date()
      warning.resolvedBy = req.user._id
      warning.resolutionNotes = resolutionNotes.trim()

      await warning.save()

      // Log the action
      await logActivity({
        adminId: req.user._id,
        adminName: req.user.name,
        adminRole: req.user.role,
        collegeId: targetCollegeId,
        college: warning.college,
        actionType: 'warning_resolved',
        resourceType: 'disciplinary_warning',
        resourceId: warning._id,
        resourceName: `${warning.warningType} warning for ${warning.userName}`,
        details: `Resolved warning for ${warning.userName}`,
        ipAddress: req.ip,
      })

      res.json({ ok: true, warning: warning.toJSON() })
    } catch (err) {
      console.error('[PATCH /api/disciplinary-warnings/:id/resolve] Error:', err)
      res.status(500).json({ ok: false, error: 'Failed to resolve warning.' })
    }
  }
)

// ── DELETE /api/disciplinary-warnings/:id ──────────────────────────────────────
// Delete a disciplinary warning (admin only)
router.delete('/:id', requireAuth, requireRole('admin'), async (req, res) => {
  try {
    const warning = await DisciplinaryWarning.findById(req.params.id)
    if (!warning) {
      return res.status(404).json({ ok: false, error: 'Warning not found.' })
    }

    // Delete attachments from Cloudinary
    if (warning.attachments && warning.attachments.length > 0 && isCloudinaryConfigured()) {
      for (const attachment of warning.attachments) {
        await deleteDocument(attachment.publicId).catch(err => console.error('[Delete Attachment Error]', err))
      }
    }

    await DisciplinaryWarning.findByIdAndDelete(req.params.id)

    // Log the action
    await logActivity({
      adminId: req.user._id,
      adminName: req.user.name,
      adminRole: req.user.role,
      collegeId: warning.collegeId,
      college: warning.college,
      actionType: 'warning_deleted',
      resourceType: 'disciplinary_warning',
      resourceId: warning._id,
      resourceName: `${warning.warningType} warning for ${warning.userName}`,
      details: `Deleted warning for ${warning.userName}`,
      ipAddress: req.ip,
    })

    res.json({ ok: true, message: 'Warning deleted successfully.' })
  } catch (err) {
    console.error('[DELETE /api/disciplinary-warnings/:id] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to delete warning.' })
  }
})

export default router
