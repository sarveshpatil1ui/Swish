import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'

import Story from '../src/models/Story.js'
import Post from '../src/models/Post.js'
import { serializePost } from '../src/routes/posts.routes.js'

test('Phase 3 — Database Query & Model Index Optimization', async (t) => {
  await t.test('Story model contains compound index for active feed query', () => {
    const indexes = Story.schema.indexes()
    const hasActiveFeedIndex = indexes.some(
      ([fields]) => fields.user === 1 && fields.expiresAt === 1 && fields.createdAt === 1
    )
    assert.equal(
      hasActiveFeedIndex,
      true,
      'Story schema must include compound index { user: 1, expiresAt: 1, createdAt: 1 }'
    )
  })

  await t.test('Post model indexes are preserved and intact', () => {
    const indexes = Post.schema.indexes()
    const hasFeedIndex = indexes.some(
      ([fields]) => fields.hidden === 1 && fields.createdAt === -1
    )
    assert.equal(hasFeedIndex, true, 'Post must retain { hidden: 1, createdAt: -1 } index')
  })
})

test('Phase 3 — Post Lean Serialization & Payload Optimization', async (t) => {
  const viewerObjectId = new mongoose.Types.ObjectId()
  const authorObjectId = new mongoose.Types.ObjectId()
  const postObjectId = new mongoose.Types.ObjectId()

  await t.test('Serializes plain lean object without toJSON correctly', () => {
    const leanPost = {
      _id: postObjectId,
      caption: 'Test lean post caption',
      user: {
        _id: authorObjectId,
        name: 'Jane Doe',
        username: 'janedoe',
        initials: 'JD',
        avatarColor: '#10b981',
      },
      likes: [viewerObjectId, new mongoose.Types.ObjectId()],
      savedBy: [viewerObjectId],
      createdAt: new Date('2026-10-22T12:00:00.000Z'),
    }

    const serialized = serializePost(leanPost, viewerObjectId.toString())

    assert.equal(serialized.id, postObjectId.toString(), 'Post _id must be transformed into string id')
    assert.equal(serialized._id, undefined, '_id must be deleted from serialized post')
    assert.equal(serialized.__v, undefined, '__v must be deleted from serialized post')
    assert.equal(serialized.user.id, authorObjectId.toString(), 'user._id must be transformed into string user.id')
    assert.equal(serialized.likeCount, 2, 'likeCount must match array length')
    assert.equal(serialized.liked, true, 'liked must be true for viewer')
    assert.equal(serialized.saved, true, 'saved must be true for viewer')
    assert.equal(serialized.likes, undefined, 'likes array must be stripped to reduce payload size')
    assert.equal(serialized.savedBy, undefined, 'savedBy array must be stripped to reduce payload size')
  })

  await t.test('Handles viewer that has not liked or saved', () => {
    const otherViewerId = new mongoose.Types.ObjectId().toString()
    const leanPost = {
      _id: postObjectId,
      caption: 'Another post',
      user: {
        _id: authorObjectId,
        name: 'Jane Doe',
      },
      likes: [viewerObjectId],
      savedBy: [],
    }

    const serialized = serializePost(leanPost, otherViewerId)

    assert.equal(serialized.likeCount, 1)
    assert.equal(serialized.liked, false)
    assert.equal(serialized.saved, false)
  })

  await t.test('Serializes Mongoose document with toJSON method correctly', () => {
    const mockMongooseDoc = {
      toJSON() {
        return {
          _id: postObjectId,
          id: postObjectId.toString(),
          caption: 'Mock doc',
          user: {
            id: authorObjectId.toString(),
            name: 'Jane Doe',
          },
          likes: [viewerObjectId],
          savedBy: [],
        }
      },
    }

    const serialized = serializePost(mockMongooseDoc, viewerObjectId.toString())

    assert.equal(serialized.id, postObjectId.toString())
    assert.equal(serialized.user.id, authorObjectId.toString())
    assert.equal(serialized.likeCount, 1)
    assert.equal(serialized.liked, true)
    assert.equal(serialized.likes, undefined)
  })
})

test('Phase 3 — Story Lean Serialization & Compatibility', async (t) => {
  const { serializeStory } = await import('../src/routes/stories.routes.js')
  const authorId = new mongoose.Types.ObjectId()
  const storyId = new mongoose.Types.ObjectId()

  await t.test('Serializes plain lean story object correctly without schema methods', () => {
    const leanStory = {
      _id: storyId,
      user: {
        _id: authorId,
        name: 'Alex Rivera',
        username: 'arivera',
        initials: 'AR',
        avatarColor: '#6366f1',
        profilePhoto: 'https://example.com/avatar.jpg',
      },
      imageUrl: 'https://example.com/story.jpg',
      imagePublicId: 'swish/stories/sample',
      caption: 'Testing lean story',
      music: null,
      filter: 'normal',
      sticker: null,
      likes: [authorId],
      replies: [
        {
          _id: new mongoose.Types.ObjectId(),
          user: {
            _id: authorId,
            name: 'Alex Rivera',
            username: 'arivera',
            initials: 'AR',
            avatarColor: '#6366f1',
            profilePhoto: null,
          },
          text: 'Nice story!',
          createdAt: new Date(),
        },
      ],
      createdAt: new Date(),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    }

    const serialized = serializeStory(leanStory, authorId.toString(), 5, true)

    assert.equal(serialized.id, storyId.toString())
    assert.equal(serialized.userId, authorId.toString())
    assert.equal(serialized.isOwnStory, true)
    assert.equal(serialized.viewsCount, 5)
    assert.equal(serialized.likesCount, 1)
    assert.equal(serialized.isLiked, true)
    assert.equal(serialized.repliesCount, 1)
    assert.equal(serialized.user.id, authorId.toString())
    assert.equal(serialized.user.name, 'Alex Rivera')
  })
})

test('Phase 3 — Request Deduplication & Stale Overwrite Protection Mechanics', async (t) => {
  await t.test('Concurrent callers share in-flight promise and settle cleanly', async () => {
    let apiCallCount = 0
    let pendingPromise = null

    const fetchResource = async () => {
      if (pendingPromise) return pendingPromise

      pendingPromise = (async () => {
        try {
          apiCallCount++
          await new Promise(r => setTimeout(r, 20))
          return { ok: true, data: 'payload' }
        } finally {
          pendingPromise = null
        }
      })()

      return pendingPromise
    }

    // Call 3 times simultaneously
    const [res1, res2, res3] = await Promise.all([
      fetchResource(),
      fetchResource(),
      fetchResource(),
    ])

    assert.equal(apiCallCount, 1, 'API must only be hit once for concurrent callers')
    assert.equal(res1.data, 'payload')
    assert.equal(res2.data, 'payload')
    assert.equal(res3.data, 'payload')
    assert.equal(pendingPromise, null, 'Pending promise must clear after settlement')
  })

  await t.test('Sequence counter prevents older slow responses from overwriting newer forced results', async () => {
    let state = 'initial'
    let seq = 0

    const executeRequest = async (targetValue, delayMs) => {
      const mySeq = ++seq
      await new Promise(r => setTimeout(r, delayMs))
      if (mySeq === seq) {
        state = targetValue
      }
    }

    // Request 1 started first but takes 50ms (slow network)
    const req1 = executeRequest('older-slow-data', 50)
    // Request 2 started immediately after (e.g. forced refresh) and takes 10ms (fast)
    const req2 = executeRequest('newer-fresh-data', 10)

    await Promise.all([req1, req2])

    assert.equal(state, 'newer-fresh-data', 'Newer response must not be overwritten by older slow response')
  })
})
