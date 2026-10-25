
import { Router } from 'express'
import { body, validationResult } from 'express-validator'

import Department from '../models/Department.js'
import College from '../models/College.js'
import User from '../models/User.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'
import {
  getOrSet,
  delPattern,
  cacheKey,
} from '../services/cache.service.js'
import { logActivity } from '../services/activity-log.service.js'

const router = Router()

const DEPT_BY_DOMAIN_TTL = 60

// ── Helpers ────────────────────────────────────────────────────────────────

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

async function requireCollegeAccess(req, res, next) {
  try {
    if (req.user.role === 'admin' || req.user.role === 'main_admin') {
      return next()
    }

    if (req.user.role === 'college_admin') {
      if (!req.user.collegeId) {
        return res.status(403).json({
          ok: false,
          error: 'College admin has no associated college.',
        })
      }

      req.collegeId = req.user.collegeId

      let collegeName = req.user.college

      if (!collegeName || collegeName === req.user.collegeId.toString()) {
        const college = await College.findById(req.user.collegeId)
        if (college) collegeName = college.name
      }

      req.collegeName = collegeName || ''
      return next()
    }

    return res.status(403).json({
      ok: false,
      error: 'Access denied.',
    })
  } catch (err) {
    return next(err)
  }
}

// Log successful actions without turning a successful department
// operation into an apparent failure if audit logging is unavailable.
async function recordDepartmentActivity(req, department, actionType, details) {
  try {
    await logActivity({
      adminId: req.user._id,
      adminName: req.user.name,
      adminRole: req.user.role,
      collegeId: department.collegeId,
      college: department.college,
      actionType,
      resourceType: 'department',
      resourceId: department._id,
      resourceName: `${department.name} (${department.code})`,
      details,
      ipAddress: req.ip,
    })
  } catch (err) {
    console.error('[Department Activity Log]', err)
  }
}

// ── GET /api/departments/by-domain ─────────────────────────────────────────
// Public endpoint used during registration.

router.get('/by-domain', async (req, res) => {
  try {
    const { domain } = req.query

    if (typeof domain !== 'string' || !domain.trim()) {
      return res.status(400).json({
        ok: false,
        error: 'Domain is required.',
      })
    }

    const normDomain = domain.trim().toLowerCase()
    const key = cacheKey('departments', 'by-domain', normDomain)

    const result = await getOrSet(key, DEPT_BY_DOMAIN_TTL, async () => {
      const college = await College.findOne({
        domain: normDomain,
        active: true,
      })

      if (!college) return null

      const departments = await Department.find({
        collegeId: college._id,
        active: true,
      })
        .sort({ name: 1 })
        .select('name code')
        .lean()

      return { ok: true, departments }
    })

    if (!result) {
      return res.status(404).json({
        ok: false,
        error: 'College not found.',
      })
    }

    res.setHeader(
      'Cache-Control',
      'public, max-age=300, stale-while-revalidate=600'
    )

    return res.status(200).json(result)
  } catch (err) {
    console.error('[GET /departments/by-domain]', err)
    return res.status(500).json({
      ok: false,
      error: 'Failed to fetch departments.',
    })
  }
})

// ── GET /api/departments ───────────────────────────────────────────────────
// Get departments and student counts.

router.get(
  '/',
  requireAuth,
  requireRole('admin', 'college_admin'),
  requireCollegeAccess,
  async (req, res) => {
    try {
      const filter =
        req.user.role === 'admin'
          ? {}
          : { collegeId: req.collegeId }

      const departments = await Department.find(filter)
        .sort({ name: 1 })
        .lean()

      const departmentsWithCounts = await Promise.all(
        departments.map(async (dept) => {
          const studentCount = await User.countDocuments({
            dept: dept.name,
            collegeId: dept.collegeId,
            role: 'student',
            deactivated: false,
          })

          return { ...dept, studentCount }
        })
      )

      return res.status(200).json({
        ok: true,
        departments: departmentsWithCounts,
      })
    } catch (err) {
      console.error('[GET /departments]', err)
      return res.status(500).json({
        ok: false,
        error: 'Failed to fetch departments.',
      })
    }
  }
)

// ── POST /api/departments ──────────────────────────────────────────────────
// Create a department.

