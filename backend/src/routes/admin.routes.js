// backend/src/routes/admin.routes.js

import express from 'express'
import User from '../models/User.js'
import College from '../models/College.js'
import CollegeOnboardingRequest from '../models/CollegeOnboardingRequest.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import {sendCollegeAdminCredentialsEmail,sendCollegeRegistrationRejectedEmail,} from '../services/email.service.js'
import { getSignedProofUrl } from '../services/cloudinary.service.js'
import { del, cacheKey } from '../services/cache.service.js'
const router = express.Router()

const COLLEGES_LIST_KEY = cacheKey('colleges', 'list')

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/dashboard
// Main Admin dashboard statistics
// ─────────────────────────────────────────────────────────────────────────────
router.get(
  '/dashboard',
  requireAuth,
  requireRole('admin'),
  async (_req, res) => {
    try {
      const [
        totalColleges,
        activeColleges,
        totalStudents,
        totalFaculty,
        totalCollegeAdmins,
        pendingCollegeRequests,
        activeUsers,
      ] = await Promise.all([
        College.countDocuments(),

        College.countDocuments({
          active: true,
        }),

        User.countDocuments({
          role: 'student',
        }),

        User.countDocuments({
          role: 'faculty',
        }),

        User.countDocuments({
          role: 'college_admin',
        }),

        CollegeOnboardingRequest.countDocuments({
          status: 'PENDING',
        }),

        User.countDocuments({
          deactivated: false,
          suspended: false,
        }),
      ])

      return res.status(200).json({
        ok: true,
        stats: {
          totalColleges,
          activeColleges,
          totalStudents,
          totalFaculty,
          totalCollegeAdmins,
          pendingCollegeRequests,
          activeUsers,
          escalatedReports: 0,
        },
      })
    } catch (err) {
      console.error('[GET /api/admin/dashboard]', err)

      return res.status(500).json({
        ok: false,
        error: 'Unable to load Main Admin dashboard data.',
      })
    }
  }
)
router.get(
  '/colleges',
  requireAuth,
  requireRole('admin'),
  async (_req, res) => {
    try {
      const colleges = await College.find().sort({ name: 1 }).lean()

      const enrichedColleges = await Promise.all(
        colleges.map(async (college) => {
          const domainRegex = new RegExp(`@${college.domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')

          const [adminUser, totalUsers, studentCount, facultyCount] = await Promise.all([
            User.findOne({
              role: 'college_admin',
              $or: [
                { email: domainRegex },
                { collegeId: college._id },
              ],
            }).select('name email designation phone').lean(),

            User.countDocuments({
              $or: [
                { email: domainRegex },
                { collegeId: college._id },
              ],
            }),

            User.countDocuments({
              role: 'student',
              $or: [
                { email: domainRegex },
                { collegeId: college._id },
              ],
            }),

            User.countDocuments({
              role: 'faculty',
              $or: [
                { email: domainRegex },
                { collegeId: college._id },
              ],
            }),
          ])

          return {
            id: college._id.toString(),
            name: college.name,
            code: college.code || '',
            domain: college.domain,
            location: college.location || '',
            active: Boolean(college.active),
            createdAt: college.createdAt,
            collegeAdmin: adminUser
              ? { name: adminUser.name, email: adminUser.email, designation: adminUser.designation || '', phone: adminUser.phone || '' }
              : null,
            stats: {
              totalUsers,
              students: studentCount,
              faculty: facultyCount,
            },
          }
        })
      )

      return res.status(200).json({
        ok: true,
        colleges: enrichedColleges,
      })
    } catch (err) {
      console.error('[GET /api/admin/colleges]', err)
      return res.status(500).json({ ok: false, error: 'Unable to load colleges list.' })
    }
  }
)

router.patch(
  '/colleges/:id/toggle',
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

      // Invalidate public colleges list cache
      await del(COLLEGES_LIST_KEY)

      return res.status(200).json({
        ok: true,
        message: `College ${college.name} is now ${college.active ? 'active' : 'inactive'}.`,
        college: {
          id: college._id.toString(),
          name: college.name,
          code: college.code,
          domain: college.domain,
          location: college.location,
          active: college.active,
        },
      })
    } catch (err) {
      console.error('[PATCH /api/admin/colleges/:id/toggle]', err)
      return res.status(500).json({ ok: false, error: 'Failed to toggle college status.' })
    }
  }
)

// ── GET /api/admin/college-admins ─────────────────────────────────────────────
router.get(
  '/college-admins',
  requireAuth,
  requireRole('admin'),
  async (_req, res) => {
    try {
      const admins = await User.find({ role: 'college_admin' })
        .sort({ createdAt: -1 })
        .lean()

      const enrichedAdmins = await Promise.all(
        admins.map(async (admin) => {
          const emailDomain = admin.email ? admin.email.split('@')[1] : ''

          let college = null
          if (admin.collegeId) {
            college = await College.findById(admin.collegeId).lean()
          } else if (emailDomain) {
            college = await College.findOne({ domain: emailDomain.toLowerCase() }).lean()
          }

          let stats = { totalUsers: 0, students: 0, faculty: 0 }

          if (college) {
            const domainRegex = new RegExp(`@${college.domain.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')

            const [totalUsers, students, faculty] = await Promise.all([
              User.countDocuments({
                $or: [{ collegeId: college._id }, { email: domainRegex }],
              }),
              User.countDocuments({
                role: 'student',
                $or: [{ collegeId: college._id }, { email: domainRegex }],
              }),
              User.countDocuments({
                role: 'faculty',
                $or: [{ collegeId: college._id }, { email: domainRegex }],
              }),
            ])

            stats = { totalUsers, students, faculty }
          }

          return {
            id: admin._id.toString(),
            name: admin.name,
            email: admin.email,
            designation: admin.designation || '',
            phone: admin.phone || '',
            active: !admin.deactivated,
            deactivated: Boolean(admin.deactivated),
            createdAt: admin.createdAt,
            college: college
              ? {
                  id: college._id.toString(),
                  name: college.name,
                  code: college.code || '',
                  domain: college.domain,
                  location: college.location || '',
                  active: Boolean(college.active),
                  createdAt: college.createdAt,
                }
              : null,
            stats,
          }
        })
      )

      return res.status(200).json({
        ok: true,
        admins: enrichedAdmins,
      })
    } catch (err) {
      console.error('[GET /api/admin/college-admins]', err)
      return res.status(500).json({ ok: false, error: 'Unable to load college admins.' })
    }
  }
)

// ── POST /api/admin/college-admins ────────────────────────────────────────────
// Manual provisioning of a College Admin for an existing college
router.post(
  '/college-admins',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { collegeId, name, officialEmail, designation } = req.body

      if (!collegeId || !name || !officialEmail) {
        return res.status(400).json({
          ok: false,
          error: 'College selection, full name, and official email are required.',
        })
      }

      const normalizedEmail = officialEmail.trim().toLowerCase()
      const trimmedName = name.trim()

      const college = await College.findById(collegeId)
      if (!college) {
        return res.status(404).json({ ok: false, error: 'Selected college not found.' })
      }

      const emailDomain = normalizedEmail.split('@')[1]
      if (!emailDomain || emailDomain !== college.domain.toLowerCase()) {
        return res.status(400).json({
          ok: false,
          error: `Official email domain (@${emailDomain || ''}) must match college domain (@${college.domain}).`,
        })
      }

      const existingUser = await User.findOne({ email: normalizedEmail })
      if (existingUser) {
        return res.status(409).json({
          ok: false,
          error: `An account with email "${normalizedEmail}" already exists.`,
        })
      }

      // Generate 10-char temporary password
      const temporaryPassword = crypto.randomBytes(5).toString('hex')
      const passwordHash = await bcrypt.hash(temporaryPassword, 12)

      const initials = trimmedName
        .split(/\s+/)
        .map(word => word[0] || '')
        .join('')
        .toUpperCase()
        .slice(0, 2)

      const collegeAdmin = await User.create({
        name: trimmedName,
        username: normalizedEmail,
        initials,
        avatarColor: '#6366f1',
        email: normalizedEmail,
        passwordHash,
        role: 'college_admin',
        isEmailVerified: true,
        college: college.name,
        collegeId: college._id,
        mustChangePassword: true,
        designation: designation ? designation.trim() : '',
        deactivated: false,
        suspended: false,
      })

      // Send credentials email
      try {
        await sendCollegeAdminCredentialsEmail(
          normalizedEmail,
          trimmedName,
          college.name,
          normalizedEmail,
          temporaryPassword
        )
      } catch (emailErr) {
        console.error('[POST /api/admin/college-admins] Email credentials send failed:', emailErr)
      }

      return res.status(201).json({
        ok: true,
        message: `College Admin ${trimmedName} provisioned successfully. Credentials sent to ${normalizedEmail}.`,
        admin: {
          id: collegeAdmin._id.toString(),
          name: collegeAdmin.name,
          email: collegeAdmin.email,
          designation: collegeAdmin.designation,
          active: true,
          createdAt: collegeAdmin.createdAt,
          college: {
            id: college._id.toString(),
            name: college.name,
            domain: college.domain,
            code: college.code,
            location: college.location,
            active: college.active,
          },
        },
      })
    } catch (err) {
      console.error('[POST /api/admin/college-admins]', err)
      return res.status(500).json({ ok: false, error: 'Failed to provision college admin.' })
    }
  }
)

