import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import { uploadProfilePhoto, uploadPostPhoto } from '../middleware/upload.middleware.js'
import { uploadPostImage, isCloudinaryConfigured } from '../services/cloudinary.service.js'
import User from '../models/User.js'
import Follow from '../models/Follow.js'
import FollowRequest from '../models/FollowRequest.js'
import Department from '../models/Department.js'
import Notice from '../models/Notice.js'
import Notification from '../models/Notification.js'
import Post from '../models/Post.js'
import Comment from '../models/Comment.js'
import Story from '../models/Story.js'
import StoryView from '../models/StoryView.js'
import { Conversation } from '../models/Conversation.js'
import { emitToUser } from '../services/socket.service.js'
import { createNotification } from '../services/notification.service.js'
import { logActivity } from '../services/activity-log.service.js'

const router = Router()

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

// ── GET /api/users/search?q= — search users (any authenticated user) ──────────
router.get('/search', requireAuth, async (req, res) => {
  try {
    const q = req.query.q?.trim()
    if (!q) return res.json({ ok: true, users: [] })

    const regex = new RegExp(q, 'i')
    const users = await User.find({
      _id:         { $ne: req.user._id },
      deactivated: false,
      suspended:   { $ne: true },
      role:        { $in: ['student', 'faculty'] },
      $or: [{ name: regex }, { username: regex }, { dept: regex }],
    })
      .limit(20)
      .select('name username initials avatarColor profilePhoto dept year role followers preferences.privacy.private')
      .lean()

    // Check follow & request status for each result
    const ids = users.map(u => u._id)
    const [followDocs, requestDocs] = await Promise.all([
      Follow.find({ follower: req.user._id, following: { $in: ids } }),
      FollowRequest.find({ requester: req.user._id, recipient: { $in: ids }, status: 'pending' }),
    ])
    const followingSet = new Set(followDocs.map(f => f.following.toString()))
    const requestedSet = new Set(requestDocs.map(r => r.recipient.toString()))

    res.json({
      ok: true,
      users: users.map(u => ({
        ...u,
        id: u._id.toString(),
        isFollowing: followingSet.has(u._id.toString()),
        isRequested: requestedSet.has(u._id.toString()),
        isPrivate: Boolean(u.preferences?.privacy?.private),
        isSelf: u._id.toString() === req.user.id,
      })),
    })
  } catch (err) {
    console.error('[GET /api/users/search]', err)
    res.status(500).json({ ok: false, error: 'Search failed.' })
  }
})

// ── GET /api/users/all — list all users for Explore page ─────────────────────
// College admin only sees users from their college; excludes admin roles from campus directory
router.get('/all', requireAuth, async (req, res) => {
  try {
    const filter = {
      _id:         { $ne: req.user._id },
      deactivated: false,
      suspended:   { $ne: true },
      role:        { $in: ['student', 'faculty'] },
    }
    
    // College admin can only see users from their college
    if (req.user.role === 'college_admin' && req.user.collegeId) {
      filter.collegeId = req.user.collegeId
    }

    const limit = Math.min(Math.max(1, Number(req.query.limit) || 50), 100)
    const page  = Math.max(1, Number(req.query.page) || 1)
    const skip  = (page - 1) * limit
    
    const users = await User.find(filter)
      .sort({ followers: -1, createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('name username initials avatarColor profilePhoto dept year role followers college collegeId preferences.privacy.private')
      .lean()

    const ids = users.map(u => u._id)
    const [followDocs, requestDocs] = await Promise.all([
      Follow.find({ follower: req.user._id, following: { $in: ids } }),
      FollowRequest.find({ requester: req.user._id, recipient: { $in: ids }, status: 'pending' }),
    ])
    const followingSet = new Set(followDocs.map(f => f.following.toString()))
    const requestedSet = new Set(requestDocs.map(r => r.recipient.toString()))

    res.json({
      ok: true,
      users: users.map(u => ({
        ...u,
        id: u._id.toString(),
        isFollowing: followingSet.has(u._id.toString()),
        isRequested: requestedSet.has(u._id.toString()),
        isPrivate: Boolean(u.preferences?.privacy?.private),
        isSelf: u._id.toString() === req.user.id,
      })),
      page,
      limit,
    })
  } catch (err) {
    console.error('[GET /api/users/all]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch users.' })
  }
})

// ── GET /api/users ───────────────────────────────────────────────────────────
router.get('/', requireAuth, requireRole('admin', 'college_admin', 'faculty'), async (req, res) => {
  try {
    const filter = {}
    
    // College admin & faculty can only see users from their college
    if (req.user.role === 'college_admin') {
      if (!req.user.collegeId) {
        return res.status(403).json({ ok: false, error: 'Access denied: College admin has no associated college.' })
      }
      filter.collegeId = req.user.collegeId
    } else if (req.user.role === 'faculty') {
      if (!req.user.collegeId) {
        return res.status(403).json({ ok: false, error: 'Access denied: Faculty has no associated college.' })
      }
      filter.collegeId = req.user.collegeId
      filter.role = 'student' // Faculty can only view students in their college
      if (req.query.dept) {
        filter.dept = req.query.dept
      }
    } else if (req.user.role === 'admin' && req.query.collegeId) {
      filter.collegeId = req.query.collegeId
    }
    
    if (req.query.role && req.user.role !== 'faculty') {
      filter.role = req.query.role
    }
    
    const users = await User.find(filter).sort({ createdAt: -1 })
    res.json({ ok: true, users })
  } catch (err) {
    console.error('[GET /api/users] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch users.' })
  }
})

