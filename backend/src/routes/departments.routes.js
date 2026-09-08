// backend/src/routes/departments.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// Department management routes for College Admin module
//
// College Admin can only access departments belonging to their college
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express'
import { body, validationResult } from 'express-validator'

import Department from '../models/Department.js'
import { requireAuth, requireRole } from '../middleware/auth.middleware.js'

const router = Router()

// ── Helpers ──────────────────────────────────────────────────────────────────

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

// Middleware to ensure user can only access their college's departments
function requireCollegeAccess(req, res, next) {
  if (req.user.role === 'admin') {
    // Super admin can access all
    return next()
  }
  if (req.user.role === 'college_admin') {
    // College admin can only access their own college
    req.collegeId = req.user.collegeId
    req.collegeName = req.user.college
    return next()
  }
  return res.status(403).json({ ok: false, error: 'Access denied.' })
}

// ── GET /api/departments ─────────────────────────────────────────────────────
// Get departments for the college admin's college
router.get('/', requireAuth, requireRole('admin', 'college_admin'), requireCollegeAccess, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' ? {} : { collegeId: req.collegeId }
    const departments = await Department.find(filter).sort({ name: 1 })
    return res.status(200).json({ ok: true, departments: departments.map(d => d.toJSON()) })
  } catch (err) {
    console.error('[GET /departments]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch departments.' })
  }
})

// ── POST /api/departments ────────────────────────────────────────────────────
// Create a new department (college_admin or admin)
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
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const { name, code, description, headOfDepartment } = req.body

      // Check for duplicate code within the same college
      const filter = req.user.role === 'admin' 
        ? { code: code.trim().toUpperCase() }
        : { code: code.trim().toUpperCase(), collegeId: req.collegeId }
      
      const existing = await Department.findOne(filter)
      if (existing) {
        return res.status(409).json({
          ok: false,
          error: `A department with code "${code}" already exists in this college.`,
        })
      }

      const department = await Department.create({
        name: name.trim(),
        code: code.trim().toUpperCase(),
        collegeId: req.collegeId,
        college: req.collegeName,
        description: (description || '').trim(),
        headOfDepartment: headOfDepartment || null,
        active: true,
      })

      return res.status(201).json({ ok: true, department: department.toJSON() })
    } catch (err) {
      console.error('[POST /departments]', err)
      res.status(500).json({ ok: false, error: 'Failed to create department.' })
    }
  }
)

// ── GET /api/departments/:id ─────────────────────────────────────────────────
// Get a specific department
router.get('/:id', requireAuth, requireRole('admin', 'college_admin'), requireCollegeAccess, async (req, res) => {
  try {
    const filter = req.user.role === 'admin' 
      ? { _id: req.params.id }
      : { _id: req.params.id, collegeId: req.collegeId }
    
    const department = await Department.findOne(filter)
    if (!department) {
      return res.status(404).json({ ok: false, error: 'Department not found.' })
    }

    return res.status(200).json({ ok: true, department: department.toJSON() })
  } catch (err) {
    console.error('[GET /departments/:id]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch department.' })
  }
})

// ── PUT /api/departments/:id ─────────────────────────────────────────────────
// Update a department
router.put(
  '/:id',
  requireAuth,
  requireRole('admin', 'college_admin'),
  requireCollegeAccess,
  [
    body('name').optional().trim(),
    body('code').optional().trim(),
    body('description').optional().trim(),
    body('headOfDepartment').optional().trim(),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const filter = req.user.role === 'admin' 
        ? { _id: req.params.id }
        : { _id: req.params.id, collegeId: req.collegeId }
      
      const department = await Department.findOne(filter)
      if (!department) {
        return res.status(404).json({ ok: false, error: 'Department not found.' })
      }

      const { name, code, description, headOfDepartment, active } = req.body

      if (name) department.name = name.trim()
      if (code) department.code = code.trim().toUpperCase()
      if (description !== undefined) department.description = description.trim()
      if (headOfDepartment !== undefined) department.headOfDepartment = headOfDepartment || null
      if (active !== undefined) department.active = active

      await department.save()

      return res.status(200).json({ ok: true, department: department.toJSON() })
    } catch (err) {
      console.error('[PUT /departments/:id]', err)
      res.status(500).json({ ok: false, error: 'Failed to update department.' })
    }
  }
)

// ── PATCH /api/departments/:id/toggle ────────────────────────────────────────
// Toggle department active status
router.patch(
  '/:id/toggle',
  requireAuth,
  requireRole('admin', 'college_admin'),
  requireCollegeAccess,
  async (req, res) => {
    try {
      const filter = req.user.role === 'admin' 
        ? { _id: req.params.id }
        : { _id: req.params.id, collegeId: req.collegeId }
      
      const department = await Department.findOne(filter)
      if (!department) {
        return res.status(404).json({ ok: false, error: 'Department not found.' })
      }

      department.active = !department.active
      await department.save()

      return res.status(200).json({ ok: true, department: department.toJSON() })
    } catch (err) {
      console.error('[PATCH /departments/:id/toggle]', err)
      res.status(500).json({ ok: false, error: 'Failed to toggle department status.' })
    }
  }
)

export default router
