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

/**
 * Calculates percentage growth with strict zero-baseline and division-by-zero protection.
 */
function calculateGrowth(current, previous) {
  const curr = typeof current === 'number' && !Number.isNaN(current) ? current : 0
  const prev = typeof previous === 'number' && !Number.isNaN(previous) ? previous : 0

  if (prev === 0) {
    if (curr === 0) {
      return { percentage: 0, direction: 'neutral', label: '0%', current: curr, previous: prev }
    }
    return { percentage: 100, direction: 'up', label: `+${curr} new`, current: curr, previous: prev }
  }

  const diff = curr - prev
  const pct = Math.round((diff / prev) * 1000) / 10

  if (pct > 0) {
    return { percentage: pct, direction: 'up', label: `+${pct}%`, current: curr, previous: prev }
  } else if (pct < 0) {
    return { percentage: pct, direction: 'down', label: `${pct}%`, current: curr, previous: prev }
  }
  return { percentage: 0, direction: 'neutral', label: '0%', current: curr, previous: prev }
}

/**
 * Generates an unbroken array of ISO date or hour strings for chart timelines.
 */
function generateTimeSlots(startDate, endDate, period) {
  const slots = []
  if (period === 'today') {
    // Generate 24 hourly slots
    for (let h = 0; h < 24; h++) {
      slots.push(`${String(h).padStart(2, '0')}:00`)
    }
    return slots
  }

  const curr = new Date(startDate)
  curr.setUTCHours(0, 0, 0, 0)
  const end = new Date(endDate)
  end.setUTCHours(23, 59, 59, 999)

  while (curr <= end) {
    slots.push(curr.toISOString().slice(0, 10))
    curr.setUTCDate(curr.getUTCDate() + 1)
  }
  return slots
}