// ── GET /api/users/stats ─────────────────────────────────────────────────────
// Get dynamic statistics for college dashboard
router.get('/stats', requireAuth, requireRole('admin', 'college_admin', 'faculty'), async (req, res) => {
  try {
    const filter = {}
    const deptFilter = {}
    const noticeFilter = {}
    
    // College admin and faculty can only see stats from their college
    if (req.user.role === 'college_admin' || req.user.role === 'faculty') {
      if (!req.user.collegeId) {
        return res.status(403).json({ ok: false, error: 'Access denied: User has no associated college.' })
      }
      filter.collegeId = req.user.collegeId
      deptFilter.collegeId = req.user.collegeId
      noticeFilter.collegeId = req.user.collegeId
    } else if (req.user.role === 'admin' && req.query.collegeId) {
      filter.collegeId = req.query.collegeId
      deptFilter.collegeId = req.query.collegeId
      noticeFilter.collegeId = req.query.collegeId
    }
    
    const now = new Date()

    const [
      totalStudents,
      totalFaculty,
      activeStudents,
      activeFaculty,
      suspendedStudents,
      suspendedFaculty,
      totalDepartments,
      activeNotices,
    ] = await Promise.all([
      User.countDocuments({ ...filter, role: 'student' }),
      User.countDocuments({ ...filter, role: 'faculty' }),
      User.countDocuments({ ...filter, role: 'student', suspended: false, deactivated: false }),
      User.countDocuments({ ...filter, role: 'faculty', suspended: false, deactivated: false }),
      User.countDocuments({ ...filter, role: 'student', suspended: true }),
      User.countDocuments({ ...filter, role: 'faculty', suspended: true }),
      Department.countDocuments(deptFilter),
      Notice.countDocuments({
        ...noticeFilter,
        published: true,
        $or: [
          { expiresAt: null },
          { expiresAt: { $gt: now } }
        ]
      }),
    ])
    
    res.json({
      ok: true,
      stats: {
        totalStudents,
        activeStudents,
        suspendedStudents,
        totalFaculty,
        activeFaculty,
        suspendedFaculty,
        totalDepartments,
        activeNotices,
      }
    })
  } catch (err) {
    console.error('[GET /api/users/stats] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch user statistics.' })
  }
})

// ── PATCH /api/users/preferences ───────────────────────────────────────────
router.patch('/preferences', requireAuth, async (req, res) => {
  try {
    const preferences = req.body?.preferences
    if (!preferences || typeof preferences !== 'object') {
      return res.status(422).json({ ok: false, error: 'Preferences are required.' })
    }

    const allowed = {
      notifications: ['likes', 'comments', 'follows', 'mentions', 'events'],
      privacy: ['private', 'showEmail', 'activity', 'tagged'],
      security: ['twoFactor'],
    }
    for (const [section, keys] of Object.entries(allowed)) {
      if (!preferences[section] || typeof preferences[section] !== 'object') continue
      for (const key of keys) {
        if (preferences[section][key] !== undefined) {
          if (typeof preferences[section][key] !== 'boolean') {
            return res.status(422).json({ ok: false, error: `${section}.${key} must be a boolean.` })
          }
          req.user.preferences[section][key] = preferences[section][key]
        }
      }
    }
    await req.user.save()
    res.json({ ok: true, user: req.user.toJSON() })
  } catch (err) {
    console.error('[PATCH /api/users/preferences] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to update preferences.' })
  }
})

