// backend/src/scripts/backfill_college_isolation.js
// ─────────────────────────────────────────────────────────────────────────────
// Phase 2 — Database Schema & Data Isolation Architecture
// Idempotent Migration & Dry-Run Audit Script
//
// Usage:
//   node --env-file=backend/.env backend/src/scripts/backfill_college_isolation.js --dry-run
//   node --env-file=backend/.env backend/src/scripts/backfill_college_isolation.js --execute (LOCKED)
// ─────────────────────────────────────────────────────────────────────────────
import 'dotenv/config'
import mongoose from 'mongoose'
import { connectDB } from '../config/db.js'
import User from '../models/User.js'
import College from '../models/College.js'
import Post from '../models/Post.js'
import Comment from '../models/Comment.js'
import Story from '../models/Story.js'
import Follow from '../models/Follow.js'
import FollowRequest from '../models/FollowRequest.js'
import { Conversation } from '../models/Conversation.js'
import Notification from '../models/Notification.js'

// ── Pure Classification Functions (Exported for Unit Tests) ───────────────────

/**
 * Classifies a follow relationship based on trusted user college membership.
 */
export function classifyFollow(f, userMap) {
  const followerId = f.follower ? f.follower.toString() : null
  const followingId = f.following ? f.following.toString() : null
  const follower = followerId ? userMap.get(followerId) : null
  const following = followingId ? userMap.get(followingId) : null

  if (!follower || !following) {
    return { type: 'missing_user_reference', follower, following }
  }

  if (!follower.collegeId || !following.collegeId) {
    const isSuperAdminFollow = Boolean(
      follower.role === 'main_admin' ||
      following.role === 'main_admin' ||
      follower.email === 'admin@swish.com' ||
      following.email === 'admin@swish.com' ||
      following.username === 'swish.admin' ||
      follower.username === 'swish.admin'
    )
    return {
      type: 'missing_college_id',
      subType: isSuperAdminFollow ? 'platform_admin_follow' : 'unaffiliated_user_follow',
      isSuperAdminFollow,
      follower,
      following,
    }
  }

  if (follower.collegeId === following.collegeId) {
    return { type: 'same_college', follower, following, collegeId: follower.collegeId }
  }

  return { type: 'cross_college', follower, following }
}

/**
 * Classifies a follow request based on requester and recipient college membership.
 */
export function classifyFollowRequest(fr, userMap) {
  const requesterId = fr.requester ? fr.requester.toString() : null
  const recipientId = fr.recipient ? fr.recipient.toString() : null
  const requester = requesterId ? userMap.get(requesterId) : null
  const recipient = recipientId ? userMap.get(recipientId) : null

  if (!requester || !recipient) {
    return { type: 'missing_user_reference', requester, recipient }
  }

  if (!requester.collegeId || !recipient.collegeId) {
    return { type: 'missing_college_id', requester, recipient }
  }

  if (requester.collegeId === recipient.collegeId) {
    return { type: 'same_college', requester, recipient, collegeId: requester.collegeId }
  }

  return { type: 'cross_college', requester, recipient }
}

/**
 * Classifies a conversation's participants as same-college, cross-college, or ambiguous.
 */
export function classifyConversation(conv, userMap) {
  const pIds = (conv.participants || []).map(p => p.toString())
  if (pIds.length !== 2) {
    return { type: 'invalid_participants', participants: pIds }
  }

  const p1 = userMap.get(pIds[0])
  const p2 = userMap.get(pIds[1])

  if (!p1 || !p2) {
    return { type: 'invalid_participants', participants: pIds }
  }

  if (!p1.collegeId || !p2.collegeId) {
    return { type: 'missing_college_membership', p1, p2 }
  }

  if (p1.collegeId === p2.collegeId) {
    return { type: 'same_college', p1, p2, collegeId: p1.collegeId }
  }

  return { type: 'cross_college', p1, p2 }
}

/**
 * Classifies a post's college ownership compared to its author's collegeId.
 */
