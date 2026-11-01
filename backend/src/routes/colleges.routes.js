// backend/src/routes/colleges.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// College management routes:
//
//   GET    /api/colleges                  List all colleges (public)
//   POST   /api/colleges                  Add a new college (admin only)
//   PATCH  /api/colleges/:id/toggle       Toggle active/inactive (admin only)
//   GET    /api/colleges/check-domain     Check if a domain is registered & active
//
// ─────────────────────────────────────────────────────────────────────────────
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import { Router } from 'express'
import { body, query, validationResult } from 'express-validator'
import multer from 'multer'

import College from '../models/College.js'
import CollegeOnboardingRequest from '../models/CollegeOnboardingRequest.js'
import User from '../models/User.js'
import Department from '../models/Department.js'
import Notice from '../models/Notice.js'
import { requireAuth, requireRole, invalidateCollegeCache } from '../middleware/auth.middleware.js'
import { getOrSet, del, cacheKey } from '../services/cache.service.js'
import { sendCollegeAdminCredentialsEmail } from '../services/email.service.js'
import { uploadPostImage, deletePostImage, isCloudinaryConfigured } from '../services/cloudinary.service.js'
import { logActivity } from '../services/activity-log.service.js'
import {
  resolveUserCollege,
  buildCollegeUserFilter,
  autoHealCollegeUsers,
} from '../services/college-reconciliation.service.js'

const router = Router()

// Multer configuration for branding uploads (logo, banner)
const brandingStorage = multer.memoryStorage()
const brandingUpload = multer({
  storage: brandingStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowedTypes.includes(file.mimetype) || file.originalname.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      cb(null, true)
    } else {
      cb(new Error('Only image files are allowed.'), false)
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
})

const logoUpload = brandingUpload.single('logo')
const bannerUpload = brandingUpload.single('banner')

// ── Cache keys ────────────────────────────────────────────────────────────────
const COLLEGES_LIST_KEY = cacheKey('colleges', 'list')
const COLLEGES_TTL = 60 // seconds

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Sends a validation-errors 422 response. */
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

// ── GET /api/colleges ────────────────────────────────────────────────────────
// Public — returns all colleges (admin page lists them, signup uses for display)
router.get('/', async (_req, res) => {
  try {
    res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
    const data = await getOrSet(COLLEGES_LIST_KEY, COLLEGES_TTL, async () => {
      const colleges = await College.find().sort({ name: 1 })
      return { ok: true, colleges: colleges.map(c => c.toJSON()) }
    })
    return res.status(200).json(data)
  } catch (err) {
    console.error('[GET /colleges]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch colleges.' })
  }
})

// ── GET /api/colleges/my-college ─────────────────────────────────────────────
// College admin only — get their own college
router.get('/my-college', requireAuth, requireRole('college_admin'), async (req, res) => {
  try {
    const college = await resolveUserCollege(req.user)
    if (!college) {
      return res.status(404).json({ ok: false, error: 'College not found for this user.' })
    }

    return res.status(200).json({ ok: true, college: college.toJSON() })
  } catch (err) {
    console.error('[GET /colleges/my-college]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch college.' })
  }
})

// ── GET /api/colleges/dashboard ─────────────────────────────────────────────
// College admin dashboard statistics
router.get('/dashboard', requireAuth, requireRole('admin', 'college_admin'), async (req, res) => {
  try {
    let filter = {}
    let deptFilter = {}
    let noticeFilter = {}

    if (req.user.role === 'college_admin') {
      const college = await resolveUserCollege(req.user)
      if (!college) {
        return res.status(403).json({ ok: false, error: 'Access denied: College admin has no associated college.' })
      }
      autoHealCollegeUsers(college).catch(() => {})
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
    console.error('[GET /colleges/dashboard]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch dashboard statistics.' })
  }
})