// ── GET /api/users/follow-requests/pending — list pending follow requests for viewer ──
router.get('/follow-requests/pending', requireAuth, async (req, res) => {
  try {
    const requests = await FollowRequest.find({
      recipient: req.user._id,
      status: 'pending',
    })
      .sort({ createdAt: -1 })
      .populate('requester', 'name username initials avatarColor profilePhoto dept year role followers')
      .lean()

    res.json({
      ok: true,
      requests: requests
        .filter(r => r.requester)
        .map(r => ({
          id: r._id.toString(),
          createdAt: r.createdAt,
          user: {
            id: r.requester._id.toString(),
            name: r.requester.name,
            username: r.requester.username,
            initials: r.requester.initials,
            avatarColor: r.requester.avatarColor,
            profilePhoto: r.requester.profilePhoto || null,
            dept: r.requester.dept || '',
            year: r.requester.year || '',
            role: r.requester.role || 'student',
            followers: r.requester.followers || 0,
          },
        })),
    })
  } catch (err) {
    console.error('[GET /api/users/follow-requests/pending] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch follow requests.' })
  }
})

router.get('/:userId', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }
    if (user.role === 'admin' && req.user.role !== 'admin') {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }

    const [isFollowing, isRequested] = await Promise.all([
      Follow.exists({
        follower: req.user.id,
        following: user.id,
      }),
      FollowRequest.exists({
        requester: req.user.id,
        recipient: user.id,
        status: 'pending',
      }),
    ])

    const serializedUser = user.toJSON()
    if (req.user.id !== user.id && !user.preferences?.privacy?.showEmail) {
      delete serializedUser.email
    }

    res.json({
      ok: true,
      user: {
        ...serializedUser,
        canViewPosts: req.user.id === user.id
          || !user.preferences?.privacy?.private
          || Boolean(isFollowing),
        isFollowing: Boolean(isFollowing),
        isRequested: Boolean(isRequested),
        isPrivate: Boolean(user.preferences?.privacy?.private),
        isSelf: req.user.id === user.id,
      },
    })
  } catch (err) {
    console.error('[GET /api/users/:userId] Error:', err)
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }
    res.status(500).json({ ok: false, error: 'Failed to fetch user.' })
  }
})
router.put(
  '/:userId',
  requireAuth,
  [
    body('name')
      .optional()
      .trim()
      .notEmpty().withMessage('Name cannot be empty.')
      .isLength({ max: 100 }).withMessage('Name too long.'),
    body('bio')
      .optional()
      .trim()
      .isLength({ max: 300 }).withMessage('Bio must be 300 characters or fewer.'),
    body('username')
      .optional()
      .trim()
      .matches(/^[a-z0-9._-]+$/i).withMessage('Username may contain only letters, numbers, dots, underscores, and hyphens.')
      .isLength({ min: 3, max: 30 }).withMessage('Username must be between 3 and 30 characters.'),
    body('designation')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Designation too long.'),
    body('year')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('Year value too long.'),
    body('rollNumber')
      .optional()
      .trim()
      .isLength({ max: 50 }).withMessage('Roll number too long.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      if (req.params.userId !== req.user.id) {
        return res.status(403).json({ ok: false, error: 'You can only edit your own profile.' })
      }

      const { name, username, bio, designation, year, rollNumber } = req.body
      if (name !== undefined) req.user.name = name
      if (username !== undefined && username.toLowerCase() !== req.user.username) {
        const existing = await User.findOne({ username: username.toLowerCase(), _id: { $ne: req.user.id } })
        if (existing) return res.status(409).json({ ok: false, error: 'Username is already taken.' })
        req.user.username = username.toLowerCase()
      }
      if (bio !== undefined) req.user.bio = bio
      if (designation !== undefined && (req.user.role === 'faculty' || req.user.role === 'college_admin')) {
        req.user.designation = designation
      }
      if (year !== undefined && req.user.role === 'student') {
        req.user.year = year
      }
      if (rollNumber !== undefined && req.user.role === 'student') {
        if (rollNumber && rollNumber !== req.user.rollNumber) {
          const existing = await User.findOne({ 
            rollNumber: rollNumber, 
            collegeId: req.user.collegeId,
            _id: { $ne: req.user.id } 
          })
          if (existing) {
            return res.status(409).json({ ok: false, error: 'Roll number already exists in this college.' })
          }
        }
        req.user.rollNumber = rollNumber
      }
      await req.user.save()

      res.json({ ok: true, user: req.user.toJSON() })
    } catch (err) {
      console.error('[PUT /api/users/:userId] Error:', err)
      res.status(500).json({ ok: false, error: 'Failed to update profile.' })
    }
  }
)

