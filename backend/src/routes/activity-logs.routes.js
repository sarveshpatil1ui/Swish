// backend/src/routes/activity-logs.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// Activity Log routes for College Admin auditing
//
// College Admin can only view logs from their college
// Super admins can view all logs
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import ActivityLog from '../models/ActivityLog.js'

const router = Router()

// Middleware to ensure user can only access their college's logs
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
    return next()
  }
  return res.status(403).json({ ok: false, error: 'Access denied.' })
}

// ── GET /api/activity-logs ───────────────────────────────────────────────────
// Get activity logs with pagination and filtering
router.get('/', requireAuth, requireRole('admin', 'college_admin', 'main_admin'), requireCollegeAccess, async (req, res) => {
  try {
    const { actionType, resourceType, limit = 50, skip = 0, startDate, endDate } = req.query

    const filter = {}
    if (req.user.role === 'college_admin') {
      filter.collegeId = req.user.collegeId
    }
    if (actionType) filter.actionType = actionType
    if (resourceType) filter.resourceType = resourceType
    if (startDate) {
      filter.createdAt = { $gte: new Date(startDate) }
    }
    if (endDate) {
      filter.createdAt = { ...filter.createdAt, $lte: new Date(endDate) }
    }

    const logs = await ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean()

    const total = await ActivityLog.countDocuments(filter)

    res.json({ ok: true, logs, total })
  } catch (err) {
    console.error('[GET /activity-logs]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch activity logs.' })
  }
})

// ── GET /api/activity-logs/stats ─────────────────────────────────────────────
// Get activity log statistics for the college
router.get('/stats', requireAuth, requireRole('admin', 'college_admin', 'main_admin'), requireCollegeAccess, async (req, res) => {
  try {
    const filter = req.user.role === 'college_admin' ? { collegeId: req.user.collegeId } : {}

    const stats = await ActivityLog.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$actionType',
          count: { $sum: 1 },
        },
      },
      { $sort: { count: -1 } },
    ])

    const totalLogs = await ActivityLog.countDocuments(filter)

    res.json({ ok: true, stats, totalLogs })
  } catch (err) {
    console.error('[GET /activity-logs/stats]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch activity log statistics.' })
  }
})

export default router