// ── PATCH /api/admin/college-admins/:id/toggle ────────────────────────────────
router.patch(
  '/college-admins/:id/toggle',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const adminUser = await User.findOne({ _id: req.params.id, role: 'college_admin' })
      if (!adminUser) {
        return res.status(404).json({ ok: false, error: 'College admin not found.' })
      }

      adminUser.deactivated = !adminUser.deactivated
      await adminUser.save()

      return res.status(200).json({
        ok: true,
        message: `College Admin ${adminUser.name} is now ${adminUser.deactivated ? 'deactivated' : 'active'}.`,
        active: !adminUser.deactivated,
        deactivated: Boolean(adminUser.deactivated),
      })
    } catch (err) {
      console.error('[PATCH /api/admin/college-admins/:id/toggle]', err)
      return res.status(500).json({ ok: false, error: 'Failed to toggle admin status.' })
    }
  }
)

router.get(
  '/pending-requests',
  requireAuth,
  requireRole('admin'),
    async (req, res) => {
    try {
      const statusFilter =
        req.query.status === 'all'
          ? {}
          : req.query.status
          ? { status: req.query.status.toUpperCase() }
          : { status: 'PENDING' }

      const requests = await CollegeOnboardingRequest.find(statusFilter)
        .sort({ createdAt: -1 })
        .lean()

      const formattedRequests = requests.map((request) => ({
        id: request._id,
        collegeName: request.collegeName || '',
        collegeCode: request.collegeCode || '',
        location: request.location || '',
        requesterName: request.adminName || '',
        officialEmail: request.officialEmail || '',
        emailVerified: Boolean(request.emailVerified),
        status: request.status,
        proofPublicId: request.proofPublicId || null,
        proofResourceType: request.proofResourceType || null,
        proofUrl: request.proofUrl || null,
        createdAt: request.createdAt,
      }))

      return res.status(200).json({
        ok: true,
        requests: formattedRequests,
      })
    } catch (err) {
      console.error('[GET /api/admin/pending-requests]', err)

      return res.status(500).json({
        ok: false,
        error: 'Unable to load pending college requests.',
      })
    }
  }
)
router.get(
  '/pending-requests/:id',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const request = await CollegeOnboardingRequest.findOne({
        _id: req.params.id,
        status: 'PENDING',
      }).lean()

      if (!request) {
        return res.status(404).json({
          ok: false,
          error: 'Pending college request not found.',
        })
      }

      let proofUrl = request.proofUrl || null
      if (!proofUrl && request.proofPublicId) {
        proofUrl = getSignedProofUrl(request.proofPublicId, request.proofResourceType)
      }

      return res.status(200).json({
        ok: true,
        request: {
          id: request._id,
          collegeName: request.collegeName || '',
          collegeCode: request.collegeCode || '',
          emailDomain: request.emailDomain || '',
          location: request.location || '',
          campusType: request.campusType || '',
          campusSize: request.campusSize || '',

          adminName: request.adminName || '',
          designation: request.designation || '',
          phone: request.phone || '',

          officialEmail: request.officialEmail || '',
          emailVerified: Boolean(request.emailVerified),
          verifiedAt: request.verifiedAt || null,

          proofPublicId: request.proofPublicId || null,
          proofResourceType: request.proofResourceType || null,
          proofUrl,

          status: request.status,
          createdAt: request.createdAt || null,
        },
      })
    } catch (err) {
      console.error(
        '[GET /api/admin/pending-requests/:id]',
        err
      )

      return res.status(500).json({
        ok: false,
        error: 'Unable to load college request.',
      })
    }
  }
)