// ── DELETE /api/users/profile-photo ─────────────────────────────────────────────
// Remove profile photo
// Alias for /upload-photo
router.post('/profile-photo', (req, res, next) => {
  req.url = '/upload-photo'
  router.handle(req, res, next)
})

router.delete('/profile-photo', requireAuth, async (req, res) => {
  try {
    req.user.profilePhoto = null
    await req.user.save()
    res.json({ ok: true, user: req.user.toJSON() })
  } catch (err) {
    console.error('[DELETE /api/users/profile-photo] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to remove profile photo.' })
  }
})

router.delete('/:userId', requireAuth, async (req, res, next) => {
  if (req.params.userId === 'profile-photo') {
    return next()
  }
  try {
    if (req.params.userId !== req.user.id) {
      return res.status(403).json({ ok: false, error: 'You can only delete your own account.' })
    }

    const userId = req.user._id
    const posts = await Post.find({ user: userId }).select('_id imagePublicId')
    const postIds = posts.map(post => post._id)

    await Promise.all([
      Comment.deleteMany({ $or: [{ user: userId }, { post: { $in: postIds } }] }),
      Post.deleteMany({ user: userId }),
      Post.updateMany({ savedBy: userId }, { $pull: { savedBy: userId } }),
      Post.updateMany({ likes: userId }, { $pull: { likes: userId } }),
      StoryView.deleteMany({ viewer: userId }),
      StoryView.deleteMany({ story: { $in: await Story.find({ user: userId }).distinct('_id') } }),
      Story.deleteMany({ user: userId }),
      Follow.deleteMany({ $or: [{ follower: userId }, { following: userId }] }),
      FollowRequest.deleteMany({ $or: [{ requester: userId }, { recipient: userId }] }),
      Notification.deleteMany({ $or: [{ recipient: userId }, { sender: userId }] }),
      Conversation.deleteMany({ participants: userId }),
      User.deleteOne({ _id: userId }),
    ])

    res.clearCookie('swish_token', { path: '/' })
    res.json({ ok: true })
  } catch (err) {
    console.error('[DELETE /api/users/:userId] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to delete account.' })
  }
})

router.post('/:userId/follow', requireAuth, async (req, res) => {
  try {
    const targetId = req.params.userId

    if (targetId === req.user.id) {
      return res.status(400).json({ ok: false, error: 'You cannot follow yourself.' })
    }

    const target = await User.findById(targetId)
    if (!target) {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }

    // Role restriction: Students & Faculty ONLY. Admins cannot follow or be followed.
    const adminRoles = ['admin', 'college_admin', 'main_admin']
    if (adminRoles.includes(req.user.role) || adminRoles.includes(target.role)) {
      return res.status(403).json({ ok: false, error: 'Follow actions are only available for students and faculty.' })
    }

    // Check if already following
    const existing = await Follow.findOne({ follower: req.user.id, following: targetId })
    if (existing) {
      return res.status(200).json({ ok: true, following: true, requested: false, message: 'You already follow this user.' })
    }

    // Check if target account is private
    const isPrivate = Boolean(target.preferences?.privacy?.private)
    if (isPrivate) {
      const existingReq = await FollowRequest.findOne({
        requester: req.user.id,
        recipient: targetId,
        status: 'pending',
      })
      if (existingReq) {
        return res.status(200).json({
          ok: true,
          following: false,
          requested: true,
          message: 'Follow request already sent.',
          followerCount: target.followers || 0,
        })
      }

      await FollowRequest.findOneAndUpdate(
        { requester: req.user.id, recipient: targetId },
        { requester: req.user.id, recipient: targetId, status: 'pending' },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )

      try {
        await createNotification({
          recipient: targetId,
          sender: req.user.id,
          type: 'follow_request',
          text: 'requested to follow you',
        })
        emitToUser(targetId, 'follow_request:received', {
          fromUserId: req.user.id,
          fromUserName: req.user.name,
          fromUserUsername: req.user.username,
        })
      } catch (notifErr) {
        console.error('[Notification follow_request error]', notifErr)
      }

      return res.status(201).json({
        ok: true,
        following: false,
        requested: true,
        message: 'Follow request sent.',
        followerCount: target.followers || 0,
      })
    }

    // Public account: Direct follow
    await Follow.create({ follower: req.user.id, following: targetId })
    const [updatedTarget] = await Promise.all([
      User.findByIdAndUpdate(targetId, { $inc: { followers: 1 } }, { new: true }),
      User.findByIdAndUpdate(req.user.id, { $inc: { following: 1 } }, { new: true }),
    ])

    // Create & emit real-time notification
    try {
      await createNotification({
        recipient: targetId,
        sender: req.user.id,
        type: 'follow',
        text: 'started following you',
      })
      emitToUser(targetId, 'follow:received', { fromUserName: req.user.name })
    } catch (notifErr) {
      console.error('[Notification follow error]', notifErr)
    }

    res.status(201).json({
      ok: true,
      following: true,
      requested: false,
      followerCount: updatedTarget ? updatedTarget.followers : 0,
    })
  } catch (err) {
    // Unique index race: two simultaneous follow requests
    if (err.code === 11000) {
      return res.status(409).json({ ok: false, error: 'You already follow this user.' })
    }
    console.error('[POST /api/users/:userId/follow] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to follow user.' })
  }
})

