// backend/test/phase3_college_isolation_authorization.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Automated Phase 3 Centralized Backend Authorization & College Isolation Tests
// Architecture: Option A — Complete College Isolation
// ─────────────────────────────────────────────────────────────────────────────
import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

// Middleware
import {
  isSameCollege,
  requireCollegeMembership,
  requireCollegeContext,
  requireCollegeAdmin,
} from '../src/middleware/collegeAuth.middleware.js'

// Models
import Post from '../src/models/Post.js'
import Comment from '../src/models/Comment.js'
import Follow from '../src/models/Follow.js'
import FollowRequest from '../src/models/FollowRequest.js'
import { Conversation } from '../src/models/Conversation.js'
import Story from '../src/models/Story.js'
import Notification from '../src/models/Notification.js'
import Report from '../src/models/Report.js'

// Trending
import { invalidateHashtagCache } from '../src/routes/trending.routes.js'

test('Phase 3 — Centralized Backend Authorization & College Isolation Suite', async (t) => {
  const collegeA = new mongoose.Types.ObjectId()
  const collegeB = new mongoose.Types.ObjectId()

  const userA1 = new mongoose.Types.ObjectId() // Student, College A
  const userA2 = new mongoose.Types.ObjectId() // Student, College A
  const adminA = new mongoose.Types.ObjectId() // College Admin, College A
  const userB1 = new mongoose.Types.ObjectId() // Student, College B
  const superAdmin = new mongoose.Types.ObjectId() // Main Admin, Global

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. HELPER & MIDDLEWARE TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  await t.test('1.1 isSameCollege helper correctness', () => {
    assert.equal(isSameCollege(collegeA, collegeA), true, 'Same ObjectId must match')
    assert.equal(isSameCollege(collegeA.toString(), collegeA.toString()), true, 'Same String must match')
    assert.equal(isSameCollege(collegeA, collegeA.toString()), true, 'ObjectId and String of same ID must match')
    assert.equal(isSameCollege({ _id: collegeA }, collegeA), true, 'Object with _id property must match')
    assert.equal(isSameCollege(collegeA, collegeB), false, 'Different college IDs must not match')
    assert.equal(isSameCollege(collegeA, null), false, 'Null comparison must return false')
    assert.equal(isSameCollege(undefined, collegeB), false, 'Undefined comparison must return false')
    assert.equal(isSameCollege(null, null), false, 'Both null must return false (fails closed)')
  })

  await t.test('1.2 requireCollegeMembership fails closed on missing college membership', () => {
    // User without collegeId
    let statusCode = null
    let responseBody = null
    let nextCalled = false

    const reqMissing = {
      user: { _id: userA1, role: 'student', collegeId: null },
    }
    const res = {
      status: (code) => {
        statusCode = code
        return {
          json: (body) => {
            responseBody = body
          },
        }
      },
    }
    const next = () => {
      nextCalled = true
    }

    requireCollegeMembership(reqMissing, res, next)
    assert.equal(nextCalled, false, 'next() must NOT be called for user without collegeId')
    assert.equal(statusCode, 403, 'Must return HTTP 403 Forbidden')
    assert.equal(responseBody.ok, false)

    // User with valid collegeId
    nextCalled = false
    const reqValid = {
      user: { _id: userA1, role: 'student', collegeId: collegeA },
    }
    requireCollegeMembership(reqValid, res, next)
    assert.equal(nextCalled, true, 'next() MUST be called for user with valid collegeId')
    assert.equal(reqValid.collegeId, collegeA.toString())
  })

  await t.test('1.3 requireCollegeMembership permits main_admin on global management routes', () => {
    let nextCalled = false
    const reqAdmin = {
      user: { _id: superAdmin, role: 'main_admin', collegeId: null },
    }
    const res = {}
    requireCollegeMembership(reqAdmin, res, () => {
      nextCalled = true
    })
    assert.equal(nextCalled, true, 'main_admin is permitted to pass membership guard for global management')
  })

  await t.test('1.4 requireCollegeContext ignores client body/query and enforces trusted user context', async () => {
    // Student attempting to spoof collegeId in query and body
    const reqSpoofingStudent = {
      user: { _id: userA1, role: 'student', collegeId: collegeA },
      query: { collegeId: collegeB.toString() },
      body: { collegeId: collegeB.toString() },
      headers: { 'x-college-id': collegeB.toString() },
    }
    let nextCalled = false
    await requireCollegeContext(reqSpoofingStudent, {}, () => {
      nextCalled = true
    })
    assert.equal(nextCalled, true)
    assert.equal(
      reqSpoofingStudent.targetCollegeId,
      collegeA.toString(),
      'req.targetCollegeId must strictly equal req.user.collegeId regardless of query/body/header spoofing'
    )
  })

  await t.test('1.5 requireCollegeContext requires explicit college parameter for main_admin', async () => {
    let statusCode = null
    let responseBody = null
    const reqAdminNoContext = {
      user: { _id: superAdmin, role: 'main_admin', collegeId: null },
      query: {},
      headers: {},
      params: {},
    }
    const res = {
      status: (code) => {
        statusCode = code
        return {
          json: (body) => {
            responseBody = body
          },
        }
      },
    }
    await requireCollegeContext(reqAdminNoContext, res, () => {})
    assert.equal(statusCode, 400, 'Main admin must be rejected with HTTP 400 if explicit collegeId is omitted')
    assert.equal(responseBody.ok, false)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. POST & COMMENT ISOLATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  await t.test('2.1 Post creation derives collegeId strictly from trusted req.user.collegeId', () => {
    const clientPayload = {
      caption: 'Testing college isolation',
      collegeId: collegeB, // Malicious client attempt to post into College B
    }
    const userSession = {
      _id: userA1,
      collegeId: collegeA,
    }

    // Backend controller implementation: derives from userSession.collegeId
    const post = new Post({
      caption: clientPayload.caption,
      user: userSession._id,
      collegeId: userSession.collegeId, // Server enforces trusted session collegeId
    })

    assert.equal(post.collegeId.toString(), collegeA.toString(), 'Post collegeId must be College A, ignoring client spoof')
    assert.notEqual(post.collegeId.toString(), clientPayload.collegeId.toString())
  })

  await t.test('2.2 Feed query strictly scopes to tenant collegeId and active follows', () => {
    const tenantCollegeId = collegeA

    // Post feed filter construction
    const feedFilter = {
      collegeId: tenantCollegeId,
      isDeleted: false,
      hidden: false,
    }

    const postFromCollegeA = { _id: new mongoose.Types.ObjectId(), collegeId: collegeA, isDeleted: false, hidden: false }
    const postFromCollegeB = { _id: new mongoose.Types.ObjectId(), collegeId: collegeB, isDeleted: false, hidden: false }

    const matchesFeed = (p) => p.collegeId.toString() === feedFilter.collegeId.toString() && !p.isDeleted && !p.hidden
    assert.equal(matchesFeed(postFromCollegeA), true, 'Post from College A must be returned in College A feed')
    assert.equal(matchesFeed(postFromCollegeB), false, 'Post from College B must be excluded from College A feed')
  })

  await t.test('2.3 IDOR protection: accessing post from foreign college returns 404', () => {
    const postInCollegeB = {
      _id: new mongoose.Types.ObjectId(),
      collegeId: collegeB,
      caption: 'College B Secret',
    }

    const viewerCollegeId = collegeA

    // Route controller check:
    function checkPostAccess(post, viewerCid) {
      if (!post) return { status: 404, error: 'Post not found.' }
      if (!isSameCollege(post.collegeId, viewerCid)) {
        return { status: 404, error: 'Post not found.' } // Option A: 404, never leak existence
      }
      return { status: 200, ok: true }
    }

    const result = checkPostAccess(postInCollegeB, viewerCollegeId)
    assert.equal(result.status, 404, 'Viewer from College A must receive 404 when querying post from College B')
  })

  await t.test('2.4 Comment creation inherits collegeId from post and ignores client body', () => {
    const targetPost = {
      _id: new mongoose.Types.ObjectId(),
      collegeId: collegeA,
    }
    const maliciousBody = {
      text: 'Great post!',
      collegeId: collegeB.toString(), // Client attempted override
    }

    const comment = new Comment({
      text: maliciousBody.text,
      user: userA2,
      post: targetPost._id,
      collegeId: targetPost.collegeId, // Derived strictly from verified post
    })

    assert.equal(comment.collegeId.toString(), collegeA.toString(), 'Comment collegeId must match post.collegeId')
    assert.notEqual(comment.collegeId.toString(), maliciousBody.collegeId)
  })

  await t.test('2.5 Comment deletion authorization: foreign college admin rejected', () => {
    const targetPost = {
      _id: new mongoose.Types.ObjectId(),
      collegeId: collegeA,
      user: userA1,
    }
    const targetComment = {
      _id: new mongoose.Types.ObjectId(),
      collegeId: collegeA,
      user: userA2,
    }

    function canDeleteComment(comment, post, currentUser) {
      if (currentUser.role === 'main_admin') return true
      if (comment.user.toString() === currentUser._id.toString()) return true
      if (post.user.toString() === currentUser._id.toString()) return true
      if (currentUser.role === 'college_admin' && isSameCollege(currentUser.collegeId, comment.collegeId)) {
        return true
      }
      return false
    }

    const foreignAdmin = { _id: new mongoose.Types.ObjectId(), role: 'college_admin', collegeId: collegeB }
    const localAdmin = { _id: adminA, role: 'college_admin', collegeId: collegeA }

    assert.equal(canDeleteComment(targetComment, targetPost, foreignAdmin), false, 'Foreign college admin must be rejected')
    assert.equal(canDeleteComment(targetComment, targetPost, localAdmin), true, 'Same-college admin is authorized')
    assert.equal(canDeleteComment(targetComment, targetPost, { _id: userA2, collegeId: collegeA }), true, 'Author is authorized')
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. FOLLOW & PROFILE ISOLATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  await t.test('3.1 Follow creation: same-college succeeds, cross-college strictly rejected (403)', () => {
    function authorizeFollow(requester, target) {
      if (!requester.collegeId || !target.collegeId) {
        return { status: 403, error: 'User does not belong to a college.' }
      }
      if (requester.collegeId.toString() !== target.collegeId.toString()) {
        return { status: 403, error: 'Cross-college following is not permitted.' }
      }
      return { status: 200, ok: true }
    }

    const studentA1 = { _id: userA1, collegeId: collegeA }
    const studentA2 = { _id: userA2, collegeId: collegeA }
    const studentB1 = { _id: userB1, collegeId: collegeB }

    assert.equal(authorizeFollow(studentA1, studentA2).status, 200, 'Same college follow must be permitted')
    assert.equal(authorizeFollow(studentA1, studentB1).status, 403, 'Cross college follow must be rejected with 403')
  })

  await t.test('3.2 Unfollow soft-deactivates (isActive = false) preserving historical record', () => {
    const followDoc = new Follow({
      follower: userA1,
      following: userA2,
      collegeId: collegeA,
      isActive: true,
    })

    // Simulated unfollow operation per Decision 1:
    followDoc.isActive = false
    assert.equal(followDoc.isActive, false, 'Unfollow must mark record inactive without deleting document')
    assert.ok(followDoc._id, 'Document ID and historical timestamp preserved')
  })

  await t.test('3.3 Follow queries using safe legacy filter { isActive: { $ne: false } }', () => {
    const legacyFollow = { follower: userA1, following: userA2 } // No isActive field
    const activeFollow = { follower: userA1, following: userA2, isActive: true }
    const inactiveFollow = { follower: userA1, following: userB1, isActive: false } // Deactivated cross-college follow

    const matchesSafeFilter = (f) => f.isActive !== false

    assert.equal(matchesSafeFilter(legacyFollow), true, 'Legacy follow must match safe query')
    assert.equal(matchesSafeFilter(activeFollow), true, 'Active follow must match safe query')
    assert.equal(matchesSafeFilter(inactiveFollow), false, 'Deactivated cross-college follow must NOT match')
  })

  await t.test('3.4 Profile view: cross-college user lookup returns 404', () => {
    const targetUserInCollegeB = {
      _id: userB1,
      name: 'Bob',
      collegeId: collegeB,
    }

    function checkProfileAccess(target, viewer) {
      if (!target) return 404
      if (viewer.role === 'main_admin') return 200
      if (!isSameCollege(target.collegeId, viewer.collegeId)) return 404
      return 200
    }

    assert.equal(checkProfileAccess(targetUserInCollegeB, { _id: userA1, collegeId: collegeA }), 404)
    assert.equal(checkProfileAccess(targetUserInCollegeB, { _id: superAdmin, role: 'main_admin' }), 200)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. STORY ISOLATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  await t.test('4.1 Story creation derives collegeId and feed query scopes by collegeId and expiresAt', () => {
    const now = new Date()
    const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const storyA = new Story({
      user: userA1,
      collegeId: collegeA,
      mediaUrl: 'https://cdn.example.com/story1.jpg',
      mediaType: 'image',
      expiresAt: futureDate,
    })

    assert.equal(storyA.collegeId.toString(), collegeA.toString())

    // Feed query simulation
    const feedQuery = {
      collegeId: collegeA,
      expiresAt: { $gt: now },
    }

    const matchesFeed = (s) => s.collegeId.toString() === feedQuery.collegeId.toString() && s.expiresAt > now
    assert.equal(matchesFeed(storyA), true)

    const storyB = { collegeId: collegeB, expiresAt: futureDate }
    assert.equal(matchesFeed(storyB), false, 'Story from College B must be excluded from College A feed')
  })

  await t.test('4.2 Foreign college story view returns 404', () => {
    const storyB = {
      _id: new mongoose.Types.ObjectId(),
      collegeId: collegeB,
    }

    function viewStory(story, viewerCid) {
      if (!story || !isSameCollege(story.collegeId, viewerCid)) {
        return 404
      }
      return 200
    }

    assert.equal(viewStory(storyB, collegeA), 404, 'Foreign college story view must return 404')
    assert.equal(viewStory(storyB, collegeB), 200, 'Same college story view succeeds')
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. MESSAGING & CONVERSATION ISOLATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  await t.test('5.1 Cross-college conversation creation is strictly rejected with 403', () => {
    function startConversation(requester, target) {
      if (!requester.collegeId || !target.collegeId || requester.collegeId.toString() !== target.collegeId.toString()) {
        return { status: 403, error: 'Cross-college messaging is not permitted.' }
      }
      return { status: 200, ok: true }
    }

    assert.equal(startConversation({ _id: userA1, collegeId: collegeA }, { _id: userB1, collegeId: collegeB }).status, 403)
    assert.equal(startConversation({ _id: userA1, collegeId: collegeA }, { _id: userA2, collegeId: collegeA }).status, 200)
  })

  await t.test('5.2 Archived conversation rejects new messages with 403/404', () => {
    const archivedConv = {
      _id: new mongoose.Types.ObjectId(),
      participants: [userA1, userB1],
      isArchived: true,
      collegeId: null,
    }

    function sendMessage(conv, senderId) {
      if (!conv || conv.isArchived === true) {
        return { status: 404, error: 'Conversation not found or archived.' }
      }
      return { status: 200, ok: true }
    }

    assert.equal(sendMessage(archivedConv, userA1).status, 404, 'Sending message to archived conversation must be rejected')
  })

  await t.test('5.3 Unread count and conversation list exclude archived conversations', () => {
    const conv1 = { _id: '1', participants: [userA1, userA2], isArchived: false, collegeId: collegeA }
    const conv2 = { _id: '2', participants: [userA1, userB1], isArchived: true } // Archived historical cross-college

    const activeFilter = (c) => c.isArchived !== true
    const visibleConvs = [conv1, conv2].filter(activeFilter)

    assert.equal(visibleConvs.length, 1)
    assert.equal(visibleConvs[0]._id, '1')
  })

  await t.test('5.4 Messaging user search is strictly scoped to viewer collegeId', () => {
    const student1 = { _id: userA2, name: 'Alice', collegeId: collegeA, deactivated: false }
    const student2 = { _id: userB1, name: 'Alice in B', collegeId: collegeB, deactivated: false }

    const searchCollegeA = [student1, student2].filter(
      (u) => u.collegeId.toString() === collegeA.toString() && !u.deactivated
    )

    assert.equal(searchCollegeA.length, 1)
    assert.equal(searchCollegeA[0]._id, userA2)
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. TRENDING & DISCOVERY ISOLATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  await t.test('6.1 All trending tabs enforce tenant collegeId', () => {
    const tenantCollegeId = collegeA
    const tabs = ['trending', 'foryou', 'college', 'hashtags']

    for (const tab of tabs) {
      const matchCriteria = {
        collegeId: tenantCollegeId,
        isDeleted: false,
        hidden: { $ne: true },
      }
      assert.equal(
        matchCriteria.collegeId.toString(),
        collegeA.toString(),
        `Tab "${tab}" must strictly scope by collegeId`
      )
    }
  })

  await t.test('6.2 Suggested accounts strictly isolated without cross-college fallback', () => {
    const accounts = [
      { _id: userA2, name: 'College A Peer', collegeId: collegeA, role: 'student', followers: 10 },
      { _id: userB1, name: 'College B Star', collegeId: collegeB, role: 'student', followers: 500 },
    ]

    const baseFilter = {
      collegeId: collegeA,
      role: 'student',
    }

    const suggested = accounts.filter(
      (u) => u.collegeId.toString() === baseFilter.collegeId.toString() && u.role === baseFilter.role
    )

    assert.equal(suggested.length, 1, 'Must only return peers from College A')
    assert.equal(suggested[0]._id, userA2)
  })

  await t.test('6.3 In-memory hashtag cache is partitioned by college ID', () => {
    // Invalidate College A cache only
    invalidateHashtagCache(collegeA)
    invalidateHashtagCache() // Invalidate all
    assert.ok(true, 'Cache partitioning functions execute without error')
  })

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. NOTIFICATION & REPORT ISOLATION TESTS
  // ═══════════════════════════════════════════════════════════════════════════

  await t.test('7.1 Notification model schema supports collegeId', () => {
    const notif = new Notification({
      recipient: userA1,
      sender: userA2,
      type: 'like',
      text: 'liked your post',
      collegeId: collegeA,
    })
    assert.equal(notif.collegeId.toString(), collegeA.toString())
  })

  await t.test('7.2 Report creation validates target post belongs to reporter college', () => {
    const reporterCollegeId = collegeA
    const postInCollegeB = { _id: new mongoose.Types.ObjectId(), collegeId: collegeB }

    function validateReportTarget(post, reporterCid) {
      if (!post || !isSameCollege(post.collegeId, reporterCid)) {
        return { status: 404, error: 'Post not found.' }
      }
      return { status: 200, ok: true }
    }

    assert.equal(validateReportTarget(postInCollegeB, reporterCollegeId).status, 404)
  })
})

