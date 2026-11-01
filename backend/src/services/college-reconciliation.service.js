// backend/src/services/college-reconciliation.service.js
// ─────────────────────────────────────────────────────────────────────────────
// College & Department Reconciliation Service
//
// Establishes a reliable, authoritative relationship:
// College -> Departments -> Students / Faculty
//
// Ensures:
// 1. College Admin always has their collegeId resolved.
// 2. All legitimate students and faculty belonging to a college are visible,
//    even if legacy records stored department/college as plain text strings.
// 3. Departments referenced by legacy users are safely reconciled into official
//    Department records without duplicates or data loss.
// 4. Strict college-level data isolation is preserved at all times.
// ─────────────────────────────────────────────────────────────────────────────
import mongoose from 'mongoose'
import User from '../models/User.js'
import College from '../models/College.js'
import Department from '../models/Department.js'
import { delPattern, cacheKey } from './cache.service.js'

/**
 * Common engineering / academic department abbreviations.
 */
const KNOWN_DEPT_CODES = {
  'information technology': 'IT',
  'computer engineering': 'CE',
  'computer science': 'CS',
  'computer science and engineering': 'CSE',
  'mechanical engineering': 'ME',
  'civil engineering': 'CIVIL',
  'electrical engineering': 'EE',
  'electronics engineering': 'ETRX',
  'electronics and telecommunication': 'EXTC',
  'electronics and telecommunication engineering': 'EXTC',
  'artificial intelligence and data science': 'AIDS',
  'artificial intelligence and machine learning': 'AIML',
  'chemical engineering': 'CHEM',
  'biomedical engineering': 'BIOMED',
  'humanities and sciences': 'H&S',
  'applied sciences': 'AS',
  'general engineering': 'GEN',
}

/**
 * Generates a clean, unique department code for a given department name.
 */
export function generateDeptCode(name, existingCodes = new Set()) {
  const norm = (name || '').trim().toLowerCase()
  let candidate = KNOWN_DEPT_CODES[norm]

  if (!candidate) {
    const clean = (name || '').trim().replace(/[^a-zA-Z0-9\s]/g, '')
    const words = clean.split(/\s+/).filter(Boolean)
    if (words.length > 1) {
      candidate = words.map(w => w[0]).join('').toUpperCase()
    } else if (words.length === 1) {
      candidate = words[0].slice(0, 4).toUpperCase()
    } else {
      candidate = 'DEPT'
    }
  }

  let code = candidate
  let counter = 1
  while (existingCodes.has(code)) {
    code = `${candidate}${counter++}`
  }
  return code
}

/**
 * Resolves the authoritative College document for any user (especially college_admin).
 * If the user's collegeId was missing, null, or mismatched, it auto-resolves via
 * email domain or college name, heals the record in MongoDB, and returns the College.
 */
export async function resolveUserCollege(user) {
  if (!user) return null
  if (user.role === 'admin' || user.role === 'main_admin') return null

  // 1. If collegeId exists, verify it points to an active College
  if (user.collegeId) {
    let college = null
    try {
      college = await College.findById(user.collegeId)
    } catch {
      // Invalid ObjectId format
    }
    if (college) {
      // Heal college name if mismatched or stored as ObjectId string
      if (!user.college || user.college !== college.name) {
        user.college = college.name
        await User.updateOne({ _id: user._id }, { $set: { college: college.name } }).catch(() => {})
      }
      return college
    }
  }

  // 2. Try resolving via email domain
  const emailDomain = user.email ? user.email.split('@')[1]?.toLowerCase().trim() : null
  if (emailDomain) {
    const college = await College.findOne({ domain: emailDomain, active: true })
    if (college) {
      user.collegeId = college._id
      user.college = college.name
      await User.updateOne(
        { _id: user._id },
        { $set: { collegeId: college._id, college: college.name } }
      ).catch(() => {})
      return college
    }
  }

  // 3. Try resolving via college name string
  if (user.college && typeof user.college === 'string' && user.college.trim()) {
    const trimmed = user.college.trim()
    const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const college = await College.findOne({
      name: new RegExp(`^${escaped}$`, 'i'),
      active: true,
    })
    if (college) {
      user.collegeId = college._id
      user.college = college.name
      await User.updateOne(
        { _id: user._id },
        { $set: { collegeId: college._id, college: college.name } }
      ).catch(() => {})
      return college
    }
  }

  return null
}

