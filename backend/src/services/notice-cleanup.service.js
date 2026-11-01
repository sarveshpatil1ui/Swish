// backend/src/services/notice-cleanup.service.js
// ─────────────────────────────────────────────────────────────────────────────
// Safe duplicate notice detection and cleanup service
// Finds duplicate notices created within short windows and removes surplus duplicates
// while preserving legitimate notices.
// ─────────────────────────────────────────────────────────────────────────────
import Notice from '../models/Notice.js'

/**
 * Group notices and identify duplicates safely.
 * Two notices are considered duplicates if:
 * 1. They belong to the same college and author.
 * 2. They have identical normalized title and content.
 * 3. They were created within timeWindowMs (default 5 minutes) of each other.
 *
 * The canonical notice to KEEP is chosen by:
 * - Pinned status (pinned notices take priority)
 * - Published status (published notices take priority over drafts)
 * - Earliest createdAt date
 *
 * @param {Array} notices - Array of notice documents (lean or hydrated)
 * @param {number} timeWindowMs - Milliseconds window for considering rapid duplicates (default 5m)
 * @returns {{ groups: Array, duplicateIds: Array, keptIds: Array }}
 */
export function identifyDuplicateNotices(notices = [], timeWindowMs = 5 * 60 * 1000) {
  if (!Array.isArray(notices) || notices.length === 0) {
    return { groups: [], duplicateIds: [], keptIds: [] }
  }

  // Key: collegeId_authorId_normalizedTitle_normalizedContent
  const buckets = new Map()

  for (const n of notices) {
    const colId = (n.collegeId?._id || n.collegeId || '').toString()
    const authorId = (n.createdBy?._id || n.createdBy || '').toString()
    const titleNorm = (n.title || '').trim().toLowerCase()
    const contentNorm = (n.content || '').trim().toLowerCase()

    const bucketKey = `${colId}:::${authorId}:::${titleNorm}:::${contentNorm}`
    if (!buckets.has(bucketKey)) {
      buckets.set(bucketKey, [])
    }
    buckets.get(bucketKey).push(n)
  }

  const groups = []
  const duplicateIds = []
  const keptIds = []

  for (const [key, items] of buckets.entries()) {
    if (items.length <= 1) {
      if (items[0]) {
        keptIds.push((items[0]._id || items[0].id).toString())
      }
      continue
    }

    // Sort items by priority: pinned first, published first, then earliest createdAt
    items.sort((a, b) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      if (a.published && !b.published) return -1
      if (!a.published && b.published) return 1
      return new Date(a.createdAt || 0) - new Date(b.createdAt || 0)
    })

    const canonical = items[0]
    const canonicalId = (canonical._id || canonical.id).toString()
    keptIds.push(canonicalId)

    const duplicatesInGroup = []

    for (let i = 1; i < items.length; i++) {
      const candidate = items[i]
      const candidateId = (candidate._id || candidate.id).toString()

      // Check if candidate is within time window of canonical or previous item
      const diffMs = Math.abs(new Date(candidate.createdAt || 0) - new Date(canonical.createdAt || 0))
      if (diffMs <= timeWindowMs || timeWindowMs === 0) {
        duplicatesInGroup.push(candidateId)
        duplicateIds.push(candidateId)
      } else {
        // Genuinely different posting outside the time window
        keptIds.push(candidateId)
      }
    }

    if (duplicatesInGroup.length > 0) {
      groups.push({
        bucketKey: key,
        canonicalId,
        title: canonical.title,
        duplicateIds: duplicatesInGroup,
      })
    }
  }

  return { groups, duplicateIds, keptIds }
}

/**
 * Executes safe cleanup of duplicate notices in MongoDB
 *
 * @param {object} options
 * @param {string|mongoose.Types.ObjectId} [options.collegeId] - Optional college scope
 * @param {boolean} [options.dryRun=false] - If true, only reports duplicates without deleting
 * @param {number} [options.timeWindowMs=300000] - Rapid duplicate window in ms
 * @returns {Promise<{ totalScanned: number, duplicateGroups: number, duplicatesFound: number, duplicatesRemoved: number, removedIds: Array }>}
 */
export async function cleanupDuplicateNotices({ collegeId, dryRun = false, timeWindowMs = 5 * 60 * 1000 } = {}) {
  const filter = {}
  if (collegeId) {
    filter.collegeId = collegeId
  }

  const notices = await Notice.find(filter).sort({ createdAt: 1 }).lean()
  const { groups, duplicateIds } = identifyDuplicateNotices(notices, timeWindowMs)

  let duplicatesRemoved = 0
  if (!dryRun && duplicateIds.length > 0) {
    const result = await Notice.deleteMany({ _id: { $in: duplicateIds } })
    duplicatesRemoved = result.deletedCount || duplicateIds.length
  }

  return {
    totalScanned: notices.length,
    duplicateGroups: groups.length,
    duplicatesFound: duplicateIds.length,
    duplicatesRemoved,
    removedIds: duplicateIds,
    dryRun,
  }
}
