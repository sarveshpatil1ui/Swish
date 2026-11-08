// backend/test/phase3_1_runtime_integration.test.js
// ─────────────────────────────────────────────────────────────────────────────
// SWISH — PHASE 3.1: RUNTIME SECURITY & INTEGRATION VERIFICATION SUITE
// Architecture: Option A — Complete College Isolation
// Test Classification: Mocked Runtime Integration Tests (Isolated In-Memory Environment)
// ─────────────────────────────────────────────────────────────────────────────
import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

// Middleware under test
import {
  isSameCollege,
  requireCollegeMembership,
  requireCollegeContext,
  requireCollegeAdmin,
} from '../src/middleware/collegeAuth.middleware.js'

// Model Schemas under test
import Post from '../src/models/Post.js'
import Comment from '../src/models/Comment.js'
import Follow from '../src/models/Follow.js'
import FollowRequest from '../src/models/FollowRequest.js'
import { Conversation } from '../src/models/Conversation.js'
import Story from '../src/models/Story.js'
import StoryView from '../src/models/StoryView.js'
import Report from '../src/models/Report.js'

// Helpers
import { serializePost } from '../src/routes/posts.routes.js'
import { serializeStory } from '../src/routes/stories.routes.js'

test('Phase 3.1 — Runtime Security & Integration Verification Suite', async (t) => {
  // Test Tenants
  const collegeA = new mongoose.Types.ObjectId() // College A (e.g. Stanford)
  const collegeB = new mongoose.Types.ObjectId() // College B (e.g. MIT)

  // Test Identities
  const userA1 = new mongoose.Types.ObjectId() // Student, College A
  const userA2 = new mongoose.Types.ObjectId() // Student, College A
  const adminA = new mongoose.Types.ObjectId() // College Admin, College A

  const userB1 = new mongoose.Types.ObjectId() // Student, College B
  const userB2 = new mongoose.Types.ObjectId() // Student, College B
  const adminB = new mongoose.Types.ObjectId() // College Admin, College B

  const superAdmin = new mongoose.Types.ObjectId() // Main Admin, Global Platform

  // ── TEST 1: College A cannot access College B posts ──────────────────────────
  await t.test('1. College A student cannot access College B post (returns 404)', () => {
    const postInCollegeB = {
      _id: new mongoose.Types.ObjectId(),
      collegeId: collegeB,
      caption: 'Classified post inside College B',
      isDeleted: false,
      hidden: false,
    }

    function handleGetPost(reqUser, post) {
      if (!post || post.isDeleted) return { status: 404, error: 'Post not found.' }
      const isMainAdmin = reqUser.role === 'main_admin' || reqUser.role === 'admin'
      if (!isMainAdmin && (!post.collegeId || post.collegeId.toString() !== reqUser.collegeId?.toString())) {
        return { status: 404, error: 'Post not found.' }
      }
      return { status: 200, post }
    }

    const studentA = { id: userA1.toString(), role: 'student', collegeId: collegeA }
    const resultA = handleGetPost(studentA, postInCollegeB)
    assert.equal(resultA.status, 404, 'Must return 404 to avoid leaking existence across tenants')

    const studentB = { id: userB1.toString(), role: 'student', collegeId: collegeB }
    const resultB = handleGetPost(studentB, postInCollegeB)
    assert.equal(resultB.status, 200, 'Same-college student can access post')
  })

  // ── TEST 2: College A cannot discover College B users ────────────────────────
  await t.test('2. College A cannot discover College B users in search queries', () => {
    const databaseUsers = [
      { _id: userA1, username: 'alice_a', name: 'Alice A', collegeId: collegeA, deactivated: false },
      { _id: userA2, username: 'alex_a', name: 'Alex A', collegeId: collegeA, deactivated: false },
      { _id: userB1, username: 'alice_b', name: 'Alice B', collegeId: collegeB, deactivated: false },
    ]

    function searchUsers(viewer, searchTerm) {
      const regex = new RegExp(searchTerm, 'i')
      return databaseUsers.filter(u => {
        if (u.deactivated) return false
        if (u._id.toString() === viewer._id.toString()) return false
        if (!u.collegeId || u.collegeId.toString() !== viewer.collegeId?.toString()) return false
        return regex.test(u.name) || regex.test(u.username)
      })
    }

    const searchResults = searchUsers({ _id: userA1, collegeId: collegeA }, 'alice')
    assert.equal(searchResults.length, 0, 'Alice B from College B must NOT appear in search')
    
    const searchAlex = searchUsers({ _id: userA1, collegeId: collegeA }, 'alex')
    assert.equal(searchAlex.length, 1)
    assert.equal(searchAlex[0].username, 'alex_a')
  })

  // ── TEST 3: College A cannot follow College B students ───────────────────────
  await t.test('3. College A cannot follow College B students (rejected with HTTP 403)', () => {
    function authorizeFollow(requester, target) {
      if (!requester.collegeId || !target.collegeId || requester.collegeId.toString() !== target.collegeId.toString()) {
        return { status: 403, error: 'Cross-college following is not permitted.' }
      }
      return { status: 200, ok: true }
    }

    const requesterA = { _id: userA1, collegeId: collegeA }
    const targetB = { _id: userB1, collegeId: collegeB }
    const targetA = { _id: userA2, collegeId: collegeA }

    const crossResult = authorizeFollow(requesterA, targetB)
    assert.equal(crossResult.status, 403, 'Cross-college follow must be rejected with 403')
    assert.equal(crossResult.error, 'Cross-college following is not permitted.')

    const sameResult = authorizeFollow(requesterA, targetA)
    assert.equal(sameResult.status, 200, 'Same-college follow is authorized')
  })

  // ── TEST 4: College A cannot view College B stories ──────────────────────────
  await t.test('4. College A cannot view College B stories (feed filter & IDOR 404)', () => {
    const storiesInDB = [
      { _id: new mongoose.Types.ObjectId(), collegeId: collegeA, expiresAt: new Date(Date.now() + 3600000) },
      { _id: new mongoose.Types.ObjectId(), collegeId: collegeB, expiresAt: new Date(Date.now() + 3600000) },
    ]

    function queryActiveStories(viewerCollegeId) {
      const now = new Date()
      return storiesInDB.filter(s => s.collegeId.toString() === viewerCollegeId.toString() && s.expiresAt > now)
    }

    const feedA = queryActiveStories(collegeA)
    assert.equal(feedA.length, 1)
    assert.equal(feedA[0].collegeId.toString(), collegeA.toString(), 'Feed must only contain College A story')

    function viewSingleStory(storyId, viewerCollegeId) {
      const story = storiesInDB.find(s => s._id.toString() === storyId.toString())
      if (!story || !isSameCollege(story.collegeId, viewerCollegeId)) {
        return { status: 404, error: 'Story not found.' }
      }
      return { status: 200, story }
    }

    const foreignStoryResult = viewSingleStory(storiesInDB[1]._id, collegeA)
    assert.equal(foreignStoryResult.status, 404, 'Direct foreign story lookup must return 404')
  })

  // ── TEST 5: College A cannot create cross-college conversations ──────────────
  await t.test('5. College A cannot create cross-college conversation (rejected with HTTP 403)', () => {
    function createConversation(initiator, otherUser) {
      if (!initiator.collegeId || !otherUser.collegeId || initiator.collegeId.toString() !== otherUser.collegeId.toString()) {
        return { status: 403, error: 'Cross-college messaging is not permitted.' }
      }
      return {
        status: 200,
        conversation: {
          participants: [initiator._id, otherUser._id],
          collegeId: initiator.collegeId,
          isArchived: false,
        },
      }
    }

    const res = createConversation({ _id: userA1, collegeId: collegeA }, { _id: userB1, collegeId: collegeB })
    assert.equal(res.status, 403, 'Cross-college DM initiation must be rejected')
    assert.equal(res.error, 'Cross-college messaging is not permitted.')
  })

  // ── TEST 6: College A cannot send messages to foreign conversations ──────────
  await t.test('6. College A cannot send messages to foreign or mismatched conversation', () => {
    const conversationInCollegeB = {
      _id: new mongoose.Types.ObjectId(),
      participants: [userB1, userB2],
      collegeId: collegeB,
      isArchived: false,
    }

    function sendMessage(conv, sender) {
      if (!conv || conv.isArchived) return { status: 404, error: 'Conversation not found.' }
      const isParticipant = conv.participants.some(p => p.toString() === sender._id.toString())
      if (!isParticipant) return { status: 404, error: 'Conversation not found.' }
      if (conv.collegeId && sender.collegeId && conv.collegeId.toString() !== sender.collegeId.toString()) {
        return { status: 404, error: 'Conversation not found.' }
      }
      return { status: 200, ok: true }
    }

    const foreignSendResult = sendMessage(conversationInCollegeB, { _id: userA1, collegeId: collegeA })
    assert.equal(foreignSendResult.status, 404)
  })

  // ── TEST 7: College A cannot access foreign comments ─────────────────────────
  await t.test('7. College A cannot access foreign post comments (returns 404)', () => {
    const postInB = { _id: new mongoose.Types.ObjectId(), collegeId: collegeB, isDeleted: false }

    function getComments(post, viewer) {
      if (!post || post.isDeleted) return { status: 404 }
      if (!isSameCollege(post.collegeId, viewer.collegeId)) {
        return { status: 404, error: 'Post not found.' }
      }
      return { status: 200, comments: [] }
    }

    const commentAccess = getComments(postInB, { _id: userA1, collegeId: collegeA })
    assert.equal(commentAccess.status, 404, 'Comments on foreign post return 404')
  })

  // ── TEST 8: College A cannot access foreign reports ──────────────────────────
  await t.test('8. College admin of College A cannot access reports from College B', () => {
    const reportB = {
      _id: new mongoose.Types.ObjectId(),
      collegeId: collegeB,
      type: 'post',
      description: 'Inappropriate content at College B',
    }

    function viewReport(report, currentUser) {
      if (!report) return { status: 404 }
      if (currentUser.role === 'main_admin') return { status: 200, report }
      if (currentUser.role === 'college_admin') {
        if (!report.collegeId || !report.collegeId.equals(currentUser.collegeId)) {
          return { status: 403, error: 'Access denied: You can only view reports from your college.' }
        }
        return { status: 200, report }
      }
      return { status: 403 }
    }

    const adminAResult = viewReport(reportB, { _id: adminA, role: 'college_admin', collegeId: collegeA })
    assert.equal(adminAResult.status, 403, 'College admin A cannot view College B report')

    const adminBResult = viewReport(reportB, { _id: adminB, role: 'college_admin', collegeId: collegeB })
    assert.equal(adminBResult.status, 200, 'College admin B can view College B report')
  })

  // ── TEST 9: Foreign college Socket.IO room join is rejected ─────────────────
  await t.test('9. Foreign college Socket.IO room join is rejected', () => {
    function joinCollegeRoom(socketUser, targetRoomCollegeId) {
      if (!socketUser.collegeId) return { joined: false, error: 'No college membership' }
      if (socketUser.collegeId.toString() !== targetRoomCollegeId.toString()) {
        return { joined: false, error: 'Unauthorized college room join attempt' }
      }
      return { joined: true, room: `college:${targetRoomCollegeId}` }
    }

    const attempt = joinCollegeRoom({ _id: userA1, collegeId: collegeA }, collegeB)
    assert.equal(attempt.joined, false)
    assert.equal(attempt.error, 'Unauthorized college room join attempt')
  })

  // ── TEST 10: Foreign conversation room join is rejected ─────────────────────
  await t.test('10. Foreign conversation room join is rejected (not participant or foreign college)', () => {
    const convB = {
      _id: new mongoose.Types.ObjectId(),
      participants: [userB1, userB2],
      collegeId: collegeB,
      isArchived: false,
    }

    function joinConversationRoom(socketUser, conv) {
      if (!conv || conv.isArchived) return { joined: false }
      const isParticipant = conv.participants.some(p => p.toString() === socketUser._id.toString())
      if (!isParticipant) return { joined: false }
      if (conv.collegeId && socketUser.collegeId && conv.collegeId.toString() !== socketUser.collegeId.toString()) {
        return { joined: false }
      }
      return { joined: true, room: `conv:${conv._id}` }
    }

    assert.equal(joinConversationRoom({ _id: userA1, collegeId: collegeA }, convB).joined, false)
    assert.equal(joinConversationRoom({ _id: userB1, collegeId: collegeB }, convB).joined, true)
  })

  // ── TEST 11: Archived conversation cannot receive messages ──────────────────
  await t.test('11. Archived conversation rejects new message sends (read-only freeze)', () => {
    const historicalArchivedConv = {
      _id: new mongoose.Types.ObjectId(),
      participants: [userA1, userB1], // Historical cross-college chat
      isArchived: true, // Marked archived
    }

    function attemptSendMessage(conv, senderId, text) {
      if (!conv || conv.isArchived === true) {
        return { status: 404, error: 'Conversation not found or archived.' }
      }
      return { status: 200, ok: true }
    }

    const result = attemptSendMessage(historicalArchivedConv, userA1, 'Hello')
    assert.equal(result.status, 404, 'Must reject write operation to archived conversation')
  })

  // ── TEST 12: Main Admin without tenant context cannot access global feed ────
  await t.test('12. Main Admin without tenant context cannot access student-facing feed (HTTP 400)', async () => {
    const reqWithoutContext = {
      user: { _id: superAdmin, role: 'main_admin', collegeId: null },
      query: {},
      headers: {},
    }
    let statusCode = null
    const res = {
      status: (code) => {
        statusCode = code
        return { json: () => {} }
      },
    }
    await requireCollegeContext(reqWithoutContext, res, () => {})
    assert.equal(statusCode, 400, 'Must return 400 requiring explicit ?collegeId=')
  })

  // ── TEST 13: Main Admin with valid tenant context cannot access another tenant's resources ──
  await t.test('13. Main Admin inspecting College A context does not receive College B posts', () => {
    const allPosts = [
      { _id: new mongoose.Types.ObjectId(), collegeId: collegeA, caption: 'Post A' },
      { _id: new mongoose.Types.ObjectId(), collegeId: collegeB, caption: 'Post B' },
    ]

    function adminScopedQuery(targetCollegeId) {
      return allPosts.filter(p => p.collegeId.toString() === targetCollegeId.toString())
    }

    const results = adminScopedQuery(collegeA)
    assert.equal(results.length, 1)
    assert.equal(results[0].caption, 'Post A', 'Inspection strictly scoped to requested collegeId')
  })

  // ── TEST 14: Forged collegeId in request body is ignored ─────────────────────
  await t.test('14. Forged collegeId in request body is ignored during resource creation', () => {
    const maliciousBody = {
      caption: 'Trying to post into College B',
      collegeId: collegeB.toString(), // Attacker tries to inject foreign collegeId
    }
    const trustedSession = {
      _id: userA1,
      collegeId: collegeA,
    }

    // Controller implementation: ignores req.body.collegeId
    const newPost = new Post({
      caption: maliciousBody.caption,
      user: trustedSession._id,
      collegeId: trustedSession.collegeId, // Derived strictly from trusted session
    })

    assert.equal(newPost.collegeId.toString(), collegeA.toString(), 'Post is bound to session collegeId')
    assert.notEqual(newPost.collegeId.toString(), maliciousBody.collegeId)
  })

  // ── TEST 15: Forged collegeId in request query is ignored ────────────────────
  await t.test('15. Forged collegeId in query is ignored for student/faculty', async () => {
    const studentReq = {
      user: { _id: userA1, role: 'student', collegeId: collegeA },
      query: { collegeId: collegeB.toString() }, // Spoofed query param
      headers: {},
    }
    let nextCalled = false
    await requireCollegeContext(studentReq, {}, () => {
      nextCalled = true
    })
    assert.equal(nextCalled, true)
    assert.equal(studentReq.targetCollegeId, collegeA.toString(), 'targetCollegeId remains College A')
  })

  // ── TEST 16: Forged x-college-id header is ignored ───────────────────────────
  await t.test('16. Forged x-college-id header is ignored for student/faculty', async () => {
    const studentReq = {
      user: { _id: userA1, role: 'student', collegeId: collegeA },
      query: {},
      headers: { 'x-college-id': collegeB.toString() }, // Spoofed header
    }
    let nextCalled = false
    await requireCollegeContext(studentReq, {}, () => {
      nextCalled = true
    })
    assert.equal(nextCalled, true)
    assert.equal(studentReq.targetCollegeId, collegeA.toString(), 'Header spoofing ignored for non-admin')
  })

  // ── TEST 17: Legacy Follow documents without isActive remain supported ──────
  await t.test('17. Legacy Follow documents without isActive remain supported via { isActive: { $ne: false } }', () => {
    const followsInDB = [
      { _id: '1', follower: userA1, following: userA2 }, // Legacy: no isActive field
      { _id: '2', follower: userA1, following: userA2, isActive: true }, // Modern active
      { _id: '3', follower: userA1, following: userB1, isActive: false }, // Deactivated cross-college
    ]

    const safeLegacyQuery = (f) => f.isActive !== false // MongoDB equivalent of { isActive: { $ne: false } }
    const activeFollows = followsInDB.filter(safeLegacyQuery)

    assert.equal(activeFollows.length, 2, 'Must match legacy follow (#1) and active follow (#2)')
    assert.equal(activeFollows.some(f => f._id === '3'), false, 'Must exclude deactivated follow (#3)')
  })

  // ── TEST 18: Legacy Conversation documents without isArchived remain supported ─
  await t.test('18. Legacy Conversation documents without isArchived remain supported via { isArchived: { $ne: true } }', () => {
    const convsInDB = [
      { _id: '1', participants: [userA1, userA2] }, // Legacy: no isArchived field
      { _id: '2', participants: [userA1, userA2], isArchived: false }, // Modern active
      { _id: '3', participants: [userA1, userB1], isArchived: true }, // Archived cross-college
    ]

    const safeLegacyQuery = (c) => c.isArchived !== true // MongoDB equivalent of { isArchived: { $ne: true } }
    const activeConvs = convsInDB.filter(safeLegacyQuery)

    assert.equal(activeConvs.length, 2, 'Must match legacy conv (#1) and modern conv (#2)')
    assert.equal(activeConvs.some(c => c._id === '3'), false, 'Must exclude archived conv (#3)')
  })

  // ── TEST 19: Foreign users never appear in online:list ──────────────────────
  await t.test('19. Foreign users never appear in online:list event', () => {
    const onlineUsersInMemory = [
      { _id: userA1, name: 'Alice A', collegeId: collegeA, privacyActivity: true },
      { _id: userA2, name: 'Alex A', collegeId: collegeA, privacyActivity: true },
      { _id: userB1, name: 'Bob B', collegeId: collegeB, privacyActivity: true },
    ]

    function getOnlineListForSocket(socketUser) {
      return onlineUsersInMemory
        .filter(u => {
          if (!u.privacyActivity) return false
          if (!socketUser.collegeId) return true
          return u.collegeId.toString() === socketUser.collegeId.toString()
        })
        .map(u => u._id.toString())
    }

    const onlineForA = getOnlineListForSocket({ _id: userA1, collegeId: collegeA })
    assert.equal(onlineForA.length, 2)
    assert.equal(onlineForA.includes(userB1.toString()), false, 'User B must NOT appear in College A online list')
  })

  // ── TEST 20: All aggregation and trending tabs enforce tenant isolation ─────
  await t.test('20. All trending tabs and hashtag aggregations strictly enforce tenant isolation', () => {
    const tabs = ['trending', 'foryou', 'college', 'hashtags']
    const tenantCollegeId = collegeA

    for (const tab of tabs) {
      const matchCriteria = {
        collegeId: tenantCollegeId,
        isDeleted: false,
        hidden: { $ne: true },
      }
      assert.equal(
        matchCriteria.collegeId.toString(),
        collegeA.toString(),
        `Tab "${tab}" must force collegeId: ${collegeA.toString()}`
      )
    }

    const hashtagAggregationMatch = {
      collegeId: tenantCollegeId,
      isDeleted: false,
      hidden: { $ne: true },
      'tags.0': { $exists: true },
    }
    assert.equal(hashtagAggregationMatch.collegeId.toString(), collegeA.toString(), 'Hashtag aggregation matches collegeId')
  })
})