router.post(
  '/',
  requireAuth,
  requireRole('admin', 'college_admin'),
  requireCollegeAccess,
  [
    body('name').trim().notEmpty().withMessage('Department name is required.'),
    body('code').trim().notEmpty().withMessage('Department code is required.'),
    body('description').optional().trim(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return

    try {
      const { name, code, description, headOfDepartment } = req.body

      // College admins can only create departments for their own college.
      // Global admins must explicitly identify the target college.
      let collegeId = req.collegeId
      let collegeName = req.collegeName

      if (req.user.role === 'admin') {
        if (!req.body.collegeId) {
          return res.status(400).json({
            ok: false,
            error: 'A collegeId is required when creating a department as admin.',
          })
        }

        const targetCollege = await College.findById(req.body.collegeId)

        if (!targetCollege) {
          return res.status(404).json({
            ok: false,
            error: 'College not found.',
          })
        }

        collegeId = targetCollege._id
        collegeName = targetCollege.name
      }

      const normalizedCode = code.trim().toUpperCase()

      const existing = await Department.findOne({
        collegeId,
        code: normalizedCode,
      })

      if (existing) {
        return res.status(409).json({
          ok: false,
          error: `Department code "${normalizedCode}" already exists in this college.`,
        })
      }

      const department = await Department.create({
        name: name.trim(),
        code: normalizedCode,
        collegeId,
        college: collegeName,
        description: (description || '').trim(),
        headOfDepartment: headOfDepartment || null,
        active: true,
      })

      await delPattern(cacheKey('departments', 'by-domain', '*'))

      await recordDepartmentActivity(
        req,
        department,
        'department_created',
        `Created department: ${department.name}`
      )

      return res.status(201).json({
        ok: true,
        department: department.toJSON(),
      })
    } catch (err) {
      console.error('[POST /departments]', err)
      return res.status(500).json({
        ok: false,
        error: 'Failed to create department.',
      })
    }
  }
)

// ── GET /api/departments/:id ───────────────────────────────────────────────

router.get(
  '/:id',
  requireAuth,
  requireRole('admin', 'college_admin'),
  requireCollegeAccess,
  async (req, res) => {
    try {
      const filter =
        req.user.role === 'admin'
          ? { _id: req.params.id }
          : { _id: req.params.id, collegeId: req.collegeId }

      const department = await Department.findOne(filter)

      if (!department) {
        return res.status(404).json({
          ok: false,
          error: 'Department not found.',
        })
      }

      return res.status(200).json({
        ok: true,
        department: department.toJSON(),
      })
    } catch (err) {
      console.error('[GET /departments/:id]', err)
      return res.status(500).json({
        ok: false,
        error: 'Failed to fetch department.',
      })
    }
  }
)

// ── PUT /api/departments/:id ───────────────────────────────────────────────
// Update a department.

router.put(
  '/:id',
  requireAuth,
  requireRole('admin', 'college_admin'),
  requireCollegeAccess,
  [
    body('name').optional().trim().notEmpty(),
    body('code').optional().trim().notEmpty(),
    body('description').optional().trim(),
    body('headOfDepartment').optional().trim(),
  ],
  async (req, res) => {
    if (handleValidationErrors(req, res)) return

    try {
      const filter =
        req.user.role === 'admin'
          ? { _id: req.params.id }
          : { _id: req.params.id, collegeId: req.collegeId }

      const department = await Department.findOne(filter)

      if (!department) {
        return res.status(404).json({
          ok: false,
          error: 'Department not found.',
        })
      }

      const { name, code, description, headOfDepartment, active } = req.body

      const nextCode = code
        ? code.trim().toUpperCase()
        : department.code

      if (nextCode !== department.code) {
        const duplicate = await Department.findOne({
          _id: { $ne: department._id },
          collegeId: department.collegeId,
          code: nextCode,
        })

        if (duplicate) {
          return res.status(409).json({
            ok: false,
            error: `Department code "${nextCode}" already exists in this college.`,
          })
        }
      }

      if (name !== undefined) department.name = name.trim()
      if (code !== undefined) department.code = nextCode
      if (description !== undefined) department.description = description.trim()
      if (headOfDepartment !== undefined) {
        department.headOfDepartment = headOfDepartment || null
      }
      if (active !== undefined) department.active = active

      await department.save()

      await delPattern(cacheKey('departments', 'by-domain', '*'))

      await recordDepartmentActivity(
        req,
        department,
        'department_edited',
        `Updated department: ${department.name}`
      )

      return res.status(200).json({
        ok: true,
        department: department.toJSON(),
      })
    } catch (err) {
      console.error('[PUT /departments/:id]', err)
      return res.status(500).json({
        ok: false,
        error: 'Failed to update department.',
      })
    }
  }
)

// ── PATCH /api/departments/:id/toggle ──────────────────────────────────────
// Activate or deactivate a department.

router.patch(
  '/:id/toggle',
  requireAuth,
  requireRole('admin', 'college_admin'),
  requireCollegeAccess,
  async (req, res) => {
    try {
      const filter =
        req.user.role === 'admin'
          ? { _id: req.params.id }
          : { _id: req.params.id, collegeId: req.collegeId }

      const department = await Department.findOne(filter)

      if (!department) {
        return res.status(404).json({
          ok: false,
          error: 'Department not found.',
        })
      }

      department.active = !department.active
      await department.save()

      await delPattern(cacheKey('departments', 'by-domain', '*'))

      await recordDepartmentActivity(
        req,
        department,
        department.active
          ? 'department_activated'
          : 'department_deactivated',
        department.active
          ? 'Activated department'
          : 'Deactivated department'
      )

      return res.status(200).json({
        ok: true,
        department: department.toJSON(),
      })
    } catch (err) {
      console.error('[PATCH /departments/:id/toggle]', err)
      return res.status(500).json({
        ok: false,
        error: 'Failed to toggle department status.',
      })
    }
  }
)

// ── DELETE /api/departments/:id ────────────────────────────────────────────
// Delete a department.

router.delete(
  '/:id',
  requireAuth,
  requireRole('admin', 'college_admin'),
  requireCollegeAccess,
  async (req, res) => {
    try {
      const filter =
        req.user.role === 'admin' || req.user.role === 'main_admin'
          ? { _id: req.params.id }
          : { _id: req.params.id, collegeId: req.collegeId }

      const department = await Department.findOneAndDelete(filter)

      if (!department) {
        return res.status(404).json({
          ok: false,
          error: 'Department not found.',
        })
      }

      await delPattern(cacheKey('departments', 'by-domain', '*'))

      await recordDepartmentActivity(
        req,
        department,
        'department_deleted',
        `Deleted department: ${department.name}`
      )

      return res.status(200).json({
        ok: true,
        message: 'Department deleted successfully.',
      })
    } catch (err) {
      console.error('[DELETE /departments/:id]', err)
      return res.status(500).json({
        ok: false,
        error: 'Failed to delete department.',
      })
    }
  }
)

export default router
