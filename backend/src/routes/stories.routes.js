import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth } from '../middleware/auth.middleware.js'
import { uploadStoryPhoto } from '../middleware/upload.middleware.js'
import { uploadStoryImage, deleteStoryImage } from '../services/cloudinary.service.js'
import Story from '../models/Story.js'
import StoryView from '../models/StoryView.js'
import Follow from '../models/Follow.js'
import College from '../models/College.js'
import { Conversation } from '../models/Conversation.js'
import { emitToUser, getIO } from '../services/socket.service.js'
import { createNotification } from '../services/notification.service.js'

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

export function serializeStory(story, currentUserId, viewsCount = 0, hasSeen = false) {
  const user = story.user
  const authorId = user?._id?.toString() || user?.id || (typeof user === 'string' ? user : '')
  const isOwn = authorId === currentUserId?.toString()
  const likes = story.likes || []
  const replies = story.replies || []

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
    music: story.music || null,
    filter: story.filter || 'normal',
    sticker: story.sticker || null,
    likesCount: likes.length,
    isLiked: likes.some(l => (l?._id?.toString() || l?.toString()) === currentUserId?.toString()),
    repliesCount: replies.length,
    replies: replies.map(r => ({
      id: r._id ? r._id.toString() : undefined,
      userId: r.user?._id?.toString() || r.user?.toString(),
      name: r.user?.name || 'User',
      username: r.user?.username || '',
      initials: r.user?.initials || 'U',
      avatarColor: r.user?.avatarColor || '#6366f1',
      profilePhoto: r.user?.profilePhoto || null,
      text: r.text,
      createdAt: r.createdAt,
    })),
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
    const isMainAdmin = req.user.role === 'main_admin' || req.user.role === 'admin'
    let tenantCollegeId = req.user.collegeId ? req.user.collegeId.toString() : null

    if (isMainAdmin) {
      const candidateId = req.query.collegeId || req.headers['x-college-id']
      if (!candidateId) {
        return res.status(400).json({
          ok: false,
          error: 'Explicit college context (?collegeId=...) is required for administrative stories inspection.',
        })
      }
      const college = await College.findById(candidateId).select('_id').lean()
      if (!college) {
        return res.status(404).json({ ok: false, error: 'Specified college not found.' })
      }
      tenantCollegeId = college._id.toString()
    } else if (!tenantCollegeId) {
      return res.status(403).json({ ok: false, error: 'College membership required to view stories.' })
    }

    // Find all users the current user follows using legacy-safe isActive filter
    const follows = await Follow.find({ follower: req.user._id, isActive: { $ne: false } }).select('following')
    const followingIds = follows.map(f => f.following)
    const allowedAuthorIds = [req.user._id, ...followingIds]

    const now = new Date()
    // Explicitly filter for expiresAt > now and collegeId so expired or foreign stories are never returned
    const stories = await Story.find({
      user: { $in: allowedAuthorIds },
      collegeId: tenantCollegeId,
      expiresAt: { $gt: now },
    })
      .sort({ createdAt: 1 })
      .populate('user', 'name username initials avatarColor profilePhoto')
      .populate('replies.user', 'name username initials avatarColor profilePhoto')
      .lean()

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
      if (!req.user.collegeId) {
        return res.status(403).json({
          ok: false,
          error: 'You must be affiliated with an active college to post stories.',
        })
      }
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

      let music = null
      if (req.body.music) {
        try {
          music = typeof req.body.music === 'string' ? JSON.parse(req.body.music) : req.body.music
        } catch {
          music = null
        }
      }

      let sticker = null
      if (req.body.sticker) {
        try {
          sticker = typeof req.body.sticker === 'string' ? JSON.parse(req.body.sticker) : req.body.sticker
        } catch {
          sticker = null
        }
      }

      const filter = req.body.filter || 'normal'

      const story = await Story.create({
        user: req.user.id,
        imageUrl,
        imagePublicId,
        caption: (req.body.caption || '').trim(),
        music,
        filter,
        sticker,
        expiresAt,
        collegeId: req.user.collegeId,
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

    const isMainAdmin = req.user.role === 'admin' || req.user.role === 'main_admin'
    if (!isMainAdmin && (!story.collegeId || story.collegeId.toString() !== req.user.collegeId?.toString())) {
      return res.status(404).json({ ok: false, error: 'Story not found.' })
    }

    if (story.expiresAt && story.expiresAt <= new Date()) {
      return res.status(410).json({ ok: false, error: 'Story has expired.' })
    }

    const isAuthor = story.user?._id?.toString() === req.user.id
    const isAdmin = isMainAdmin
    let isFollowing = false

    if (!isAuthor && !isAdmin) {
      isFollowing = await Follow.exists({ follower: req.user._id, following: story.user._id, isActive: { $ne: false } })
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

    const isMainAdmin = req.user.role === 'admin' || req.user.role === 'main_admin'
    if (!isMainAdmin && (!story.collegeId || story.collegeId.toString() !== req.user.collegeId?.toString())) {
      return res.status(404).json({ ok: false, error: 'Story not found.' })
    }

    if (story.expiresAt && story.expiresAt <= new Date()) {
      return res.status(410).json({ ok: false, error: 'Story has expired.' })
    }

    const isAuthor = story.user.toString() === req.user.id
    const isAdmin = isMainAdmin

    // Verify privacy
    if (!isAuthor && !isAdmin) {
      const isFollowing = await Follow.exists({ follower: req.user._id, following: story.user, isActive: { $ne: false } })
      if (!isFollowing) {
        return res.status(403).json({ ok: false, error: 'Access denied: You must follow this user to view their story.' })
      }
    }

    // In production, do not count the story owner as a viewer. In development, allow recording so self-tests show up in viewers.
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV !== 'production'
    if (isAuthor && !isDev) {
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
        reaction: v.reaction || null,
        reactedAt: v.reactedAt || null,
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

// ── LIKE / UNLIKE STORY ───────────────────────────────────────────────────────
// POST /api/stories/:storyId/like
router.post('/:storyId/like', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId)
    if (!story) return res.status(404).json({ ok: false, error: 'Story not found.' })

    const isMainAdmin = req.user.role === 'admin' || req.user.role === 'main_admin'
    if (!isMainAdmin && (!story.collegeId || story.collegeId.toString() !== req.user.collegeId?.toString())) {
      return res.status(404).json({ ok: false, error: 'Story not found.' })
    }

    if (story.expiresAt && story.expiresAt <= new Date()) {
      return res.status(410).json({ ok: false, error: 'Story has expired.' })
    }

    const alreadyLiked = (story.likes || []).some(l => l.toString() === req.user.id)
    if (alreadyLiked) {
      await Story.updateOne({ _id: story._id }, { $pull: { likes: req.user._id } })
      await StoryView.updateOne(
        { story: story._id, viewer: req.user._id, reaction: '❤️' },
        { $set: { reaction: null, reactedAt: null } }
      )
    } else {
      await Story.updateOne({ _id: story._id }, { $addToSet: { likes: req.user._id } })
      await StoryView.findOneAndUpdate(
        { story: story._id, viewer: req.user._id },
        {
          $set: { reaction: '❤️', reactedAt: new Date() },
          $setOnInsert: { viewedAt: new Date() },
        },
        { upsert: true }
      )
    }

    const updated = await Story.findById(story._id).select('likes')
    const isLiked = !alreadyLiked
    const likesCount = (updated.likes || []).length

    const authorObjectId = story.user?._id || story.user
    const authorId = authorObjectId.toString()
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV !== 'production'
    const shouldNotify = (authorId !== req.user.id) || isDev

    if (!alreadyLiked && shouldNotify) {
      try {
        await createNotification({
          recipient: authorObjectId,
          sender: req.user._id,
          type: 'like',
          text: 'liked your story',
          subtext: story.caption ? story.caption.slice(0, 50) : '',
        })
      } catch (notifErr) {
        console.error('[Story like notification error]', notifErr)
      }
    }

    res.json({ ok: true, isLiked, likesCount })
  } catch (err) {
    console.error('[POST /api/stories/:storyId/like] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to update story like.' })
  }
})

// ── REACT TO STORY (EMOJI REACTION) ──────────────────────────────────────────
// POST /api/stories/:storyId/react
router.post('/:storyId/react', requireAuth, async (req, res) => {
  try {
    let emoji = req.body?.emoji
    if (!emoji && typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body)
        emoji = parsed?.emoji || parsed
      } catch {}
    }

    if (typeof emoji !== 'string' || !emoji.trim()) {
      return res.status(400).json({ ok: false, error: 'Reaction emoji is required.' })
    }

    const story = await Story.findById(req.params.storyId)
    if (!story) return res.status(404).json({ ok: false, error: 'Story not found.' })

    const isMainAdmin = req.user.role === 'admin' || req.user.role === 'main_admin'
    if (!isMainAdmin && (!story.collegeId || story.collegeId.toString() !== req.user.collegeId?.toString())) {
      return res.status(404).json({ ok: false, error: 'Story not found.' })
    }

    if (story.expiresAt && story.expiresAt <= new Date()) {
      return res.status(410).json({ ok: false, error: 'Story has expired.' })
    }

    const trimmedEmoji = emoji.trim()

    // Upsert or update the viewer's StoryView with this reaction
    await StoryView.findOneAndUpdate(
      { story: story._id, viewer: req.user._id },
      {
        $set: { reaction: trimmedEmoji, reactedAt: new Date() },
        $setOnInsert: { viewedAt: new Date() },
      },
      { upsert: true, new: true }
    )

    // If reaction is ❤️, also ensure likes is updated on the story
    if (trimmedEmoji === '❤️') {
      await Story.updateOne({ _id: story._id }, { $addToSet: { likes: req.user._id } })
    }

    const authorObjectId = story.user?._id || story.user
    const authorId = authorObjectId.toString()
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV !== 'production'
    const shouldNotify = (authorId !== req.user.id) || isDev

    // Forward as direct message to story author if sender is not the author
    if (authorId !== req.user.id) {
      try {
        let conv = await Conversation.findOne({
          participants: { $all: [req.user._id, authorObjectId], $size: 2 },
        })
        if (conv && conv.isArchived) {
          // Do not send DM to archived cross-college conversation
          return res.json({ ok: true, reaction: trimmedEmoji, message: 'Reaction recorded (conversation archived).' })
        }
        if (!conv) {
          conv = await Conversation.create({
            participants: [req.user._id, authorObjectId],
            collegeId: req.user.collegeId,
            isArchived: false,
            messages: [],
          })
        }
        const dmText = `Reacted ${trimmedEmoji} to your story`
        const storyReplyData = {
          storyId: story._id,
          imageUrl: story.imageUrl,
          reaction: trimmedEmoji,
          caption: story.caption || '',
          storyAuthorId: authorObjectId,
        }
        conv.messages.push({
          sender: req.user._id,
          text: dmText,
          readBy: [req.user._id],
          storyReply: storyReplyData,
        })
        conv.lastMessage = dmText.slice(0, 100)
        conv.lastMessageAt = new Date()
        conv.lastSender = req.user._id
        await conv.save()

        const savedMsg = conv.messages[conv.messages.length - 1]
        const msgPayload = {
          id: savedMsg._id.toString(),
          convId: conv._id.toString(),
          senderId: req.user.id,
          senderName: req.user.name,
          text: dmText,
          createdAt: savedMsg.createdAt,
          readBy: [req.user.id],
          storyReply: {
            storyId: story._id.toString(),
            imageUrl: story.imageUrl,
            reaction: trimmedEmoji,
            caption: story.caption || '',
            storyAuthorId: authorId,
          },
        }

        // Socket notifications for messaging reflection in real-time
        emitToUser(authorId, 'msg:new', msgPayload)
        emitToUser(authorId, 'msg:notification', {
          convId: conv._id.toString(),
          senderId: req.user.id,
          senderName: req.user.name,
          text: dmText,
          createdAt: savedMsg.createdAt,
          storyReply: msgPayload.storyReply,
        })

        const io = getIO()
        if (io) {
          io.to(`conv:${conv._id.toString()}`).emit('msg:new', msgPayload)
        }
      } catch (dmErr) {
        console.warn('[Story React] DM sync warning:', dmErr)
      }
    }

    // Real-time story react update to author
    emitToUser(authorId, 'story:react', {
      storyId: story._id.toString(),
      viewerId: req.user.id,
      emoji: trimmedEmoji,
      viewer: {
        id: req.user.id,
        name: req.user.name,
        username: req.user.username,
        initials: req.user.initials,
        avatarColor: req.user.avatarColor,
        profilePhoto: req.user.profilePhoto || null,
        reaction: trimmedEmoji,
      },
    })

    // Create & emit notification for emoji reaction
    if (shouldNotify) {
      try {
        await createNotification({
          recipient: authorObjectId,
          sender: req.user._id,
          type: 'comment',
          text: `reacted ${trimmedEmoji} to your story`,
          subtext: trimmedEmoji,
        })
      } catch (notifErr) {
        console.error('[Story reaction notification error]', notifErr)
      }
    }

    res.json({ ok: true, message: 'Reaction recorded.', reaction: trimmedEmoji })
  } catch (err) {
    console.error('[POST /api/stories/:storyId/react] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to record reaction.' })
  }
})