router.delete('/:userId/follow', requireAuth, async (req, res) => {
  try {
    const targetId = req.params.userId

    // Check if there is a pending follow request to cancel
    const pendingReq = await FollowRequest.findOneAndDelete({
      requester: req.user.id,
      recipient: targetId,
      status: 'pending',
    })

    if (pendingReq) {
      await Notification.deleteMany({
        recipient: targetId,
        sender: req.user.id,
        type: 'follow_request',
      })
      emitToUser(targetId, 'follow_request:cancelled', { fromUserId: req.user.id })

      const target = await User.findById(targetId).select('followers')
      return res.json({
        ok: true,
        following: false,
        requested: false,
        message: 'Follow request cancelled.',
        followerCount: target?.followers || 0,
      })
    }

    const existing = await Follow.findOneAndDelete({ follower: req.user.id, following: targetId })
    if (!existing) {
      const target = await User.findById(targetId).select('followers')
      return res.status(200).json({
        ok: true,
        following: false,
        requested: false,
        message: 'You do not follow this user.',
        followerCount: target?.followers || 0,
      })
    }

    const [target] = await Promise.all([
      User.findByIdAndUpdate(targetId, [{ $set: { followers: { $max: [0, { $subtract: ['$followers', 1] }] } } }], { new: true }),
      User.findByIdAndUpdate(req.user.id, [{ $set: { following: { $max: [0, { $subtract: ['$following', 1] }] } } }], { new: true }),
    ])

    res.json({
      ok: true,
      following: false,
      requested: false,
      followerCount: target ? target.followers : 0,
    })
  } catch (err) {
    console.error('[DELETE /api/users/:userId/follow] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to unfollow user.' })
  }
})

// ── POST /api/users/:userId/follow-request/accept ────────────────────────────
// Authenticated user (recipient) accepts a follow request from requester (:userId)
router.post('/:userId/follow-request/accept', requireAuth, async (req, res) => {
  try {
    const requesterId = req.params.userId
    const recipientId = req.user.id

    const followReq = await FollowRequest.findOneAndDelete({
      requester: requesterId,
      recipient: recipientId,
      status: 'pending',
    })

    if (!followReq) {
      return res.status(404).json({ ok: false, error: 'Follow request not found or already processed.' })
    }

    // Create follow relationship if it doesn't already exist
    const existingFollow = await Follow.findOne({ follower: requesterId, following: recipientId })
    let updatedSelf = null
    if (!existingFollow) {
      await Follow.create({ follower: requesterId, following: recipientId })
      const [self, reqUser] = await Promise.all([
        User.findByIdAndUpdate(recipientId, { $inc: { followers: 1 } }, { new: true }),
        User.findByIdAndUpdate(requesterId, { $inc: { following: 1 } }, { new: true }),
      ])
      updatedSelf = self
    } else {
      updatedSelf = await User.findById(recipientId).select('followers')
    }

    // Remove the follow_request notification
    await Notification.deleteMany({
      recipient: recipientId,
      sender: requesterId,
      type: 'follow_request',
    })

    // Send follow_accept notification to the requester
    try {
      await createNotification({
        recipient: requesterId,
        sender: recipientId,
        type: 'follow_accept',
        text: 'accepted your follow request',
      })
      emitToUser(requesterId, 'follow_request:accepted', {
        byUserId: recipientId,
        byUserName: req.user.name,
        byUserUsername: req.user.username,
      })
    } catch (notifErr) {
      console.error('[Notification follow_accept error]', notifErr)
    }

    res.json({
      ok: true,
      message: 'Follow request accepted.',
      followerCount: updatedSelf?.followers || 0,
    })
  } catch (err) {
    console.error('[POST /api/users/:userId/follow-request/accept] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to accept follow request.' })
  }
})