// ── GET /api/colleges/check-domain ───────────────────────────────────────────
// Public — used by signup form to check if a domain is registered & active
router.get(
  '/check-domain',
  [
    query('domain')
      .trim()
      .notEmpty().withMessage('Domain query parameter is required.')
      .isLength({ min: 3 }).withMessage('Invalid domain.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const domain = req.query.domain.trim().toLowerCase()
      res.setHeader('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')

      // Hardcoded admin bypass
      if (domain === 'swish.com') {
        return res.status(200).json({ ok: true, approved: true, college: 'Swish Admin' })
      }

      const college = await College.findOne({ domain, active: true })
      if (college) {
        return res.status(200).json({ ok: true, approved: true, college: college.name })
      }

      return res.status(200).json({ ok: true, approved: false })
    } catch (err) {
      console.error('[GET /colleges/check-domain]', err)
      res.status(500).json({ ok: false, error: 'Domain check failed.' })
    }
  }
)

// ── POST /api/colleges ───────────────────────────────────────────────────────
// Admin only — add a new college (always requires and provisions a College Admin)
router.post(
  '/',
  requireAuth,
  requireRole('admin'),
  [
    body('name').trim().notEmpty().withMessage('College name is required.'),
    body('code').trim().notEmpty().withMessage('College code is required.'),
    body('domain')
      .trim().notEmpty().withMessage('Email domain is required.')
      .isLength({ min: 3 }).withMessage('Domain too short.'),
    body('location').optional().trim(),
    body('adminName').trim().notEmpty().withMessage('College admin full name is required.'),
    body('adminEmail')
      .trim().notEmpty().withMessage('Official college admin email is required.')
      .isEmail().withMessage('Valid official college admin email is required.'),
    body('adminDesignation').optional().trim(),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { name, code, domain, location, adminName, adminEmail, adminDesignation } = req.body
      const normalizedDomain = domain.trim().toLowerCase().replace(/^@/, '')
      const normalizedAdminEmail = adminEmail.trim().toLowerCase()
      const trimmedAdminName = adminName.trim()

      // Domain check for admin email
      const emailDomain = normalizedAdminEmail.split('@')[1]
      if (!emailDomain || emailDomain !== normalizedDomain) {
        return res.status(400).json({
          ok: false,
          error: `College admin email (@${emailDomain || ''}) must match college domain (@${normalizedDomain}).`,
        })
      }

      // Check for duplicate domain, code, or name
      const existing = await College.findOne({
        $or: [
          { domain: normalizedDomain },
          { code: code.trim().toUpperCase() },
          { name: new RegExp(`^${name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
        ],
      })
      if (existing) {
        return res.status(409).json({
          ok: false,
          error: `A college with this name, code, or domain ("${normalizedDomain}") already exists.`,
        })
      }

      // Check if admin user already exists
      const existingUser = await User.findOne({
        $or: [
          { email: normalizedAdminEmail },
          { username: normalizedAdminEmail },
        ],
      })
      if (existingUser) {
        return res.status(409).json({
          ok: false,
          error: `A user account with email or username "${normalizedAdminEmail}" already exists.`,
        })
      }

      let college = null
      let collegeAdmin = null

      try {
        college = await College.create({
          name:     name.trim(),
          code:     code.trim().toUpperCase(),
          domain:   normalizedDomain,
          location: (location || '').trim(),
          active:   true,
        })

        // Invalidate the colleges list cache so the next GET reflects the new entry
        await del(COLLEGES_LIST_KEY)

        // Generate temporary password
        const temporaryPassword = `Swish@${crypto.randomBytes(6).toString('hex')}`
        const temporaryPasswordHash = await bcrypt.hash(temporaryPassword, 12)

        const adminInitials = trimmedAdminName
          .split(/\s+/)
          .map(w => w[0] || '')
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'CA'

        collegeAdmin = await User.create({
          name: trimmedAdminName,
          username: normalizedAdminEmail,
          initials: adminInitials,
          avatarColor: '#6366f1',
          email: normalizedAdminEmail,
          passwordHash: temporaryPasswordHash,
          role: 'college_admin',
          isEmailVerified: true,
          college: college.name,
          collegeId: college._id,
          mustChangePassword: true,
          designation: adminDesignation ? adminDesignation.trim() : '',
          deactivated: false,
          suspended: false,
        })

        // Send credentials email
        try {
          await sendCollegeAdminCredentialsEmail(
            normalizedAdminEmail,
            trimmedAdminName,
            college.name,
            normalizedAdminEmail,
            temporaryPassword
          )
        } catch (emailErr) {
          console.error('[POST /colleges] Failed to send admin credentials email:', emailErr.message)
        }

        return res.status(201).json({
          ok: true,
          college: college.toJSON(),
          collegeAdmin: {
            id: collegeAdmin._id.toString(),
            name: collegeAdmin.name,
            email: collegeAdmin.email,
          },
        })
      } catch (innerErr) {
        // Rollback: if college was created but admin failed, delete orphan college
        if (college && college._id && !collegeAdmin) {
          console.error('[POST /colleges] Rollback: deleting orphan college after admin creation failure:', college._id)
          await College.findByIdAndDelete(college._id).catch(() => {})
          await del(COLLEGES_LIST_KEY).catch(() => {})
        }
        throw innerErr
      }
    } catch (err) {
      console.error('[POST /colleges]', err)
      res.status(500).json({ ok: false, error: err.message || 'Failed to add college.' })
    }
  }
)

// ── GET /api/colleges/check-conflict ────────────────────────────────────────
// Public — used by onboarding UI to detect live conflicts for name, code, and domain.
// Returns { ok:true, conflicts:{ name:boolean, code:boolean, domain:boolean } }
router.get(
  '/check-conflict',
  [
    query('name').optional().trim(),
    query('code').optional().trim(),
    query('domain').optional().trim(),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    const nameQuery = req.query.name?.trim()
    const codeQuery = req.query.code?.trim().toUpperCase()
    const domainQuery = req.query.domain?.trim().toLowerCase()

    const conflicts = { name: false, code: false, domain: false }
    try {
      // Existing College collection checks
      if (nameQuery) {
        const existingByName = await College.findOne({ name: new RegExp(`^${nameQuery}$`, 'i') })
        if (existingByName) conflicts.name = true
      }
      if (codeQuery) {
        const existingByCode = await College.findOne({ code: codeQuery })
        if (existingByCode) conflicts.code = true
      }
      if (domainQuery) {
        const existingByDomain = await College.findOne({ domain: domainQuery, active: true })
        if (existingByDomain) conflicts.domain = true
      }

      // Pending onboarding request checks (status PENDING)
      const pendingFilters = []
      if (nameQuery) pendingFilters.push({ collegeName: new RegExp(`^${nameQuery}$`, 'i') })
      if (codeQuery) pendingFilters.push({ collegeCode: codeQuery })
      if (domainQuery) pendingFilters.push({ emailDomain: domainQuery })

      if (pendingFilters.length) {
        const pending = await CollegeOnboardingRequest.find({
          status: 'PENDING',
          $or: pendingFilters,
        })
        pending.forEach(r => {
          if (nameQuery && r.collegeName?.toLowerCase() === nameQuery.toLowerCase()) conflicts.name = true
          if (codeQuery && r.collegeCode?.toUpperCase() === codeQuery) conflicts.code = true
          if (domainQuery && r.emailDomain?.toLowerCase() === domainQuery) conflicts.domain = true
        })
      }

      return res.status(200).json({ ok: true, conflicts })
    } catch (err) {
      console.error('[GET /colleges/check-conflict]', err)
      return res.status(500).json({ ok: false, error: 'Conflict check failed.' })
    }
  }
)

// ── PATCH /api/colleges/:id/toggle ───────────────────────────────────────────
// Admin only — toggle active/inactive
router.patch(
  '/:id/toggle',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const college = await College.findById(req.params.id)
      if (!college) {
        return res.status(404).json({ ok: false, error: 'College not found.' })
      }

      college.active = !college.active
      await college.save()
      invalidateCollegeCache(college.domain)

      // Invalidate the colleges list cache (active state changed)
      await del(COLLEGES_LIST_KEY)

      return res.status(200).json({ ok: true, college: college.toJSON() })
    } catch (err) {
      console.error('[PATCH /colleges/:id/toggle]', err)
      res.status(500).json({ ok: false, error: 'Failed to toggle college status.' })
    }
  }
)

// ── PUT /api/colleges/:id ─────────────────────────────────────────────────────
// Admin or college_admin — update college information
// College admin can only update their own college
router.put(
  '/:id',
  requireAuth,
  requireRole('admin', 'college_admin'),
  [
    body('name').optional().trim(),
    body('code').optional().trim(),
    body('location').optional().trim(),
    body('website').optional().trim(),
    body('address').optional().trim(),
    body('phone').optional().trim(),
    body('email').optional().trim().isEmail().withMessage('Invalid email.'),
    body('description').optional().trim(),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const college = await College.findById(req.params.id)
      if (!college) {
        return res.status(404).json({ ok: false, error: 'College not found.' })
      }

      // College admin can only update their own college
      if (req.user.role === 'college_admin' && req.user.collegeId?.toString() !== college._id.toString()) {
        return res.status(403).json({ ok: false, error: 'You can only update your own college.' })
      }

      const { name, code, location, website, address, phone, email, description } = req.body

      if (name) college.name = name.trim()
      if (code) college.code = code.trim().toUpperCase()
      if (location !== undefined) college.location = location.trim()
      if (website !== undefined) college.website = website.trim()
      if (address !== undefined) college.address = address.trim()
      if (phone !== undefined) college.phone = phone.trim()
      if (email !== undefined) college.email = email.trim().toLowerCase()
      if (description !== undefined) college.description = description.trim()

      await college.save()
      invalidateCollegeCache(college.domain)

      // Invalidate the colleges list cache (college metadata changed)
      await del(COLLEGES_LIST_KEY)

      return res.status(200).json({ ok: true, college: college.toJSON() })
    } catch (err) {
      console.error('[PUT /colleges/:id]', err)
      res.status(500).json({ ok: false, error: 'Failed to update college.' })
    }
  }
)

// ── POST /api/colleges/:id/logo ──────────────────────────────────────────────────
// Upload college logo
router.post('/:id/logo', requireAuth, requireRole('admin', 'college_admin'), logoUpload, async (req, res) => {
  try {
    const college = await College.findById(req.params.id)
    if (!college) {
      return res.status(404).json({ ok: false, error: 'College not found.' })
    }

    // College admin can only update their own college
    if (req.user.role === 'college_admin' && req.user.collegeId?.toString() !== college._id.toString()) {
      return res.status(403).json({ ok: false, error: 'You can only update your own college.' })
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file uploaded.' })
    }

    if (!isCloudinaryConfigured()) {
      return res.status(500).json({ ok: false, error: 'Cloudinary is not configured.' })
    }

    // Delete old logo if exists
    if (college.logoPublicId) {
      await deletePostImage(college.logoPublicId).catch(err => console.error('[Delete Logo Error]', err))
    }

    // Upload new logo
    const uploadResult = await uploadPostImage(req.file.buffer, {
      folder: `swish/colleges/${college._id}`,
      public_id: `logo_${college._id}`,
      transformation: { width: 200, height: 200, crop: 'limit' }
    })

    college.logo = uploadResult.secureUrl
    college.logoPublicId = uploadResult.publicId
    await college.save()

    invalidateCollegeCache(college.domain)
    await del(COLLEGES_LIST_KEY)

    // Log the action
    await logActivity({
      adminId: req.user._id,
      adminName: req.user.name,
      adminRole: req.user.role,
      collegeId: college._id,
      college: college.name,
      actionType: 'college_logo_updated',
      resourceType: 'college',
      resourceId: college._id,
      resourceName: college.name,
      details: 'Updated college logo',
      ipAddress: req.ip,
    })

    res.json({ ok: true, college: college.toJSON() })
  } catch (err) {
    console.error('[POST /colleges/:id/logo] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to upload logo.' })
  }
})

// ── POST /api/colleges/:id/banner ────────────────────────────────────────────────
// Upload college banner
router.post('/:id/banner', requireAuth, requireRole('admin', 'college_admin'), bannerUpload, async (req, res) => {
  try {
    const college = await College.findById(req.params.id)
    if (!college) {
      return res.status(404).json({ ok: false, error: 'College not found.' })
    }

    // College admin can only update their own college
    if (req.user.role === 'college_admin' && req.user.collegeId?.toString() !== college._id.toString()) {
      return res.status(403).json({ ok: false, error: 'You can only update your own college.' })
    }

    if (!req.file) {
      return res.status(400).json({ ok: false, error: 'No file uploaded.' })
    }

    if (!isCloudinaryConfigured()) {
      return res.status(500).json({ ok: false, error: 'Cloudinary is not configured.' })
    }

    // Delete old banner if exists
    if (college.bannerPublicId) {
      await deletePostImage(college.bannerPublicId).catch(err => console.error('[Delete Banner Error]', err))
    }

    // Upload new banner
    const uploadResult = await uploadPostImage(req.file.buffer, {
      folder: `swish/colleges/${college._id}`,
      public_id: `banner_${college._id}`,
      transformation: { width: 1200, height: 400, crop: 'limit' }
    })

    college.banner = uploadResult.secureUrl
    college.bannerPublicId = uploadResult.publicId
    await college.save()

    invalidateCollegeCache(college.domain)
    await del(COLLEGES_LIST_KEY)

    // Log the action
    await logActivity({
      adminId: req.user._id,
      adminName: req.user.name,
      adminRole: req.user.role,
      collegeId: college._id,
      college: college.name,
      actionType: 'college_banner_updated',
      resourceType: 'college',
      resourceId: college._id,
      resourceName: college.name,
      details: 'Updated college banner',
      ipAddress: req.ip,
    })

    res.json({ ok: true, college: college.toJSON() })
  } catch (err) {
    console.error('[POST /colleges/:id/banner] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to upload banner.' })
  }
})

// ── PUT /api/colleges/:id/branding ────────────────────────────────────────────────
// Update college branding (colors, social media)
router.put(
  '/:id/branding',
  requireAuth,
  requireRole('admin', 'college_admin'),
  [
    body('primaryColor').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid primary color format.'),
    body('secondaryColor').optional().matches(/^#[0-9A-Fa-f]{6}$/).withMessage('Invalid secondary color format.'),
    body('facebook').optional().trim(),
    body('twitter').optional().trim(),
    body('linkedin').optional().trim(),
    body('instagram').optional().trim(),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const college = await College.findById(req.params.id)
      if (!college) {
        return res.status(404).json({ ok: false, error: 'College not found.' })
      }

      // College admin can only update their own college
      if (req.user.role === 'college_admin' && req.user.collegeId?.toString() !== college._id.toString()) {
        return res.status(403).json({ ok: false, error: 'You can only update your own college.' })
      }

      const { primaryColor, secondaryColor, facebook, twitter, linkedin, instagram } = req.body

      if (primaryColor) college.primaryColor = primaryColor
      if (secondaryColor) college.secondaryColor = secondaryColor
      if (facebook !== undefined) college.facebook = facebook.trim()
      if (twitter !== undefined) college.twitter = twitter.trim()
      if (linkedin !== undefined) college.linkedin = linkedin.trim()
      if (instagram !== undefined) college.instagram = instagram.trim()

      await college.save()
      invalidateCollegeCache(college.domain)
      await del(COLLEGES_LIST_KEY)

      // Log the action
      await logActivity({
        adminId: req.user._id,
        adminName: req.user.name,
        adminRole: req.user.role,
        collegeId: college._id,
        college: college.name,
        actionType: 'college_branding_updated',
        resourceType: 'college',
        resourceId: college._id,
        resourceName: college.name,
        details: 'Updated college branding',
        ipAddress: req.ip,
      })

      res.json({ ok: true, college: college.toJSON() })
    } catch (err) {
      console.error('[PUT /colleges/:id/branding] Error:', err)
      res.status(500).json({ ok: false, error: 'Failed to update branding.' })
    }
  }
)

export default router
