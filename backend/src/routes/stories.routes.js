import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { uploadStoryPhoto } from '../middleware/upload.middleware.js'
import { uploadStoryImage, deleteStoryImage } from '../services/cloudinary.service.js'
import Story from '../models/Story.js'
import StoryView from '../models/StoryView.js'
import Follow from '../models/Follow.js'

const router = Router()

function formatRelativeTime(date) {
  const diffMs = Date.now() - new Date(date).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

function serializeStory(story, currentUserId, viewsCount = 0, hasSeen = false) {
  const user = story.user
  const authorId = user?._id?.toString() || user?.id || (typeof user === 'string' ? user : '')
  const isOwn = authorId === currentUserId?.toString()
  return {
    id: story._id.toString(),
    userId: authorId,
    label: isOwn ? 'Your Story' : (user?.name?.split(' ')[0] || 'User'),
    initials: user?.initials || (user?.name ? user.name.slice(0, 2).toUpperCase() : 'U'),
    avatarColor: user?.avatarColor || '#6366f1',
    user: {
      id: authorId,
      name: user?.name || 'User',
      username: user?.username || '',
      initials: user?.initials || (user?.name ? user.name.slice(0, 2).toUpperCase() : 'U'),
      avatarColor: user?.avatarColor || '#6366f1',
      profilePhoto: user?.profilePhoto || null,
    },
    imageUrl: story.imageUrl,
    imagePublicId: story.imagePublicId,
    caption: story.caption || '',
    createdAt: story.createdAt,
    expiresAt: story.expiresAt,
    isOwnStory: isOwn,
    hasSeen: isOwn ? true : !!hasSeen,
    hasNew: isOwn ? false : !hasSeen,
    viewsCount: viewsCount || 0,
    time: formatRelativeTime(story.createdAt),
  }
}

/**
 * Background / lazy cleanup of expired stories and their Cloudinary assets.
 */
export async function cleanupExpiredStories() {
  try {
    const now = new Date()
    const expiredStories = await Story.find({ expiresAt: { $lte: now } })
    if (!expiredStories || expiredStories.length === 0) return

    for (const story of expiredStories) {
      if (story.imagePublicId) {
        await deleteStoryImage(story.imagePublicId).catch(() => {})
      }
      await StoryView.deleteMany({ story: story._id }).catch(() => {})
    }
    await Story.deleteMany({ expiresAt: { $lte: now } })
  } catch (err) {
    console.error('[Stories] Cleanup error:', err)
  }
}

// ── GET ACTIVE STORIES ────────────────────────────────────────────────────────
// Returns stories for the current user and users they follow, filtered to active (unexpired).
router.get('/', requireAuth, async (req, res) => {
  try {
    // Non-blocking cleanup of expired stories in the background
    cleanupExpiredStories().catch(() => {})

    // Find all users the current user follows
    const follows = await Follow.find({ follower: req.user._id }).select('following')
    const followingIds = follows.map(f => f.following)
    const allowedAuthorIds = [req.user._id, ...followingIds]

    const now = new Date()
    // Explicitly filter for expiresAt > now so expired stories are never returned
    const stories = await Story.find({
      user: { $in: allowedAuthorIds },
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: 1 })
      .populate('user', 'name username initials avatarColor profilePhoto')

    const ownStoryIds = []
    const otherStoryIds = []
    for (const s of stories) {
      const aId = s.user?._id?.toString() || s.user?.toString()
      if (aId === req.user.id) {
        ownStoryIds.push(s._id)
      } else {
        otherStoryIds.push(s._id)
      }
    }

    // View counts for own stories
    const countMap = {}
    if (ownStoryIds.length > 0) {
      const viewCounts = await StoryView.aggregate([
        { $match: { story: { $in: ownStoryIds } } },
        { $group: { _id: '$story', count: { $sum: 1 } } },
      ])
      for (const vc of viewCounts) {
        countMap[vc._id.toString()] = vc.count
      }
    }

    // Seen status for other users' stories
    const seenSet = new Set()
    if (otherStoryIds.length > 0) {
      const userViews = await StoryView.find({
        story: { $in: otherStoryIds },
        viewer: req.user._id,
      }).select('story')
      for (const uv of userViews) {
        seenSet.add(uv.story.toString())
      }
    }

    res.json({
      ok: true,
      stories: stories.map(s => {
        const isOwn = (s.user?._id?.toString() || s.user?.toString()) === req.user.id
        const vCount = countMap[s._id.toString()] || 0
        const hasSeen = isOwn ? true : seenSet.has(s._id.toString())
        return serializeStory(s, req.user.id, vCount, hasSeen)
      }),
    })
  } catch (err) {
    console.error('[GET /api/stories] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch stories.' })
  }
})