// ── REPLY / COMMENT ON STORY ─────────────────────────────────────────────────
// POST /api/stories/:storyId/reply
router.post('/:storyId/reply', requireAuth, async (req, res) => {
  try {
    let text = req.body?.text
    if (!text && typeof req.body === 'string') {
      try {
        const parsed = JSON.parse(req.body)
        text = parsed?.text || parsed
      } catch {}
    }

    if (typeof text !== 'string' || !text.trim()) {
      return res.status(400).json({ ok: false, error: 'Reply text cannot be empty.' })
    }

    const story = await Story.findById(req.params.storyId)
    if (!story) return res.status(404).json({ ok: false, error: 'Story not found.' })

    const isMainAdmin = req.user.role === 'admin' || req.user.role === 'main_admin'
    if (!isMainAdmin && (!story.collegeId || story.collegeId.toString() !== req.user.collegeId?.toString())) {
      return res.status(404).json({ ok: false, error: 'Story not found.' })
    }

    if (story.expiresAt && story.expiresAt <= new Date()) {
      return res.status(410).json({ ok: false, error: 'Story has expired.' })
    }

    const replyId = new mongoose.Types.ObjectId()
    const replyItem = {
      _id: replyId,
      user: req.user._id,
      text: text.trim().slice(0, 500),
      createdAt: new Date(),
    }

    if (!Array.isArray(story.replies)) {
      story.replies = []
    }
    story.replies.push(replyItem)
    await story.save()

    const formattedReply = {
      id: replyId.toString(),
      _id: replyId.toString(),
      userId: req.user._id.toString(),
      name: req.user.name || 'User',
      username: req.user.username || '',
      initials: req.user.initials || (req.user.name ? req.user.name.slice(0, 2).toUpperCase() : 'U'),
      avatarColor: req.user.avatarColor || '#6366f1',
      profilePhoto: req.user.profilePhoto || null,
      text: replyItem.text,
      createdAt: replyItem.createdAt,
      time: 'Just now',
    }

    const authorObjectId = story.user?._id || story.user
    const authorId = authorObjectId.toString()
    const isDev = !process.env.NODE_ENV || process.env.NODE_ENV !== 'production'
    const shouldNotify = (authorId !== req.user.id) || isDev

    // Forward as direct message to story author if sender is not the author (Instagram-style)
    if (authorId !== req.user.id) {
      try {
        let conv = await Conversation.findOne({
          participants: { $all: [req.user._id, authorObjectId], $size: 2 },
        })
        if (conv && conv.isArchived) {
          // Do not send DM to archived cross-college conversation
          return res.status(201).json({ ok: true, reply: formattedReply, message: 'Reply added (direct message skipped: conversation archived).' })
        }
        if (!conv) {
          conv = await Conversation.create({
            participants: [req.user._id, authorObjectId],
            collegeId: req.user.collegeId,
            isArchived: false,
            messages: [],
          })
        }
        const dmText = text.trim()
        const storyReplyData = {
          storyId: story._id,
          imageUrl: story.imageUrl,
          reaction: null,
          caption: story.caption || '',
          storyAuthorId: authorObjectId,
        }
        conv.messages.push({
          sender: req.user._id,
          text: dmText,
          readBy: [req.user._id],
          storyReply: storyReplyData,
        })
        conv.lastMessage = `Replied to story: ${dmText}`.slice(0, 100)
        conv.lastMessageAt = new Date()
        conv.lastSender = req.user._id
        await conv.save()

        const savedMsg = conv.messages[conv.messages.length - 1]
        const msgPayload = {
          id: savedMsg._id.toString(),
          convId: conv._id.toString(),
          senderId: req.user.id,
          senderName: req.user.name,
          text: dmText,
          createdAt: savedMsg.createdAt,
          readBy: [req.user.id],
          storyReply: {
            storyId: story._id.toString(),
            imageUrl: story.imageUrl,
            reaction: null,
            caption: story.caption || '',
            storyAuthorId: authorId,
          },
        }

        emitToUser(authorId, 'msg:new', msgPayload)
        emitToUser(authorId, 'msg:notification', {
          convId: conv._id.toString(),
          senderId: req.user.id,
          senderName: req.user.name,
          text: `Replied to your story: ${dmText}`,
          createdAt: savedMsg.createdAt,
          storyReply: msgPayload.storyReply,
        })

        const io = getIO()
        if (io) {
          io.to(`conv:${conv._id.toString()}`).emit('msg:new', msgPayload)
        }
      } catch (dmErr) {
        console.warn('[Story Reply] DM sync warning:', dmErr)
      }
    }

    // Real-time story comment update for comment section
    emitToUser(authorId, 'story:reply', {
      storyId: story._id.toString(),
      reply: formattedReply,
    })

    // Create & emit notification for comment
    if (shouldNotify) {
      try {
        await createNotification({
          recipient: authorObjectId,
          sender: req.user._id,
          type: 'comment',
          text: `commented on your story: "${text.trim().slice(0, 45)}"`,
          subtext: text.trim(),
        })
      } catch (notifErr) {
        console.error('[Story reply notification error]', notifErr)
      }
    }

    res.json({ ok: true, message: 'Reply sent successfully.', reply: formattedReply })
  } catch (err) {
    console.error('[POST /api/stories/:storyId/reply] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to send reply.' })
  }
})