router.get(
  '/pending-requests/:id/proof-url',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const request = await CollegeOnboardingRequest.findById(req.params.id).lean()
      if (!request || !request.proofPublicId) {
        return res.status(404).json({ ok: false, error: 'Proof document not found.' })
      }

      const proofUrl = getSignedProofUrl(request.proofPublicId, request.proofResourceType)
      return res.status(200).json({ ok: true, proofUrl })
    } catch (err) {
      console.error('[GET /api/admin/pending-requests/:id/proof-url]', err)
      return res.status(500).json({ ok: false, error: 'Failed to generate proof document URL.' })
    }
  }
)
router.post(
  '/pending-requests/:id/approve',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const request = await CollegeOnboardingRequest.findOne({
        _id: req.params.id,
        status: 'PENDING',
      })

      if (!request) {
        return res.status(404).json({
          ok: false,
          error: 'Pending college request not found.',
        })
      }

      // Official email must be verified before approval
      if (!request.emailVerified) {
        return res.status(400).json({
          ok: false,
          error: 'The official college email has not been verified.',
        })
      }

      // ------------------------------------------------------------
      // 1. Re-check college duplicates
      // ------------------------------------------------------------

      const existingCollege = await College.findOne({
        $or: [
          { name: request.collegeName },
          { code: request.collegeCode },
          { domain: request.emailDomain },
        ],
      })

      if (existingCollege) {
        return res.status(409).json({
          ok: false,
          error:
            'This college, college code, or email domain is already registered.',
        })
      }

      // ------------------------------------------------------------
      // 2. Re-check existing user account
      // ------------------------------------------------------------

      const loginId = request.officialEmail
        .trim()
        .toLowerCase()

      const existingUser = await User.findOne({
        $or: [
          { email: loginId },
          { username: loginId },
        ],
      })

      if (existingUser) {
        return res.status(409).json({
          ok: false,
          error:
            'A user account already exists with this official email or username.',
        })
      }

      const adminInitials =
        (request.adminName || '')
          .trim()
          .split(/\s+/)
          .map((word) => word[0] || '')
          .join('')
          .toUpperCase()
          .slice(0, 2) || 'CA'

      let college = null
      let collegeAdmin = null

      try {
        // ------------------------------------------------------------
        // 3. Create College
        // ------------------------------------------------------------

        college = await College.create({
          name: request.collegeName,
          code: request.collegeCode,
          domain: request.emailDomain,
          location: request.location || '',
          active: true,
        })

        // Invalidate public colleges list cache
        await del(COLLEGES_LIST_KEY)

        // ------------------------------------------------------------
        // 4. Generate temporary password
        // ------------------------------------------------------------

        const temporaryPassword =
          `Swish@${crypto.randomBytes(6).toString('hex')}`

        const temporaryPasswordHash = await bcrypt.hash(
          temporaryPassword,
          12
        )

        // ------------------------------------------------------------
        // 5. Create College Admin
        // ------------------------------------------------------------

        collegeAdmin = await User.create({
          name: request.adminName.trim() || 'Campus Administrator',

          // Official college email is the login ID
          username: loginId,

          initials: adminInitials,

          avatarColor: '#6366f1',

          email: loginId,

          passwordHash: temporaryPasswordHash,

          role: 'college_admin',

          isEmailVerified: true,

          college: college.name,

          collegeId: college._id,

          mustChangePassword: true,

          designation: request.designation || '',

          deactivated: false,

          suspended: false,
        })

        // ------------------------------------------------------------
        // 6. Update onboarding request
        // ------------------------------------------------------------

        request.status = 'APPROVED'
        request.approvedAt = new Date()
        request.approvedCollegeId = college._id
        request.approvedAdminId = collegeAdmin._id

        await request.save()

        // ------------------------------------------------------------
        // 7. Send College Admin credentials email (non-fatal)
        // ------------------------------------------------------------

        try {
          await sendCollegeAdminCredentialsEmail(
            loginId,
            request.adminName,
            request.collegeName,
            loginId,
            temporaryPassword
          )
        } catch (emailErr) {
          console.error(
            '[approve] College & Admin created, but credentials email failed:',
            emailErr.message
          )
        }

        return res.status(200).json({
          ok: true,
          message:
            'College request approved successfully. College Admin credentials have been sent by email.',

          college: {
            id: college._id,
            name: college.name,
            code: college.code,
          },

          collegeAdmin: {
            id: collegeAdmin._id,
            name: collegeAdmin.name,
            email: collegeAdmin.email,
          },
        })
      } catch (creationErr) {
        // ROLLBACK: If admin creation or request save failed, do NOT leave orphan college!
        if (college && college._id && !collegeAdmin) {
          console.error(
            '[approve] Rollback: deleting orphan college after failure:',
            college._id,
            creationErr.message
          )
          await College.findByIdAndDelete(college._id).catch(() => {})
          await del(COLLEGES_LIST_KEY).catch(() => {})
        }
        throw creationErr
      }
    } catch (err) {
      console.error(
        '[POST /api/admin/pending-requests/:id/approve]',
        err
      )

      return res.status(500).json({
        ok: false,
        error: 'Unable to approve college request.',
      })
    }
  }
)
router.post(
  '/pending-requests/:id/reject',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { reason } = req.body

      const trimmedReason =
        typeof reason === 'string'
          ? reason.trim()
          : ''

      if (!trimmedReason) {
        return res.status(422).json({
          ok: false,
          error: 'A rejection reason is required.',
        })
      }

      const request = await CollegeOnboardingRequest.findOne({
        _id: req.params.id,
        status: 'PENDING',
      })

      if (!request) {
        return res.status(404).json({
          ok: false,
          error: 'Pending college request not found.',
        })
      }

      // ------------------------------------------------------------
      // 1. Save rejection decision + reason
      // ------------------------------------------------------------

      request.status = 'REJECTED'
      request.rejectedAt = new Date()
      request.rejectionReason = trimmedReason

      await request.save()

      // ------------------------------------------------------------
      // 2. Send rejection email
      // ------------------------------------------------------------

      await sendCollegeRegistrationRejectedEmail(
        request.officialEmail,
        request.adminName,
        request.collegeName,
        trimmedReason
      )

      return res.status(200).json({
        ok: true,
        message:
          'College request rejected successfully. Rejection email sent.',
      })
    } catch (err) {
      console.error(
        '[POST /api/admin/pending-requests/:id/reject]',
        err
      )

      return res.status(500).json({
        ok: false,
        error: 'Unable to reject college request.',
      })
    }
  }
)

