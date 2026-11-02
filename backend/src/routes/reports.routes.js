import { Router } from 'express'
import { body, validationResult } from 'express-validator'

import Report from '../models/Report.js'
import User from '../models/User.js'
import Post from '../models/Post.js'
import College from '../models/College.js'
import { emitToCollege } from '../services/socket.service.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import { logActivity } from '../services/activity-log.service.js'

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
// and cannot access platform/system reports ──
async function requireCollegeAccess(req, res, next) {
  if (req.user.role === 'admin' || req.user.role === 'main_admin') {
    return next()
  }
  if (req.user.role === 'college_admin') {
    if (!req.user.collegeId) {
      return res.status(403).json({ ok: false, error: 'Access denied: No college associated.' })
    }
    req.collegeId = req.user.collegeId
    // College admins should only see post and comment reports, not platform/system reports
    req.isCollegeAdmin = true
    return next()
  }
  return res.status(403).json({ ok: false, error: 'Access denied.' })
}

// ── POST /api/reports — Create a new report (any authenticated user: Student / Faculty) ───
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

      // Resolve reporter's collegeId reliably (handles students, faculty, and legacy users)
      let reporterCollegeId = req.user.collegeId
      if (!reporterCollegeId && req.user.college) {
        const c = await College.findOne({ name: req.user.college }).select('_id')
        if (c) reporterCollegeId = c._id
      }
      if (!reporterCollegeId && type === 'post' && reportedPostId) {
        const p = await Post.findById(reportedPostId).select('collegeId')
        if (p?.collegeId) reporterCollegeId = p.collegeId
      }
      if (!reporterCollegeId) {
        return res.status(400).json({ ok: false, error: 'You must be associated with a college to submit a report.' })
      }

      // Resolve reported user
      let targetUser = reportedUserId ? await User.findById(reportedUserId).select('_id name') : null
      if (type === 'post' && reportedPostId) {
        const post = await Post.findById(reportedPostId).populate('user', 'name')
        if (!post) return res.status(404).json({ ok: false, error: 'Post not found.' })
        if (!targetUser && post.user) {
          targetUser = post.user
        }
      }

      const report = await Report.create({
        reporterId: req.user._id,
        reporterName: req.user.name,
        reportedUserId: targetUser?._id || reportedUserId || null,
        reportedUserName: targetUser?.name || 'Unknown',
        reportedPostId: reportedPostId || null,
        reportedCommentId: reportedCommentId || null,
        type,
        category,
        description,
        collegeId: reporterCollegeId,
        college: req.user.college || '',
      })

      // Realtime notification to College Admin
      try {
        emitToCollege(reporterCollegeId, 'report:new', { report })
      } catch (socketErr) {
        console.warn('[Report] Socket notification error:', socketErr?.message)
      }

      // Audit Log
      await logActivity({
        userId: req.user._id,
        userName: req.user.name,
        userRole: req.user.role,
        collegeId: reporterCollegeId,
        action: 'REPORT_SUBMITTED',
        targetType: type.toUpperCase(),
        targetId: report._id,
        description: `${req.user.name} (${req.user.role}) reported a ${type} (${category}): "${description.slice(0, 80)}"`,
      }).catch(err => console.warn('[Report] Failed to log activity:', err))

      res.status(201).json({ ok: true, report })
    } catch (err) {
      console.error('[POST /reports]', err)
      res.status(500).json({ ok: false, error: 'Failed to submit report. Please try again.' })
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
      // College admins can ONLY see post and comment reports, NOT platform or system reports
      filter.type = { $in: ['post', 'comment'] }
    }
    if (status) filter.status = status
    if (type) {
      // For college admins, ensure type is only post or comment
      if (req.user.role === 'college_admin' && !['post', 'comment'].includes(type)) {
        return res.status(403).json({ ok: false, error: 'Access denied: College admins can only view post and comment reports.' })
      }
      filter.type = type
    }

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
    if (req.user.role === 'college_admin') {
      if (!report.collegeId || !report.collegeId.equals(req.user.collegeId)) {
        return res.status(403).json({ ok: false, error: 'Access denied: You can only view reports from your college.' })
      }
      // College admins cannot access platform or system reports
      if (report.type === 'platform' || report.category === 'platform_bug' || report.category === 'college_admin_misconduct' || report.category === 'feature_request') {
        return res.status(403).json({ ok: false, error: 'Access denied: College admins cannot view platform or system reports.' })
      }
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
      if (req.user.role === 'college_admin') {
        if (!report.collegeId || !report.collegeId.equals(req.user.collegeId)) {
          return res.status(403).json({ ok: false, error: 'Access denied: You can only manage reports from your college.' })
        }
        // College admins cannot manage platform or system reports
        if (report.type === 'platform' || report.category === 'platform_bug' || report.category === 'college_admin_misconduct' || report.category === 'feature_request') {
          return res.status(403).json({ ok: false, error: 'Access denied: College admins cannot manage platform or system reports.' })
        }
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

      // Log the action
      const actionType = status === 'resolved' ? 'report_resolved' : status === 'dismissed' ? 'report_dismissed' : 'report_reviewed'
      await logActivity({
        adminId: req.user._id,
        adminName: req.user.name,
        adminRole: req.user.role,
        collegeId: req.user.collegeId,
        college: req.user.college,
        actionType,
        resourceType: 'report',
        resourceId: report._id,
        resourceName: `${report.type} report #${report._id.toString().slice(-6)}`,
        details: resolutionNotes || `Status changed to ${status}`,
        ipAddress: req.ip,
      })

      res.json({ ok: true, report })
    } catch (err) {
      console.error('[PATCH /reports/:id/status]', err)
      res.status(500).json({ ok: false, error: 'Failed to update report status.' })
    }
  }
)

export default router
