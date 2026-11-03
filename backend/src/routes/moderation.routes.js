import { Router } from 'express'
import mongoose from 'mongoose'
import { body, validationResult } from 'express-validator'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import Post from '../models/Post.js'
import Comment from '../models/Comment.js'
import User from '../models/User.js'
import College from '../models/College.js'
import Report from '../models/Report.js'
import { logActivity } from '../services/activity-log.service.js'
import { broadcastEvent } from '../services/socket.service.js'
import {
  resolveUserCollege,
  buildCollegeUserFilter,
  isUserInCollege,
  autoHealCollegeUsers,
} from '../services/college-reconciliation.service.js'

const router = Router()

// College-scoped access middleware
async function requireCollegeAccess(req, res, next) {
  if (req.user.role === 'admin' || req.user.role === 'main_admin') {
    return next()
  }
  if (req.user.role === 'college_admin') {
    const college = await resolveUserCollege(req.user)
    if (!college) {
      return res.status(403).json({ ok: false, error: 'Access denied: No college associated.' })
    }
    req.college = college
    req.collegeId = college._id
    return next()
  }
  return res.status(403).json({ ok: false, error: 'Access denied.' })
}

// Helper to check if content belongs to college admin's college
async function validateCollegeAccess(content, college) {
  if (!college) return true // Super admin / main admin
  const collegeIdStr = college._id.toString()
  if (content.collegeId && content.collegeId.toString() === collegeIdStr) {
    return true
  }
  const author = await User.findById(content.user)
  if (!author) return false
  return isUserInCollege(author, college)
}

