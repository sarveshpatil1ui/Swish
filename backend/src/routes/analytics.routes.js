import { Router } from 'express'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import User from '../models/User.js'
import Post from '../models/Post.js'
import Comment from '../models/Comment.js'
import Report from '../models/Report.js'
import Department from '../models/Department.js'

const router = Router()

// College-scoped access middleware
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

// ── GET /api/analytics/dashboard ─────────────────────────────────────────────────
router.get('/dashboard', requireAuth, requireRole('admin', 'college_admin', 'main_admin'), requireCollegeAccess, async (req, res) => {
  try {
    const collegeId = req.user.role === 'college_admin' ? req.user.collegeId : null
    const filter = collegeId ? { collegeId } : {}

    // Get all user IDs in the college for post/comment filtering
    const collegeUserIds = collegeId 
      ? (await User.find({ collegeId }).select('_id').lean()).map(u => u._id)
      : null

    const now = new Date()
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)

    // Parallel queries for metrics
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      newUsers7Days,
      newUsers30Days,
      totalPosts,
      totalComments,
      totalLikes,
      posts7Days,
      posts30Days,
      reports,
      departments,
      postTrends,
    ] = await Promise.all([
      // Total users
      User.countDocuments({ ...filter, deactivated: false }),

      // Active users (not suspended, not deactivated)
      User.countDocuments({ ...filter, deactivated: false, suspended: false }),

      // Suspended users
      User.countDocuments({ ...filter, suspended: true, deactivated: false }),

      // New users in last 7 days
      User.countDocuments({ ...filter, deactivated: false, createdAt: { $gte: sevenDaysAgo } }),

      // New users in last 30 days
      User.countDocuments({ ...filter, deactivated: false, createdAt: { $gte: thirtyDaysAgo } }),

      // Total posts (college-scoped)
      collegeUserIds
        ? Post.countDocuments({ user: { $in: collegeUserIds }, isDeleted: false })
        : Post.countDocuments({ isDeleted: false }),

      // Total comments (college-scoped)
      collegeUserIds
        ? Comment.countDocuments({ user: { $in: collegeUserIds }, isDeleted: false })
        : Comment.countDocuments({ isDeleted: false }),

      // Total likes (aggregate from posts)
      collegeUserIds
        ? Post.aggregate([
            { $match: { user: { $in: collegeUserIds }, isDeleted: false } },
            { $project: { likeCount: { $size: '$likes' } } },
            { $group: { _id: null, total: { $sum: '$likeCount' } } }
          ])
        : Post.aggregate([
            { $match: { isDeleted: false } },
            { $project: { likeCount: { $size: '$likes' } } },
            { $group: { _id: null, total: { $sum: '$likeCount' } } }
          ]),

      // Posts in last 7 days
      collegeUserIds
        ? Post.countDocuments({ user: { $in: collegeUserIds }, isDeleted: false, createdAt: { $gte: sevenDaysAgo } })
        : Post.countDocuments({ isDeleted: false, createdAt: { $gte: sevenDaysAgo } }),

      // Posts in last 30 days
      collegeUserIds
        ? Post.countDocuments({ user: { $in: collegeUserIds }, isDeleted: false, createdAt: { $gte: thirtyDaysAgo } })
        : Post.countDocuments({ isDeleted: false, createdAt: { $gte: thirtyDaysAgo } }),

      // Reports by status
      Report.aggregate([
        { $match: filter },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Department-wise user distribution
      collegeId
        ? User.aggregate([
            { $match: { collegeId, deactivated: false } },
            { $group: { _id: '$dept', count: { $sum: 1 } } },
            { $sort: { count: -1 } }
          ])
        : [],

      // Post trends over last 30 days (daily)
      collegeUserIds
        ? Post.aggregate([
            { $match: { user: { $in: collegeUserIds }, isDeleted: false, createdAt: { $gte: thirtyDaysAgo } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ])
        : Post.aggregate([
            { $match: { isDeleted: false, createdAt: { $gte: thirtyDaysAgo } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ]),
    ])

    // Format reports
    const reportStats = {
      pending: 0,
      reviewed: 0,
      resolved: 0,
      dismissed: 0,
    }
    reports.forEach(r => {
      if (reportStats.hasOwnProperty(r._id)) {
        reportStats[r._id] = r.count
      }
    })

    // Format total likes
    const totalLikesCount = totalLikes[0]?.total || 0

    // Format department distribution
    const departmentDistribution = departments.map(d => ({
      department: d._id || 'Unassigned',
      count: d.count,
    }))

    // Format post trends
    const postTrendsData = postTrends.map(t => ({
      date: t._id,
      count: t.count,
    }))

    res.json({
      ok: true,
      analytics: {
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
          new7Days: newUsers7Days,
          new30Days: newUsers30Days,
        },
        content: {
          totalPosts: totalPosts,
          totalComments: totalComments,
          totalLikes: totalLikesCount,
          posts7Days: posts7Days,
          posts30Days: posts30Days,
        },
        reports: reportStats,
        departmentDistribution,
        postTrends: postTrendsData,
      },
    })
  } catch (err) {
    console.error('[GET /api/analytics/dashboard]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch analytics.' })
  }
})

export default router
