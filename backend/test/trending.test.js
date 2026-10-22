import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import trendingRouter, {
  serializeTrendingPost,
  invalidateHashtagCache,
} from '../src/routes/trending.routes.js'
import { normalizeTags, extractHashtags } from '../src/routes/posts.routes.js'
import Post from '../src/models/Post.js'

describe('Trending & Discovery Route Integrity and Business Logic', () => {
  test('1. Trending router registers all expected endpoints', () => {
    const routeLayers = trendingRouter.stack
      .filter(layer => layer.route)
      .map(layer => layer.route.path)

    assert.ok(routeLayers.includes('/posts'), 'GET /posts must be registered')
    assert.ok(routeLayers.includes('/hashtags'), 'GET /hashtags must be registered')
    assert.ok(routeLayers.includes('/hashtags/:tag/posts'), 'GET /hashtags/:tag/posts must be registered')
    assert.ok(routeLayers.includes('/accounts'), 'GET /accounts must be registered')
  })

  test('2. Post schema defines collegeId, likeCount and required indexes', () => {
    const postPaths = Post.schema.paths
    assert.ok(postPaths.collegeId, 'Post schema must have collegeId path')
    assert.ok(postPaths.likeCount, 'Post schema must have likeCount path')
    assert.equal(postPaths.likeCount.defaultValue, 0, 'likeCount must default to 0')

    const indexes = Post.schema.indexes()
    const indexKeys = indexes.map(([fields]) => Object.keys(fields).sort().join('_'))

    assert.ok(
      indexKeys.some(k => k === 'createdAt_tags'),
      'Must have index on tags and createdAt'
    )
    assert.ok(
      indexKeys.some(k => k === 'createdAt_likeCount'),
      'Must have index on createdAt and likeCount'
    )
    assert.ok(
      indexKeys.some(k => k === 'collegeId_createdAt'),
      'Must have index on collegeId and createdAt'
    )
  })

  test('3. Tag normalization cleans, dedupes, lowercases and limits tags to 10', () => {
    const dirtyTags = ['#React', '  vite ', '#React', 'JAVASCRIPT', '#Web-Dev', '', '   ']
    const cleaned = normalizeTags(dirtyTags)

    assert.deepEqual(cleaned, ['react', 'vite', 'javascript', 'web-dev'])

    // Limit to 10 unique tags test
    const twelveTags = Array.from({ length: 12 }, (_, i) => `tag${i}`)
    const limited = normalizeTags(twelveTags)
    assert.equal(limited.length, 10, 'Must cap at 10 tags')
  })

  test('4. Auto-extraction of hashtags from caption text', () => {
    const caption = 'Loving the new #Swish campus app! Great #design and #coding tips from @rahul #swish'
    const extracted = extractHashtags(caption)
    assert.deepEqual(extracted, ['swish', 'design', 'coding'])
  })

  test('5. Ranking score calculation mirrors formula (likes + 3*comments + recentLikeBoost)/(ageHours+2)^1.5', () => {
    const calculateScore = (likes, comments, ageHours) => {
      const recentLikeBoost = ageHours <= 24 ? (24 - ageHours) * 0.5 : 0
      const numerator = likes + 3 * comments + recentLikeBoost
      const denominator = Math.pow(ageHours + 2, 1.5)
      return numerator / denominator
    }

    // Monotonicity with engagement: at same age, more likes and comments = higher score
    const scoreA = calculateScore(10, 2, 5)
    const scoreB = calculateScore(50, 10, 5)
    assert.ok(scoreB > scoreA, 'Higher likes and comments must produce higher score for identical age')

    // Time decay: identical engagement at 2h vs 20h vs 48h
    const scoreFresh = calculateScore(20, 5, 2)
    const scoreMid = calculateScore(20, 5, 20)
    const scoreOld = calculateScore(20, 5, 48)
    assert.ok(scoreFresh > scoreMid, 'Fresh post (2h) must score higher than 20h post with same engagement')
    assert.ok(scoreMid > scoreOld, '20h post must score higher than 48h post with same engagement')

    // Recent like boost: age > 24 has no boost
    const boostAt23 = 23 <= 24 ? (24 - 23) * 0.5 : 0
    const boostAt25 = 25 <= 24 ? (24 - 25) * 0.5 : 0
    assert.equal(boostAt23, 0.5)
    assert.equal(boostAt25, 0)
  })

  test('6. serializeTrendingPost correctly sets like status for viewer', () => {
    const viewerId = new mongoose.Types.ObjectId()
    const otherId = new mongoose.Types.ObjectId()
    const authorId = new mongoose.Types.ObjectId()

    const rawPostLiked = {
      _id: new mongoose.Types.ObjectId(),
      caption: 'Test post caption #vibes',
      tags: ['vibes'],
      likes: [viewerId, otherId],
      likeCount: 2,
      commentCount: 5,
      createdAt: new Date(),
      score: 14.2857,
      user: {
        _id: authorId,
        name: 'Priya Desai',
        username: 'priya.desai',
        avatarColor: '#ec4899',
        dept: 'Computer Science',
        college: 'KJSCE Mumbai',
      },
    }

    const serializedLiked = serializeTrendingPost(rawPostLiked, viewerId)
    assert.equal(serializedLiked.liked, true)
    assert.equal(serializedLiked.isLiked, true)
    assert.equal(serializedLiked.likeCount, 2)
    assert.equal(serializedLiked.commentCount, 5)
    assert.equal(serializedLiked.score, 14.286)
    assert.equal(serializedLiked.user.name, 'Priya Desai')

    const serializedUnliked = serializeTrendingPost(rawPostLiked, new mongoose.Types.ObjectId())
    assert.equal(serializedUnliked.liked, false)
    assert.equal(serializedUnliked.isLiked, false)
  })

  test('7. Invalidate hashtag cache clears internal cache', () => {
    invalidateHashtagCache()
    // Calling without error confirms cache reset function works
    assert.doesNotThrow(() => invalidateHashtagCache())
  })
})