// ── GET /api/moderation/posts ─────────────────────────────────────────────────
// Get all posts for college admin's college or platform-wide for main admin.
// Supports search, status, role, dept, sort, and pagination.
router.get(
  '/posts',
  requireAuth,
  requireRole('admin', 'college_admin', 'main_admin'),
  requireCollegeAccess,
  async (req, res) => {
    try {
      const isMainAdmin = req.user.role === 'admin' || req.user.role === 'main_admin'
      let college = null

      if (!isMainAdmin) {
        college = req.college || (await resolveUserCollege(req.user))
        if (!college) {
          return res.status(403).json({ ok: false, error: 'Access denied: No college associated.' })
        }
        autoHealCollegeUsers(college).catch(() => {})
      } else if (req.query.collegeId) {
        try {
          college = await College.findById(req.query.collegeId)
        } catch {
          // ignore invalid ObjectId
        }
      }

      const {
        search,
        q,
        status = 'all',
        role = 'all',
        dept = 'all',
        sort = 'newest',
        page = 1,
        limit = 20,
      } = req.query

      const searchTerm = (search || q || '').trim()
      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
      const skip = (pageNum - 1) * limitNum

      // 1. Build author/user filter
      let authorFilter = college ? buildCollegeUserFilter(college) : {}

      if (role && role !== 'all') {
        const roleClause = { role }
        if (authorFilter.$and) {
          authorFilter.$and.push(roleClause)
        } else if (Object.keys(authorFilter).length > 0) {
          authorFilter = { $and: [authorFilter, roleClause] }
        } else {
          authorFilter = roleClause
        }
      }

      if (dept && dept !== 'all') {
        const escapedDept = dept.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const deptClause = {
          $or: [
            { dept: new RegExp(`^${escapedDept}$`, 'i') },
            ...(mongoose.Types.ObjectId.isValid(dept) ? [{ departmentId: dept }] : []),
          ],
        }
        if (authorFilter.$and) {
          authorFilter.$and.push(deptClause)
        } else if (Object.keys(authorFilter).length > 0) {
          authorFilter = { $and: [authorFilter, deptClause] }
        } else {
          authorFilter = deptClause
        }
      }

      // Fetch eligible user IDs for this scope
      let eligibleUserIds = null
      if (college || (role && role !== 'all') || (dept && dept !== 'all')) {
        const eligibleUsers = await User.find(authorFilter).select('_id').lean()
        eligibleUserIds = eligibleUsers.map((u) => u._id)

        // Include any user whose posts are directly tagged with this college (if role/dept are unconstrained)
        if (college && role === 'all' && dept === 'all') {
          const postsUsers = await Post.distinct('user', { collegeId: college._id, isDeleted: false })
          const combined = new Set([...eligibleUserIds.map(String), ...postsUsers.map(String)])
          eligibleUserIds = Array.from(combined).map((id) => new mongoose.Types.ObjectId(id))
        }
      }

      // 2. Base post query
      const postFilter = { isDeleted: false }

      if (college) {
        postFilter.$and = postFilter.$and || []
        postFilter.$and.push({
          $or: [
            { user: { $in: eligibleUserIds || [] } },
            { collegeId: college._id },
          ],
        })
        // Enforce strict college isolation: never return posts belonging to other colleges
        postFilter.$and.push({
          $or: [
            { collegeId: college._id },
            { collegeId: null },
            { collegeId: { $exists: false } },
          ],
        })
      } else if (eligibleUserIds !== null) {
        postFilter.user = { $in: eligibleUserIds }
      }

      // 3. Search filter
      if (searchTerm) {
        const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

        const userSearchClause = {
          $or: [{ name: searchRegex }, { username: searchRegex }],
        }
        const searchUserFilter =
          eligibleUserIds !== null
            ? { _id: { $in: eligibleUserIds }, ...userSearchClause }
            : userSearchClause

        const matchedUserDocs = await User.find(searchUserFilter).select('_id').lean()
        const searchMatchedUserIds = matchedUserDocs.map((u) => u._id)

        postFilter.$and = postFilter.$and || []
        postFilter.$and.push({
          $or: [
            { caption: searchRegex },
            { user: { $in: searchMatchedUserIds } },
          ],
        })
      }

      // 4. Status filter
      const reportedPostIds = await Report.distinct('reportedPostId', { reportedPostId: { $ne: null } })

      if (status === 'reported') {
        postFilter.$and = postFilter.$and || []
        postFilter.$and.push({ _id: { $in: reportedPostIds } })
      } else if (status === 'unreported') {
        postFilter.$and = postFilter.$and || []
        postFilter.$and.push({ _id: { $nin: reportedPostIds } })
      } else if (status === 'hidden') {
        postFilter.hidden = true
      } else if (status === 'visible') {
        postFilter.hidden = false
      }

      // 5. Compute stats for summary cards
      const statsBaseFilter = { isDeleted: false }
      if (college) {
        statsBaseFilter.$and = [
          {
            $or: [
              { user: { $in: eligibleUserIds || [] } },
              { collegeId: college._id },
            ],
          },
          {
            $or: [
              { collegeId: college._id },
              { collegeId: null },
              { collegeId: { $exists: false } },
            ],
          },
        ]
      } else if (eligibleUserIds !== null) {
        statsBaseFilter.user = { $in: eligibleUserIds }
      }

      const [totalPostsCount, hiddenPostsCount] = await Promise.all([
        Post.countDocuments(statsBaseFilter),
        Post.countDocuments({ ...statsBaseFilter, hidden: true }),
      ])

      const reportedScopeFilter = {
        ...statsBaseFilter,
        _id: { $in: reportedPostIds },
      }
      const reportedPostsCount = await Post.countDocuments(reportedScopeFilter)

      // 6. Query matching posts
      let posts = []
      let total = 0

      if (sort === 'reports') {
        const reportCountDocs = await Report.aggregate([
          { $match: { reportedPostId: { $ne: null } } },
          { $group: { _id: '$reportedPostId', count: { $sum: 1 } } },
        ])
        const reportCountMap = new Map(reportCountDocs.map((r) => [r._id.toString(), r.count]))

        const allMatchingPosts = await Post.find(postFilter)
          .populate(
            'user',
            'name username initials avatarColor profilePhoto collegeId college dept departmentId role designation year studentId employeeId verifiedBadge suspended'
          )
          .lean()

        allMatchingPosts.sort((a, b) => {
          const countA = reportCountMap.get(a._id.toString()) || 0
          const countB = reportCountMap.get(b._id.toString()) || 0
          if (countB !== countA) return countB - countA
          return new Date(b.createdAt) - new Date(a.createdAt)
        })

        total = allMatchingPosts.length
        posts = allMatchingPosts.slice(skip, skip + limitNum)
      } else {
        const sortObj = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 }
        total = await Post.countDocuments(postFilter)
        posts = await Post.find(postFilter)
          .populate(
            'user',
            'name username initials avatarColor profilePhoto collegeId college dept departmentId role designation year studentId employeeId verifiedBadge suspended'
          )
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean()
      }

      // 7. Attach reports to the returned posts
      const postIds = posts.map((p) => p._id)
      const postReports = await Report.find({ reportedPostId: { $in: postIds } })
        .sort({ createdAt: -1 })
        .lean()

      const reportsByPostId = new Map()
      for (const report of postReports) {
        const pid = report.reportedPostId.toString()
        if (!reportsByPostId.has(pid)) reportsByPostId.set(pid, [])
        reportsByPostId.get(pid).push(report)
      }

      const annotatedPosts = posts.map((post) => {
        const pReports = reportsByPostId.get(post._id.toString()) || []
        return {
          ...post,
          id: post._id.toString(),
          isReported: pReports.length > 0,
          reportCount: pReports.length,
          activeReportCount: pReports.filter((r) => r.status === 'pending' || r.status === 'reviewed').length,
          reports: pReports.map((r) => ({
            _id: r._id,
            id: r._id.toString(),
            category: r.category,
            description: r.description,
            status: r.status,
            reporterName: r.reporterName,
            reporterRole: r.reporterRole,
            createdAt: r.createdAt,
            resolutionNotes: r.resolutionNotes || r.resolutionNote || '',
          })),
        }
      })

      const totalPages = Math.ceil(total / limitNum) || 1

      res.json({
        ok: true,
        posts: annotatedPosts,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
        },
        stats: {
          totalPosts: totalPostsCount,
          reportedCount: reportedPostsCount,
          hiddenCount: hiddenPostsCount,
        },
      })
    } catch (err) {
      console.error('[GET /api/moderation/posts]', err)
      res.status(500).json({ ok: false, error: 'Failed to fetch posts.' })
    }
  }
)