// ── GET /api/admin/users ──────────────────────────────────────────────────────
// Returns all non-admin users enriched with their college information
router.get(
  '/users',
  requireAuth,
  requireRole('admin'),
  async (_req, res) => {
    try {
      const users = await User.find({ role: { $ne: 'admin' } })
        .sort({ createdAt: -1 })
        .lean()

      const enrichedUsers = await Promise.all(
        users.map(async (u) => {
          const emailDomain = u.email ? u.email.split('@')[1] : ''

          let college = null
          if (u.collegeId) {
            college = await College.findById(u.collegeId).lean()
          } else if (emailDomain) {
            college = await College.findOne({ domain: emailDomain.toLowerCase() }).lean()
          }

          return {
            id: u._id.toString(),
            name: u.name,
            email: u.email,
            role: u.role,
            designation: u.designation || '',
            dept: u.dept || '',
            year: u.year || '',
            active: !u.deactivated,
            deactivated: Boolean(u.deactivated),
            suspended: Boolean(u.suspended),
            createdAt: u.createdAt,
            college: college
              ? {
                  id: college._id.toString(),
                  name: college.name,
                  domain: college.domain,
                  code: college.code || '',
                  location: college.location || '',
                  active: Boolean(college.active),
                }
              : null,
          }
        })
      )

      return res.status(200).json({ ok: true, users: enrichedUsers })
    } catch (err) {
      console.error('[GET /api/admin/users]', err)
      return res.status(500).json({ ok: false, error: 'Unable to load users list.' })
    }
  }
)

