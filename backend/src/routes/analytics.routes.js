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
// Query params: period (today|7days|30days|all), startDate, endDate
router.get('/dashboard', requireAuth, requireRole('admin', 'college_admin', 'main_admin'), requireCollegeAccess, async (req, res) => {
  try {
    const collegeId = req.user.role === 'college_admin' ? req.user.collegeId : null
    const filter = collegeId ? { collegeId } : {}

    // Get all user IDs in the college for post/comment filtering
    const collegeUserIds = collegeId
      ? (await User.find({ collegeId }).select('_id').lean()).map(u => u._id)
      : null

    const now = new Date()
    const period = req.query.period || 'all'
    let startDate, endDate

    // Calculate date range based on period
    if (period === 'today') {
      // Today from midnight to next midnight in UTC
      startDate = new Date(now)
      startDate.setUTCHours(0, 0, 0, 0)
      endDate = new Date(now)
      endDate.setUTCHours(23, 59, 59, 999)
    } else if (period === '7days') {
      startDate = new Date(now - 7 * 24 * 60 * 60 * 1000)
      endDate = now
    } else if (period === '30days') {
      startDate = new Date(now - 30 * 24 * 60 * 60 * 1000)
      endDate = now
    } else if (req.query.startDate && req.query.endDate) {
      startDate = new Date(req.query.startDate)
      endDate = new Date(req.query.endDate)
    }

    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000)

    // Date filter for queries
    const dateFilter = (startDate && endDate) ? { createdAt: { $gte: startDate, $lte: endDate } } : {}

    // Parallel queries for metrics
    const [
      totalUsers,
      activeUsers,
      suspendedUsers,
      newUsers7Days,
      newUsers30Days,
      newUsersToday,
      totalPosts,
      totalComments,
      totalLikes,
      posts7Days,
      posts30Days,
      postsToday,
      commentsToday,
      reports,
      departments,
      postTrends,
      userTrends,
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

      // New users today
      User.countDocuments({ ...filter, deactivated: false, ...dateFilter }),

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

      // Posts today
      collegeUserIds
        ? Post.countDocuments({ user: { $in: collegeUserIds }, isDeleted: false, ...dateFilter })
        : Post.countDocuments({ isDeleted: false, ...dateFilter }),

      // Comments today
      collegeUserIds
        ? Comment.countDocuments({ user: { $in: collegeUserIds }, isDeleted: false, ...dateFilter })
        : Comment.countDocuments({ isDeleted: false, ...dateFilter }),

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
            { $match: { user: { $in: collegeUserIds }, isDeleted: false, createdAt: { $gte: thirtyDaysAgo } } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ])
        : Post.aggregate([
            { $match: { isDeleted: false, createdAt: { $gte: thirtyDaysAgo } } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ]),

      // User registration trends over last 30 days (daily)
      collegeId
        ? User.aggregate([
            { $match: { collegeId, deactivated: false, createdAt: { $gte: thirtyDaysAgo } } },
            { $group: {
                _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                count: { $sum: 1 }
              }
            },
            { $sort: { _id: 1 } }
          ])
        : User.aggregate([
            { $match: { deactivated: false, createdAt: { $gte: thirtyDaysAgo } } },
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

    // Format user trends
    const userTrendsData = userTrends.map(t => ({
      date: t._id,
      count: t.count,
    }))

    res.json({
      ok: true,
      analytics: {
        period,
        dateRange: startDate && endDate ? { start: startDate.toISOString(), end: endDate.toISOString() } : null,
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
          new7Days: newUsers7Days,
          new30Days: newUsers30Days,
          newToday: newUsersToday,
        },
        content: {
          totalPosts: totalPosts,
          totalComments: totalComments,
          totalLikes: totalLikesCount,
          posts7Days: posts7Days,
          posts30Days: posts30Days,
          postsToday: postsToday,
          commentsToday: commentsToday,
        },
        reports: reportStats,
        departmentDistribution,
        postTrends: postTrendsData,
        userTrends: userTrendsData,
      },
    })
  } catch (err) {
    console.error('[GET /api/analytics/dashboard]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch analytics.' })
  }
})

export default router
