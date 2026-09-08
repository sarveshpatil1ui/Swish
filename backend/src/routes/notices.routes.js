// backend/src/routes/notices.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// Notice management routes for College Admin module
//
// College Admin can only access notices belonging to their college
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express'
import { body, validationResult } from 'express-validator'

import Notice from '../models/Notice.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

const router = Router()

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
function requireCollegeAccess(req, res, next) {
  if (req.user.role === 'admin') {
    // Super admin can access all
    return next()
  }
  if (req.user.role === 'college_admin') {
    // College admin can only access their own college
    req.collegeId = req.user.collegeId
    req.collegeName = req.user.college
    return next()
  }
  return res.status(403).json({ ok: false, error: 'Access denied.' })
}

// ── GET /api/notices ─────────────────────────────────────────────────────────
// Get notices for the college admin's college
router.get('/', requireAuth, requireRole('admin', 'college_admin'), requireCollegeAccess, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { collegeId: req.collegeId }
    const notices = await Notice.find(filter).sort({ createdAt: -1 })
    return res.status(200).json({ ok: true, notices: notices.map(n => n.toJSON()) })
  } catch (err) {
    console.error('[GET /notices]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch notices.' })
  }
})

// ── POST /api/notices ────────────────────────────────────────────────────────
// Create a new notice
router.post(
  '/',
  requireAuth,
  requireRole('admin', 'college_admin'),
  requireCollegeAccess,
  [
    body('title').trim().notEmpty().withMessage('Notice title is required.'),
    body('content').trim().notEmpty().withMessage('Notice content is required.'),
    body('targetAudience').optional().isIn(['all', 'students', 'faculty', 'department']),
    body('priority').optional().isIn(['low', 'medium', 'high', 'urgent']),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { title, content, departmentId, department, targetAudience, priority, published, expiresAt } = req.body

      const notice = await Notice.create({
        title: title.trim(),
        content: content.trim(),
        collegeId: req.collegeId,
        college: req.collegeName,
        departmentId: departmentId || null,
        department: department || null,
        targetAudience: targetAudience || 'all',
        priority: priority || 'medium',
        published: published || false,
        publishedAt: published ? new Date() : null,
        expiresAt: expiresAt || null,
        createdBy: req.user._id,
        attachments: [],
      })

      return res.status(201).json({ ok: true, notice: notice.toJSON() })
    } catch (err) {
      console.error('[POST /notices]', err)
      res.status(500).json({ ok: false, error: 'Failed to create notice.' })
    }
  }
)

// ── GET /api/notices/:id ─────────────────────────────────────────────────────
// Get a specific notice
router.get('/:id', requireAuth, requireRole('admin', 'college_admin'), requireCollegeAccess, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' 
      ? { _id: req.params.id }
      : { _id: req.params.id, collegeId: req.collegeId }
    
    const notice = await Notice.findOne(filter)
    if (!notice) {
      return res.status(404).json({ ok: false, error: 'Notice not found.' })
    }

    return res.status(200).json({ ok: true, notice: notice.toJSON() })
  } catch (err) {
    console.error('[GET /notices/:id]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch notice.' })
  }
})

// ── PUT /api/notices/:id ─────────────────────────────────────────────────────
// Update a notice
router.put(
  '/:id',
  requireAuth,
  requireRole('admin', 'college_admin'),
  requireCollegeAccess,
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

      const { title, content, departmentId, department, targetAudience, priority, published, expiresAt } = req.body

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

      await notice.save()

      return res.status(200).json({ ok: true, notice: notice.toJSON() })
    } catch (err) {
      console.error('[PUT /notices/:id]', err)
      res.status(500).json({ ok: false, error: 'Failed to update notice.' })
    }
  }
)

// ── DELETE /api/notices/:id ───────────────────────────────────────────────────
// Delete a notice
router.delete('/:id', requireAuth, requireRole('admin', 'college_admin'), requireCollegeAccess, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' 
      ? { _id: req.params.id }
      : { _id: req.params.id, collegeId: req.collegeId }
    
    const notice = await Notice.findOneAndDelete(filter)
    if (!notice) {
      return res.status(404).json({ ok: false, error: 'Notice not found.' })
    }

    return res.status(200).json({ ok: true, message: 'Notice deleted successfully.' })
  } catch (err) {
    console.error('[DELETE /notices/:id]', err)
    res.status(500).json({ ok: false, error: 'Failed to delete notice.' })
  }
})

// ── PATCH /api/notices/:id/publish ────────────────────────────────────────────
// Publish/unpublish a notice
router.patch('/:id/publish', requireAuth, requireRole('admin', 'college_admin'), requireCollegeAccess, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' 
      ? { _id: req.params.id }
      : { _id: req.params.id, collegeId: req.collegeId }
    
    const notice = await Notice.findOne(filter)
    if (!notice) {
      return res.status(404).json({ ok: false, error: 'Notice not found.' })
    }

    notice.published = !notice.published
    if (notice.published && !notice.publishedAt) {
      notice.publishedAt = new Date()
    }
    await notice.save()

    return res.status(200).json({ ok: true, notice: notice.toJSON() })
  } catch (err) {
    console.error('[PATCH /notices/:id/publish]', err)
    res.status(500).json({ ok: false, error: 'Failed to toggle notice publish status.' })
  }
})

export default router