// ── CREATE STORY ──────────────────────────────────────────────────────────────
router.post(
  '/',
  requireAuth,
  (req, res, next) => {
    uploadStoryPhoto(req, res, (err) => {
      if (err) {
        if (err.message === 'INVALID_FILE_TYPE') {
          return res.status(400).json({ ok: false, error: 'Only JPEG, PNG, WEBP, or GIF images are allowed.' })
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ ok: false, error: 'Story image must be 5MB or smaller.' })
        }
        console.error('[POST /api/stories] Upload error:', err)
        return res.status(400).json({ ok: false, error: 'Upload failed. Please try again.' })
      }
      next()
    })
  },
  async (req, res) => {
    let uploadedAsset = null
    try {
      if (!req.file && !req.body.imageUrl) {
        return res.status(400).json({ ok: false, error: 'Story image is required.' })
      }

      let imageUrl = req.body.imageUrl || null
      let imagePublicId = null

      if (req.file) {
        try {
          uploadedAsset = await uploadStoryImage(req.file.buffer)
          imageUrl = uploadedAsset.secureUrl
          imagePublicId = uploadedAsset.publicId
        } catch (uploadErr) {
          console.error('[POST /api/stories] Cloudinary upload error:', uploadErr)
          return res.status(502).json({
            ok: false,
            error: 'Failed to upload story image. Please try again.',
          })
        } finally {
          // Immediately free up memory buffer so it is not retained
          if (req.file) {
            req.file.buffer = null
            delete req.file.buffer
          }
        }
      }

      const createdAt = new Date()
      // Default to 24 hours from creation
      let expiresAt = new Date(createdAt.getTime() + 24 * 60 * 60 * 1000)

      // In test/dev environments, allow setting custom expiresAt for automated verification
      if (process.env.NODE_ENV !== 'production' && req.body.expiresAt) {
        expiresAt = new Date(req.body.expiresAt)
      }

      const story = await Story.create({
        user: req.user.id,
        imageUrl,
        imagePublicId,
        caption: (req.body.caption || '').trim(),
        expiresAt,
      })

      const populated = await story.populate('user', 'name username initials avatarColor profilePhoto')
      res.status(201).json({
        ok: true,
        story: serializeStory(populated, req.user.id, 0, true),
      })
    } catch (err) {
      if (uploadedAsset?.publicId) {
        deleteStoryImage(uploadedAsset.publicId).catch(() => {})
      }
      console.error('[POST /api/stories] Error:', err)
      res.status(500).json({ ok: false, error: 'Failed to create story.' })
    }
  }
)