export function classifyPost(p, userMap) {
  const pId = p._id ? p._id.toString() : p.id
  const authorId = p.user ? p.user.toString() : null
  const postCId = p.collegeId ? p.collegeId.toString() : null
  const author = authorId ? userMap.get(authorId) : null

  if (!author) {
    return { type: 'ambiguous', id: pId, reason: 'Author not found in database' }
  }

  if (!author.collegeId) {
    return { type: 'ambiguous', id: pId, reason: `Author (${author.email}) has no collegeId` }
  }

  if (!postCId) {
    return { type: 'safely_resolvable', id: pId, resolvedCollegeId: author.collegeId }
  }

  if (postCId === author.collegeId) {
    return { type: 'already_correct', id: pId, collegeId: postCId }
  }

  return {
    type: 'conflicting',
    id: pId,
    existingCollegeId: postCId,
    authorCollegeId: author.collegeId,
    reason: 'Post collegeId differs from author user collegeId',
  }
}

/**
 * Classifies a story's college ownership compared to its owner's collegeId.
 */
export function classifyStory(s, userMap) {
  const sId = s._id ? s._id.toString() : s.id
  const ownerId = s.user ? s.user.toString() : null
  const storyCId = s.collegeId ? s.collegeId.toString() : null
  const owner = ownerId ? userMap.get(ownerId) : null

  if (!owner) {
    return { type: 'ambiguous', id: sId, reason: 'Owner not found in database' }
  }

  if (!owner.collegeId) {
    return { type: 'ambiguous', id: sId, reason: `Owner (${owner.email}) has no collegeId` }
  }

  if (!storyCId) {
    return { type: 'safely_resolvable', id: sId, resolvedCollegeId: owner.collegeId }
  }

  if (storyCId === owner.collegeId) {
    return { type: 'already_correct', id: sId, collegeId: storyCId }
  }

  return {
    type: 'conflicting',
    id: sId,
    existingCollegeId: storyCId,
    ownerCollegeId: owner.collegeId,
    reason: 'Story collegeId differs from owner user collegeId',
  }
}

/**
 * Classifies a comment's college ownership derived from its parent Post.
 */
export function classifyComment(comm, postMap) {
  const cId = comm._id ? comm._id.toString() : comm.id
  const parentPostId = comm.post ? comm.post.toString() : null
  const existingCommCId = comm.collegeId ? comm.collegeId.toString() : null
  const parentPost = parentPostId ? postMap.get(parentPostId) : null

  if (!parentPost) {
    return { type: 'ambiguous', id: cId, reason: `Parent post ${parentPostId} not found` }
  }

  const trustedCollegeId = parentPost.collegeId || parentPost.resolvedCollegeId
  if (!trustedCollegeId) {
    return { type: 'ambiguous', id: cId, reason: `Parent post ${parentPostId} has no resolvable collegeId` }
  }

  if (!existingCommCId) {
    return { type: 'safely_resolvable', id: cId, resolvedCollegeId: trustedCollegeId }
  }

  if (existingCommCId === trustedCollegeId) {
    return { type: 'already_correct', id: cId, collegeId: existingCommCId }
  }

  return {
    type: 'conflicting',
    id: cId,
    existingCollegeId: existingCommCId,
    postCollegeId: trustedCollegeId,
    reason: 'Comment collegeId differs from parent post collegeId',
  }
}

// ── Main Audit Function ──────────────────────────────────────────────────────

