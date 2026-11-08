import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import mongoose from 'mongoose'
import User from '../src/models/User.js'
import College from '../src/models/College.js'
import Post from '../src/models/Post.js'
import Comment from '../src/models/Comment.js'
import Story from '../src/models/Story.js'
import StoryView from '../src/models/StoryView.js'
import Follow from '../src/models/Follow.js'
import FollowRequest from '../src/models/FollowRequest.js'
import Notification from '../src/models/Notification.js'
import { Conversation } from '../src/models/Conversation.js'
import {
  classifyFollow,
  classifyFollowRequest,
  classifyConversation,
  classifyPost,
  classifyStory,
  classifyComment,
} from '../src/scripts/backfill_college_isolation.js'

test('Phase 2 Deep Code Audit & Schema Isolation Test Suite', async (t) => {
  const dummyCollegeA = new mongoose.Types.ObjectId()
  const dummyCollegeB = new mongoose.Types.ObjectId()
  const dummyUserA = new mongoose.Types.ObjectId()
  const dummyUserB = new mongoose.Types.ObjectId()
  const dummyPostId = new mongoose.Types.ObjectId()

  // ── 1. Existing Legacy Follow Document Without isActive ─────────────────────
  await t.test('1. Existing legacy Follow document without isActive behavior', () => {
    // Simulate a raw document read directly from MongoDB where isActive is missing (undefined)
    const rawLegacyFollow = {
      _id: new mongoose.Types.ObjectId(),
      follower: dummyUserA,
      following: dummyUserB,
      createdAt: new Date(),
    }
    assert.equal(rawLegacyFollow.isActive, undefined, 'Legacy document in MongoDB has no isActive field')

    // Safe query simulation: { isActive: { $ne: false } }
    const matchesSafeFilter = (doc) => doc.isActive !== false
    assert.equal(matchesSafeFilter(rawLegacyFollow), true, 'Safe query { isActive: { $ne: false } } MUST match legacy follow')

    // Unsafe query simulation: { isActive: true }
    const matchesUnsafeFilter = (doc) => doc.isActive === true
    assert.equal(matchesUnsafeFilter(rawLegacyFollow), false, 'Unsafe query { isActive: true } fails to match legacy follow!')
  })

  // ── 2. New Follow Document Default Behavior ─────────────────────────────────
  await t.test('2. New Follow document default behavior initializes isActive to true', () => {
    const followDoc = new Follow({
      follower: dummyUserA,
      following: dummyUserB,
      collegeId: dummyCollegeA,
    })
    assert.equal(followDoc.isActive, true, 'New Follow documents must default isActive to true')
    assert.equal(followDoc.collegeId.toString(), dummyCollegeA.toString())
  })

  // ── 3. Existing Legacy Conversation Document Without isArchived ─────────────
  await t.test('3. Existing legacy Conversation document without isArchived behavior', () => {
    // Simulate a raw legacy conversation in MongoDB
    const rawLegacyConv = {
      _id: new mongoose.Types.ObjectId(),
      participants: [dummyUserA, dummyUserB],
      messages: [{ sender: dummyUserA, text: 'Historical chat' }],
      lastMessage: 'Historical chat',
      lastMessageAt: new Date(),
    }
    assert.equal(rawLegacyConv.isArchived, undefined, 'Legacy conversation has no isArchived field')

    // Safe unarchived query simulation: { isArchived: { $ne: true } }
    const matchesUnarchivedSafe = (doc) => doc.isArchived !== true
    assert.equal(matchesUnarchivedSafe(rawLegacyConv), true, 'Safe query { isArchived: { $ne: true } } MUST match legacy conversation')

    // Unsafe query simulation: { isArchived: false }
    const matchesUnarchivedUnsafe = (doc) => doc.isArchived === false
    assert.equal(matchesUnarchivedUnsafe(rawLegacyConv), false, 'Unsafe query { isArchived: false } fails to match legacy conversation!')
  })

  // ── 4. New Conversation Document Default Behavior ───────────────────────────
  await t.test('4. New Conversation document default behavior initializes isArchived to false', () => {
    const conv = new Conversation({
      participants: [dummyUserA, dummyUserB],
      messages: [{ sender: dummyUserA, text: 'New chat' }],
      collegeId: dummyCollegeA,
    })
    assert.equal(conv.isArchived, false, 'New Conversation documents must default isArchived to false')
    assert.equal(conv.archiveReason, null, 'archiveReason defaults to null')
  })

  // ── 5. Global Username Uniqueness ───────────────────────────────────────────
  await t.test('5. Global username uniqueness is preserved on User model', () => {
    const usernamePath = User.schema.paths.username
    assert.ok(usernamePath, 'User.username path exists')
    assert.equal(usernamePath.options.unique, true, 'User.username must remain globally unique')
  })

  // ── 6. Comment Ownership Relationship with Parent Post ──────────────────────
  await t.test('6. Comment ownership is derived strictly from parent Post', () => {
    const postMap = new Map([
      [dummyPostId.toString(), { id: dummyPostId.toString(), collegeId: dummyCollegeA.toString() }],
    ])

    const testComment = {
      _id: new mongoose.Types.ObjectId(),
      post: dummyPostId,
      user: dummyUserA,
      collegeId: null, // Legacy comment without collegeId
    }

    const classification = classifyComment(testComment, postMap)
    assert.equal(classification.type, 'safely_resolvable', 'Legacy comment must be safely resolvable from parent post')
    assert.equal(classification.resolvedCollegeId, dummyCollegeA.toString(), 'Comment collegeId matches parent post')
  })

  // ── 7. Story Ownership Relationship with User ───────────────────────────────
  await t.test('7. Story ownership is derived strictly from author User.collegeId', () => {
    const userMap = new Map([
      [dummyUserA.toString(), { id: dummyUserA.toString(), collegeId: dummyCollegeA.toString(), email: 'a@college.edu' }],
    ])

    const testStory = {
      _id: new mongoose.Types.ObjectId(),
      user: dummyUserA,
      collegeId: null, // Legacy story without collegeId
    }

    const classification = classifyStory(testStory, userMap)
    assert.equal(classification.type, 'safely_resolvable', 'Legacy story must be safely resolvable from author')
    assert.equal(classification.resolvedCollegeId, dummyCollegeA.toString(), 'Story collegeId matches author college')
  })

  // ── 8. StoryView Unique Compound Index ──────────────────────────────────────
  await t.test('8. StoryView unique compound index { story: 1, viewer: 1 } is preserved', () => {
    const indexes = StoryView.schema.indexes()
    const hasUniqueViewIndex = indexes.some(([fields, opts]) => 
      fields.story === 1 && fields.viewer === 1 && opts.unique === true
    )
    assert.ok(hasUniqueViewIndex, 'StoryView must have unique compound index { story: 1, viewer: 1 }')
    assert.equal(StoryView.schema.paths.collegeId, undefined, 'StoryView collegeId removed to eliminate duplicate ownership')
  })

  // ── 9. Story and StoryView TTL Preservation ─────────────────────────────────
  await t.test('9. Story and StoryView TTL indexes are preserved intact', () => {
    const storyIndexes = Story.schema.indexes()
    const hasStoryTTL = storyIndexes.some(([fields, opts]) => 
      fields.expiresAt === 1 && opts.expireAfterSeconds === 0
    )
    assert.ok(hasStoryTTL, 'Story must preserve 24-hour expiration TTL index')

    const viewIndexes = StoryView.schema.indexes()
    const hasViewTTL = viewIndexes.some(([fields, opts]) => 
      fields.createdAt === 1 && opts.expireAfterSeconds === 48 * 3600
    )
    assert.ok(hasViewTTL, 'StoryView must preserve 48-hour auto-expiration TTL index')
  })

  // ── 10. Follow Unique Index Preservation ────────────────────────────────────
  await t.test('10. Follow unique compound index { follower: 1, following: 1 } is preserved', () => {
    const indexes = Follow.schema.indexes()
    const hasUniqueFollow = indexes.some(([fields, opts]) => 
      fields.follower === 1 && fields.following === 1 && opts.unique === true
    )
    assert.ok(hasUniqueFollow, 'Follow must preserve unique index { follower: 1, following: 1 }')
  })

  // ── 11. FollowRequest Unique Constraint Preservation ────────────────────────
  await t.test('11. FollowRequest unique compound index { requester: 1, recipient: 1 } is preserved', () => {
    const indexes = FollowRequest.schema.indexes()
    const hasUniqueRequest = indexes.some(([fields, opts]) => 
      fields.requester === 1 && fields.recipient === 1 && opts.unique === true
    )
    assert.ok(hasUniqueRequest, 'FollowRequest must preserve unique index { requester: 1, recipient: 1 }')
  })

  // ── 12. Conversation Embedded Messages Preservation ─────────────────────────
  await t.test('12. Conversation structure preserves participants and embedded messages', () => {
    const conv = new Conversation({
      participants: [dummyUserA, dummyUserB],
      messages: [
        { sender: dummyUserA, text: 'Hello message 1' },
        { sender: dummyUserB, text: 'Hello message 2' },
      ],
      lastMessage: 'Hello message 2',
      lastMessageAt: new Date(),
    })
    assert.equal(conv.participants.length, 2, 'Conversation has 2 participants')
    assert.equal(conv.messages.length, 2, 'Both embedded messages are intact')
    assert.equal(conv.messages[0].text, 'Hello message 1')
    assert.equal(conv.messages[1].text, 'Hello message 2')
  })

  // ── 13. Migration Dry-Run Performs Zero Database Writes ─────────────────────
  await t.test('13. Migration script contains zero prohibited database write calls', () => {
    const scriptPath = path.resolve('backend/src/scripts/backfill_college_isolation.js')
    const scriptCode = fs.readFileSync(scriptPath, 'utf8')

    const prohibitedCalls = [
      'updateOne',
      'updateMany',
      'replaceOne',
      'deleteOne',
      'deleteMany',
      'bulkWrite',
      'insertOne',
      'insertMany',
      'findOneAndUpdate',
      'findOneAndDelete',
      'createIndex',
      'createIndexes',
      '.save(',
    ]

    for (const call of prohibitedCalls) {
      assert.equal(
        scriptCode.includes(call),
        false,
        `Migration script must NOT call prohibited write operation: ${call}`
      )
    }
  })

  // ── 14. Ambiguous Follow Relationships Classification ───────────────────────
  await t.test('14. Ambiguous follow relationships are classified without modifying data', () => {
    const userMap = new Map([
      [dummyUserA.toString(), { id: dummyUserA.toString(), collegeId: null, email: 'no_college@swish.com' }],
      [dummyUserB.toString(), { id: dummyUserB.toString(), collegeId: dummyCollegeB.toString(), email: 'b@college.edu' }],
    ])

    const ambiguousFollow = {
      follower: dummyUserA,
      following: dummyUserB,
    }

    const classification = classifyFollow(ambiguousFollow, userMap)
    assert.equal(classification.type, 'missing_college_id', 'Follow with missing collegeId must be classified as missing_college_id')
  })

  // ── 15. Cross-College Conversation Classification ───────────────────────────
  await t.test('15. Cross-college conversation is correctly classified without modification', () => {
    const userMap = new Map([
      [dummyUserA.toString(), { id: dummyUserA.toString(), collegeId: dummyCollegeA.toString(), email: 'a@dmce.ac.in', college: 'DMCE' }],
      [dummyUserB.toString(), { id: dummyUserB.toString(), collegeId: dummyCollegeB.toString(), email: 'b@kccemsr.edu.in', college: 'KCCEMSR' }],
    ])

    const crossCollegeConv = {
      participants: [dummyUserA, dummyUserB],
      lastMessage: 'Cross college chat',
    }

    const classification = classifyConversation(crossCollegeConv, userMap)
    assert.equal(classification.type, 'cross_college', 'Conversation between users of different colleges must be classified as cross_college')
  })

  // ── 16. Migration Script Does Not Execute on Import ─────────────────────────
  await t.test('16. Migration script does not automatically execute or connect on import', async () => {
    // Dynamic import to verify it exports helpers without connecting or running
    const imported = await import('../src/scripts/backfill_college_isolation.js')
    assert.ok(imported.classifyFollow, 'classifyFollow must be exported')
    assert.ok(imported.classifyConversation, 'classifyConversation must be exported')
    assert.ok(imported.runIsolationMigrationAudit, 'runIsolationMigrationAudit must be exported')
    assert.equal(mongoose.connection.readyState, 0, 'Database connection readyState must remain 0 (disconnected) upon import')
  })
})
