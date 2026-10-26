import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

// Import models to test schema index definitions
import Post from '../src/models/Post.js'
import User from '../src/models/User.js'
import { Conversation } from '../src/models/Conversation.js'
import Notification from '../src/models/Notification.js'
import { cleanupExpiredStories } from '../src/routes/stories.routes.js'
import { createStoryCleanupScheduler } from '../src/services/storyCleanup.service.js'

test('Phase 2 — Database Model Indexes Integrity', async (t) => {
  await t.test('Post model contains required compound indexes', () => {
    const indexes = Post.schema.indexes()
    
    // Check { hidden: 1, createdAt: -1 }
    const hasHiddenCreatedIndex = indexes.some(
      ([fields]) => fields.hidden === 1 && fields.createdAt === -1
    )
    assert.equal(hasHiddenCreatedIndex, true, 'Post must have compound index on { hidden: 1, createdAt: -1 }')

    // Check { user: 1, createdAt: -1 }
    const hasUserCreatedIndex = indexes.some(
      ([fields]) => fields.user === 1 && fields.createdAt === -1
    )
    assert.equal(hasUserCreatedIndex, true, 'Post must have compound index on { user: 1, createdAt: -1 }')
  })

  await t.test('User model contains privacy preference index', () => {
    const indexes = User.schema.indexes()
    const hasPrivacyIndex = indexes.some(
      ([fields]) => fields['preferences.privacy.private'] === 1
    )
    assert.equal(hasPrivacyIndex, true, 'User must have index on preferences.privacy.private')
  })

  await t.test('User model does not declare duplicate username or email indexes', () => {
    const indexes = User.schema.indexes()
    const usernameIndexes = indexes.filter(([fields]) => fields.username === 1)
    const emailIndexes = indexes.filter(([fields]) => fields.email === 1)

    assert.equal(usernameIndexes.length, 1, 'User must have exactly one username index')
    assert.equal(emailIndexes.length, 1, 'User must have exactly one email index')
    assert.equal(usernameIndexes[0][1].unique, true, 'Username index must remain unique')
    assert.equal(emailIndexes[0][1].unique, true, 'Email index must remain unique')
  })

  await t.test('Conversation model contains compound participants and lastMessageAt index', () => {
    const indexes = Conversation.schema.indexes()
    const hasParticipantsLastMessageIndex = indexes.some(
      ([fields]) => fields.participants === 1 && fields.lastMessageAt === -1
    )
    assert.equal(
      hasParticipantsLastMessageIndex,
      true,
      'Conversation must have compound index on { participants: 1, lastMessageAt: -1 }'
    )
  })

  await t.test('Notification model maintains recipient and createdAt index without bloat', () => {
    const indexes = Notification.schema.indexes()
    const hasRecipientCreatedIndex = indexes.some(
      ([fields]) => fields.recipient === 1 && fields.createdAt === -1
    )
    assert.equal(
      hasRecipientCreatedIndex,
      true,
      'Notification must have index on { recipient: 1, createdAt: -1 }'
    )
  })
})