// ── GET STORY BY ID ───────────────────────────────────────────────────────────
router.get('/:storyId', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId).populate('user', 'name username initials avatarColor profilePhoto')
    if (!story) {
      return res.status(404).json({ ok: false, error: 'Story not found.' })
    }

    if (story.expiresAt && story.expiresAt <= new Date()) {
      return res.status(410).json({ ok: false, error: 'Story has expired.' })
    }

    const isAuthor = story.user?._id?.toString() === req.user.id
    const isAdmin = req.user.role === 'admin' || req.user.role === 'main_admin'
    let isFollowing = false

    if (!isAuthor && !isAdmin) {
      isFollowing = await Follow.exists({ follower: req.user._id, following: story.user._id })
      if (!isFollowing) {
        return res.status(403).json({ ok: false, error: 'Access denied: You must follow this user to view their story.' })
      }
    }

    const viewsCount = await StoryView.countDocuments({ story: story._id })
    const hasSeen = isAuthor ? true : await StoryView.exists({ story: story._id, viewer: req.user._id })

    res.json({
      ok: true,
      story: serializeStory(story, req.user.id, viewsCount, !!hasSeen),
    })
  } catch (err) {
    console.error('[GET /api/stories/:storyId] Error:', err)
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: 'Story not found.' })
    }
    res.status(500).json({ ok: false, error: 'Failed to fetch story.' })
  }
})

// ── RECORD STORY VIEW ─────────────────────────────────────────────────────────
// POST /api/stories/:storyId/view
router.post('/:storyId/view', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId)
    if (!story) {
      return res.status(404).json({ ok: false, error: 'Story not found.' })
    }

    if (story.expiresAt && story.expiresAt <= new Date()) {
      return res.status(410).json({ ok: false, error: 'Story has expired.' })
    }

    const isAuthor = story.user.toString() === req.user.id
    const isAdmin = req.user.role === 'admin' || req.user.role === 'main_admin'

    // Verify privacy
    if (!isAuthor && !isAdmin) {
      const isFollowing = await Follow.exists({ follower: req.user._id, following: story.user })
      if (!isFollowing) {
        return res.status(403).json({ ok: false, error: 'Access denied: You must follow this user to view their story.' })
      }
    }

    // Do NOT count the story owner as a viewer of their own story
    if (isAuthor) {
      const viewsCount = await StoryView.countDocuments({ story: story._id })
      return res.json({ ok: true, viewsCount, message: 'Owner view not recorded.' })
    }

    // Upsert view record to prevent duplicate views
    await StoryView.updateOne(
      { story: story._id, viewer: req.user._id },
      { $setOnInsert: { viewedAt: new Date() } },
      { upsert: true }
    )

    const viewsCount = await StoryView.countDocuments({ story: story._id })
    res.json({ ok: true, viewsCount })
  } catch (err) {
    console.error('[POST /api/stories/:storyId/view] Error:', err)
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: 'Story not found.' })
    }
    res.status(500).json({ ok: false, error: 'Failed to record story view.' })
  }
})

// ── GET STORY VIEWERS ─────────────────────────────────────────────────────────
// GET /api/stories/:storyId/viewers
// Only the story owner (or admin) can view the viewers list
router.get('/:storyId/viewers', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId)
    if (!story) {
      return res.status(404).json({ ok: false, error: 'Story not found.' })
    }

    const isAuthor = story.user.toString() === req.user.id
    const isAdmin = req.user.role === 'admin' || req.user.role === 'main_admin'

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ ok: false, error: 'Access denied: You can only view viewers of your own stories.' })
    }

    const views = await StoryView.find({ story: story._id })
      .sort({ viewedAt: -1 })
      .populate('viewer', 'name username initials avatarColor profilePhoto')

    const viewers = views
      .filter(v => v.viewer)
      .map(v => ({
        id: v.viewer._id.toString(),
        name: v.viewer.name,
        username: v.viewer.username,
        initials: v.viewer.initials || (v.viewer.name ? v.viewer.name.slice(0, 2).toUpperCase() : 'U'),
        avatarColor: v.viewer.avatarColor || '#6366f1',
        profilePhoto: v.viewer.profilePhoto || null,
        viewedAt: v.viewedAt,
        time: formatRelativeTime(v.viewedAt),
      }))

    res.json({
      ok: true,
      storyId: req.params.storyId,
      viewsCount: viewers.length,
      viewers,
    })
  } catch (err) {
    console.error('[GET /api/stories/:storyId/viewers] Error:', err)
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: 'Story not found.' })
    }
    res.status(500).json({ ok: false, error: 'Failed to fetch viewers.' })
  }
})