export async function runIsolationMigrationAudit() {
  const args = process.argv.slice(2)
  const isExecuteRequested = args.includes('--execute')
  const isDryRun = args.includes('--dry-run') || !isExecuteRequested

  console.log('\n══════════════════════════════════════════════════════════════════')
  console.log('  SWISH COMPLETE COLLEGE ISOLATION (OPTION A) — DATABASE AUDIT    ')
  console.log(`  Execution Mode: ${isDryRun ? '🔍 DRY-RUN (STRICTLY READ-ONLY)' : '⚠️ LIVE EXECUTION'}`)
  console.log('══════════════════════════════════════════════════════════════════\n')

  try {
    await connectDB()
    console.log('✔ Connected to MongoDB successfully.\n')

    // ── 1. Load Colleges & Users Cache ─────────────────────────────────────────
    const [colleges, users] = await Promise.all([
      College.find({}).lean(),
      User.find({}).select('_id name email username role college collegeId').lean(),
    ])

    const collegeMap = new Map()
    for (const c of colleges) {
      collegeMap.set(c._id.toString(), c)
    }

    const userMap = new Map()
    const usersMissingCollege = []
    for (const u of users) {
      const uId = u._id.toString()
      const cIdStr = u.collegeId ? u.collegeId.toString() : null
      userMap.set(uId, {
        id: uId,
        name: u.name,
        email: u.email,
        username: u.username,
        role: u.role,
        college: u.college,
        collegeId: cIdStr,
      })

      if (!cIdStr && u.role !== 'admin' && u.role !== 'main_admin') {
        usersMissingCollege.push({
          id: uId,
          name: u.name,
          email: u.email,
          role: u.role,
        })
      }
    }

    console.log(`📊 Master Entities Loaded:`)
    console.log(`   • Colleges: ${colleges.length}`)
    console.log(`   • Total Users: ${users.length}`)
    console.log(`   • Users Missing collegeId (excluding super admins): ${usersMissingCollege.length}\n`)

    // ── 2. Post Backfill Audit ─────────────────────────────────────────────────
    const posts = await Post.find({}).select('_id user collegeId isDeleted hidden createdAt').lean()
    const postStats = {
      total: posts.length,
      alreadyCorrect: 0,
      missingCollegeId: 0,
      safelyResolvable: 0,
      conflicting: 0,
      ambiguous: 0,
      details: [],
    }

    const postMap = new Map()
    for (const p of posts) {
      const pId = p._id.toString()
      const classification = classifyPost(p, userMap)

      postMap.set(pId, {
        id: pId,
        collegeId: p.collegeId ? p.collegeId.toString() : null,
        authorId: p.user ? p.user.toString() : null,
        resolvedCollegeId: classification.resolvedCollegeId || null,
      })

      if (classification.type === 'already_correct') {
        postStats.alreadyCorrect++
      } else if (classification.type === 'safely_resolvable') {
        postStats.missingCollegeId++
        postStats.safelyResolvable++
      } else if (classification.type === 'conflicting') {
        postStats.conflicting++
        postStats.details.push(classification)
      } else {
        postStats.ambiguous++
        postStats.details.push(classification)
      }
    }

    // ── 3. Story Backfill Audit ────────────────────────────────────────────────
    const stories = await Story.find({}).select('_id user collegeId expiresAt createdAt').lean()
    const storyStats = {
      total: stories.length,
      alreadyCorrect: 0,
      missingCollegeId: 0,
      safelyResolvable: 0,
      conflicting: 0,
      ambiguous: 0,
      details: [],
    }

    for (const s of stories) {
      const classification = classifyStory(s, userMap)
      if (classification.type === 'already_correct') {
        storyStats.alreadyCorrect++
      } else if (classification.type === 'safely_resolvable') {
        storyStats.missingCollegeId++
        storyStats.safelyResolvable++
      } else if (classification.type === 'conflicting') {
        storyStats.conflicting++
        storyStats.details.push(classification)
      } else {
        storyStats.ambiguous++
        storyStats.details.push(classification)
      }
    }

    // ── 4. Comment Backfill Audit ──────────────────────────────────────────────
    const comments = await Comment.find({}).select('_id post user collegeId createdAt').lean()
    const commentStats = {
      total: comments.length,
      alreadyCorrect: 0,
      missingCollegeId: 0,
      safelyResolvable: 0,
      conflicting: 0,
      ambiguous: 0,
      details: [],
    }

    for (const comm of comments) {
      const classification = classifyComment(comm, postMap)
      if (classification.type === 'already_correct') {
        commentStats.alreadyCorrect++
      } else if (classification.type === 'safely_resolvable') {
        commentStats.missingCollegeId++
        commentStats.safelyResolvable++
      } else if (classification.type === 'conflicting') {
        commentStats.conflicting++
        commentStats.details.push(classification)
      } else {
        commentStats.ambiguous++
        commentStats.details.push(classification)
      }
    }

    // ── 5. Follow Relationships Audit ──────────────────────────────────────────
    const follows = await Follow.find({}).select('_id follower following isActive collegeId createdAt').lean()
    const followStats = {
      total: follows.length,
      sameCollege: 0,
      crossCollege: 0,
      missingUserReferences: 0,
      usersWithMissingCollegeId: 0,
      platformAdminFollows: 0,
      crossCollegeList: [],
      platformAdminList: [],
    }

    for (const f of follows) {
      const res = classifyFollow(f, userMap)
      if (res.type === 'missing_user_reference') {
        followStats.missingUserReferences++
      } else if (res.type === 'missing_college_id') {
        followStats.usersWithMissingCollegeId++
        if (res.isSuperAdminFollow) {
          followStats.platformAdminFollows++
          followStats.platformAdminList.push({
            followId: f._id.toString(),
            follower: `${res.follower.username} (${res.follower.email}) [College: ${res.follower.college || 'None'}]`,
            following: `${res.following.username} (${res.following.email}) [College: ${res.following.college || 'None'}]`,
          })
        }
      } else if (res.type === 'same_college') {
        followStats.sameCollege++
      } else {
        followStats.crossCollege++
        followStats.crossCollegeList.push({
          followId: f._id.toString(),
          follower: `${res.follower.username} (${res.follower.email}) [College: ${res.follower.college}]`,
          following: `${res.following.username} (${res.following.email}) [College: ${res.following.college}]`,
        })
      }
    }

    // ── 6. Follow Requests Audit ───────────────────────────────────────────────
    const followRequests = await FollowRequest.find({}).select('_id requester recipient status collegeId createdAt').lean()
    const followRequestStats = {
      total: followRequests.length,
      sameCollege: 0,
      crossCollege: 0,
      missingUserReferences: 0,
      usersWithMissingCollegeId: 0,
      crossCollegeList: [],
    }

    for (const fr of followRequests) {
      const res = classifyFollowRequest(fr, userMap)
      if (res.type === 'missing_user_reference') {
        followRequestStats.missingUserReferences++
      } else if (res.type === 'missing_college_id') {
        followRequestStats.usersWithMissingCollegeId++
      } else if (res.type === 'same_college') {
        followRequestStats.sameCollege++
      } else {
        followRequestStats.crossCollege++
        followRequestStats.crossCollegeList.push({
          requestId: fr._id.toString(),
          status: fr.status,
          requester: `${res.requester.username} (${res.requester.email}) [${res.requester.college}]`,
          recipient: `${res.recipient.username} (${res.recipient.email}) [${res.recipient.college}]`,
        })
      }
    }

    // ── 7. Conversation Audit ──────────────────────────────────────────────────
    const conversations = await Conversation.find({}).select('_id participants lastMessage lastMessageAt collegeId isArchived').lean()
    const conversationStats = {
      total: conversations.length,
      sameCollege: 0,
      crossCollege: 0,
      invalidParticipants: 0,
      missingCollegeMembership: 0,
      crossCollegeList: [],
    }

    for (const conv of conversations) {
      const res = classifyConversation(conv, userMap)
      if (res.type === 'invalid_participants') {
        conversationStats.invalidParticipants++
      } else if (res.type === 'missing_college_membership') {
        conversationStats.missingCollegeMembership++
      } else if (res.type === 'same_college') {
        conversationStats.sameCollege++
      } else {
        conversationStats.crossCollege++
        conversationStats.crossCollegeList.push({
          conversationId: conv._id.toString(),
          participant1: `${res.p1.username} (${res.p1.email}) [${res.p1.college}]`,
          participant2: `${res.p2.username} (${res.p2.email}) [${res.p2.college}]`,
          lastMessage: conv.lastMessage,
        })
      }
    }

    // ── 8. Formatted ASCII Summary Table ───────────────────────────────────────
    console.log('──────────────────────────────────────────────────────────────────────────────────────────')
    console.log('                               MIGRATION DRY-RUN AUDIT SUMMARY                             ')
    console.log('──────────────────────────────────────────────────────────────────────────────────────────')
    console.log(
      '| Entity'.padEnd(14) +
      '| Total Records'.padStart(16) +
      '| Already Correct'.padStart(18) +
      '| Missing collegeId'.padStart(20) +
      '| Safely Resolvable'.padStart(20) +
      '| Conflicting'.padStart(14) +
      '| Ambiguous'.padStart(12) + ' |'
    )
    console.log('├─────────────┼───────────────┼─────────────────┼───────────────────┼───────────────────┼─────────────┼───────────┤')

    const printRow = (name, stats) => {
      console.log(
        `| ${name.padEnd(11)} | ` +
        `${stats.total.toString().padStart(13)} | ` +
        `${stats.alreadyCorrect.toString().padStart(15)} | ` +
        `${stats.missingCollegeId.toString().padStart(17)} | ` +
        `${stats.safelyResolvable.toString().padStart(17)} | ` +
        `${stats.conflicting.toString().padStart(11)} | ` +
        `${stats.ambiguous.toString().padStart(9)} |`
      )
    }

    printRow('Post', postStats)
    printRow('Story', storyStats)
    printRow('Comment', commentStats)
    console.log('──────────────────────────────────────────────────────────────────────────────────────────\n')

    console.log('──────────────────────────────────────────────────────────────────────────────────────────')
    console.log('                          RELATIONSHIP & CONVERSATION AUDIT                                ')
    console.log('──────────────────────────────────────────────────────────────────────────────────────────')
    console.log(`• Follow Records: Total = ${followStats.total}`)
    console.log(`    - Same-College Follows:         ${followStats.sameCollege}`)
    console.log(`    - Cross-College Follows:        ${followStats.crossCollege}`)
    console.log(`    - Platform Admin Follows (swish.admin): ${followStats.platformAdminFollows}`)
    console.log(`    - Missing User References:      ${followStats.missingUserReferences}`)
    console.log(`    - Other Users Missing collegeId: ${followStats.usersWithMissingCollegeId - followStats.platformAdminFollows}`)

    if (followStats.crossCollegeList.length > 0) {
      console.log(`\n    [Confirmed Cross-College Follow Relationships (${followStats.crossCollegeList.length})]`)
      followStats.crossCollegeList.forEach((item, idx) => {
        console.log(`      ${idx + 1}. [${item.followId}] ${item.follower} -> follows -> ${item.following}`)
      })
    }

    if (followStats.platformAdminList.length > 0) {
      console.log(`\n    [Platform Admin Follow Relationships (${followStats.platformAdminList.length})]`)
      followStats.platformAdminList.forEach((item, idx) => {
        console.log(`      ${idx + 1}. [${item.followId}] ${item.follower} -> follows -> ${item.following}`)
      })
    }

    console.log(`\n• Follow Requests: Total = ${followRequestStats.total}`)
    console.log(`    - Same-College Requests:        ${followRequestStats.sameCollege}`)
    console.log(`    - Cross-College Requests:       ${followRequestStats.crossCollege}`)
    console.log(`    - Missing User References:      ${followRequestStats.missingUserReferences}`)

    console.log(`\n• Conversations: Total = ${conversationStats.total}`)
    console.log(`    - Same-College Conversations:   ${conversationStats.sameCollege}`)
    console.log(`    - Cross-College Conversations:  ${conversationStats.crossCollege}`)
    console.log(`    - Invalid Participant Ref:      ${conversationStats.invalidParticipants}`)
    console.log(`    - Missing College Membership:   ${conversationStats.missingCollegeMembership}`)

    if (conversationStats.crossCollegeList.length > 0) {
      console.log(`\n    [Sample Cross-College Conversations]`)
      conversationStats.crossCollegeList.slice(0, 5).forEach((item, idx) => {
        console.log(`      ${idx + 1}. [${item.conversationId}] ${item.participant1} <-> ${item.participant2}`)
      })
    }

    if (usersMissingCollege.length > 0) {
      console.log(`\n• Users Missing College Membership: ${usersMissingCollege.length}`)
      usersMissingCollege.forEach((u, i) => {
        console.log(`    ${i + 1}. [${u.id}] ${u.name} (${u.email}) [Role: ${u.role}]`)
      })
    }
    console.log('──────────────────────────────────────────────────────────────────────────────────────────\n')

    if (isDryRun) {
      console.log('🔒 DRY-RUN COMPLETE: Zero database modifications were executed.')
      console.log('   All data above reflects the actual, current state of MongoDB.\n')
    } else {
      console.log('⚠️ Live execution mode is currently locked pending user approval.')
    }

    await mongoose.disconnect()
    console.log('✔ MongoDB connection safely closed.\n')

    return {
      postStats,
      storyStats,
      commentStats,
      followStats,
      followRequestStats,
      conversationStats,
      usersMissingCollege,
    }
  } catch (err) {
    console.error('❌ Error during audit execution:', err)
    process.exit(1)
  }
}

// ── Direct Execution Guard ────────────────────────────────────────────────────
// Only execute if invoked directly via CLI (not when imported in unit tests)
const isDirectRun = process.argv[1] && (
  process.argv[1].endsWith('backfill_college_isolation.js') ||
  process.argv[1].endsWith('backfill_college_isolation')
)

if (isDirectRun) {
  runIsolationMigrationAudit().catch(err => {
    console.error('❌ Unhandled audit error:', err)
    process.exit(1)
  })
}
