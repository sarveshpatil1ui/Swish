// backend/src/routes/trending.routes.js
// ─────────────────────────────────────────────────────────────────────────────
// Trending & Discovery endpoints (Instagram-style ranking, hashtags, suggested)
// ─────────────────────────────────────────────────────────────────────────────
import { Router } from 'express'
import { query, param, validationResult } from 'express-validator'
import rateLimit from 'express-rate-limit'
import mongoose from 'mongoose'
import Post from '../models/Post.js'
import User from '../models/User.js'
import Follow from '../models/Follow.js'
import { requireAuth } from '../middleware/auth.middleware.js'

const router = Router()

const trendingLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { ok: false, error: 'Too many requests. Please slow down.' },
})

router.use(requireAuth)
router.use(trendingLimiter)

function handleValidationErrors(req, res) {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(422).json({
      ok: false,
      error: errors.array()[0].msg,
      errors: errors.array(),
    })
  }
  return null
}

// ── In-memory 60s cache for hashtags ─────────────────────────────────────────
let _hashtagCache = {
  data: null,
  expiresAt: 0,
}

export function invalidateHashtagCache() {
  _hashtagCache = { data: null, expiresAt: 0 }
}

// ── Post serializer matching the Swish feed shape ─────────────────────────────
export function serializeTrendingPost(p, viewerId, followingSet = null) {
  const author = p.user || {}
  const rawLikes = Array.isArray(p.likes) ? p.likes : []
  const rawSavedBy = Array.isArray(p.savedBy) ? p.savedBy : []
  const viewerStr = viewerId ? viewerId.toString() : ''
  const liked = rawLikes.some(id => (id?._id || id).toString() === viewerStr)
  const saved = rawSavedBy.some(id => (id?._id || id).toString() === viewerStr)
  const likeCount = typeof p.likeCount === 'number' ? p.likeCount : rawLikes.length

  const authorId = author._id ? author._id.toString() : (author.id || '')
  const computedInitials = author.initials || (
    author.name
      ? author.name.trim().split(/\s+/).map(w => w[0]).slice(0, 2).join('').toUpperCase()
      : 'U'
  )
  const isFollowing = followingSet ? followingSet.has(authorId) : Boolean(p.isFollowing)

  return {
    id: p._id ? p._id.toString() : p.id,
    _id: p._id ? p._id.toString() : p.id,
    userId: authorId,
    userName: author.name || 'User',
    userUsername: author.username || 'user',
    userInitials: computedInitials,
    userAvatarColor: author.avatarColor || '#6366f1',
    userProfilePhoto: author.profilePhoto || null,
    user: {
      id: authorId,
      _id: authorId,
      name: author.name || 'User',
      username: author.username || 'user',
      initials: computedInitials,
      avatarColor: author.avatarColor || '#6366f1',
      profilePhoto: author.profilePhoto || null,
      dept: author.dept || '',
      year: author.year || '',
      college: author.college || '',
    },
    caption: p.caption || '',
    imageUrl: p.imageUrl || null,
    imagePublicId: p.imagePublicId || null,
    music: p.music || null,
    emoji: p.emoji || null,
    label: p.label || null,
    gradientFrom: p.gradientFrom || null,
    gradientTo: p.gradientTo || null,
    tags: Array.isArray(p.tags) ? p.tags : [],
    likeCount,
    likes: likeCount,
    liked,
    isLiked: liked,
    saved,
    isFollowing,
    commentCount: typeof p.commentCount === 'number' ? p.commentCount : 0,
    createdAt: p.createdAt,
    score: typeof p.score === 'number' ? Number(p.score.toFixed(3)) : undefined,
  }
}