// ── GET /api/moderation/comments ───────────────────────────────────────────────
// Get all comments for college admin's college or platform-wide for main admin.
// Supports search, status, role, dept, sort, and pagination.
router.get(
  '/comments',
  requireAuth,
  requireRole('admin', 'college_admin', 'main_admin'),
  requireCollegeAccess,
  async (req, res) => {
    try {
      const isMainAdmin = req.user.role === 'admin' || req.user.role === 'main_admin'
      let college = null

      if (!isMainAdmin) {
        college = req.college || (await resolveUserCollege(req.user))
        if (!college) {
          return res.status(403).json({ ok: false, error: 'Access denied: No college associated.' })
        }
        autoHealCollegeUsers(college).catch(() => {})
      } else if (req.query.collegeId) {
        try {
          college = await College.findById(req.query.collegeId)
        } catch {
          // ignore invalid ObjectId
        }
      }

      const {
        search,
        q,
        status = 'all',
        role = 'all',
        dept = 'all',
        sort = 'newest',
        page = 1,
        limit = 20,
      } = req.query

      const searchTerm = (search || q || '').trim()
      const pageNum = Math.max(1, parseInt(page, 10) || 1)
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20))
      const skip = (pageNum - 1) * limitNum

      // 1. Build author filter for comments
      let authorFilter = college ? buildCollegeUserFilter(college) : {}

      if (role && role !== 'all') {
        const roleClause = { role }
        if (authorFilter.$and) {
          authorFilter.$and.push(roleClause)
        } else if (Object.keys(authorFilter).length > 0) {
          authorFilter = { $and: [authorFilter, roleClause] }
        } else {
          authorFilter = roleClause
        }
      }

      if (dept && dept !== 'all') {
        const escapedDept = dept.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        const deptClause = {
          $or: [
            { dept: new RegExp(`^${escapedDept}$`, 'i') },
            ...(mongoose.Types.ObjectId.isValid(dept) ? [{ departmentId: dept }] : []),
          ],
        }
        if (authorFilter.$and) {
          authorFilter.$and.push(deptClause)
        } else if (Object.keys(authorFilter).length > 0) {
          authorFilter = { $and: [authorFilter, deptClause] }
        } else {
          authorFilter = deptClause
        }
      }

      let eligibleUserIds = null
      if (college || (role && role !== 'all') || (dept && dept !== 'all')) {
        const eligibleUsers = await User.find(authorFilter).select('_id').lean()
        eligibleUserIds = eligibleUsers.map((u) => u._id)
      }

      // 2. Base comment filter
      const commentFilter = { isDeleted: false }
      if (eligibleUserIds !== null) {
        commentFilter.user = { $in: eligibleUserIds }
      }

      // 3. Search filter
      if (searchTerm) {
        const searchRegex = new RegExp(searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i')

        const userSearchClause = {
          $or: [{ name: searchRegex }, { username: searchRegex }],
        }
        const searchUserFilter =
          eligibleUserIds !== null
            ? { _id: { $in: eligibleUserIds }, ...userSearchClause }
            : userSearchClause

        const matchedUserDocs = await User.find(searchUserFilter).select('_id').lean()
        const searchMatchedUserIds = matchedUserDocs.map((u) => u._id)

        commentFilter.$and = commentFilter.$and || []
        commentFilter.$and.push({
          $or: [
            { text: searchRegex },
            { user: { $in: searchMatchedUserIds } },
          ],
        })
      }

      // 4. Status filter
      const reportedCommentIds = await Report.distinct('reportedCommentId', { reportedCommentId: { $ne: null } })

      if (status === 'reported') {
        commentFilter.$and = commentFilter.$and || []
        commentFilter.$and.push({ _id: { $in: reportedCommentIds } })
      } else if (status === 'unreported') {
        commentFilter.$and = commentFilter.$and || []
        commentFilter.$and.push({ _id: { $nin: reportedCommentIds } })
      } else if (status === 'hidden') {
        commentFilter.hidden = true
      } else if (status === 'visible') {
        commentFilter.hidden = false
      }

      // 5. Stats
      const statsBaseFilter = { isDeleted: false }
      if (eligibleUserIds !== null) {
        statsBaseFilter.user = { $in: eligibleUserIds }
      }

      const [totalCommentsCount, hiddenCommentsCount] = await Promise.all([
        Comment.countDocuments(statsBaseFilter),
        Comment.countDocuments({ ...statsBaseFilter, hidden: true }),
      ])

      const reportedScopeFilter = {
        ...statsBaseFilter,
        _id: { $in: reportedCommentIds },
      }
      const reportedCommentsCount = await Comment.countDocuments(reportedScopeFilter)

      // 6. Fetch paginated comments
      let comments = []
      let total = 0

      if (sort === 'reports') {
        const reportCountDocs = await Report.aggregate([
          { $match: { reportedCommentId: { $ne: null } } },
          { $group: { _id: '$reportedCommentId', count: { $sum: 1 } } },
        ])
        const reportCountMap = new Map(reportCountDocs.map((r) => [r._id.toString(), r.count]))

        const allMatchingComments = await Comment.find(commentFilter)
          .populate(
            'user',
            'name username initials avatarColor profilePhoto collegeId college dept departmentId role designation year studentId employeeId verifiedBadge suspended'
          )
          .populate({
            path: 'post',
            select: 'caption imageUrl imagePublicId user collegeId createdAt likeCount commentCount',
            populate: { path: 'user', select: 'name username initials avatarColor profilePhoto' },
          })
          .lean()

        allMatchingComments.sort((a, b) => {
          const countA = reportCountMap.get(a._id.toString()) || 0
          const countB = reportCountMap.get(b._id.toString()) || 0
          if (countB !== countA) return countB - countA
          return new Date(b.createdAt) - new Date(a.createdAt)
        })

        total = allMatchingComments.length
        comments = allMatchingComments.slice(skip, skip + limitNum)
      } else {
        const sortObj = sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 }
        total = await Comment.countDocuments(commentFilter)
        comments = await Comment.find(commentFilter)
          .populate(
            'user',
            'name username initials avatarColor profilePhoto collegeId college dept departmentId role designation year studentId employeeId verifiedBadge suspended'
          )
          .populate({
            path: 'post',
            select: 'caption imageUrl imagePublicId user collegeId createdAt likeCount commentCount',
            populate: { path: 'user', select: 'name username initials avatarColor profilePhoto' },
          })
          .sort(sortObj)
          .skip(skip)
          .limit(limitNum)
          .lean()
      }

      // 7. Attach reports
      const commentIds = comments.map((c) => c._id)
      const commentReports = await Report.find({ reportedCommentId: { $in: commentIds } })
        .sort({ createdAt: -1 })
        .lean()

      const reportsByCommentId = new Map()
      for (const report of commentReports) {
        const cid = report.reportedCommentId.toString()
        if (!reportsByCommentId.has(cid)) reportsByCommentId.set(cid, [])
        reportsByCommentId.get(cid).push(report)
      }

      const annotatedComments = comments.map((comment) => {
        const cReports = reportsByCommentId.get(comment._id.toString()) || []
        return {
          ...comment,
          id: comment._id.toString(),
          isReported: cReports.length > 0,
          reportCount: cReports.length,
          activeReportCount: cReports.filter((r) => r.status === 'pending' || r.status === 'reviewed').length,
          reports: cReports.map((r) => ({
            _id: r._id,
            id: r._id.toString(),
            category: r.category,
            description: r.description,
            status: r.status,
            reporterName: r.reporterName,
            reporterRole: r.reporterRole,
            createdAt: r.createdAt,
            resolutionNotes: r.resolutionNotes || r.resolutionNote || '',
          })),
        }
      })

      const totalPages = Math.ceil(total / limitNum) || 1

      res.json({
        ok: true,
        comments: annotatedComments,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages,
        },
        stats: {
          totalComments: totalCommentsCount,
          reportedCount: reportedCommentsCount,
          hiddenCount: hiddenCommentsCount,
        },
      })
    } catch (err) {
      console.error('[GET /api/moderation/comments]', err)
      res.status(500).json({ ok: false, error: 'Failed to fetch comments.' })
    }
  }
)