// ── POST /api/users/:userId/follow-request/reject ────────────────────────────
// Authenticated user (recipient) rejects a follow request from requester (:userId)
router.post('/:userId/follow-request/reject', requireAuth, async (req, res) => {
  try {
    const requesterId = req.params.userId
    const recipientId = req.user.id

    const followReq = await FollowRequest.findOneAndDelete({
      requester: requesterId,
      recipient: recipientId,
      status: 'pending',
    })

    // Clean up any follow_request notification from that sender
    await Notification.deleteMany({
      recipient: recipientId,
      sender: requesterId,
      type: 'follow_request',
    })

    emitToUser(requesterId, 'follow_request:rejected', {
      byUserId: recipientId,
    })

    res.json({
      ok: true,
      message: 'Follow request rejected.',
    })
  } catch (err) {
    console.error('[POST /api/users/:userId/follow-request/reject] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to reject follow request.' })
  }
})

router.post('/upload-photo', requireAuth, (req, res, next) => {
  uploadPostPhoto(req, res, (err) => {
    if (err) {
      if (err.message === 'INVALID_FILE_TYPE') {
        return res.status(400).json({ ok: false, error: 'Only JPEG, PNG, WEBP, or GIF images are allowed.' })
      }
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ ok: false, error: 'Image must be 5MB or smaller.' })
      }
      console.error('[POST /api/users/upload-photo] Upload error:', err)
      return res.status(400).json({ ok: false, error: 'Upload failed. Please try again.' })
    }
    next()
  })
}, async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ ok: false, error: 'No file uploaded.' })
  }

  try {
    let photoUrl
    if (isCloudinaryConfigured()) {
      try {
        const result = await uploadPostImage(req.file.buffer, {
          folder: process.env.CLOUDINARY_AVATARS_FOLDER?.trim() || 'swish/avatars',
          width: 400,
          height: 400,
          crop: 'fill',
          gravity: 'face',
          quality: 'auto',
          fetch_format: 'auto',
        })
        photoUrl = result.secureUrl
      } catch (cErr) {
        console.warn('[upload-photo] Cloudinary error, falling back to local storage:', cErr.message)
      }
    }

    if (!photoUrl) {
      // Local fallback
      const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'profile-photos')
      fs.mkdirSync(UPLOAD_DIR, { recursive: true })
      const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg'
      const filename = `${req.user.id}-${crypto.randomBytes(16).toString('hex')}${ext}`
      fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.file.buffer)
      photoUrl = `/uploads/profile-photos/${filename}`
    }
    if (req.file) {
      req.file.buffer = null
      delete req.file.buffer
    }

    req.user.profilePhoto = photoUrl
    await req.user.save()
    res.json({ ok: true, profilePhoto: photoUrl, user: req.user.toJSON() })
  } catch (saveErr) {
    console.error('[POST /api/users/upload-photo] Save error:', saveErr)
    res.status(500).json({ ok: false, error: 'Failed to save profile photo.' })
  }
})