// ── PATCH /api/admin/users/:id/toggle ────────────────────────────────────────
// Toggles user.deactivated for any non-admin user
router.patch(
  '/users/:id/toggle',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const u = await User.findOne({ _id: req.params.id, role: { $ne: 'admin' } })
      if (!u) {
        return res.status(404).json({ ok: false, error: 'User not found.' })
      }

      u.deactivated = !u.deactivated
      await u.save()

      return res.status(200).json({
        ok: true,
        message: `User ${u.name} is now ${u.deactivated ? 'deactivated' : 'active'}.`,
        active: !u.deactivated,
        deactivated: Boolean(u.deactivated),
      })
    } catch (err) {
      console.error('[PATCH /api/admin/users/:id/toggle]', err)
      return res.status(500).json({ ok: false, error: 'Failed to toggle user status.' })
    }
  }
)

// ── GET /api/admin/profile ──────────────────────────────────────────────────
// Returns the current Main Admin profile details & overall system stats
router.get(
  '/profile',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id).select('-passwordHash -otpHash -otpExpiresAt -otpAttempts')
      if (!user) {
        return res.status(404).json({ ok: false, error: 'Admin user not found.' })
      }

      // Quick system stats for the profile overview
      const [totalColleges, totalUsers, pendingRequests] = await Promise.all([
        College.countDocuments(),
        User.countDocuments({ role: { $ne: 'admin' } }),
        CollegeOnboardingRequest.countDocuments({ status: 'PENDING' }),
      ])

      return res.status(200).json({
        ok: true,
        user: {
          ...user.toJSON(),
          stats: {
            totalColleges,
            totalUsers,
            pendingRequests,
          },
        },
      })
    } catch (err) {
      console.error('[GET /api/admin/profile]', err)
      return res.status(500).json({ ok: false, error: 'Failed to fetch admin profile.' })
    }
  }
)