// ── GET STORY REPLIES ────────────────────────────────────────────────────────
// GET /api/stories/:storyId/replies
router.get('/:storyId/replies', requireAuth, async (req, res) => {
  try {
    const story = await Story.findById(req.params.storyId)
      .populate('replies.user', 'name username initials avatarColor profilePhoto')
    if (!story) return res.status(404).json({ ok: false, error: 'Story not found.' })

    const isMainAdmin = req.user.role === 'admin' || req.user.role === 'main_admin'
    if (!isMainAdmin && (!story.collegeId || story.collegeId.toString() !== req.user.collegeId?.toString())) {
      return res.status(404).json({ ok: false, error: 'Story not found.' })
    }

    const replies = (story.replies || []).map(r => ({
      id: r._id ? r._id.toString() : undefined,
      userId: r.user?._id?.toString() || r.user?.id || (typeof r.user === 'string' ? r.user : ''),
      name: r.user?.name || (r.user?.toString() === req.user.id ? req.user.name : 'User'),
      username: r.user?.username || (r.user?.toString() === req.user.id ? req.user.username : ''),
      initials: r.user?.initials || (r.user?.name ? r.user.name.slice(0, 2).toUpperCase() : 'U'),
      avatarColor: r.user?.avatarColor || '#6366f1',
      profilePhoto: r.user?.profilePhoto || null,
      text: r.text,
      createdAt: r.createdAt,
      time: formatRelativeTime(r.createdAt),
    }))

    res.json({ ok: true, replies })
  } catch (err) {
    console.error('[GET /api/stories/:storyId/replies] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch replies.' })
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
      if (!req.user.collegeId) {
        return res.status(403).json({
          ok: false,
          error: 'You must be affiliated with an active college to post stories.',
        })
      }
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

    const isMainAdmin = req.user.role === 'admin' || req.user.role === 'main_admin'
    const isCollegeAdmin = req.user.role === 'college_admin' && story.collegeId?.toString() === req.user.collegeId?.toString()
    const isAuthor = story.user.toString() === req.user.id

    if (!isAuthor && !isMainAdmin && !isCollegeAdmin) {
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
