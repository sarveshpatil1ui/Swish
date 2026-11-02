// backend/src/routes/admin.routes.js

import express from 'express'
import User from '../models/User.js'
import College from '../models/College.js'
import CollegeOnboardingRequest from '../models/CollegeOnboardingRequest.js'
import AdminNotification from '../models/AdminNotification.js'
import Report from '../models/Report.js'
import { emitToAdmin } from '../services/socket.service.js'
import { createNotification } from '../services/notification.service.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import crypto from 'crypto'
import bcrypt from 'bcryptjs'
import {sendCollegeAdminCredentialsEmail,sendCollegeRegistrationRejectedEmail,} from '../services/email.service.js'
import { getSignedProofUrl } from '../services/cloudinary.service.js'
import { del, cacheKey } from '../services/cache.service.js'
import { logActivity } from '../services/activity-log.service.js'
import {
  listUserSessions,
  revokeSession,
  revokeOtherSessions,
  clearSessionCookies,
} from '../services/session.service.js'
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
        escalatedReports,
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

        Report.countDocuments({
          $or: [
            { type: 'platform' },
            { category: { $in: ['college_admin_misconduct', 'platform_bug', 'feature_request'] } },
          ],
          status: { $in: ['pending', 'reviewed'] },
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
          escalatedReports,
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
      const [colleges, allAdmins, userStats] = await Promise.all([
        College.find().sort({ name: 1 }).lean(),
        User.find({ role: 'college_admin' })
          .select('name email designation phone collegeId')
          .lean(),
        User.aggregate([
          { $match: { role: { $in: ['student', 'faculty', 'college_admin'] } } },
          { $group: { _id: { collegeId: '$collegeId', role: '$role' }, count: { $sum: 1 } } }
        ])
      ])

      const adminByCollegeId = new Map()
      const adminByDomain = new Map()
      for (const a of allAdmins) {
        if (a.collegeId) adminByCollegeId.set(a.collegeId.toString(), a)
        if (a.email) {
          const dom = a.email.split('@')[1]?.toLowerCase()
          if (dom) adminByDomain.set(dom, a)
        }
      }

      const countByCollegeAndRole = new Map()
      for (const item of userStats) {
        if (item._id?.collegeId) {
          const cid = item._id.collegeId.toString()
          const role = item._id.role || 'other'
          countByCollegeAndRole.set(`${cid}:${role}`, item.count)
        }
      }

      const enrichedColleges = colleges.map((college) => {
        const cIdStr = college._id.toString()
        const cDomain = college.domain?.toLowerCase()

        const adminUser = adminByCollegeId.get(cIdStr) || (cDomain && adminByDomain.get(cDomain)) || null

        const studentCount = countByCollegeAndRole.get(`${cIdStr}:student`) || 0
        const facultyCount = countByCollegeAndRole.get(`${cIdStr}:faculty`) || 0
        const adminCount = countByCollegeAndRole.get(`${cIdStr}:college_admin`) || 0
        const totalUsers = studentCount + facultyCount + adminCount

        return {
          id: cIdStr,
          name: college.name,
          code: college.code || '',
          domain: college.domain,
          location: college.location || '',
          active: Boolean(college.active),
          createdAt: college.createdAt,
          collegeAdmin: adminUser
            ? {
                name: adminUser.name,
                email: adminUser.email,
                designation: adminUser.designation || '',
                phone: adminUser.phone || '',
              }
            : null,
          stats: {
            totalUsers,
            students: studentCount,
            faculty: facultyCount,
          },
        }
      })

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
      const [admins, allColleges, userStats] = await Promise.all([
        User.find({ role: 'college_admin' }).sort({ createdAt: -1 }).lean(),
        College.find().lean(),
        User.aggregate([
          { $match: { role: { $in: ['student', 'faculty', 'college_admin'] } } },
          { $group: { _id: { collegeId: '$collegeId', role: '$role' }, count: { $sum: 1 } } }
        ])
      ])

      const collegeById = new Map()
      const collegeByDomain = new Map()
      for (const c of allColleges) {
        collegeById.set(c._id.toString(), c)
        if (c.domain) collegeByDomain.set(c.domain.toLowerCase(), c)
      }

      const countByCollegeAndRole = new Map()
      for (const item of userStats) {
        if (item._id?.collegeId) {
          const cid = item._id.collegeId.toString()
          const role = item._id.role || 'other'
          countByCollegeAndRole.set(`${cid}:${role}`, item.count)
        }
      }

      const enrichedAdmins = admins.map((admin) => {
        const emailDomain = admin.email ? admin.email.split('@')[1]?.toLowerCase() : ''
        const college = (admin.collegeId && collegeById.get(admin.collegeId.toString())) || (emailDomain && collegeByDomain.get(emailDomain)) || null

        let stats = { totalUsers: 0, students: 0, faculty: 0 }
        if (college) {
          const cIdStr = college._id.toString()
          const students = countByCollegeAndRole.get(`${cIdStr}:student`) || 0
          const faculty = countByCollegeAndRole.get(`${cIdStr}:faculty`) || 0
          const ca = countByCollegeAndRole.get(`${cIdStr}:college_admin`) || 0
          stats = { totalUsers: students + faculty + ca, students, faculty }
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

      // Create Admin Notification for security audit
      try {
        const notif = await AdminNotification.create({
          type: 'admin_security',
          title: adminUser.deactivated ? 'College Admin Deactivated' : 'College Admin Activated',
          message: `College Admin ${adminUser.name} (${adminUser.email}) was ${adminUser.deactivated ? 'deactivated' : 'reactivated'} by ${req.user.name}.`,
          data: {
            adminUserId: adminUser._id.toString(),
            adminUserName: adminUser.name,
            deactivated: Boolean(adminUser.deactivated),
            updatedBy: req.user.name,
          },
          link: '/admin/college-admins',
          priority: 'high',
        })
        emitToAdmin('admin:notification:new', {
          ...notif.toObject(),
          id: notif._id.toString(),
        })
      } catch (notifErr) {
        console.error('[toggle-admin] Failed to create AdminNotification:', notifErr)
      }

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

        // Create Admin Notification for college approval
        try {
          const notif = await AdminNotification.create({
            type: 'college_status',
            title: `College Approved: ${request.collegeName}`,
            message: `${request.collegeName} (${request.collegeCode}) was approved and onboarded to Swish network by ${req.user.name}.`,
            data: {
              collegeId: college._id.toString(),
              collegeName: college.name,
              collegeCode: college.code,
              approvedBy: req.user.name,
            },
            link: '/admin/colleges',
            priority: 'medium',
          })
          emitToAdmin('admin:notification:new', {
            ...notif.toObject(),
            id: notif._id.toString(),
          })
        } catch (notifErr) {
          console.error('[approve] Failed to create AdminNotification:', notifErr)
        }

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

      // Create Admin Notification for college rejection
      try {
        const notif = await AdminNotification.create({
          type: 'college_status',
          title: `College Request Rejected: ${request.collegeName}`,
          message: `Request for ${request.collegeName} was rejected by ${req.user.name}. Reason: "${trimmedReason}"`,
          data: {
            requestId: request._id.toString(),
            collegeName: request.collegeName,
            rejectedBy: req.user.name,
            reason: trimmedReason,
          },
          link: '/admin/pending-requests',
          priority: 'low',
        })
        emitToAdmin('admin:notification:new', {
          ...notif.toObject(),
          id: notif._id.toString(),
        })
      } catch (notifErr) {
        console.error('[reject] Failed to create AdminNotification:', notifErr)
      }

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
      const [users, allColleges] = await Promise.all([
        User.find({ role: { $ne: 'admin' } })
          .sort({ createdAt: -1 })
          .lean(),
        College.find().lean()
      ])

      const collegeById = new Map()
      const collegeByDomain = new Map()
      for (const c of allColleges) {
        collegeById.set(c._id.toString(), c)
        if (c.domain) collegeByDomain.set(c.domain.toLowerCase(), c)
      }

      const enrichedUsers = users.map((u) => {
        const emailDomain = u.email ? u.email.split('@')[1]?.toLowerCase() : ''
        const college = (u.collegeId && collegeById.get(u.collegeId.toString())) || (emailDomain && collegeByDomain.get(emailDomain)) || null

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

      // Log the action
      await logActivity({
        adminId: req.user._id,
        adminName: req.user.name,
        adminRole: req.user.role,
        collegeId: u.collegeId,
        college: u.college,
        actionType: u.deactivated ? 'user_blocked' : 'user_unblocked',
        resourceType: 'user',
        resourceId: u._id,
        resourceName: u.name,
        details: u.deactivated ? 'Deactivated user account' : 'Reactivated user account',
        ipAddress: req.ip,
      })

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

// ── POST /api/admin/sessions/terminate-others ──────────────────────────────
// Invalidates other active sessions / remembered devices and logs a security event
router.post(
  '/sessions/terminate-others',
  requireAuth,
  requireRole('admin', 'college_admin', 'main_admin'),
  async (req, res) => {
    try {
      const revokedCount = await revokeOtherSessions(req.user._id, req.sessionId)

      // Create an internal admin notification for security log
      try {
        const notif = await AdminNotification.create({
          type: 'admin_security',
          title: 'Admin Sessions Terminated',
          message: `Admin (${req.user.email}) terminated ${revokedCount} other active session(s) and remembered devices.`,
          metadata: {
            adminId: req.user._id.toString(),
            action: 'terminate_other_sessions',
            revokedCount,
            timestamp: new Date().toISOString(),
          },
        })
        emitToAdmin('admin:notification:new', notif)
      } catch (logErr) {
        console.error('[terminate-others] Security notification creation failed:', logErr.message)
      }

      return res.status(200).json({
        ok: true,
        message: 'All other active sessions and remembered devices have been invalidated.',
        revokedCount,
        terminatedAt: new Date().toISOString(),
      })
    } catch (err) {
      console.error('[POST /api/admin/sessions/terminate-others]', err)
      return res.status(500).json({ ok: false, error: 'Failed to terminate other sessions.' })
    }
  }
)

// ── GET /api/admin/sessions ──────────────────────────────────────────────────
// Returns the active sessions of the requesting admin
router.get(
  '/sessions',
  requireAuth,
  requireRole('admin', 'college_admin', 'main_admin'),
  async (req, res) => {
    try {
      const sessions = await listUserSessions(req.user._id, req.sessionId)
      return res.status(200).json({ ok: true, sessions })
    } catch (err) {
      console.error('[GET /api/admin/sessions]', err)
      return res.status(500).json({ ok: false, error: 'Failed to retrieve active sessions.' })
    }
  }
)

// ── DELETE /api/admin/sessions/:sessionId ────────────────────────────────────
// Revoke a specific session of the requesting admin
router.delete(
  '/sessions/:sessionId',
  requireAuth,
  requireRole('admin', 'college_admin', 'main_admin'),
  async (req, res) => {
    try {
      const { sessionId } = req.params
      const success = await revokeSession(sessionId, req.user._id)
      if (!success) {
        return res.status(404).json({ ok: false, error: 'Session not found or access denied.' })
      }
      if (req.sessionId && req.sessionId.toString() === sessionId.toString()) {
        clearSessionCookies(res)
      }
      return res.status(200).json({ ok: true, message: 'Session revoked successfully.' })
    } catch (err) {
      console.error('[DELETE /api/admin/sessions/:sessionId]', err)
      return res.status(500).json({ ok: false, error: 'Failed to revoke session.' })
    }
  }
)


// ─────────────────────────────────────────────────────────────────────────────
// 🔔 MAIN ADMIN NOTIFICATION ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// GET /api/admin/notifications - List all admin notifications + unread count
router.get(
  '/notifications',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const limit = parseInt(req.query.limit, 10) || 40
      const unreadOnly = req.query.unreadOnly === 'true'

      const filter = unreadOnly ? { read: false } : {}
      const [notifications, unreadCount] = await Promise.all([
        AdminNotification.find(filter)
          .sort({ createdAt: -1 })
          .limit(limit)
          .lean(),
        AdminNotification.countDocuments({ read: false }),
      ])

      return res.status(200).json({
        ok: true,
        notifications: notifications.map((n) => ({
          ...n,
          id: n._id.toString(),
        })),
        unreadCount,
      })
    } catch (err) {
      console.error('[GET /api/admin/notifications]', err)
      return res.status(500).json({ ok: false, error: 'Failed to fetch admin notifications.' })
    }
  }
)

// PATCH /api/admin/notifications/:id/read - Mark single notification as read
router.patch(
  '/notifications/:id/read',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      const notification = await AdminNotification.findByIdAndUpdate(
        req.params.id,
        { $set: { read: true, readAt: new Date() } },
        { new: true }
      ).lean()

      if (!notification) {
        return res.status(404).json({ ok: false, error: 'Notification not found.' })
      }

      const unreadCount = await AdminNotification.countDocuments({ read: false })

      return res.status(200).json({
        ok: true,
        notification: { ...notification, id: notification._id.toString() },
        unreadCount,
      })
    } catch (err) {
      console.error('[PATCH /api/admin/notifications/:id/read]', err)
      return res.status(500).json({ ok: false, error: 'Failed to update notification.' })
    }
  }
)

// PATCH /api/admin/notifications/read-all - Mark all notifications as read
router.patch(
  '/notifications/read-all',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      await AdminNotification.updateMany(
        { read: false },
        { $set: { read: true, readAt: new Date() } }
      )
      return res.status(200).json({
        ok: true,
        message: 'All notifications marked as read.',
        unreadCount: 0,
      })
    } catch (err) {
      console.error('[PATCH /api/admin/notifications/read-all]', err)
      return res.status(500).json({ ok: false, error: 'Failed to mark all notifications as read.' })
    }
  }
)

// DELETE /api/admin/notifications/:id - Delete single notification
router.delete(
  '/notifications/:id',
  requireAuth,
  requireRole('admin'),
  async (req, res) => {
    try {
      await AdminNotification.findByIdAndDelete(req.params.id)
      const unreadCount = await AdminNotification.countDocuments({ read: false })
      return res.status(200).json({
        ok: true,
        message: 'Notification removed.',
        unreadCount,
      })
    } catch (err) {
      console.error('[DELETE /api/admin/notifications/:id]', err)
      return res.status(500).json({ ok: false, error: 'Failed to delete notification.' })
    }
  }
)

// ─────────────────────────────────────────────────────────────────────────────
// 🚨 PLATFORM REPORTS & GRIEVANCE ENDPOINTS
// ─────────────────────────────────────────────────────────────────────────────

// POST /api/admin/reports/platform - Submit platform bug or college admin grievance
router.post(
  '/reports/platform',
  requireAuth,
  async (req, res) => {
    try {
      const { category, subject, description } = req.body
      if (!subject?.trim() || !description?.trim()) {
        return res.status(400).json({ ok: false, error: 'Subject and description are required.' })
      }

      const reportCategory = category || 'other'
      const reporterRole = req.user.role || 'student'

      const report = await Report.create({
        reporterId: req.user._id,
        reporterName: req.user.name,
        reporterRole,
        reportedUserName: reportCategory === 'college_admin_misconduct' ? 'College Administration' : 'Platform / System',
        type: 'platform',
        category: reportCategory,
        description: `[${subject.trim()}] ${description.trim()}`,
        collegeId: req.user.collegeId || null,
        college: req.user.college || 'Swish Network',
        status: 'pending',
      })

      // Create high-signal Admin Notification
      const notifTitle = reportCategory === 'college_admin_misconduct'
        ? `College Admin Grievance (${reporterRole.toUpperCase()})`
        : `Platform Issue Reported (${reporterRole.toUpperCase()})`

      const notif = await AdminNotification.create({
        type: 'platform_report',
        title: notifTitle,
        message: `${req.user.name} [${reporterRole}] reported: "${subject.trim()}"`,
        data: {
          reportId: report._id.toString(),
          reporterName: req.user.name,
          reporterEmail: req.user.email,
          reporterRole,
          college: req.user.college || 'Swish Network',
          category: reportCategory,
          subject: subject.trim(),
        },
        link: '/admin/reports',
        priority: reportCategory === 'college_admin_misconduct' ? 'urgent' : 'high',
      })

      emitToAdmin('admin:notification:new', notif)

      return res.status(201).json({
        ok: true,
        message: 'Your report has been sent to the platform administrators.',
        report: { id: report._id.toString() },
      })
    } catch (err) {
      console.error('[POST /api/admin/reports/platform]', err)
      return res.status(500).json({ ok: false, error: 'Failed to submit report. Please try again.' })
    }
  }
)

// GET /api/admin/reports - Get platform reports & grievances for Main Admin
router.get(
  '/reports',
  requireAuth,
  requireRole('admin', 'main_admin'),
  async (req, res) => {
    try {
      const reports = await Report.find({
        $or: [
          { type: 'platform' },
          { category: { $in: ['college_admin_misconduct', 'platform_bug', 'feature_request'] } }
        ]
      })
        .populate({
          path: 'reportedPostId',
          select: 'caption imageUrl imagePublicId music tags isDeleted hidden createdAt user collegeId',
          populate: { path: 'user', select: 'name username initials avatarColor profilePhoto' },
        })
        .populate('reporterId', 'role name email')
        .sort({ createdAt: -1 })
        .lean()

      return res.status(200).json({
        ok: true,
        reports: reports.map((r) => ({
          ...r,
          id: r._id.toString(),
          reportedPost: r.reportedPostId && typeof r.reportedPostId === 'object' && r.reportedPostId._id ? r.reportedPostId : null,
          reporterRole: r.reporterRole || r.reporterId?.role || 'student',
          resolutionNote: r.resolutionNote || r.resolutionNotes || '',
          resolutionNotes: r.resolutionNotes || r.resolutionNote || '',
        })),
      })
    } catch (err) {
      console.error('[GET /api/admin/reports]', err)
      return res.status(500).json({ ok: false, error: 'Failed to fetch platform reports.' })
    }
  }
)

// PATCH /api/admin/reports/:id/status - Update report status (reviewed, resolved, dismissed)
router.patch(
  '/reports/:id/status',
  requireAuth,
  requireRole('admin', 'main_admin'),
  async (req, res) => {
    try {
      const { status, resolutionNote, resolutionNotes } = req.body
      if (!['pending', 'reviewed', 'resolved', 'dismissed'].includes(status)) {
        return res.status(400).json({ ok: false, error: 'Invalid status.' })
      }

      const cleanNote = (resolutionNote || resolutionNotes || '').trim()

      const updateFields = {
        status,
        resolutionNote: cleanNote,
        resolutionNotes: cleanNote,
        reviewedBy: req.user._id,
      }
      if (status === 'resolved') updateFields.resolvedAt = new Date()
      if (status === 'reviewed') updateFields.reviewedAt = new Date()

      const report = await Report.findByIdAndUpdate(
        req.params.id,
        { $set: updateFields },
        { new: true }
      ).populate('reporterId', 'role name email').lean()

      if (!report) {
        return res.status(404).json({ ok: false, error: 'Report not found.' })
      }

      // Notify the reporter (Student or Faculty) about the resolution/update
      if (report.reporterId) {
        try {
          const reporterUserId = report.reporterId._id || report.reporterId
          let notifText = 'updated your report status'
          if (status === 'resolved') {
            notifText = 'resolved your platform report'
          } else if (status === 'reviewed') {
            notifText = 'is reviewing your platform report'
          } else if (status === 'dismissed') {
            notifText = 'reviewed and closed your platform report'
          }

          const subtext = cleanNote
            ? `Admin Note: "${cleanNote}"`
            : `Your report status is now marked as ${status}.`

          await createNotification({
            recipient: reporterUserId,
            sender: req.user._id,
            type: 'report_update',
            text: notifText,
            subtext,
          })
        } catch (notifErr) {
          console.error('[PATCH /api/admin/reports/:id/status] Failed to notify reporter:', notifErr)
        }
      }

      return res.status(200).json({
        ok: true,
        report: {
          ...report,
          id: report._id.toString(),
          reporterRole: report.reporterRole || report.reporterId?.role || 'student',
          resolutionNote: cleanNote,
          resolutionNotes: cleanNote,
        },
      })
    } catch (err) {
      console.error('[PATCH /api/admin/reports/:id/status]', err)
      return res.status(500).json({ ok: false, error: 'Failed to update report status.' })
    }
  }
)

export default router