// ── GET /api/trending/posts ──────────────────────────────────────────────────
// tab=trending | foryou | college | hashtags
router.get(
  '/posts',
  [
    query('tab').optional().isIn(['trending', 'foryou', 'college', 'hashtags']).withMessage('Invalid tab parameter.'),
    query('tag').optional().trim(),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const tab = req.query.tab || 'trending'
      const rawTag = req.query.tag ? req.query.tag.trim().replace(/^#+/, '') : null
      const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), 50)
      const cursor = req.query.cursor

      let skip = 0
      if (cursor) {
        try {
          const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'))
          skip = Number(decoded.skip) || 0
        } catch {
          skip = Number(cursor) || 0
        }
      }

      const now = new Date()
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

      // Base query criteria: non-deleted and not hidden by moderation
      const matchCriteria = {
        isDeleted: false,
        hidden: { $ne: true },
      }

      // Check if any posts were created in the last 7 days. If so, restrict to recent 7 days.
      // If none (e.g. seed data or sparse activity), fall back to all-time posts so the feed is never empty.
      const hasRecentPosts = await Post.exists({
        isDeleted: false,
        hidden: { $ne: true },
        createdAt: { $gte: sevenDaysAgo },
      })
      if (hasRecentPosts) {
        matchCriteria.createdAt = { $gte: sevenDaysAgo }
      }

      // Fetch user follow context (used for privacy filtering & affinity)
      const follows = await Follow.find({ follower: req.user._id }).select('following').lean()
      const followingIds = follows.map(f => f.following)
      const allowedAuthorIds = [req.user._id, ...followingIds]

      let viewerLikedTags = []
      if (tab === 'foryou') {
        // Find tags the user has liked recently
        const likedQuery = { likes: req.user._id, hidden: { $ne: true } }
        if (hasRecentPosts) likedQuery.createdAt = { $gte: sevenDaysAgo }
        const likedPosts = await Post.find(likedQuery).select('tags').limit(30).lean()

        const tagSet = new Set()
        likedPosts.forEach(lp => {
          if (Array.isArray(lp.tags)) lp.tags.forEach(t => tagSet.add(t.toLowerCase().replace(/^#+/, '')))
        })
        viewerLikedTags = Array.from(tagSet)

        // Exclude viewer's own posts
        matchCriteria.user = { $ne: req.user._id }
      } else if (tab === 'college') {
        if (!req.user.collegeId) {
          return res.json({ ok: true, posts: [], nextCursor: null, hasMore: false, tab })
        }
        matchCriteria.collegeId = req.user.collegeId
      } else if (tab === 'hashtags') {
        if (rawTag) {
          const escaped = rawTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
          matchCriteria.tags = {
            $in: [
              rawTag.toLowerCase(),
              rawTag,
              `#${rawTag.toLowerCase()}`,
              `#${rawTag}`,
              new RegExp(`^#?${escaped}$`, 'i'),
            ],
          }
        } else {
          matchCriteria['tags.0'] = { $exists: true }
        }
      }

      // If a specific tag was supplied regardless of tab, apply it
      if (rawTag && tab !== 'hashtags') {
        const escaped = rawTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
        matchCriteria.tags = {
          $in: [
            rawTag.toLowerCase(),
            rawTag,
            `#${rawTag.toLowerCase()}`,
            `#${rawTag}`,
            new RegExp(`^#?${escaped}$`, 'i'),
          ],
        }
      }

      // Aggregation pipeline with ranking formula:
      // score = (likes + 3 * comments + recentLikeBoost) / (ageHours + 2)^1.5
      const pipeline = [
        { $match: matchCriteria },

        // Join author to exclude suspended/deactivated users and private accounts viewer does not follow
        {
          $lookup: {
            from: 'users',
            localField: 'user',
            foreignField: '_id',
            as: 'author',
          },
        },
        { $unwind: '$author' },
        {
          $match: {
            'author.deactivated': { $ne: true },
            'author.suspended': { $ne: true },
            $or: [
              { 'author.preferences.privacy.private': { $ne: true } },
              { 'author._id': { $in: allowedAuthorIds } },
            ],
          },
        },

        // Calculate age in hours and score
        {
          $addFields: {
            resolvedLikes: {
              $ifNull: ['$likeCount', { $size: { $ifNull: ['$likes', []] } }],
            },
            resolvedComments: { $ifNull: ['$commentCount', 0] },
            ageHours: {
              $divide: [{ $subtract: [now, '$createdAt'] }, 3600000],
            },
          },
        },
        {
          $addFields: {
            // Recent like boost: higher if created in last 24h
            recentLikeBoost: {
              $cond: [
                { $lte: ['$ageHours', 24] },
                { $multiply: [{ $subtract: [24, '$ageHours'] }, 0.5] },
                0,
              ],
            },
          },
        },
        {
          $addFields: {
            baseScore: {
              $divide: [
                {
                  $add: [
                    '$resolvedLikes',
                    { $multiply: ['$resolvedComments', 3] },
                    '$recentLikeBoost',
                  ],
                },
                {
                  $pow: [{ $add: ['$ageHours', 2] }, 1.5],
                },
              ],
            },
          },
        },
      ]

      // Custom ranking for "For You"
      if (tab === 'foryou') {
        pipeline.push({
          $addFields: {
            isFollowingAuthor: {
              $in: ['$author._id', followingIds],
            },
            isSameCollege: {
              $and: [
                { $ne: [req.user.collegeId, null] },
                { $eq: ['$author.collegeId', req.user.collegeId] },
              ],
            },
            isSameDept: {
              $and: [
                { $ne: [req.user.dept, ''] },
                { $eq: ['$author.dept', req.user.dept] },
              ],
            },
            hasLikedTag: {
              $gt: [
                {
                  $size: {
                    $setIntersection: [
                      { $ifNull: ['$tags', []] },
                      viewerLikedTags,
                    ],
                  },
                },
                0,
              ],
            },
          },
        })

        pipeline.push({
          $addFields: {
            affinityMultiplier: {
              $add: [
                1.0,
                { $cond: ['$isFollowingAuthor', 2.0, 0] },
                { $cond: ['$isSameCollege', 1.0, 0] },
                { $cond: ['$isSameDept', 0.5, 0] },
                { $cond: ['$hasLikedTag', 1.5, 0] },
              ],
            },
          },
        })

        pipeline.push({
          $addFields: {
            score: { $multiply: ['$baseScore', '$affinityMultiplier'] },
          },
        })
      } else {
        pipeline.push({
          $addFields: {
            score: '$baseScore',
          },
        })
      }

      // Sort by score desc, createdAt desc
      pipeline.push(
        { $sort: { score: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: limit + 1 },
        {
          $project: {
            caption: 1,
            imageUrl: 1,
            imagePublicId: 1,
            music: 1,
            emoji: 1,
            label: 1,
            gradientFrom: 1,
            gradientTo: 1,
            savedBy: 1,
            tags: 1,
            likes: 1,
            likeCount: '$resolvedLikes',
            commentCount: '$resolvedComments',
            createdAt: 1,
            score: 1,
            user: {
              _id: '$author._id',
              name: '$author.name',
              username: '$author.username',
              initials: '$author.initials',
              avatarColor: '$author.avatarColor',
              profilePhoto: '$author.profilePhoto',
              dept: '$author.dept',
              year: '$author.year',
              college: '$author.college',
            },
          },
        }
      )

      const rawPosts = await Post.aggregate(pipeline)
      const hasMore = rawPosts.length > limit
      if (hasMore) rawPosts.pop()

      const followingSet = new Set(followingIds.map(f => f.toString()))
      const posts = rawPosts.map(p => serializeTrendingPost(p, req.user._id, followingSet))
      const nextCursor = hasMore
        ? Buffer.from(JSON.stringify({ skip: skip + limit })).toString('base64')
        : null

      res.json({
        ok: true,
        posts,
        nextCursor,
        hasMore,
        tab,
      })
    } catch (err) {
      console.error('[GET /api/trending/posts] Error:', err)
      res.status(500).json({ ok: false, error: 'Failed to fetch trending posts.' })
    }
  }
)

// ── GET /api/trending/hashtags ───────────────────────────────────────────────
// Returns trending hashtags with post counts (60s in-memory cache)
router.get(
  '/hashtags',
  [
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const limit = Math.min(Math.max(1, Number(req.query.limit) || 12), 30)
      const now = Date.now()

      // Return cached results if still valid
      if (_hashtagCache.data && _hashtagCache.expiresAt > now) {
        return res.json({
          ok: true,
          hashtags: _hashtagCache.data.slice(0, limit),
          cached: true,
        })
      }

      const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

      // Exclude posts from private accounts and hidden posts from public trending hashtag aggregations
      const privateUsers = await User.find({ 'preferences.privacy.private': true }).select('_id').lean()
      const privateUserIds = privateUsers.map(u => u._id)

      // First try posts in the last 7 days; if none, fall back to all-time tagged posts
      let results = await Post.aggregate([
        {
          $match: {
            isDeleted: false,
            hidden: { $ne: true },
            user: { $nin: privateUserIds },
            createdAt: { $gte: sevenDaysAgo },
            'tags.0': { $exists: true },
          },
        },
        { $unwind: '$tags' },
        {
          $project: {
            cleanTag: {
              $trim: {
                input: { $toLower: '$tags' },
                chars: '# ',
              },
            },
          },
        },
        { $match: { cleanTag: { $ne: '' } } },
        {
          $group: {
            _id: '$cleanTag',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
        { $limit: 30 },
        {
          $project: {
            tag: '$_id',
            count: 1,
            _id: 0,
          },
        },
      ])

      if (results.length === 0) {
        results = await Post.aggregate([
          {
            $match: {
              isDeleted: false,
              hidden: { $ne: true },
              user: { $nin: privateUserIds },
              'tags.0': { $exists: true },
            },
          },
          { $unwind: '$tags' },
          {
            $project: {
              cleanTag: {
                $trim: {
                  input: { $toLower: '$tags' },
                  chars: '# ',
                },
              },
            },
          },
          { $match: { cleanTag: { $ne: '' } } },
          {
            $group: {
              _id: '$cleanTag',
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 30 },
          {
            $project: {
              tag: '$_id',
              count: 1,
              _id: 0,
            },
          },
        ])
      }

      // Store in memory cache for 60 seconds
      _hashtagCache = {
        data: results,
        expiresAt: now + 60 * 1000,
      }

      res.json({
        ok: true,
        hashtags: results.slice(0, limit),
        cached: false,
      })
    } catch (err) {
      console.error('[GET /api/trending/hashtags] Error:', err)
      res.status(500).json({ ok: false, error: 'Failed to fetch trending hashtags.' })
    }
  }
)

// ── GET /api/trending/hashtags/:tag/posts ────────────────────────────────────
// Filter posts by specific tag with cursor pagination
router.get(
  '/hashtags/:tag/posts',
  [
    param('tag').trim().notEmpty().withMessage('Hashtag name is required.'),
    query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const rawTag = req.params.tag.trim().replace(/^#+/, '')
      const tag = rawTag.toLowerCase()
      const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), 50)
      const cursor = req.query.cursor

      let skip = 0
      if (cursor) {
        try {
          const decoded = JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'))
          skip = Number(decoded.skip) || 0
        } catch {
          skip = Number(cursor) || 0
        }
      }

      const follows = await Follow.find({ follower: req.user._id }).select('following').lean()
      const followingIds = follows.map(f => f.following)
      const allowedAuthorIds = [req.user._id, ...followingIds]

      // Exclude deactivated, suspended, and private accounts that the viewer does not follow
      const excludedUsers = await User.find({
        $or: [
          { deactivated: true },
          { suspended: true },
          {
            'preferences.privacy.private': true,
            _id: { $nin: allowedAuthorIds },
          },
        ],
      }).select('_id').lean()
      const excludedUserIds = excludedUsers.map(u => u._id)

      const escaped = rawTag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const posts = await Post.find({
        tags: {
          $in: [
            tag,
            rawTag,
            `#${tag}`,
            `#${rawTag}`,
            new RegExp(`^#?${escaped}$`, 'i'),
          ],
        },
        user: { $nin: excludedUserIds },
        hidden: { $ne: true },
        isDeleted: false,
      })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit + 1)
        .populate('user', 'name username initials avatarColor profilePhoto dept year college')

      const hasMore = posts.length > limit
      if (hasMore) posts.pop()

      const followingSet = new Set(followingIds.map(f => f.toString()))
      const nextCursor = hasMore
        ? Buffer.from(JSON.stringify({ skip: skip + limit })).toString('base64')
        : null

      res.json({
        ok: true,
        tag,
        posts: posts.map(p => serializeTrendingPost(p, req.user._id, followingSet)),
        nextCursor,
        hasMore,
      })
    } catch (err) {
      console.error('[GET /api/trending/hashtags/:tag/posts] Error:', err)
      res.status(500).json({ ok: false, error: 'Failed to fetch hashtag posts.' })
    }
  }
)

// ── GET /api/trending/accounts ───────────────────────────────────────────────
// Suggested accounts for trending page
router.get('/accounts', async (req, res) => {
  try {
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 8), 20)

    // Find users currently followed by the viewer
    const follows = await Follow.find({ follower: req.user._id }).select('following').lean()
    const followingIds = [req.user._id, ...follows.map(f => f.following)]

    // Strictly students and faculty only — NO admin, main_admin, or college_admin
    const baseFilter = {
      _id: { $nin: followingIds },
      deactivated: false,
      suspended: false,
      role: { $in: ['student', 'faculty'] },
    }

    // Try finding peers from the same college first if viewer has a collegeId
    let suggested = []
    if (req.user.collegeId) {
      suggested = await User.find({ ...baseFilter, collegeId: req.user.collegeId })
        .sort({ followers: -1, createdAt: -1 })
        .limit(limit)
        .select('name username initials avatarColor profilePhoto dept year college followers role')
        .lean()
    }

    // If fewer than limit, fill with general popular students/faculty across campus
    if (suggested.length < limit) {
      const remaining = limit - suggested.length
      const existingIds = [...followingIds, ...suggested.map(u => u._id)]
      const fallback = await User.find({
        ...baseFilter,
        _id: { $nin: existingIds },
      })
        .sort({ followers: -1, createdAt: -1 })
        .limit(remaining)
        .select('name username initials avatarColor profilePhoto dept year college followers role')
        .lean()

      suggested = [...suggested, ...fallback]
    }

    res.json({
      ok: true,
      accounts: suggested.map(u => ({
        id: u._id.toString(),
        name: u.name,
        username: u.username,
        initials: u.initials,
        avatarColor: u.avatarColor,
        profilePhoto: u.profilePhoto || null,
        dept: u.dept || '',
        year: u.year || '',
        college: u.college || '',
        followers: u.followers || 0,
        role: u.role || 'student',
        isFollowing: false,
      })),
    })
  } catch (err) {
    console.error('[GET /api/trending/accounts] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch suggested accounts.' })
  }
})

export default router