// ── PATCH /api/moderation/posts/:id/hide ───────────────────────────────────────
// Hide a post
router.patch(
  '/posts/:id/hide',
  requireAuth,
  requireRole('admin', 'college_admin', 'main_admin'),
  requireCollegeAccess,
  [body('reason').optional().trim().isLength({ max: 500 })],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ ok: false, error: errors.array()[0].msg })
    }

    try {
      const post = await Post.findById(req.params.id)
      if (!post) {
        return res.status(404).json({ ok: false, error: 'Post not found.' })
      }

      // Validate college access
      if (req.user.role === 'college_admin') {
        const college = req.college || (await resolveUserCollege(req.user))
        const hasAccess = await validateCollegeAccess(post, college)
        if (!hasAccess) {
          return res.status(403).json({ ok: false, error: 'Access denied: You can only moderate posts from your college.' })
        }
      }

      post.hidden = true
      post.hiddenBy = req.user._id
      post.hiddenAt = new Date()
      post.hiddenReason = req.body.reason || ''

      await post.save()

      // Realtime notification scoped to college
      const collegeId = post.collegeId || req.collegeId || (req.college ? req.college._id : null)
      broadcastEvent('post:hide', { postId: post._id.toString() }, { collegeId })

      // Log the action
      await logActivity({
        adminId: req.user._id,
        adminName: req.user.name,
        adminRole: req.user.role,
        collegeId: req.user.collegeId,
        college: req.user.college,
        actionType: 'post_hidden',
        resourceType: 'post',
        resourceId: post._id,
        resourceName: post.caption?.slice(0, 50) || 'Post',
        details: req.body.reason || 'Post hidden by admin',
        ipAddress: req.ip,
      })

      res.json({ ok: true, post: post.toJSON() })
    } catch (err) {
      console.error('[PATCH /api/moderation/posts/:id/hide]', err)
      res.status(500).json({ ok: false, error: 'Failed to hide post.' })
    }
  }
)

