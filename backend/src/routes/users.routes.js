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
import Department from '../models/Department.js'
import Notice from '../models/Notice.js'

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
      $or: [{ name: regex }, { username: regex }, { dept: regex }],
    })
      .limit(20)
      .select('name username initials avatarColor profilePhoto dept year role followers')
      .lean()

    // Check follow status for each result
    const ids = users.map(u => u._id)
    const followDocs = await Follow.find({ follower: req.user._id, following: { $in: ids } })
    const followingSet = new Set(followDocs.map(f => f.following.toString()))

    res.json({
      ok: true,
      users: users.map(u => ({
        ...u,
        id: u._id.toString(),
        isFollowing: followingSet.has(u._id.toString()),
        isSelf: u._id.toString() === req.user.id,
      })),
    })
  } catch (err) {
    console.error('[GET /api/users/search]', err)
    res.status(500).json({ ok: false, error: 'Search failed.' })
  }
})

// ── GET /api/users/all — list all users for Explore page ─────────────────────
// College admin only sees users from their college
router.get('/all', requireAuth, async (req, res) => {
  try {
    const filter = {
      _id:         { $ne: req.user._id },
      deactivated: false,
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
      .select('name username initials avatarColor profilePhoto dept year role followers college collegeId')
      .lean()

    const ids = users.map(u => u._id)
    const followDocs = await Follow.find({ follower: req.user._id, following: { $in: ids } })
    const followingSet = new Set(followDocs.map(f => f.following.toString()))

    res.json({
      ok: true,
      users: users.map(u => ({
        ...u,
        id: u._id.toString(),
        isFollowing: followingSet.has(u._id.toString()),
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
router.get('/', requireAuth, requireRole('admin', 'faculty', 'college_admin'), async (req, res) => {
  try {
    const filter = {}
    
    // College admin can only see users from their college
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
      filter.role = 'student' // faculty only views students
    } else if (req.user.role === 'admin' && req.query.collegeId) {
      filter.collegeId = req.query.collegeId
    }
    
    const users = await User.find(filter).sort({ createdAt: -1 })
    res.json({ ok: true, users })
  } catch (err) {
    console.error('[GET /api/users] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch users.' })
  }
})

// ── GET /api/users/stats ─────────────────────────────────────────────────────
// Get dynamic statistics for college admin dashboard
router.get('/stats', requireAuth, requireRole('admin', 'college_admin'), async (req, res) => {
  try {
    const filter = {}
    const deptFilter = {}
    const noticeFilter = {}
    
    // College admin can only see stats from their college
    if (req.user.role === 'college_admin') {
      if (!req.user.collegeId) {
        return res.status(403).json({ ok: false, error: 'Access denied: College admin has no associated college.' })
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

router.get('/:userId', requireAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.userId)
    if (!user) {
      return res.status(404).json({ ok: false, error: 'User not found.' })
    }

    const isFollowing = await Follow.exists({
      follower: req.user.id,
      following: user.id,
    })

    res.json({
      ok: true,
      user: {
        ...user.toJSON(),
        isFollowing: Boolean(isFollowing),
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
    body('designation')
      .optional()
      .trim()
      .isLength({ max: 100 }).withMessage('Designation too long.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      if (req.params.userId !== req.user.id) {
        return res.status(403).json({ ok: false, error: 'You can only edit your own profile.' })
      }

      const { name, bio, designation } = req.body
      if (name !== undefined) req.user.name = name
      if (bio !== undefined) req.user.bio = bio
      if (designation !== undefined) req.user.designation = designation
      await req.user.save()

      res.json({ ok: true, user: req.user.toJSON() })
    } catch (err) {
      console.error('[PUT /api/users/:userId] Error:', err)
      res.status(500).json({ ok: false, error: 'Failed to update profile.' })
    }
  }
)

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

    const existing = await Follow.findOne({ follower: req.user.id, following: targetId })
    if (existing) {
      return res.status(409).json({ ok: false, error: 'You already follow this user.' })
    }

    await Follow.create({ follower: req.user.id, following: targetId })
    const [updatedTarget] = await Promise.all([
      User.findByIdAndUpdate(targetId, { $inc: { followers: 1 } }, { new: true }),
      User.findByIdAndUpdate(req.user.id, { $inc: { following: 1 } }, { new: true }),
    ])

    res.status(201).json({
      ok: true,
      following: true,
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

    const existing = await Follow.findOneAndDelete({ follower: req.user.id, following: targetId })
    if (!existing) {
      return res.status(404).json({ ok: false, error: 'You do not follow this user.' })
    }

    const [target] = await Promise.all([
      User.findByIdAndUpdate(targetId, [{ $set: { followers: { $max: [0, { $subtract: ['$followers', 1] }] } } }], { new: true }),
      User.findByIdAndUpdate(req.user.id, [{ $set: { following: { $max: [0, { $subtract: ['$following', 1] }] } } }], { new: true }),
    ])

    res.json({
      ok: true,
      following: false,
      followerCount: target ? target.followers : 0,
    })
  } catch (err) {
    console.error('[DELETE /api/users/:userId/follow] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to unfollow user.' })
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
      const result = await uploadPostImage(req.file.buffer, {
        folder: process.env.CLOUDINARY_AVATARS_FOLDER || 'swish/avatars',
        width: 400,
        height: 400,
        crop: 'fill',
        gravity: 'face',
        quality: 'auto',
        fetch_format: 'auto',
      })
      photoUrl = result.secureUrl
    } else {
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


router.patch('/:id/status', requireAuth, requireRole('admin', 'faculty', 'college_admin'), async (req, res) => {
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

    if (req.user.role === 'faculty') {
      if (!req.user.collegeId || !targetUser.collegeId || !targetUser.collegeId.equals(req.user.collegeId)) {
        return res.status(403).json({ ok: false, error: 'You can only manage users from your college.' })
      }
      if (targetUser.role !== 'student') {
        return res.status(403).json({ ok: false, error: 'Faculty can only manage student accounts.' })
      }
    }
    if ((req.user.role === 'admin' || req.user.role === 'main_admin') && (targetUser.role === 'admin' || targetUser.role === 'main_admin')) {
      return res.status(403).json({ ok: false, error: 'Admins cannot suspend other admins.' })
    }

    targetUser.suspended = !targetUser.suspended
    await targetUser.save()

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