// ── PUT /api/admin/profile ──────────────────────────────────────────────────
// Updates Main Admin profile information
router.put(
  '/profile',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { name, username, bio, designation, email, profilePhoto } = req.body
      const user = await User.findById(req.user._id)
      if (!user) {
        return res.status(404).json({ ok: false, error: 'Admin user not found.' })
      }

      if (name && name.trim()) {
        user.name = name.trim()
        const parts = user.name.split(' ').filter(Boolean)
        user.initials = parts.length > 1
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : (parts[0]?.slice(0, 2) || 'SA').toUpperCase()
      }

      if (username && username.trim() && username.toLowerCase() !== user.username) {
        const existingUsername = await User.findOne({
          username: username.toLowerCase().trim(),
          _id: { $ne: user._id },
        })
        if (existingUsername) {
          return res.status(409).json({ ok: false, error: 'Username is already taken.' })
        }
        user.username = username.toLowerCase().trim()
      }

      if (email && email.trim() && email.toLowerCase() !== user.email) {
        const existingEmail = await User.findOne({
          email: email.toLowerCase().trim(),
          _id: { $ne: user._id },
        })
        if (existingEmail) {
          return res.status(409).json({ ok: false, error: 'Email is already in use.' })
        }
        user.email = email.toLowerCase().trim()
      }

      if (bio !== undefined) user.bio = bio.trim()
      if (designation !== undefined) user.designation = designation.trim()
      if (profilePhoto !== undefined) user.profilePhoto = profilePhoto

      await user.save()

      return res.status(200).json({
        ok: true,
        message: 'Profile updated successfully.',
        user: user.toJSON(),
      })
    } catch (err) {
      console.error('[PUT /api/admin/profile]', err)
      return res.status(500).json({ ok: false, error: 'Failed to update admin profile.' })
    }
  }
)

// ── POST /api/admin/profile/change-password ──────────────────────────────────
// Changes Main Admin password securely
router.post(
  '/profile/change-password',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body
      if (!currentPassword || !newPassword) {
        return res.status(400).json({ ok: false, error: 'Current and new password are required.' })
      }
      if (newPassword.length < 8) {
        return res.status(400).json({ ok: false, error: 'New password must be at least 8 characters long.' })
      }

      const user = await User.findById(req.user._id)
      if (!user) {
        return res.status(404).json({ ok: false, error: 'Admin user not found.' })
      }

      const isMatch = await bcrypt.compare(currentPassword, user.passwordHash)
      if (!isMatch) {
        return res.status(401).json({ ok: false, error: 'Current password is incorrect.' })
      }

      const salt = await bcrypt.genSalt(10)
      user.passwordHash = await bcrypt.hash(newPassword, salt)
      user.mustChangePassword = false
      user.isDemo = false
      await user.save()

      return res.status(200).json({ ok: true, message: 'Password changed successfully.' })
    } catch (err) {
      console.error('[POST /api/admin/profile/change-password]', err)
      return res.status(500).json({ ok: false, error: 'Failed to change password.' })
    }
  }
)

// ── DELETE /api/admin/profile/photo ──────────────────────────────────────────
// Removes Main Admin profile photo from database
router.delete(
  '/profile/photo',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const user = await User.findById(req.user._id)
      if (!user) {
        return res.status(404).json({ ok: false, error: 'Admin user not found.' })
      }
      user.profilePhoto = null
      await user.save()
      return res.status(200).json({
        ok: true,
        message: 'Profile photo removed successfully.',
        user: user.toJSON(),
      })
    } catch (err) {
      console.error('[DELETE /api/admin/profile/photo]', err)
      return res.status(500).json({ ok: false, error: 'Failed to remove profile photo.' })
    }
  }
)

export default router