// ── PATCH /api/moderation/posts/:id/restore ────────────────────────────────────
// Restore a hidden post
router.patch(
  '/posts/:id/restore',
  requireAuth,
  requireRole('admin', 'college_admin', 'main_admin'),
  requireCollegeAccess,
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id)
      if (!post) {
        return res.status(404).json({ ok: false, error: 'Post not found.' })
      }

      // Validate college access
      if (req.user.role === 'college_admin') {
        const college = req.college || (await resolveUserCollege(req.user))
        const hasAccess = await validateCollegeAccess(post, college)
        if (!hasAccess) {
          return res.status(403).json({ ok: false, error: 'Access denied: You can only moderate posts from your college.' })
        }
      }

      post.hidden = false
      post.hiddenBy = null
      post.hiddenAt = null
      post.hiddenReason = ''

      await post.save()

      // Realtime notification scoped to college
      const collegeId = post.collegeId || req.collegeId || (req.college ? req.college._id : null)
      broadcastEvent('post:restore', { postId: post._id.toString() }, { collegeId })

      // Log the action
      await logActivity({
        adminId: req.user._id,
        adminName: req.user.name,
        adminRole: req.user.role,
        collegeId: req.user.collegeId,
        college: req.user.college,
        actionType: 'post_restored',
        resourceType: 'post',
        resourceId: post._id,
        resourceName: post.caption?.slice(0, 50) || 'Post',
        details: 'Post restored by admin',
        ipAddress: req.ip,
      })

      res.json({ ok: true, post: post.toJSON() })
    } catch (err) {
      console.error('[PATCH /api/moderation/posts/:id/restore]', err)
      res.status(500).json({ ok: false, error: 'Failed to restore post.' })
    }
  }
)

