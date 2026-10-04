// backend/src/routes/notices.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// Notice management routes for College Admin module
//
// College Admin can only access notices belonging to their college
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express'
import { body, validationResult } from 'express-validator'

import Notice from '../models/Notice.js'
import College from '../models/College.js'
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
async function requireCollegeAccess(req, res, next) {
  if (req.user.role === 'admin' || req.user.role === 'main_admin') {
    // Super admin can access all
    return next()
  }
  if (req.user.role === 'college_admin') {
    // College admin can only access their own college
    if (!req.user.collegeId) {
      return res.status(403).json({ ok: false, error: 'Access denied: College admin has no associated college.' })
    }
    req.collegeId = req.user.collegeId
    let collegeName = req.user.college
    if (!collegeName || collegeName === req.user.collegeId.toString()) {
      const col = await College.findById(req.user.collegeId)
      if (col) collegeName = col.name
    }
    req.collegeName = collegeName || ''
    return next()
  }
  return res.status(403).json({ ok: false, error: 'Access denied.' })
}

// ── GET /api/notices ─────────────────────────────────────────────────────────
// Get all notices for college admin (drafts + published)
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

    // Sort by priority (urgent > high > medium > low), then date descending
    const priorityWeight = { urgent: 4, high: 3, medium: 2, low: 1 }
    notices.sort((a, b) => {
      const pDiff = (priorityWeight[b.priority] || 2) - (priorityWeight[a.priority] || 2)
      if (pDiff !== 0) return pDiff
      return new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt)
    })

    return res.status(200).json({
      ok: true,
      notices: notices.map(n => ({
        ...n,
        id: n._id.toString(),
      }))
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

      const notice = await Notice.create({
        title: title.trim(),
        content: content.trim(),
        collegeId: targetCollegeId,
        college: colName,
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

    // Students and faculty can only view published notices
    if ((req.user.role === 'student' || req.user.role === 'faculty') && !notice.published) {
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
