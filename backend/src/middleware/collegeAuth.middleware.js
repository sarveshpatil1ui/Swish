// backend/src/middleware/collegeAuth.middleware.js
// ─────────────────────────────────────────────────────────────────────────────
// Centralized College Authorization & Tenant Isolation Middleware
// Architecture: Option A — Complete College Isolation
// ─────────────────────────────────────────────────────────────────────────────
import College from '../models/College.js'

/**
 * Compares two college IDs safely (handles ObjectId, string, null, undefined).
 * Returns true only if both IDs are non-null and have identical string representations.
 */
export function isSameCollege(collegeIdA, collegeIdB) {
  if (!collegeIdA || !collegeIdB) return false
  const strA = typeof collegeIdA === 'object' && collegeIdA._id ? collegeIdA._id.toString() : collegeIdA.toString()
  const strB = typeof collegeIdB === 'object' && collegeIdB._id ? collegeIdB._id.toString() : collegeIdB.toString()
  return Boolean(strA && strB && strA === strB)
}

/**
 * Middleware: Requires the authenticated user to have a verified college membership.
 * Fails closed if req.user has no collegeId (except for main_admin accessing global admin tools).
 * For student-facing social routes, college membership is strictly required.
 */
export function requireCollegeMembership(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'Not authenticated. Please log in.' })
  }

  // Super admin accessing purely platform-wide management is handled separately
  if ((req.user.role === 'main_admin' || req.user.role === 'admin') && !req.user.collegeId) {
    req.collegeId = null
    return next()
  }

  if (!req.user.collegeId) {
    return res.status(403).json({
      ok: false,
      error: 'College membership required. Your account is not currently affiliated with an active campus.',
    })
  }

  req.collegeId = req.user.collegeId.toString()
  next()
}

/**
 * Middleware: Establishes a verified, unambiguous target college context for social queries.
 *
 * Rules:
 * 1. For students, faculty, and college_admin:
 *    - Always uses the user's trusted database-backed req.user.collegeId.
 *    - Never trusts client-supplied req.body.collegeId, req.query.collegeId, or headers.
 * 2. For main_admin:
 *    - Main admin has NO universal student feed (Option A Rule).
 *    - Must supply an explicit ?collegeId=... parameter.
 *    - Verifies the college exists in MongoDB.
 *    - Rejects with HTTP 400 if college context is missing.
 */
export async function requireCollegeContext(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'Not authenticated. Please log in.' })
  }

  const isMainAdmin = req.user.role === 'main_admin' || req.user.role === 'admin'

  if (isMainAdmin) {
    const candidateCollegeId = req.query?.collegeId || req.headers?.['x-college-id'] || req.params?.collegeId
    if (!candidateCollegeId) {
      return res.status(400).json({
        ok: false,
        error: 'Explicit college context (collegeId) is required for platform admin inspection.',
      })
    }

    try {
      const college = await College.findById(candidateCollegeId).select('_id name active domain').lean()
      if (!college) {
        return res.status(404).json({ ok: false, error: 'Specified college not found.' })
      }
      req.targetCollegeId = college._id.toString()
      req.targetCollege = college
      return next()
    } catch {
      return res.status(400).json({ ok: false, error: 'Invalid college ID format.' })
    }
  }

  // For ordinary users & college_admin: strictly use trusted DB profile
  if (!req.user.collegeId) {
    return res.status(403).json({
      ok: false,
      error: 'College membership required to access campus social feeds.',
    })
  }

  req.targetCollegeId = req.user.collegeId.toString()
  next()
}

/**
 * Role guard: Requires college administrator privileges.
 * College admin is restricted to their assigned collegeId.
 * Main admin is allowed but must operate with explicit tenant context.
 */
export function requireCollegeAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'Not authenticated.' })
  }

  if (req.user.role === 'main_admin' || req.user.role === 'admin') {
    return next()
  }

  if (req.user.role === 'college_admin') {
    if (!req.user.collegeId) {
      return res.status(403).json({ ok: false, error: 'Access denied: No college associated with your account.' })
    }
    req.collegeId = req.user.collegeId.toString()
    return next()
  }

  return res.status(403).json({
    ok: false,
    error: 'Access denied. College administrator role required.',
  })
}

/**
 * Role guard: Requires global platform Super Admin privileges (main_admin).
 */
export function requireMainAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'Not authenticated.' })
  }

  if (req.user.role !== 'main_admin') {
    return res.status(403).json({
      ok: false,
      error: 'Access denied. Platform Super Admin role required.',
    })
  }

  next()
}

/**
 * Verifies that a conversation adheres to complete college tenant isolation.
 * Works safely for both migrated documents (conv.collegeId) and legacy unmigrated documents (missing collegeId).
 * 
 * Strict Option A Rules (Fail Closed):
 * 1. Both conv and user must be provided.
 * 2. If conv.isArchived === true, access is denied (read-only/freeze).
 * 3. The user must have a valid collegeId.
 * 4. If conv.collegeId is present:
 *    - conv.collegeId must match user.collegeId.
 * 5. If conv.collegeId is missing (legacy unmigrated document):
 *    - All participants in conv.participants must be resolved.
 *    - Must have at least 2 participants.
 *    - Every participant must have a non-empty, valid collegeId.
 *    - Every participant's collegeId must match user.collegeId.
 *    - If any participant lacks a collegeId or belongs to a different college, FAIL CLOSED (returns false).
 * 
 * @param {object} conv - Conversation document (lean or mongoose doc)
 * @param {object} user - User document or auth context (must have _id and collegeId)
 * @param {object} [UserModel] - Optional User model if participants need DB hydration
 * @returns {Promise<boolean>} true if authorized, false otherwise
 */
export async function verifyConversationTenantAccess(conv, user, UserModel = null) {
  if (!conv || !user) return false
  if (conv.isArchived === true) return false

  const userCollegeId = user.collegeId
    ? (user.collegeId._id ? user.collegeId._id.toString() : user.collegeId.toString())
    : null

  if (!userCollegeId) return false // User must belong to a campus

  // 1. Migrated conversation with explicit collegeId
  if (conv.collegeId) {
    const convCollegeId = conv.collegeId._id ? conv.collegeId._id.toString() : conv.collegeId.toString()
    return convCollegeId === userCollegeId
  }

  // 2. Legacy unmigrated conversation (collegeId is undefined or null)
  const participants = conv.participants || []
  if (participants.length < 2) return false

  // Determine whether participants are already populated with collegeId
  const arePopulated = participants.every(p => typeof p === 'object' && p !== null && p.collegeId !== undefined)

  let participantCollegeIds = []
  if (arePopulated) {
    participantCollegeIds = participants.map(p => {
      if (!p.collegeId) return null
      return p.collegeId._id ? p.collegeId._id.toString() : p.collegeId.toString()
    })
  } else {
    // Participants are ObjectIds or unpopulated - query trusted database records
    const Model = UserModel || (await import('../models/User.js')).default
    const pIds = participants.map(p => (p && p._id ? p._id : p))
    const userDocs = await Model.find({ _id: { $in: pIds } }).select('_id collegeId').lean()
    if (userDocs.length !== pIds.length) return false // Missing user record
    participantCollegeIds = userDocs.map(u => {
      if (!u.collegeId) return null
      return u.collegeId._id ? u.collegeId._id.toString() : u.collegeId.toString()
    })
  }

  // Fail closed if ANY participant lacks a valid collegeId
  if (participantCollegeIds.some(cid => !cid)) return false

  // Fail closed if ANY participant belongs to a college different from userCollegeId
  return participantCollegeIds.every(cid => cid === userCollegeId)
}