// ── DELETE /api/moderation/posts/:id ──────────────────────────────────────────
// Delete/remove a post and cascade comments
router.delete(
  '/posts/:id',
  requireAuth,
  requireRole('admin', 'college_admin', 'main_admin'),
  requireCollegeAccess,
  async (req, res) => {
    try {
      const post = await Post.findById(req.params.id)
      if (!post) {
        return res.status(404).json({ ok: false, error: 'Post not found.' })
      }

      // Validate college access
      if (req.user.role === 'college_admin') {
        const college = req.college || (await resolveUserCollege(req.user))
        const hasAccess = await validateCollegeAccess(post, college)
        if (!hasAccess) {
          return res.status(403).json({ ok: false, error: 'Access denied: You can only delete posts from your college.' })
        }
      }

      // Mark post deleted
      post.isDeleted = true
      await post.save()

      // Cascade soft-delete comments
      await Comment.updateMany({ post: post._id }, { $set: { isDeleted: true } })

      // Decrement author post count
      if (post.user) {
        await User.findByIdAndUpdate(post.user, [
          { $set: { posts: { $max: [0, { $subtract: ['$posts', 1] }] } } },
        ]).catch(() => {})
      }

      // Broadcast delete event
      const collegeId = post.collegeId || req.collegeId || (req.college ? req.college._id : null)
      broadcastEvent('post:delete', { postId: post._id.toString() }, { collegeId })

      // Log the action
      await logActivity({
        adminId: req.user._id,
        adminName: req.user.name,
        adminRole: req.user.role,
        collegeId: req.user.collegeId,
        college: req.user.college,
        actionType: 'post_deleted',
        resourceType: 'post',
        resourceId: post._id,
        resourceName: post.caption?.slice(0, 50) || 'Post',
        details: 'Post removed by moderation admin',
        ipAddress: req.ip,
      })

      res.json({ ok: true, message: 'Post deleted successfully.', postId: post._id.toString() })
    } catch (err) {
      console.error('[DELETE /api/moderation/posts/:id]', err)
      res.status(500).json({ ok: false, error: 'Failed to delete post.' })
    }
  }
)

// ── PATCH /api/moderation/comments/:id/hide ────────────────────────────────────
// Hide a comment
router.patch(
  '/comments/:id/hide',
  requireAuth,
  requireRole('admin', 'college_admin', 'main_admin'),
  requireCollegeAccess,
  [body('reason').optional().trim().isLength({ max: 500 })],
  async (req, res) => {
    const errors = validationResult(req)
    if (!errors.isEmpty()) {
      return res.status(422).json({ ok: false, error: errors.array()[0].msg })
    }

    try {
      const comment = await Comment.findById(req.params.id)
      if (!comment) {
        return res.status(404).json({ ok: false, error: 'Comment not found.' })
      }

      // Validate college access
      if (req.user.role === 'college_admin') {
        const college = req.college || (await resolveUserCollege(req.user))
        const hasAccess = await validateCollegeAccess(comment, college)
        if (!hasAccess) {
          return res.status(403).json({ ok: false, error: 'Access denied: You can only moderate comments from your college.' })
        }
      }

      comment.hidden = true
      comment.hiddenBy = req.user._id
      comment.hiddenAt = new Date()
      comment.hiddenReason = req.body.reason || ''

      await comment.save()

      // Realtime notification
      const collegeId = req.collegeId || (req.college ? req.college._id : null)
      broadcastEvent('comment:hide', { commentId: comment._id.toString() }, { collegeId })

      // Log the action
      await logActivity({
        adminId: req.user._id,
        adminName: req.user.name,
        adminRole: req.user.role,
        collegeId: req.user.collegeId,
        college: req.user.college,
        actionType: 'comment_hidden',
        resourceType: 'comment',
        resourceId: comment._id,
        resourceName: comment.text?.slice(0, 50) || 'Comment',
        details: req.body.reason || 'Comment hidden by admin',
        ipAddress: req.ip,
      })

      res.json({ ok: true, comment: comment.toJSON() })
    } catch (err) {
      console.error('[PATCH /api/moderation/comments/:id/hide]', err)
      res.status(500).json({ ok: false, error: 'Failed to hide comment.' })
    }
  }
)