// ── UPDATE STORY ──────────────────────────────────────────────────────────────
// PUT /api/stories/:storyId
router.put(
  '/:storyId',
  requireAuth,
  (req, res, next) => {
    uploadStoryPhoto(req, res, (err) => {
      if (err) {
        if (err.message === 'INVALID_FILE_TYPE') {
          return res.status(400).json({ ok: false, error: 'Only JPEG, PNG, WEBP, or GIF images are allowed.' })
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ ok: false, error: 'Story image must be 5MB or smaller.' })
        }
        return res.status(400).json({ ok: false, error: 'Upload failed. Please try again.' })
      }
      next()
    })
  },
  async (req, res) => {
    let uploadedAsset = null
    try {
      const story = await Story.findById(req.params.storyId)
      if (!story) {
        return res.status(404).json({ ok: false, error: 'Story not found.' })
      }

      const isAuthor = story.user.toString() === req.user.id
      const isAdmin = req.user.role === 'admin' || req.user.role === 'main_admin'

      if (!isAuthor && !isAdmin) {
        return res.status(403).json({ ok: false, error: 'Access denied: You can only edit your own stories.' })
      }

      if (req.body.caption !== undefined) {
        story.caption = req.body.caption.trim()
      }

      if (req.file) {
        try {
          uploadedAsset = await uploadStoryImage(req.file.buffer)
          // Clean up old Cloudinary asset
          if (story.imagePublicId) {
            await deleteStoryImage(story.imagePublicId).catch(() => {})
          }
          story.imageUrl = uploadedAsset.secureUrl
          story.imagePublicId = uploadedAsset.publicId
        } catch (uploadErr) {
          console.error('[PUT /api/stories/:storyId] Cloudinary upload error:', uploadErr)
          return res.status(502).json({ ok: false, error: 'Failed to upload new story image.' })
        } finally {
          if (req.file) {
            req.file.buffer = null
            delete req.file.buffer
          }
        }
      }

      await story.save()
      const populated = await story.populate('user', 'name username initials avatarColor profilePhoto')
      const viewsCount = await StoryView.countDocuments({ story: story._id })

      res.json({
        ok: true,
        story: serializeStory(populated, req.user.id, viewsCount, true),
      })
    } catch (err) {
      if (uploadedAsset?.publicId) {
        deleteStoryImage(uploadedAsset.publicId).catch(() => {})
      }
      console.error('[PUT /api/stories/:storyId] Error:', err)
      if (err.name === 'CastError') {
        return res.status(404).json({ ok: false, error: 'Story not found.' })
      }
      res.status(500).json({ ok: false, error: 'Failed to update story.' })
    }
  }
)

// ── DELETE STORY ──────────────────────────────────────────────────────────────
router.delete('/:storyId', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId)
    if (!story) {
      return res.status(404).json({ ok: false, error: 'Story not found.' })
    }

    const isAdmin = req.user.role === 'admin' || req.user.role === 'main_admin'
    const isAuthor = story.user.toString() === req.user.id

    if (!isAuthor && !isAdmin) {
      return res.status(403).json({ ok: false, error: 'You can only delete your own stories.' })
    }

    // Clean up Cloudinary asset
    if (story.imagePublicId) {
      await deleteStoryImage(story.imagePublicId).catch(err => {
        console.warn('[DELETE /api/stories] Failed to delete Cloudinary asset:', err)
      })
    }

    // Clean up associated views
    await StoryView.deleteMany({ story: story._id }).catch(() => {})

    await Story.findByIdAndDelete(story._id)
    res.json({ ok: true, storyId: req.params.storyId })
  } catch (err) {
    console.error('[DELETE /api/stories/:storyId] Error:', err)
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: 'Story not found.' })
    }
    res.status(500).json({ ok: false, error: 'Failed to delete story.' })
  }
})

export default router
