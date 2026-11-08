import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import csv from 'csv-parser'
import { createObjectCsvWriter } from 'csv-writer'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import { uploadProfilePhoto, uploadPostPhoto } from '../middleware/upload.middleware.js'
import { uploadPostImage, isCloudinaryConfigured } from '../services/cloudinary.service.js'
import User from '../models/User.js'
import Follow from '../models/Follow.js'
import FollowRequest from '../models/FollowRequest.js'
import Department from '../models/Department.js'
import College from '../models/College.js'
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
import bcrypt from 'bcryptjs'
import {
  resolveUserCollege,
  buildCollegeUserFilter,
  autoHealCollegeUsers,
  isUserInCollege,
} from '../services/college-reconciliation.service.js'

const router = Router()

// Multer configuration for CSV file upload
const csvStorage = multer.memoryStorage()
const csvUpload = multer({
  storage: csvStorage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.mimetype === 'application/vnd.ms-excel' || file.originalname.endsWith('.csv')) {
      cb(null, true)
    } else {
      cb(new Error('Only CSV files are allowed.'), false)
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
})

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
    const isMainAdmin = req.user.role === 'main_admin' || req.user.role === 'admin'
    let tenantCollegeId = req.user.collegeId ? req.user.collegeId.toString() : null

    if (isMainAdmin) {
      const candidateId = req.query.collegeId || req.headers['x-college-id']
      if (!candidateId) {
        return res.status(400).json({
          ok: false,
          error: 'Explicit college context (?collegeId=...) is required for administrative user search.',
        })
      }
      const college = await College.findById(candidateId).select('_id').lean()
      if (!college) {
        return res.status(404).json({ ok: false, error: 'Specified college not found.' })
      }
      tenantCollegeId = college._id.toString()
    } else if (!tenantCollegeId) {
      return res.status(403).json({ ok: false, error: 'College membership required.' })
    }

    const q = req.query.q?.trim()
    if (!q) return res.json({ ok: true, users: [] })

    const regex = new RegExp(q, 'i')
    const users = await User.find({
      _id:         { $ne: req.user._id },
      collegeId:   tenantCollegeId,
      deactivated: false,
      suspended:   { $ne: true },
      role:        { $in: ['student', 'faculty'] },
      $or: [{ name: regex }, { username: regex }, { dept: regex }],
    })
      .limit(20)
      .select('name username initials avatarColor profilePhoto dept year role followers preferences.privacy.private')
      .lean()

    // Check follow & request status for each result using legacy-safe query
    const ids = users.map(u => u._id)
    const [followDocs, requestDocs] = await Promise.all([
      Follow.find({ follower: req.user._id, following: { $in: ids }, isActive: { $ne: false } }),
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
// Scoped exclusively to the user's college under Option A
router.get('/all', requireAuth, async (req, res) => {
  try {
    const isMainAdmin = req.user.role === 'main_admin' || req.user.role === 'admin'
    let tenantCollegeId = req.user.collegeId ? req.user.collegeId.toString() : null

    if (isMainAdmin) {
      const candidateId = req.query.collegeId || req.headers['x-college-id']
      if (!candidateId) {
        return res.status(400).json({
          ok: false,
          error: 'Explicit college context (?collegeId=...) is required for administrative directory exploration.',
        })
      }
      const college = await College.findById(candidateId).select('_id').lean()
      if (!college) {
        return res.status(404).json({ ok: false, error: 'Specified college not found.' })
      }
      tenantCollegeId = college._id.toString()
    } else if (!tenantCollegeId) {
      return res.status(403).json({ ok: false, error: 'College membership required.' })
    }

    const filter = {
      _id:         { $ne: req.user._id },
      collegeId:   tenantCollegeId,
      deactivated: false,
      suspended:   { $ne: true },
      role:        { $in: ['student', 'faculty'] },
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
      Follow.find({ follower: req.user._id, following: { $in: ids }, isActive: { $ne: false } }),
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
    let filter = {}

    // College admin & faculty can only see users from their college
    if (req.user.role === 'college_admin') {
      const college = await resolveUserCollege(req.user)
      if (!college) {
        return res.status(403).json({ ok: false, error: 'Access denied: College admin has no associated college.' })
      }
      autoHealCollegeUsers(college).catch(() => {})

      const additional = {}
      if (req.query.role) {
        additional.role = req.query.role
      }
      filter = buildCollegeUserFilter(college, additional)
    } else if (req.user.role === 'faculty') {
      const college = await resolveUserCollege(req.user)
      if (!college) {
        return res.status(403).json({ ok: false, error: 'Access denied: Faculty has no associated college.' })
      }
      const additional = { role: 'student' }
      if (req.query.dept) {
        additional.dept = req.query.dept
      }
      filter = buildCollegeUserFilter(college, additional)
    } else if (req.user.role === 'admin' && req.query.collegeId) {
      const college = await College.findById(req.query.collegeId)
      if (college) {
        const additional = req.query.role ? { role: req.query.role } : {}
        filter = buildCollegeUserFilter(college, additional)
      } else {
        filter.collegeId = req.query.collegeId
        if (req.query.role) filter.role = req.query.role
      }
    } else if (req.query.role) {
      filter.role = req.query.role
    }

    const users = await User.find(filter)
      .populate('departmentId', 'name code')
      .sort({ createdAt: -1 })
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
    let filter = {}
    let deptFilter = {}
    let noticeFilter = {}

    // College admin and faculty can only see stats from their college
    if (req.user.role === 'college_admin' || req.user.role === 'faculty') {
      const college = await resolveUserCollege(req.user)
      if (!college) {
        return res.status(403).json({ ok: false, error: 'Access denied: User has no associated college.' })
      }
      filter = buildCollegeUserFilter(college)
      deptFilter = { $or: [{ collegeId: college._id }, { collegeId: college._id.toString() }, { college: college.name }] }
      noticeFilter = { $or: [{ collegeId: college._id }, { collegeId: college._id.toString() }, { college: college.name }] }
    } else if (req.user.role === 'admin' && req.query.collegeId) {
      const college = await College.findById(req.query.collegeId)
      if (college) {
        filter = buildCollegeUserFilter(college)
        deptFilter = { $or: [{ collegeId: college._id }, { collegeId: college._id.toString() }, { college: college.name }] }
        noticeFilter = { $or: [{ collegeId: college._id }, { collegeId: college._id.toString() }, { college: college.name }] }
      } else {
        filter.collegeId = req.query.collegeId
        deptFilter.collegeId = req.query.collegeId
        noticeFilter.collegeId = req.query.collegeId
      }
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

    const isMainAdmin = req.user.role === 'main_admin' || req.user.role === 'admin'
    // Option A: Students and faculty can only discover and view profiles from their own college
    if (!isMainAdmin && req.user.id !== user.id) {
      if (!user.collegeId || !req.user.collegeId || user.collegeId.toString() !== req.user.collegeId.toString()) {
        return res.status(404).json({ ok: false, error: 'User not found.' })
      }
    }

    const [isFollowing, isRequested] = await Promise.all([
      Follow.exists({
        follower: req.user.id,
        following: user.id,
        isActive: { $ne: false },
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

    // Option A: Strict College Isolation — both users must belong to the exact same college
    if (!req.user.collegeId || !target.collegeId || req.user.collegeId.toString() !== target.collegeId.toString()) {
      return res.status(403).json({
        ok: false,
        error: 'Follow actions are only available between members of the same college.',
      })
    }

    // Check if already following or historical relationship exists
    const existing = await Follow.findOne({ follower: req.user.id, following: targetId })
    if (existing) {
      if (existing.isActive !== false) {
        return res.status(200).json({ ok: true, following: true, requested: false, message: 'You already follow this user.' })
      }
      // Reactivate previously unfollowed same-college relationship
      existing.isActive = true
      existing.collegeId = req.user.collegeId
      await existing.save()

      const [updatedTarget] = await Promise.all([
        User.findByIdAndUpdate(targetId, { $inc: { followers: 1 } }, { new: true }),
        User.findByIdAndUpdate(req.user.id, { $inc: { following: 1 } }, { new: true }),
      ])

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

      return res.status(200).json({
        ok: true,
        following: true,
        requested: false,
        followerCount: updatedTarget ? updatedTarget.followers : 0,
      })
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
        { requester: req.user.id, recipient: targetId, collegeId: req.user.collegeId, status: 'pending' },
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

    // Public account: Direct follow within same college
    await Follow.create({
      follower: req.user.id,
      following: targetId,
      collegeId: req.user.collegeId,
      isActive: true,
    })
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

    // Soft-deactivate to preserve historical records per Decision 1
    const existing = await Follow.findOne({ follower: req.user.id, following: targetId })
    if (!existing || existing.isActive === false) {
      const target = await User.findById(targetId).select('followers')
      return res.status(200).json({
        ok: true,
        following: false,
        requested: false,
        message: 'You do not follow this user.',
        followerCount: target?.followers || 0,
      })
    }

    existing.isActive = false
    await existing.save()

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

    const requester = await User.findById(requesterId)
    if (!requester || !requester.collegeId || !req.user.collegeId || requester.collegeId.toString() !== req.user.collegeId.toString()) {
      return res.status(403).json({ ok: false, error: 'Cannot accept follow requests from other institutions.' })
    }

    const followReq = await FollowRequest.findOneAndDelete({
      requester: requesterId,
      recipient: recipientId,
      status: 'pending',
    })

    if (!followReq) {
      return res.status(404).json({ ok: false, error: 'Follow request not found or already processed.' })
    }

    // Create follow relationship if it doesn't already exist or reactivate
    const existingFollow = await Follow.findOne({ follower: requesterId, following: recipientId })
    let updatedSelf = null
    if (!existingFollow) {
      await Follow.create({
        follower: requesterId,
        following: recipientId,
        collegeId: req.user.collegeId,
        isActive: true,
      })
      const [self, reqUser] = await Promise.all([
        User.findByIdAndUpdate(recipientId, { $inc: { followers: 1 } }, { new: true }),
        User.findByIdAndUpdate(requesterId, { $inc: { following: 1 } }, { new: true }),
      ])
      updatedSelf = self
    } else {
      if (existingFollow.isActive === false) {
        existingFollow.isActive = true
        existingFollow.collegeId = req.user.collegeId
        await existingFollow.save()
        await Promise.all([
          User.findByIdAndUpdate(recipientId, { $inc: { followers: 1 } }, { new: true }),
          User.findByIdAndUpdate(requesterId, { $inc: { following: 1 } }, { new: true }),
        ])
      }
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
      const adminCollege = await resolveUserCollege(req.user)
      if (!adminCollege || !isUserInCollege(targetUser, adminCollege)) {
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
      const adminCollege = await resolveUserCollege(req.user)
      if (!adminCollege || !isUserInCollege(targetUser, adminCollege)) {
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
      const adminCollege = await resolveUserCollege(req.user)
      if (!adminCollege || !isUserInCollege(targetUser, adminCollege)) {
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

    const isMainAdmin = req.user.role === 'admin' || req.user.role === 'main_admin'
    // Option A: Students and faculty cannot view followers from another college
    if (!isMainAdmin && req.user.id !== targetUser.id) {
      if (!targetUser.collegeId || !req.user.collegeId || targetUser.collegeId.toString() !== req.user.collegeId.toString()) {
        return res.status(404).json({ ok: false, error: 'User not found.' })
      }
    }

    const follows = await Follow.find({ following: req.params.userId, isActive: { $ne: false } })
      .populate('follower', 'name username initials avatarColor profilePhoto dept year followers collegeId')
      .sort({ createdAt: -1 })

    // For each follower, check if the current user follows them
    const followerIds = follows.map(f => f.follower?._id).filter(Boolean)
    const currentUserFollows = await Follow.find({
      follower: req.user.id,
      following: { $in: followerIds },
      isActive: { $ne: false },
    })
    const followingSet = new Set(currentUserFollows.map(f => f.following.toString()))

    const users = follows
      .filter(f => f.follower && (isMainAdmin || !f.follower.collegeId || !req.user.collegeId || f.follower.collegeId.toString() === req.user.collegeId.toString()))
      .map(f => ({
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

    const isMainAdmin = req.user.role === 'admin' || req.user.role === 'main_admin'
    // Option A: Students and faculty cannot view following list from another college
    if (!isMainAdmin && req.user.id !== targetUser.id) {
      if (!targetUser.collegeId || !req.user.collegeId || targetUser.collegeId.toString() !== req.user.collegeId.toString()) {
        return res.status(404).json({ ok: false, error: 'User not found.' })
      }
    }

    const follows = await Follow.find({ follower: req.params.userId, isActive: { $ne: false } })
      .populate('following', 'name username initials avatarColor profilePhoto dept year followers collegeId')
      .sort({ createdAt: -1 })

    // For each followed user, check if the current user also follows them
    const followingIds = follows.map(f => f.following?._id).filter(Boolean)
    const currentUserFollows = await Follow.find({
      follower: req.user.id,
      following: { $in: followingIds },
      isActive: { $ne: false },
    })
    const followingSet = new Set(currentUserFollows.map(f => f.following.toString()))

    const users = follows
      .filter(f => f.following && (isMainAdmin || !f.following.collegeId || !req.user.collegeId || f.following.collegeId.toString() === req.user.collegeId.toString()))
      .map(f => ({
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

// ── GET /api/students/csv-template ─────────────────────────────────────────────
// Download CSV template for student import
router.get('/students/csv-template', requireAuth, requireRole('admin', 'college_admin'), async (req, res) => {
  try {
    const template = [
      {
        name: 'John Doe',
        email: 'john.doe@college.edu',
        rollNumber: 'CS2024001',
        department: 'Computer Science',
        year: '1st Year'
      }
    ]

    const csvWriter = createObjectCsvWriter({
      path: path.join(process.cwd(), 'temp', 'student-template.csv'),
      header: [
        { id: 'name', title: 'Name' },
        { id: 'email', title: 'Email' },
        { id: 'rollNumber', title: 'Roll Number' },
        { id: 'department', title: 'Department' },
        { id: 'year', title: 'Academic Year' }
      ]
    })

    const tempDir = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    await csvWriter.writeRecords(template)

    res.download(path.join(tempDir, 'student-template.csv'), 'student-import-template.csv', (err) => {
      if (err) {
        console.error('[CSV Template Download] Error:', err)
      }
      fs.unlinkSync(path.join(tempDir, 'student-template.csv'))
    })
  } catch (err) {
    console.error('[GET /api/students/csv-template] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to generate CSV template.' })
  }
})

// ── POST /api/students/csv-import ───────────────────────────────────────────────
// Import students from CSV file
router.post('/students/csv-import', requireAuth, requireRole('admin', 'college_admin'), csvUpload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No CSV file uploaded.' })
    }

    const collegeId = req.user.collegeId
    if (!collegeId && req.user.role === 'college_admin') {
      return res.status(403).json({ ok: false, error: 'College admin has no associated college.' })
    }

    const targetCollegeId = req.user.role === 'admin' ? (req.body.collegeId || collegeId) : collegeId
    if (!targetCollegeId) {
      return res.status(400).json({ ok: false, error: 'College ID is required.' })
    }

    const college = await College.findById(targetCollegeId)
    if (!college) {
      return res.status(404).json({ ok: false, error: 'College not found.' })
    }

    const results = []
    const errors = []
    const skipped = []
    let successCount = 0
    let failCount = 0

    // Parse CSV from memory buffer
    const csvData = []
    await new Promise((resolve, reject) => {
      const bufferString = req.file.buffer.toString('utf-8')
      const lines = bufferString.split('\n')
      const headers = lines[0].split(',').map(h => h.trim())
      
      for (let i = 1; i < lines.length; i++) {
        if (!lines[i].trim()) continue
        const values = lines[i].split(',').map(v => v.trim())
        const row = {}
        headers.forEach((header, index) => {
          row[header] = values[index] || ''
        })
        csvData.push(row)
      }
      resolve()
    })

    const emailSet = new Set()
    const rollNumberSet = new Set()

    for (const [index, row] of csvData.entries()) {
      const rowNum = index + 2 // Header is row 1
      const { Name, Email, 'Roll Number': rollNumber, Department, 'Academic Year': year } = row

      // Validate required fields
      if (!Name || !Email || !rollNumber) {
        errors.push({ row: rowNum, error: 'Missing required fields: Name, Email, or Roll Number' })
        failCount++
        continue
      }

      const name = Name.trim()
      const email = Email.trim().toLowerCase()
      const dept = Department?.trim() || ''
      const academicYear = year?.trim() || ''

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(email)) {
        errors.push({ row: rowNum, email, error: 'Invalid email format' })
        failCount++
        continue
      }

      // Check for duplicate emails within CSV
      if (emailSet.has(email)) {
        errors.push({ row: rowNum, email, error: 'Duplicate email within CSV' })
        failCount++
        continue
      }
      emailSet.add(email)

      // Check for duplicate roll numbers within CSV
      if (rollNumberSet.has(rollNumber)) {
        errors.push({ row: rowNum, rollNumber, error: 'Duplicate roll number within CSV' })
        failCount++
        continue
      }
      rollNumberSet.add(rollNumber)

      // Check if email domain matches college domain
      const emailDomain = email.split('@')[1]
      if (emailDomain !== college.domain.toLowerCase()) {
        errors.push({ row: rowNum, email, error: `Email domain @${emailDomain} does not match college domain @${college.domain}` })
        failCount++
        continue
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email })
      if (existingUser) {
        skipped.push({ row: rowNum, email, reason: 'User already exists' })
        continue
      }

      // Check if roll number already exists in college
      const existingRoll = await User.findOne({ rollNumber, collegeId: targetCollegeId })
      if (existingRoll) {
        errors.push({ row: rowNum, rollNumber, error: 'Roll number already exists in college' })
        failCount++
        continue
      }

      // Validate department if provided
      let departmentId = null
      if (dept) {
        const department = await Department.findOne({ collegeId: targetCollegeId, name: dept })
        if (!department) {
          errors.push({ row: rowNum, department: dept, error: 'Department not found in college' })
          failCount++
          continue
        }
        departmentId = department._id
      }

      try {
        // Generate temporary password
        const tempPassword = crypto.randomBytes(8).toString('hex')
        const passwordHash = await bcrypt.hash(tempPassword, 12)

        const initials = name
          .split(/\s+/)
          .map(word => word[0] || '')
          .join('')
          .toUpperCase()
          .slice(0, 2)

        const student = await User.create({
          name,
          username: email,
          initials,
          avatarColor: '#6366f1',
          email,
          passwordHash,
          role: 'student',
          isEmailVerified: true,
          college: college.name,
          collegeId: targetCollegeId,
          mustChangePassword: true,
          dept,
          departmentId,
          year: academicYear,
          rollNumber,
          deactivated: false,
          suspended: false,
        })

        successCount++
        results.push({
          row: rowNum,
          name,
          email,
          rollNumber,
          tempPassword
        })
      } catch (createErr) {
        errors.push({ row: rowNum, email, error: createErr.message })
        failCount++
      }
    }

    // Log the bulk import action
    await logActivity({
      adminId: req.user._id,
      adminName: req.user.name,
      adminRole: req.user.role,
      collegeId: targetCollegeId,
      college: college.name,
      actionType: 'students_imported',
      resourceType: 'user',
      resourceId: null,
      resourceName: `${successCount} students`,
      details: `CSV import: ${successCount} successful, ${skipped.length} skipped, ${failCount} failed`,
      ipAddress: req.ip,
    })

    res.json({
      ok: true,
      summary: {
        total: csvData.length,
        success: successCount,
        skipped: skipped.length,
        failed: failCount
      },
      results,
      skipped,
      errors
    })
  } catch (err) {
    console.error('[POST /api/students/csv-import] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to import students from CSV.' })
  }
})

// ── GET /api/students/csv-export ───────────────────────────────────────────────
// Export students to CSV
router.get('/students/csv-export', requireAuth, requireRole('admin', 'college_admin'), async (req, res) => {
  try {
    const collegeId = req.user.collegeId
    if (!collegeId && req.user.role === 'college_admin') {
      return res.status(403).json({ ok: false, error: 'College admin has no associated college.' })
    }

    const targetCollegeId = req.user.role === 'admin' ? (req.query.collegeId || collegeId) : collegeId
    if (!targetCollegeId) {
      return res.status(400).json({ ok: false, error: 'College ID is required.' })
    }

    const filter = { collegeId: targetCollegeId, role: 'student' }

    // Apply search filter if provided
    if (req.query.search) {
      const searchRegex = new RegExp(req.query.search, 'i')
      filter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { rollNumber: searchRegex }
      ]
    }

    // Apply department filter if provided
    if (req.query.department) {
      filter.dept = req.query.department
    }

    // Apply year filter if provided
    if (req.query.year) {
      filter.year = req.query.year
    }

    const students = await User.find(filter)
      .select('name email rollNumber dept year suspended deactivated createdAt')
      .sort({ name: 1 })
      .lean()

    const csvData = students.map(s => ({
      Name: s.name,
      Email: s.email,
      'Roll Number': s.rollNumber || '',
      Department: s.dept || '',
      'Academic Year': s.year || '',
      Status: s.suspended ? 'Suspended' : (s.deactivated ? 'Deactivated' : 'Active'),
      'Created At': s.createdAt ? new Date(s.createdAt).toISOString().split('T')[0] : ''
    }))

    const tempDir = path.join(process.cwd(), 'temp')
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true })
    }

    const filename = `students-export-${Date.now()}.csv`
    const filepath = path.join(tempDir, filename)

    const csvWriter = createObjectCsvWriter({
      path: filepath,
      header: [
        { id: 'Name', title: 'Name' },
        { id: 'Email', title: 'Email' },
        { id: 'Roll Number', title: 'Roll Number' },
        { id: 'Department', title: 'Department' },
        { id: 'Academic Year', title: 'Academic Year' },
        { id: 'Status', title: 'Status' },
        { id: 'Created At', title: 'Created At' }
      ]
    })

    await csvWriter.writeRecords(csvData)

    res.download(filepath, filename, (err) => {
      if (err) {
        console.error('[CSV Export Download] Error:', err)
      }
      fs.unlinkSync(filepath)
    })
  } catch (err) {
    console.error('[GET /api/students/csv-export] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to export students to CSV.' })
  }
})

// ── PATCH /api/students/:id/suspend ─────────────────────────────────────────────
// Suspend or reactivate a student with reason and dates
router.patch('/students/:id/suspend', requireAuth, requireRole('admin', 'college_admin'), async (req, res) => {
  try {
    const { id } = req.params
    const { suspended, reason, suspensionStart, suspensionEnd } = req.body

    if (id === req.user.id || id === req.user._id.toString()) {
      return res.status(403).json({ ok: false, error: 'You cannot suspend your own account.' })
    }

    const targetUser = await User.findById(id)
    if (!targetUser) {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }

    if (targetUser.role !== 'student') {
      return res.status(400).json({ ok: false, error: 'Suspension can only be applied to students.' })
    }

    // College admin can only manage students from their college
    if (req.user.role === 'college_admin') {
      const adminCollege = await resolveUserCollege(req.user)
      if (!adminCollege || !isUserInCollege(targetUser, adminCollege)) {
        return res.status(403).json({ ok: false, error: 'You can only manage students from your college.' })
      }
    }

    if (suspended) {
      // Validate suspension details
      if (!reason || !reason.trim()) {
        return res.status(400).json({ ok: false, error: 'Suspension reason is required.' })
      }

      if (suspensionEnd && new Date(suspensionEnd) <= new Date()) {
        return res.status(400).json({ ok: false, error: 'Suspension end date must be in the future.' })
      }

      targetUser.suspended = true
      targetUser.suspensionReason = reason.trim()
      targetUser.suspensionStart = suspensionStart ? new Date(suspensionStart) : new Date()
      targetUser.suspensionEnd = suspensionEnd ? new Date(suspensionEnd) : null
    } else {
      // Reactivate
      targetUser.suspended = false
      targetUser.suspensionReason = null
      targetUser.suspensionStart = null
      targetUser.suspensionEnd = null
    }

    await targetUser.save()

    // Log the action
    await logActivity({
      adminId: req.user._id,
      adminName: req.user.name,
      adminRole: req.user.role,
      collegeId: req.user.collegeId,
      college: req.user.college,
      actionType: suspended ? 'user_suspended' : 'user_reactivated',
      resourceType: 'user',
      resourceId: targetUser._id,
      resourceName: targetUser.name,
      details: suspended ? `Suspended: ${reason.trim()}` : 'Reactivated student account',
      ipAddress: req.ip,
    })

    res.json({ ok: true, user: targetUser.toJSON() })
  } catch (err) {
    console.error('[PATCH /api/students/:id/suspend] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to update suspension status.' })
  }
})

// ── POST /api/faculty/invite ───────────────────────────────────────────────────
// Invite a faculty member via email
router.post('/faculty/invite', requireAuth, requireRole('admin', 'college_admin'), async (req, res) => {
  try {
    const { email, name, departmentId, designation } = req.body

    if (!email || !name) {
      return res.status(400).json({ ok: false, error: 'Email and name are required.' })
    }

    const normalizedEmail = email.trim().toLowerCase()
    const trimmedName = name.trim()

    const collegeId = req.user.collegeId
    if (!collegeId && req.user.role === 'college_admin') {
      return res.status(403).json({ ok: false, error: 'College admin has no associated college.' })
    }

    const targetCollegeId = req.user.role === 'admin' ? (req.body.collegeId || collegeId) : collegeId
    if (!targetCollegeId) {
      return res.status(400).json({ ok: false, error: 'College ID is required.' })
    }

    const college = await College.findById(targetCollegeId)
    if (!college) {
      return res.status(404).json({ ok: false, error: 'College not found.' })
    }

    // Validate email domain matches college domain
    const emailDomain = normalizedEmail.split('@')[1]
    if (emailDomain !== college.domain.toLowerCase()) {
      return res.status(400).json({
        ok: false,
        error: `Email domain @${emailDomain} does not match college domain @${college.domain}`
      })
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail })
    if (existingUser) {
      return res.status(409).json({ ok: false, error: 'A user with this email already exists.' })
    }

    // Validate department if provided
    let departmentIdObj = null
    let deptName = ''
    if (departmentId) {
      const department = await Department.findById(departmentId)
      if (!department || !department.collegeId.equals(targetCollegeId)) {
        return res.status(404).json({ ok: false, error: 'Department not found in this college.' })
      }
      departmentIdObj = department._id
      deptName = department.name
    }

    // Generate invitation token (expires in 7 days)
    const invitationToken = crypto.randomBytes(32).toString('hex')
    const invitationTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

    const initials = trimmedName
      .split(/\s+/)
      .map(word => word[0] || '')
      .join('')
      .toUpperCase()
      .slice(0, 2)

    const faculty = await User.create({
      name: trimmedName,
      username: normalizedEmail,
      initials,
      avatarColor: '#6366f1',
      email: normalizedEmail,
      passwordHash: '', // Will be set when they accept invitation
      role: 'faculty',
      isEmailVerified: false,
      college: college.name,
      collegeId: targetCollegeId,
      dept: deptName,
      departmentId: departmentIdObj,
      designation: designation?.trim() || '',
      deactivated: false,
      suspended: false,
      invitationToken,
      invitationTokenExpiresAt,
      invitationStatus: 'pending',
      invitedBy: req.user._id,
      invitedAt: new Date(),
      mustChangePassword: true,
    })

    // Log the action
    await logActivity({
      adminId: req.user._id,
      adminName: req.user.name,
      adminRole: req.user.role,
      collegeId: targetCollegeId,
      college: college.name,
      actionType: 'faculty_invited',
      resourceType: 'user',
      resourceId: faculty._id,
      resourceName: trimmedName,
      details: `Invited faculty member: ${normalizedEmail}`,
      ipAddress: req.ip,
    })

    // TODO: Send invitation email with token

    res.status(201).json({
      ok: true,
      message: 'Faculty invitation sent successfully.',
      faculty: {
        id: faculty._id.toString(),
        name: faculty.name,
        email: faculty.email,
        invitationStatus: faculty.invitationStatus,
        invitedAt: faculty.invitedAt,
      }
    })
  } catch (err) {
    console.error('[POST /api/faculty/invite] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to send faculty invitation.' })
  }
})

// ── GET /api/faculty/invitations ─────────────────────────────────────────────────
// List faculty invitations with pagination and filtering
router.get('/faculty/invitations', requireAuth, requireRole('admin', 'college_admin'), async (req, res) => {
  try {
    const collegeId = req.user.collegeId
    if (!collegeId && req.user.role === 'college_admin') {
      return res.status(403).json({ ok: false, error: 'College admin has no associated college.' })
    }

    const targetCollegeId = req.user.role === 'admin' ? (req.query.collegeId || collegeId) : collegeId
    if (!targetCollegeId) {
      return res.status(400).json({ ok: false, error: 'College ID is required.' })
    }

    const { status, limit = 50, skip = 0 } = req.query

    const filter = { collegeId: targetCollegeId, role: 'faculty' }
    if (status) {
      filter.invitationStatus = status
    }

    const invitations = await User.find(filter)
      .populate('invitedBy', 'name email')
      .sort({ invitedAt: -1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean()

    const total = await User.countDocuments(filter)

    res.json({
      ok: true,
      invitations: invitations.map(f => ({
        id: f._id.toString(),
        name: f.name,
        email: f.email,
        designation: f.designation || '',
        dept: f.dept || '',
        invitationStatus: f.invitationStatus,
        invitedAt: f.invitedAt,
        invitedBy: f.invitedBy ? {
          id: f.invitedBy._id.toString(),
          name: f.invitedBy.name,
          email: f.invitedBy.email
        } : null,
        invitationTokenExpiresAt: f.invitationTokenExpiresAt
      })),
      total,
      limit: Number(limit),
      skip: Number(skip)
    })
  } catch (err) {
    console.error('[GET /api/faculty/invitations] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch faculty invitations.' })
  }
})

// ── POST /api/faculty/accept-invitation ───────────────────────────────────────────
// Accept faculty invitation with token and set password
router.post('/faculty/accept-invitation', async (req, res) => {
  try {
    const { token, password } = req.body

    if (!token || !password) {
      return res.status(400).json({ ok: false, error: 'Token and password are required.' })
    }

    if (password.length < 8) {
      return res.status(400).json({ ok: false, error: 'Password must be at least 8 characters.' })
    }

    const faculty = await User.findOne({ invitationToken: token, invitationStatus: 'pending' })
    if (!faculty) {
      return res.status(404).json({ ok: false, error: 'Invalid or expired invitation token.' })
    }

    if (faculty.invitationTokenExpiresAt && new Date() > faculty.invitationTokenExpiresAt) {
      faculty.invitationStatus = 'expired'
      await faculty.save()
      return res.status(400).json({ ok: false, error: 'Invitation has expired.' })
    }

    // Set password and mark as accepted
    const passwordHash = await bcrypt.hash(password, 12)
    faculty.passwordHash = passwordHash
    faculty.invitationStatus = 'accepted'
    faculty.invitationToken = null
    faculty.invitationTokenExpiresAt = null
    faculty.isEmailVerified = true
    await faculty.save()

    res.json({
      ok: true,
      message: 'Invitation accepted successfully. You can now log in.',
      faculty: {
        id: faculty._id.toString(),
        name: faculty.name,
        email: faculty.email,
      }
    })
  } catch (err) {
    console.error('[POST /api/faculty/accept-invitation] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to accept invitation.' })
  }
})

// ── GET /api/faculty ───────────────────────────────────────────────────────────
// List faculty with pagination and filtering
router.get('/faculty', requireAuth, requireRole('admin', 'college_admin'), async (req, res) => {
  try {
    let targetCollege = null
    if (req.user.role === 'college_admin') {
      targetCollege = await resolveUserCollege(req.user)
      if (!targetCollege) {
        return res.status(403).json({ ok: false, error: 'College admin has no associated college.' })
      }
      autoHealCollegeUsers(targetCollege).catch(() => {})
    } else if (req.user.role === 'admin') {
      const cId = req.query.collegeId || req.user.collegeId
      if (cId) {
        targetCollege = await College.findById(cId)
      }
    }

    if (!targetCollege) {
      return res.status(400).json({ ok: false, error: 'College ID is required.' })
    }

    const { search, department, limit = 50, skip = 0 } = req.query

    const additionalFilter = { role: 'faculty', deactivated: false }

    if (search) {
      const searchRegex = new RegExp(search, 'i')
      additionalFilter.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { designation: searchRegex },
      ]
    }

    if (department) {
      additionalFilter.dept = department
    }

    const filter = buildCollegeUserFilter(targetCollege, additionalFilter)

    const faculty = await User.find(filter)
      .populate('departmentId', 'name code')
      .select('name email designation dept departmentId verifiedBadge isHOD suspended invitationStatus invitedAt')
      .sort({ name: 1 })
      .limit(Number(limit))
      .skip(Number(skip))
      .lean()

    const total = await User.countDocuments(filter)

    res.json({
      ok: true,
      faculty: faculty.map(f => ({
        id: f._id.toString(),
        name: f.name,
        email: f.email,
        designation: f.designation || '',
        dept: f.dept || '',
        verifiedBadge: f.verifiedBadge,
        isHOD: f.isHOD,
        suspended: f.suspended,
        invitationStatus: f.invitationStatus,
        invitedAt: f.invitedAt
      })),
      total,
      limit: Number(limit),
      skip: Number(skip)
    })
  } catch (err) {
    console.error('[GET /api/faculty] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch faculty.' })
  }
})

export default router