// ── PATCH /api/moderation/comments/:id/restore ─────────────────────────────────
// Restore a hidden comment
router.patch(
  '/comments/:id/restore',
  requireAuth,
  requireRole('admin', 'college_admin', 'main_admin'),
  requireCollegeAccess,
  async (req, res) => {
    try {
      const comment = await Comment.findById(req.params.id)
      if (!comment) {
        return res.status(404).json({ ok: false, error: 'Comment not found.' })
      }

      // Validate college access
      if (req.user.role === 'college_admin') {
        const college = req.college || (await resolveUserCollege(req.user))
        const hasAccess = await validateCollegeAccess(comment, college)
        if (!hasAccess) {
          return res.status(403).json({ ok: false, error: 'Access denied: You can only moderate comments from your college.' })
        }
      }

      comment.hidden = false
      comment.hiddenBy = null
      comment.hiddenAt = null
      comment.hiddenReason = ''

      await comment.save()

      // Realtime notification
      const collegeId = req.collegeId || (req.college ? req.college._id : null)
      broadcastEvent('comment:restore', { commentId: comment._id.toString() }, { collegeId })

      // Log the action
      await logActivity({
        adminId: req.user._id,
        adminName: req.user.name,
        adminRole: req.user.role,
        collegeId: req.user.collegeId,
        college: req.user.college,
        actionType: 'comment_restored',
        resourceType: 'comment',
        resourceId: comment._id,
        resourceName: comment.text?.slice(0, 50) || 'Comment',
        details: 'Comment restored by admin',
        ipAddress: req.ip,
      })

      res.json({ ok: true, comment: comment.toJSON() })
    } catch (err) {
      console.error('[PATCH /api/moderation/comments/:id/restore]', err)
      res.status(500).json({ ok: false, error: 'Failed to restore comment.' })
    }
  }
)

// ── DELETE /api/moderation/comments/:id ───────────────────────────────────────
// Delete/remove a comment
router.delete(
  '/comments/:id',
  requireAuth,
  requireRole('admin', 'college_admin', 'main_admin'),
  requireCollegeAccess,
  async (req, res) => {
    try {
      const comment = await Comment.findById(req.params.id)
      if (!comment) {
        return res.status(404).json({ ok: false, error: 'Comment not found.' })
      }

      // Validate college access
      if (req.user.role === 'college_admin') {
        const college = req.college || (await resolveUserCollege(req.user))
        const hasAccess = await validateCollegeAccess(comment, college)
        if (!hasAccess) {
          return res.status(403).json({ ok: false, error: 'Access denied: You can only delete comments from your college.' })
        }
      }

      comment.isDeleted = true
      await comment.save()

      // Decrement post's comment count
      if (comment.post) {
        await Post.findByIdAndUpdate(comment.post, [
          { $set: { commentCount: { $max: [0, { $subtract: ['$commentCount', 1] }] } } },
        ]).catch(() => {})
      }

      // Broadcast delete event
      const collegeId = req.collegeId || (req.college ? req.college._id : null)
      broadcastEvent('comment:delete', { commentId: comment._id.toString() }, { collegeId })

      // Log the action
      await logActivity({
        adminId: req.user._id,
        adminName: req.user.name,
        adminRole: req.user.role,
        collegeId: req.user.collegeId,
        college: req.user.college,
        actionType: 'comment_deleted',
        resourceType: 'comment',
        resourceId: comment._id,
        resourceName: comment.text?.slice(0, 50) || 'Comment',
        details: 'Comment removed by moderation admin',
        ipAddress: req.ip,
      })

      res.json({ ok: true, message: 'Comment deleted successfully.', commentId: comment._id.toString() })
    } catch (err) {
      console.error('[DELETE /api/moderation/comments/:id]', err)
      res.status(500).json({ ok: false, error: 'Failed to delete comment.' })
    }
  }
)

export default router