/**
 * Checks if a user belongs to a specific college, accounting for:
 * - collegeId as ObjectId or String
 * - college name matching
 * - email domain matching
 * If true, auto-heals targetUser.collegeId and targetUser.college.
 */
export function isUserInCollege(user, college) {
  if (!user || !college || !college._id) return false
  const collegeIdStr = college._id.toString()

  if (user.collegeId && user.collegeId.toString() === collegeIdStr) {
    return true
  }

  if (user.college && college.name && user.college.trim().toLowerCase() === college.name.trim().toLowerCase()) {
    user.collegeId = college._id
    user.college = college.name
    user.save?.().catch?.(() => {})
    return true
  }

  const userDomain = user.email ? user.email.split('@')[1]?.toLowerCase().trim() : null
  if (userDomain && college.domain && userDomain === college.domain.toLowerCase().trim()) {
    user.collegeId = college._id
    user.college = college.name
    user.save?.().catch?.(() => {})
    return true
  }

  return false
}

/**
 * Builds a comprehensive MongoDB filter for a college to match all users belonging to it.
 * Matches by:
 * - collegeId as ObjectId
 * - collegeId as String
 * - college name (for legacy records before collegeId was populated)
 * - email domain (for students registered before backfill)
 */
export function buildCollegeUserFilter(college, additionalFilter = {}) {
  if (!college || !college._id) {
    return { _id: null }
  }

  const collegeIdObj = college._id instanceof mongoose.Types.ObjectId
    ? college._id
    : new mongoose.Types.ObjectId(college._id)
  const collegeIdStr = collegeIdObj.toString()

  const collegeClauses = [
    { collegeId: collegeIdObj },
    { collegeId: collegeIdStr },
  ]

  if (college.name && college.name.trim()) {
    collegeClauses.push({ college: college.name.trim() })
  }

  if (college.domain && college.domain.trim()) {
    const escapedDomain = college.domain.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    collegeClauses.push({ email: new RegExp(`@${escapedDomain}$`, 'i') })
  }

  const collegeMatch = { $or: collegeClauses }

  if (!additionalFilter || Object.keys(additionalFilter).length === 0) {
    return collegeMatch
  }

  return {
    $and: [
      collegeMatch,
      additionalFilter,
    ],
  }
}

/**
 * Auto-heals users belonging to a college by setting their collegeId and college name.
 * Runs in background without blocking API responses.
 */
