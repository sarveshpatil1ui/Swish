// backend/src/scripts/cleanup_duplicate_notices.js
// ─────────────────────────────────────────────────────────────────────────────
// Standalone migration script to safely scan and remove duplicate notices
// Usage:
//   node backend/src/scripts/cleanup_duplicate_notices.js [--dry-run] [--college=<id>]
// ─────────────────────────────────────────────────────────────────────────────
import 'dotenv/config'
import { connectDB } from '../config/db.js'
import { cleanupDuplicateNotices } from '../services/notice-cleanup.service.js'

async function run() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const collegeArg = args.find(a => a.startsWith('--college='))
  const collegeId = collegeArg ? collegeArg.split('=')[1] : null

  console.log('────────────────────────────────────────────────────────────────')
  console.log('SWISH — Safe Duplicate Notice Cleanup Tool')
  console.log(`Mode: ${dryRun ? 'DRY RUN (no deletions)' : 'LIVE EXECUTION'}`)
  if (collegeId) console.log(`Scoped College: ${collegeId}`)
  console.log('────────────────────────────────────────────────────────────────')

  try {
    await connectDB()
    const summary = await cleanupDuplicateNotices({ collegeId, dryRun })

    console.log(`Total notices scanned:    ${summary.totalScanned}`)
    console.log(`Duplicate groups found:   ${summary.duplicateGroups}`)
    console.log(`Duplicate records found:  ${summary.duplicatesFound}`)
    console.log(`Duplicate records deleted: ${summary.duplicatesRemoved}`)
    if (summary.removedIds.length > 0) {
      console.log('Cleaned Notice IDs:', summary.removedIds)
    }
    console.log('────────────────────────────────────────────────────────────────')
    console.log('✅ Cleanup complete.')
    process.exit(0)
  } catch (err) {
    console.error('❌ Cleanup failed:', err)
    process.exit(1)
  }
}

run()