// ── GET /api/analytics/dashboard ─────────────────────────────────────────────────
// Query params: period (today|7days|30days|all), startDate, endDate
router.get('/dashboard', requireAuth, requireRole('admin', 'college_admin', 'main_admin'), requireCollegeAccess, async (req, res) => {
  try {
    const collegeId = req.user.role === 'college_admin' ? req.user.collegeId : null
    const filter = collegeId ? { collegeId } : {}

    // Get all user IDs in the college for post/comment filtering
    const collegeUsers = collegeId
      ? await User.find({ collegeId }).select('_id').lean()
      : null
    const collegeUserIds = collegeUsers ? collegeUsers.map(u => u._id) : null

    const postFilter = collegeUserIds ? { user: { $in: collegeUserIds }, isDeleted: false } : { isDeleted: false }
    const commentFilter = collegeUserIds ? { user: { $in: collegeUserIds }, isDeleted: false } : { isDeleted: false }
    const reportFilter = collegeId ? { collegeId } : {}

    const now = new Date()
    const period = req.query.period || 'today'

    let currentStart, currentEnd, previousStart, previousEnd
    let dateFormat = '%Y-%m-%d'

    if (period === 'today') {
      currentStart = new Date(now)
      currentStart.setUTCHours(0, 0, 0, 0)
      currentEnd = new Date(now)
      currentEnd.setUTCHours(23, 59, 59, 999)

      previousStart = new Date(currentStart.getTime() - 24 * 60 * 60 * 1000)
      previousEnd = new Date(currentEnd.getTime() - 24 * 60 * 60 * 1000)
      dateFormat = '%H:00'
    } else if (period === '7days') {
      currentStart = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      currentEnd = now

      previousStart = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
      previousEnd = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
      dateFormat = '%Y-%m-%d'
    } else if (period === '30days') {
      currentStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      currentEnd = now

      previousStart = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
      previousEnd = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      dateFormat = '%Y-%m-%d'
    } else if (req.query.startDate && req.query.endDate) {
      currentStart = new Date(req.query.startDate)
      currentEnd = new Date(req.query.endDate)
      const spanMs = currentEnd.getTime() - currentStart.getTime()
      previousStart = new Date(currentStart.getTime() - spanMs)
      previousEnd = new Date(currentStart.getTime())
      dateFormat = '%Y-%m-%d'
    } else {
      // 'all' period
      currentStart = new Date(0)
      currentEnd = now
      previousStart = new Date(0)
      previousEnd = new Date(0)
      dateFormat = '%Y-%m-%d'
    }

    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Parallel queries for all metrics & trends
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
      reportsByStatus,
      departments,
      // Current vs Previous Period (for Growth Calculations)
      currentPeriodUsers,
      previousPeriodUsers,
      currentPeriodPosts,
      previousPeriodPosts,
      currentPeriodComments,
      previousPeriodComments,
      currentPeriodReports,
      previousPeriodReports,
      currentPeriodResolved,
      previousPeriodResolved,
      // Timeline Aggregations
      rawPostTrends,
      rawCommentTrends,
      rawUserTrends,
      rawReportTrends,
      rawResolvedTrends,
    ] = await Promise.all([
      // 1. Total users
      User.countDocuments({ ...filter, deactivated: false }),

      // 2. Active users (not suspended, not deactivated)
      User.countDocuments({ ...filter, deactivated: false, suspended: false }),

      // 3. Suspended users
      User.countDocuments({ ...filter, suspended: true, deactivated: false }),

      // 4. Users in last 7 days
      User.countDocuments({ ...filter, deactivated: false, createdAt: { $gte: sevenDaysAgo } }),

      // 5. Users in last 30 days
      User.countDocuments({ ...filter, deactivated: false, createdAt: { $gte: thirtyDaysAgo } }),

      // 6. Total posts
      Post.countDocuments(postFilter),

      // 7. Total comments
      Comment.countDocuments(commentFilter),

      // 8. Total likes
      Post.aggregate([
        { $match: postFilter },
        { $project: { likeCount: { $size: { $ifNull: ['$likes', []] } } } },
        { $group: { _id: null, total: { $sum: '$likeCount' } } },
      ]),

      // 9. Posts in last 7 days
      Post.countDocuments({ ...postFilter, createdAt: { $gte: sevenDaysAgo } }),

      // 10. Posts in last 30 days
      Post.countDocuments({ ...postFilter, createdAt: { $gte: thirtyDaysAgo } }),

      // 11. Reports by status
      Report.aggregate([
        { $match: reportFilter },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // 12. Department distribution
      collegeId
        ? User.aggregate([
            { $match: { collegeId, deactivated: false } },
            { $group: { _id: '$dept', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ])
        : [],

      // ── Current vs Previous Period Counts ──
      // 13. Current Period Users
      User.countDocuments({ ...filter, deactivated: false, createdAt: { $gte: currentStart, $lte: currentEnd } }),

      // 14. Previous Period Users
      previousStart.getTime() > 0
        ? User.countDocuments({ ...filter, deactivated: false, createdAt: { $gte: previousStart, $lte: previousEnd } })
        : Promise.resolve(0),

      // 15. Current Period Posts
      Post.countDocuments({ ...postFilter, createdAt: { $gte: currentStart, $lte: currentEnd } }),

      // 16. Previous Period Posts
      previousStart.getTime() > 0
        ? Post.countDocuments({ ...postFilter, createdAt: { $gte: previousStart, $lte: previousEnd } })
        : Promise.resolve(0),

      // 17. Current Period Comments
      Comment.countDocuments({ ...commentFilter, createdAt: { $gte: currentStart, $lte: currentEnd } }),

      // 18. Previous Period Comments
      previousStart.getTime() > 0
        ? Comment.countDocuments({ ...commentFilter, createdAt: { $gte: previousStart, $lte: previousEnd } })
        : Promise.resolve(0),

      // 19. Current Period Reports Filed
      Report.countDocuments({ ...reportFilter, createdAt: { $gte: currentStart, $lte: currentEnd } }),

      // 20. Previous Period Reports Filed
      previousStart.getTime() > 0
        ? Report.countDocuments({ ...reportFilter, createdAt: { $gte: previousStart, $lte: previousEnd } })
        : Promise.resolve(0),

      // 21. Current Period Reports Resolved
      Report.countDocuments({ ...reportFilter, status: { $in: ['resolved', 'dismissed'] }, updatedAt: { $gte: currentStart, $lte: currentEnd } }),

      // 22. Previous Period Reports Resolved
      previousStart.getTime() > 0
        ? Report.countDocuments({ ...reportFilter, status: { $in: ['resolved', 'dismissed'] }, updatedAt: { $gte: previousStart, $lte: previousEnd } })
        : Promise.resolve(0),

      // ── Timeline Trends Aggregations ──
      // 23. Post trends over period
      Post.aggregate([
        { $match: { ...postFilter, createdAt: { $gte: currentStart, $lte: currentEnd } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // 24. Comment trends over period
      Comment.aggregate([
        { $match: { ...commentFilter, createdAt: { $gte: currentStart, $lte: currentEnd } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // 25. User registration trends over period
      User.aggregate([
        { $match: { ...filter, deactivated: false, createdAt: { $gte: currentStart, $lte: currentEnd } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // 26. Reports filed trends over period
      Report.aggregate([
        { $match: { ...reportFilter, createdAt: { $gte: currentStart, $lte: currentEnd } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$createdAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),

      // 27. Moderation actions / resolved trends over period
      Report.aggregate([
        { $match: { ...reportFilter, status: { $in: ['resolved', 'dismissed'] }, updatedAt: { $gte: currentStart, $lte: currentEnd } } },
        { $group: { _id: { $dateToString: { format: dateFormat, date: '$updatedAt' } }, count: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]),
    ])

    // Format reports status map
    const reportStats = {
      pending: 0,
      reviewed: 0,
      resolved: 0,
      dismissed: 0,
    }
    reportsByStatus.forEach(r => {
      if (reportStats.hasOwnProperty(r._id)) {
        reportStats[r._id] = r.count
      }
    })

    const totalLikesCount = totalLikes[0]?.total || 0

    const departmentDistribution = departments.map(d => ({
      department: d._id || 'Unassigned',
      count: d.count,
    }))

    // Build timeline maps for zero-baseline preservation
    const postMap = new Map(rawPostTrends.map(t => [t._id, t.count]))
    const commentMap = new Map(rawCommentTrends.map(t => [t._id, t.count]))
    const userMap = new Map(rawUserTrends.map(t => [t._id, t.count]))
    const reportMap = new Map(rawReportTrends.map(t => [t._id, t.count]))
    const resolvedMap = new Map(rawResolvedTrends.map(t => [t._id, t.count]))

    // Generate unbroken slot timeline
    const timeSlots = generateTimeSlots(currentStart, currentEnd, period)

    let runningCumulativeUsers = Math.max(0, totalUsers - currentPeriodUsers)

    // Activity Trends (Combined Posts & Comments)
    const activityTrends = timeSlots.map(slot => {
      const pCount = postMap.get(slot) || 0
      const cCount = commentMap.get(slot) || 0
      return {
        date: slot,
        posts: pCount,
        comments: cCount,
        count: pCount + cCount,
        total: pCount + cCount,
      }
    })

    // User Registration Trends (Daily / Hourly & Cumulative)
    const userTrends = timeSlots.map(slot => {
      const uCount = userMap.get(slot) || 0
      runningCumulativeUsers += uCount
      return {
        date: slot,
        count: uCount,
        users: uCount,
        cumulative: runningCumulativeUsers,
      }
    })

    // Moderation & Report Trends
    const moderationTrends = timeSlots.map(slot => {
      const repCount = reportMap.get(slot) || 0
      const resCount = resolvedMap.get(slot) || 0
      return {
        date: slot,
        reports: repCount,
        resolved: resCount,
      }
    })

    // Growth Metrics & Comparison Periods
    const growth = {
      users: calculateGrowth(currentPeriodUsers, previousPeriodUsers),
      posts: calculateGrowth(currentPeriodPosts, previousPeriodPosts),
      comments: calculateGrowth(currentPeriodComments, previousPeriodComments),
      reports: calculateGrowth(currentPeriodReports, previousPeriodReports),
      resolved: calculateGrowth(currentPeriodResolved, previousPeriodResolved),
      comparisonLabel:
        period === 'today'
          ? 'vs yesterday'
          : period === '7days'
          ? 'vs prior 7 days'
          : period === '30days'
          ? 'vs prior 30 days'
          : 'vs prior period',
    }

    res.json({
      ok: true,
      analytics: {
        period,
        dateRange: {
          start: currentStart.toISOString(),
          end: currentEnd.toISOString(),
          previousStart: previousStart.toISOString(),
          previousEnd: previousEnd.toISOString(),
        },
        users: {
          total: totalUsers,
          active: activeUsers,
          suspended: suspendedUsers,
          new7Days: newUsers7Days,
          new30Days: newUsers30Days,
          newToday: currentPeriodUsers,
          currentPeriod: currentPeriodUsers,
          previousPeriod: previousPeriodUsers,
        },
        content: {
          totalPosts: totalPosts,
          totalComments: totalComments,
          totalLikes: totalLikesCount,
          posts7Days: posts7Days,
          posts30Days: posts30Days,
          postsToday: currentPeriodPosts,
          commentsToday: currentPeriodComments,
          currentPeriodPosts,
          currentPeriodComments,
        },
        reports: {
          ...reportStats,
          currentPeriod: currentPeriodReports,
          currentPeriodResolved,
        },
        departmentDistribution,
        // Charts & Time Series
        postTrends: activityTrends, // Backwards-compatible alias for existing callers
        activityTrends,
        userTrends,
        moderationTrends,
        // Comparative Growth
        growth,
      },
    })
  } catch (err) {
    console.error('[GET /api/analytics/dashboard]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch analytics.' })
  }
})

export default router