// ── PATCH /api/users/:id/verified-badge ─────────────────────────────────────
// Grant or revoke verified badge for faculty
router.patch('/:id/verified-badge', requireAuth, requireRole('admin', 'college_admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { verified } = req.body

    if (id === req.user.id || id === req.user._id.toString()) {
      return res.status(403).json({ ok: false, error: 'You cannot modify your own badge.' })
    }

    const targetUser = await User.findById(id)
    if (!targetUser) {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }

    if (targetUser.role !== 'faculty') {
      return res.status(400).json({ ok: false, error: 'Verified badge can only be assigned to faculty.' })
    }

    // College admin can only manage faculty from their college
    if (req.user.role === 'college_admin') {
      if (!req.user.collegeId || !targetUser.collegeId || !targetUser.collegeId.equals(req.user.collegeId)) {
        return res.status(403).json({ ok: false, error: 'You can only manage faculty from your college.' })
      }
    }

    targetUser.verifiedBadge = Boolean(verified)
    await targetUser.save()

    // Log the action
    await logActivity({
      adminId: req.user._id,
      adminName: req.user.name,
      adminRole: req.user.role,
      collegeId: req.user.collegeId,
      college: req.user.college,
      actionType: verified ? 'badge_granted' : 'badge_revoked',
      resourceType: 'user',
      resourceId: targetUser._id,
      resourceName: targetUser.name,
      details: verified ? 'Granted verified badge to faculty' : 'Revoked verified badge from faculty',
      ipAddress: req.ip,
    })

    res.json({ ok: true, user: targetUser.toJSON() })
  } catch (err) {
    console.error('[PATCH /api/users/:id/verified-badge] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to update verified badge.' })
  }
})

// ── PATCH /api/users/:id/hod ───────────────────────────────────────────────
// Designate or remove HOD status for faculty
router.patch('/:id/hod', requireAuth, requireRole('admin', 'college_admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { isHOD, departmentId } = req.body

    if (id === req.user.id || id === req.user._id.toString()) {
      return res.status(403).json({ ok: false, error: 'You cannot modify your own HOD status.' })
    }

    const targetUser = await User.findById(id)
    if (!targetUser) {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }

    if (targetUser.role !== 'faculty') {
      return res.status(400).json({ ok: false, error: 'HOD status can only be assigned to faculty.' })
    }

    // College admin can only manage faculty from their college
    if (req.user.role === 'college_admin') {
      if (!req.user.collegeId || !targetUser.collegeId || !targetUser.collegeId.equals(req.user.collegeId)) {
        return res.status(403).json({ ok: false, error: 'You can only manage faculty from your college.' })
      }
    }

    // If assigning HOD, validate department
    if (isHOD) {
      if (!departmentId) {
        return res.status(400).json({ ok: false, error: 'Department ID is required when assigning HOD.' })
      }

      const department = await Department.findById(departmentId)
      if (!department) {
        return res.status(404).json({ ok: false, error: 'Department not found.' })
      }

      // Validate faculty belongs to the same college and department
      if (!targetUser.collegeId || !targetUser.collegeId.equals(department.collegeId)) {
        return res.status(400).json({ ok: false, error: 'Faculty must belong to the same college as the department.' })
      }

      if (targetUser.departmentId && !targetUser.departmentId.equals(department._id)) {
        return res.status(400).json({ ok: false, error: 'Faculty must belong to the same department they are being assigned as HOD.' })
      }

      // Check if department already has an HOD
      const existingHOD = await User.findOne({ 
        departmentId, 
        isHOD: true, 
        _id: { $ne: targetUser._id },
        deactivated: false
      })
      if (existingHOD) {
        return res.status(400).json({ ok: false, error: 'This department already has an HOD. Remove the existing HOD first.' })
      }

      // Update user's department if not set
      if (!targetUser.departmentId) {
        targetUser.departmentId = department._id
        targetUser.dept = department.name
      }
    }

    targetUser.isHOD = Boolean(isHOD)
    await targetUser.save()

    // Update department's headOfDepartment field
    if (isHOD && targetUser.departmentId) {
      await Department.findByIdAndUpdate(targetUser.departmentId, { 
        headOfDepartment: targetUser.name 
      })
    } else if (!isHOD && targetUser.departmentId) {
      await Department.findByIdAndUpdate(targetUser.departmentId, { 
        headOfDepartment: null 
      })
    }

    // Log the action
    await logActivity({
      adminId: req.user._id,
      adminName: req.user.name,
      adminRole: req.user.role,
      collegeId: req.user.collegeId,
      college: req.user.college,
      actionType: isHOD ? 'hod_assigned' : 'hod_removed',
      resourceType: 'user',
      resourceId: targetUser._id,
      resourceName: targetUser.name,
      details: isHOD ? `Assigned as HOD of ${targetUser.dept}` : `Removed as HOD of ${targetUser.dept}`,
      ipAddress: req.ip,
    })

    res.json({ ok: true, user: targetUser.toJSON() })
  } catch (err) {
    console.error('[PATCH /api/users/:id/hod] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to update HOD status.' })
  }
})

