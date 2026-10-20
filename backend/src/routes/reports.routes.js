import { Router } from 'express'
import { body, validationResult } from 'express-validator'

import Report from '../models/Report.js'
import User from '../models/User.js'
import Post from '../models/Post.js'
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

// ── Middleware: Ensure college admin can only access reports from their college ──
async function requireCollegeAccess(req, res, next) {
  if (req.user.role === 'admin' || req.user.role === 'main_admin') {
    return next()
  }
  if (req.user.role === 'college_admin') {
    if (!req.user.collegeId) {
      return res.status(403).json({ ok: false, error: 'Access denied: No college associated.' })
    }
    req.collegeId = req.user.collegeId
    return next()
  }
  return res.status(403).json({ ok: false, error: 'Access denied.' })
}

// ── POST /api/reports — Create a new report (any authenticated user) ───────────
router.post(
  '/',
  requireAuth,
  [
    body('type').isIn(['user', 'post', 'comment']).withMessage('Invalid report type.'),
    body('category').isIn(['harassment', 'spam', 'inappropriate_content', 'misinformation', 'other']).withMessage('Invalid category.'),
    body('description').trim().notEmpty().withMessage('Description is required.').isLength({ max: 1000 }).withMessage('Description too long.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { type, category, description, reportedUserId, reportedPostId, reportedCommentId } = req.body

      // Validate required fields based on type
      if (type === 'user' && !reportedUserId) {
        return res.status(400).json({ ok: false, error: 'reportedUserId is required for user reports.' })
      }
      if (type === 'post' && !reportedPostId) {
        return res.status(400).json({ ok: false, error: 'reportedPostId is required for post reports.' })
      }
      if (type === 'comment' && !reportedCommentId) {
        return res.status(400).json({ ok: false, error: 'reportedCommentId is required for comment reports.' })
      }

      // Get reporter's college
      if (!req.user.collegeId) {
        return res.status(400).json({ ok: false, error: 'You must be associated with a college to submit a report.' })
      }

      // Get reported user info
      const reportedUser = await User.findById(reportedUserId || (type === 'post' || type === 'comment' ? null : reportedUserId))
      if (!reportedUser && reportedUserId) {
        return res.status(404).json({ ok: false, error: 'Reported user not found.' })
      }

      // Verify the reported entity exists and belongs to the same college
      if (type === 'post') {
        const post = await Post.findById(reportedPostId)
        if (!post) return res.status(404).json({ ok: false, error: 'Post not found.' })
        if (!post.user.equals(req.user.collegeId) && !post.user.equals(req.user._id)) {
          // Allow cross-college reports for now, but they'll be routed to super admin
        }
      }

      const report = await Report.create({
        reporterId: req.user._id,
        reporterName: req.user.name,
        reportedUserId: reportedUserId || null,
        reportedUserName: reportedUser?.name || 'Unknown',
        reportedPostId: reportedPostId || null,
        reportedCommentId: reportedCommentId || null,
        type,
        category,
        description,
        collegeId: req.user.collegeId,
        college: req.user.college,
      })

      res.status(201).json({ ok: true, report })
    } catch (err) {
      console.error('[POST /reports]', err)
      res.status(500).json({ ok: false, error: 'Failed to submit report.' })
    }
  }
)

// ── GET /api/reports — List reports (college admin and super admin only) ────────
router.get('/', requireAuth, requireRole('admin', 'college_admin', 'main_admin'), requireCollegeAccess, async (req, res) => {
  try {
    const { status, type, limit = 50, skip = 0 } = req.query

    const filter = {}
    if (req.user.role === 'college_admin') {
      filter.collegeId = req.user.collegeId
    }
    if (status) filter.status = status
    if (type) filter.type = type

    const reports = await Report.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean()

    const total = await Report.countDocuments(filter)

    res.json({ ok: true, reports, total })
  } catch (err) {
    console.error('[GET /reports]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch reports.' })
  }
})

// ── GET /api/reports/:id — Get single report details ─────────────────────────────
router.get('/:id', requireAuth, requireRole('admin', 'college_admin', 'main_admin'), requireCollegeAccess, async (req, res) => {
  try {
    const report = await Report.findById(req.params.id).lean()
    if (!report) {
      return res.status(404).json({ ok: false, error: 'Report not found.' })
    }

    // College admin can only access reports from their college
    if (req.user.role === 'college_admin' && !report.collegeId.equals(req.user.collegeId)) {
      return res.status(403).json({ ok: false, error: 'Access denied.' })
    }

    res.json({ ok: true, report })
  } catch (err) {
    console.error('[GET /reports/:id]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch report.' })
  }
})

// ── PATCH /api/reports/:id/status — Update report status ─────────────────────────
router.patch(
  '/:id/status',
  requireAuth,
  requireRole('admin', 'college_admin', 'main_admin'),
  requireCollegeAccess,
  [
    body('status').isIn(['pending', 'reviewed', 'resolved', 'dismissed']).withMessage('Invalid status.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { status, resolutionNotes } = req.body
      const report = await Report.findById(req.params.id)

      if (!report) {
        return res.status(404).json({ ok: false, error: 'Report not found.' })
      }

      // College admin can only manage reports from their college
      if (req.user.role === 'college_admin' && !report.collegeId.equals(req.user.collegeId)) {
        return res.status(403).json({ ok: false, error: 'Access denied.' })
      }

      report.status = status
      if (status !== 'pending') {
        report.reviewedBy = req.user._id
        report.reviewedAt = new Date()
      }
      if (resolutionNotes !== undefined) {
        report.resolutionNotes = resolutionNotes
      }

      await report.save()

      res.json({ ok: true, report })
    } catch (err) {
      console.error('[PATCH /reports/:id/status]', err)
      res.status(500).json({ ok: false, error: 'Failed to update report status.' })
    }
  }
)

export default router