export async function autoHealCollegeUsers(college) {
  if (!college || !college._id) return

  try {
    const collegeIdObj = college._id instanceof mongoose.Types.ObjectId
      ? college._id
      : new mongoose.Types.ObjectId(college._id)

    // Match users that belong to this college by name or domain but lack an ObjectId collegeId
    const filter = {
      $and: [
        {
          $or: [
            ...(college.name ? [{ college: college.name.trim() }] : []),
            ...(college.domain ? [{ email: new RegExp(`@${college.domain.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') }] : []),
          ],
        },
        {
          $or: [
            { collegeId: null },
            { collegeId: { $exists: false } },
            { collegeId: { $type: 'string' } },
            { college: { $ne: college.name } },
          ],
        },
      ],
    }

    await User.updateMany(filter, {
      $set: {
        collegeId: collegeIdObj,
        college: college.name,
      },
    })
  } catch (err) {
    console.warn('[autoHealCollegeUsers] Error healing users:', err.message)
  }
}

/**
 * Reconciles departments and user department references for a college.
 * 1. Loads all existing Department records for the college.
 * 2. Scans all students and faculty in the college.
 * 3. If a student/faculty has a plain text `dept` without an official `Department`,
 *    it creates the Department record (without creating duplicates).
 * 4. Links `user.departmentId` to the official Department ObjectId.
 * 5. Returns reconciliation report.
 */
export async function reconcileCollegeDepartments(college) {
  if (!college || !college._id) {
    return { departmentsCount: 0, usersReconciled: 0, departmentsCreated: 0, unmatched: [] }
  }

  const collegeIdObj = college._id instanceof mongoose.Types.ObjectId
    ? college._id
    : new mongoose.Types.ObjectId(college._id)

  // 1. Load all existing departments for this college
  const existingDepartments = await Department.find({
    $or: [
      { collegeId: collegeIdObj },
      { collegeId: collegeIdObj.toString() },
      { college: college.name },
    ],
  })

  // Heal any department records that had string collegeId or mismatched college name
  for (const dept of existingDepartments) {
    if (!dept.collegeId || dept.collegeId.toString() !== collegeIdObj.toString() || dept.college !== college.name) {
      dept.collegeId = collegeIdObj
      dept.college = college.name
      await dept.save().catch(() => {})
    }
  }

  // Maps for quick case-insensitive lookup
  const deptByName = new Map()
  const deptByCode = new Map()
  const existingCodes = new Set()

  existingDepartments.forEach((d) => {
    deptByName.set(d.name.trim().toLowerCase(), d)
    deptByCode.set(d.code.trim().toUpperCase(), d)
    existingCodes.add(d.code.trim().toUpperCase())
  })

  // 2. Fetch all users belonging to this college
  const userFilter = buildCollegeUserFilter(college, {
    role: { $in: ['student', 'faculty'] },
  })
  const users = await User.find(userFilter)

  let departmentsCreated = 0
  let usersReconciled = 0
  const unmatched = []

  // 3. Scan user plain text `dept` fields and ensure Department records exist
  for (const user of users) {
    const rawDept = (user.dept || '').trim()
    if (!rawDept) {
      // User has no department specified
      continue
    }

    const normDept = rawDept.toLowerCase()
    let department = deptByName.get(normDept)

    // Also check if rawDept matches a known code
    if (!department) {
      department = deptByCode.get(rawDept.toUpperCase())
    }

    // If no Department exists for this college, safely create it!
    if (!department) {
      try {
        const code = generateDeptCode(rawDept, existingCodes)
        existingCodes.add(code)

        department = await Department.create({
          name: rawDept,
          code,
          collegeId: collegeIdObj,
          college: college.name,
          description: `${rawDept} Department at ${college.name}`,
          active: true,
        })

        deptByName.set(normDept, department)
        deptByCode.set(code, department)
        existingDepartments.push(department)
        departmentsCreated++
      } catch (createErr) {
        // In case of parallel race condition, re-query
        department = await Department.findOne({
          collegeId: collegeIdObj,
          $or: [
            { name: new RegExp(`^${rawDept.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') },
          ],
        })
        if (!department) {
          unmatched.push({ userId: user._id, name: user.name, dept: rawDept, error: createErr.message })
          continue
        }
      }
    }

    // 4. Link user to department if not linked or mismatched
    let userChanged = false
    if (!user.departmentId || user.departmentId.toString() !== department._id.toString()) {
      user.departmentId = department._id
      userChanged = true
    }
    if (user.dept !== department.name) {
      user.dept = department.name
      userChanged = true
    }
    if (!user.collegeId || user.collegeId.toString() !== collegeIdObj.toString() || user.college !== college.name) {
      user.collegeId = collegeIdObj
      user.college = college.name
      userChanged = true
    }

    if (userChanged) {
      await user.save().catch(() => {})
      usersReconciled++
    }
  }

  // Also check users who have `departmentId` but empty or mismatched `dept` string
  for (const user of users) {
    if (user.departmentId && (!user.dept || !user.dept.trim())) {
      const d = existingDepartments.find(dep => dep._id.toString() === user.departmentId.toString())
      if (d) {
        user.dept = d.name
        await user.save().catch(() => {})
        usersReconciled++
      }
    }
  }

  // Invalidate Redis cache
  await delPattern(cacheKey('departments', '*')).catch(() => {})

  return {
    departmentsCount: existingDepartments.length,
    usersReconciled,
    departmentsCreated,
    unmatched,
  }
}