router.patch('/:id/status', requireAuth, requireRole('admin', 'college_admin'), async (req, res) => {
  try {
    const { id } = req.params

    if (id === req.user.id || id === req.user._id.toString()) {
      return res.status(403).json({ ok: false, error: 'You cannot suspend your own account.' })
    }

    const targetUser = await User.findById(id)
    if (!targetUser) {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }

    // College admin can only manage users from their college
    if (req.user.role === 'college_admin') {
      if (!req.user.collegeId || !targetUser.collegeId || !targetUser.collegeId.equals(req.user.collegeId)) {
        return res.status(403).json({ ok: false, error: 'You can only manage users from your college.' })
      }
      // College admin cannot manage other college admins or super admins
      if (targetUser.role === 'college_admin' || targetUser.role === 'admin' || targetUser.role === 'main_admin') {
        return res.status(403).json({ ok: false, error: 'College admins cannot manage admin accounts.' })
      }
    }

    if ((req.user.role === 'admin' || req.user.role === 'main_admin') && (targetUser.role === 'admin' || targetUser.role === 'main_admin')) {
      return res.status(403).json({ ok: false, error: 'Admins cannot suspend other admins.' })
    }

    targetUser.suspended = !targetUser.suspended
    await targetUser.save()

    // Log the action
    await logActivity({
      adminId: req.user._id,
      adminName: req.user.name,
      adminRole: req.user.role,
      collegeId: req.user.collegeId,
      college: req.user.college,
      actionType: targetUser.suspended ? 'user_suspended' : 'user_reactivated',
      resourceType: 'user',
      resourceId: targetUser._id,
      resourceName: targetUser.name,
      details: targetUser.suspended ? 'Suspended user account' : 'Reactivated user account',
      ipAddress: req.ip,
    })

    res.json({ ok: true, user: targetUser.toJSON() })
  } catch (err) {
    console.error('[PATCH /api/users/:id/status] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to update user status.' })
  }
})

// ── GET FOLLOWERS LIST ─────────────────────────────────────────────────────────
router.get('/:userId/followers', requireAuth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId)
    if (!targetUser) {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }

    const follows = await Follow.find({ following: req.params.userId })
      .populate('follower', 'name username initials avatarColor profilePhoto dept year followers')
      .sort({ createdAt: -1 })

    // For each follower, check if the current user follows them
    const followerIds = follows.map(f => f.follower._id)
    const currentUserFollows = await Follow.find({
      follower: req.user.id,
      following: { $in: followerIds },
    })
    const followingSet = new Set(currentUserFollows.map(f => f.following.toString()))

    const users = follows.map(f => ({
      ...f.follower.toJSON(),
      isFollowing: followingSet.has(f.follower._id.toString()),
      isSelf: f.follower._id.toString() === req.user.id,
    }))

    res.json({ ok: true, users })
  } catch (err) {
    console.error('[GET /api/users/:userId/followers] Error:', err)
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }
    res.status(500).json({ ok: false, error: 'Failed to fetch followers.' })
  }
})

// ── GET FOLLOWING LIST ─────────────────────────────────────────────────────────
router.get('/:userId/following', requireAuth, async (req, res) => {
  try {
    const targetUser = await User.findById(req.params.userId)
    if (!targetUser) {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }

    const follows = await Follow.find({ follower: req.params.userId })
      .populate('following', 'name username initials avatarColor profilePhoto dept year followers')
      .sort({ createdAt: -1 })

    // For each followed user, check if the current user also follows them
    const followingIds = follows.map(f => f.following._id)
    const currentUserFollows = await Follow.find({
      follower: req.user.id,
      following: { $in: followingIds },
    })
    const followingSet = new Set(currentUserFollows.map(f => f.following.toString()))

    const users = follows.map(f => ({
      ...f.following.toJSON(),
      isFollowing: followingSet.has(f.following._id.toString()),
      isSelf: f.following._id.toString() === req.user.id,
    }))

    res.json({ ok: true, users })
  } catch (err) {
    console.error('[GET /api/users/:userId/following] Error:', err)
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }
    res.status(500).json({ ok: false, error: 'Failed to fetch following.' })
  }
})

export default router