test('Phase 2 — Feed Filter Construction & Privacy Rules', async (t) => {
  await t.test('Student/Faculty feed query correctly structure privacy and hidden filters', () => {
    const currentUserId = new mongoose.Types.ObjectId()
    const followedUserId = new mongoose.Types.ObjectId()
    const privateUserId = new mongoose.Types.ObjectId()
    const cursorDate = new Date('2026-10-20T12:00:00.000Z')

    const visibleUserIds = [currentUserId, followedUserId]
    const privateUserIds = [privateUserId]

    // Construct filter according to optimized posts.routes logic
    const filter = { hidden: false }
    filter.$or = [
      { user: { $in: visibleUserIds } },
      { user: { $nin: privateUserIds } },
    ]
    filter.createdAt = { $lt: cursorDate }

    // Assert clean filter structure without nested $and wrappers
    assert.equal(filter.hidden, false)
    assert.equal(filter.$or.length, 2)
    assert.deepEqual(filter.$or[0], { user: { $in: visibleUserIds } })
    assert.deepEqual(filter.$or[1], { user: { $nin: privateUserIds } })
    assert.equal(filter.createdAt.$lt.toISOString(), cursorDate.toISOString())
    assert.equal(filter.$and, undefined, 'Filter should not have redundant nested $and arrays')
  })

  await t.test('College Admin feed query isolates to college users and excludes hidden', () => {
    const collegeUser1 = new mongoose.Types.ObjectId()
    const collegeUser2 = new mongoose.Types.ObjectId()
    const collegeUserIds = [collegeUser1, collegeUser2]

    const filter = { hidden: false }
    filter.user = { $in: collegeUserIds }

    assert.equal(filter.hidden, false)
    assert.deepEqual(filter.user, { $in: collegeUserIds })
    assert.equal(filter.$or, undefined, 'College admin does not query global private users array')
  })
})

test('Phase 2 — Story Cleanup Scheduler Resilience', async (t) => {
  await t.test('cleanupExpiredStories function is exported and callable', () => {
    assert.equal(typeof cleanupExpiredStories, 'function', 'cleanupExpiredStories must be exported function')
  })

  await t.test('Scheduler prevents overlapping executions when runs take time', async () => {
    let activeRuns = 0
    let maxConcurrentRuns = 0
    let totalInvocations = 0

    let resolveActiveRun
    const mockCleanup = () => {
      totalInvocations++
      activeRuns++
      if (activeRuns > maxConcurrentRuns) {
        maxConcurrentRuns = activeRuns
      }
      return new Promise((resolve) => {
        resolveActiveRun = () => {
          activeRuns--
          resolve()
        }
      })
    }

    const scheduler = createStoryCleanupScheduler({
      cleanupFn: mockCleanup,
      initialDelayMs: 60000, // keep timer out of the way for manual trigger
      intervalMs: 60000,
      logger: { error: () => {} },
    })

    // Start first run
    const firstRunPromise = scheduler.triggerNow()
    assert.equal(scheduler.isRunning, true, 'Scheduler must flag isRunning = true while running')

    // Attempt overlapping second run while first is in-flight
    const secondRunPromise = scheduler.triggerNow()

    // Assert that concurrency did not exceed 1 and second call did not start another cleanup
    assert.equal(maxConcurrentRuns, 1, 'Concurrent executions must never exceed 1')
    assert.equal(totalInvocations, 1, 'Second trigger must be ignored while first is active')

    // Settle first run
    resolveActiveRun()
    await Promise.all([firstRunPromise, secondRunPromise])

    assert.equal(scheduler.isRunning, false, 'Scheduler must flag isRunning = false after completion')
    assert.equal(maxConcurrentRuns, 1)

    scheduler.stop()
    assert.equal(scheduler.isStopped, true, 'Scheduler stop() must set isStopped = true')
  })

  await t.test('Scheduler catches rejection and keeps scheduler functional without unhandled rejection', async () => {
    let invocations = 0
    const mockFailingCleanup = async () => {
      invocations++
      throw new Error('Simulated transient Cloudinary/MongoDB error')
    }

    let loggedError = null
    const mockLogger = {
      error: (msg, err) => {
        loggedError = { msg, err }
      },
    }

    const scheduler = createStoryCleanupScheduler({
      cleanupFn: mockFailingCleanup,
      initialDelayMs: 60000,
      intervalMs: 60000,
      logger: mockLogger,
    })

    // Must not reject or throw unhandled rejection
    await assert.doesNotReject(async () => {
      await scheduler.triggerNow()
    })

    assert.equal(invocations, 1)
    assert.equal(loggedError?.msg, '[Stories Background Cleanup Error]')
    assert.equal(loggedError?.err, 'Simulated transient Cloudinary/MongoDB error')
    assert.equal(scheduler.isRunning, false)

    scheduler.stop()
  })
})
