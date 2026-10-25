import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import Post from '../models/Post.js'
import Comment from '../models/Comment.js'
import User from '../models/User.js'
import College from '../models/College.js'
import { logActivity } from '../services/activity-log.service.js'

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

// Helper to check if content belongs to college admin's college
async function validateCollegeAccess(content, collegeId) {
  if (!collegeId) return true // Super admin
  const user = await User.findById(content.user)
  if (!user) return false
  return user.collegeId && user.collegeId.toString() === collegeId.toString()
}

// ── GET /api/moderation/posts ─────────────────────────────────────────────────
// Get posts that can be moderated (reported posts or all posts for college admin)
router.get('/posts', requireAuth, requireRole('admin', 'college_admin', 'main_admin'), requireCollegeAccess, async (req, res) => {
  try {
    const collegeId = req.user.role === 'college_admin' ? req.user.collegeId : null
    
    // Get all user IDs in the college for filtering
    const collegeUserIds = collegeId 
      ? (await User.find({ collegeId }).select('_id').lean()).map(u => u._id)
      : null

    const filter = {
      isDeleted: false,
      ...(collegeUserIds ? { user: { $in: collegeUserIds } } : {}),
    }

    const posts = await Post.find(filter)
      .populate('user', 'name username initials avatarColor profilePhoto collegeId')
      .sort({ createdAt: -1 })
      .lean()

    res.json({ ok: true, posts })
  } catch (err) {
    console.error('[GET /api/moderation/posts]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch posts.' })
  }
})

// ── GET /api/moderation/comments ───────────────────────────────────────────────
// Get comments that can be moderated
router.get('/comments', requireAuth, requireRole('admin', 'college_admin', 'main_admin'), requireCollegeAccess, async (req, res) => {
  try {
    const collegeId = req.user.role === 'college_admin' ? req.user.collegeId : null
    
    // Get all user IDs in the college for filtering
    const collegeUserIds = collegeId 
      ? (await User.find({ collegeId }).select('_id').lean()).map(u => u._id)
      : null

    const filter = {
      isDeleted: false,
      ...(collegeUserIds ? { user: { $in: collegeUserIds } } : {}),
    }

    const comments = await Comment.find(filter)
      .populate('user', 'name username initials avatarColor profilePhoto collegeId')
      .populate('post', 'caption')
      .sort({ createdAt: -1 })
      .lean()

    res.json({ ok: true, comments })
  } catch (err) {
    console.error('[GET /api/moderation/comments]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch comments.' })
  }
})

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
        const hasAccess = await validateCollegeAccess(post, req.collegeId)
        if (!hasAccess) {
          return res.status(403).json({ ok: false, error: 'Access denied: You can only moderate posts from your college.' })
        }
      }

      post.hidden = true
      post.hiddenBy = req.user._id
      post.hiddenAt = new Date()
      post.hiddenReason = req.body.reason || ''

      await post.save()

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
        const hasAccess = await validateCollegeAccess(post, req.collegeId)
        if (!hasAccess) {
          return res.status(403).json({ ok: false, error: 'Access denied: You can only moderate posts from your college.' })
        }
      }

      post.hidden = false
      post.hiddenBy = null
      post.hiddenAt = null
      post.hiddenReason = ''

      await post.save()

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
        const hasAccess = await validateCollegeAccess(comment, req.collegeId)
        if (!hasAccess) {
          return res.status(403).json({ ok: false, error: 'Access denied: You can only moderate comments from your college.' })
        }
      }

      comment.hidden = true
      comment.hiddenBy = req.user._id
      comment.hiddenAt = new Date()
      comment.hiddenReason = req.body.reason || ''

      await comment.save()

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
        const hasAccess = await validateCollegeAccess(comment, req.collegeId)
        if (!hasAccess) {
          return res.status(403).json({ ok: false, error: 'Access denied: You can only moderate comments from your college.' })
        }
      }

      comment.hidden = false
      comment.hiddenBy = null
      comment.hiddenAt = null
      comment.hiddenReason = ''

      await comment.save()

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

export default router
