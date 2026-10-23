
import { Router } from 'express'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import { body, validationResult } from 'express-validator'
import { requireAuth } from '../middleware/auth.middleware.js'
import { uploadPostPhoto } from '../middleware/upload.middleware.js'
import { uploadPostImage, deletePostImage, isCloudinaryConfigured } from '../services/cloudinary.service.js'
import Post from '../models/Post.js'
import Comment from '../models/Comment.js'
import User from '../models/User.js'
import Follow from '../models/Follow.js'
import { broadcastEvent } from '../services/socket.service.js'
import { createNotification } from '../services/notification.service.js'

const router = Router()

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

export function normalizeTags(rawTags, caption = '') {
  let list = Array.isArray(rawTags) ? rawTags : []
  if (typeof rawTags === 'string') {
    try {
      const parsed = JSON.parse(rawTags)
      if (Array.isArray(parsed)) list = parsed
      else list = [rawTags]
    } catch {
      list = rawTags.split(',').map(t => t.trim())
    }
  }

  // Auto-extract #hashtags from caption
  const fromCaption = [...(caption || '').matchAll(/#([a-zA-Z0-9_]+)/g)].map(m => m[1])
  const combined = [...list, ...fromCaption]

  const normalizedSet = new Set()
  for (const tag of combined) {
    if (typeof tag !== 'string') continue
    const cleaned = tag.trim().replace(/^#+/, '').toLowerCase()
    if (cleaned && cleaned.length <= 50) {
      normalizedSet.add(cleaned)
    }
    if (normalizedSet.size >= 10) break
  }
  return Array.from(normalizedSet)
}

export function extractHashtags(caption = '') {
  return normalizeTags([], caption)
}

export function serializePost(post, viewerId) {
  const json = typeof post.toJSON === 'function' ? post.toJSON() : { ...post, id: (post._id ? post._id.toString() : post.id) }
  delete json._id
  delete json.__v
  if (json.user && typeof json.user === 'object') {
    const userObjId = json.user._id ? json.user._id.toString() : (json.user.id ? json.user.id.toString() : '')
    json.user = {
      ...json.user,
      id: userObjId,
    }
  }
  const likes = json.likes || []
  const savedBy = json.savedBy || []
  const viewerStr = viewerId ? viewerId.toString() : ''
  const likeCount = typeof json.likeCount === 'number' ? json.likeCount : likes.length
  return {
    ...json,
    likeCount,
    liked: likes.some(id => (id?._id?.toString() || id?.toString()) === viewerStr),
    saved: savedBy.some(id => (id?._id?.toString() || id?.toString()) === viewerStr),
    likes: undefined, // don't ship the full liker-id list to every client
    savedBy: undefined,
  }
}

router.post(
  '/',
  requireAuth,
  (req, res, next) => {
    uploadPostPhoto(req, res, (err) => {
      if (err) {
        if (err.message === 'INVALID_FILE_TYPE') {
          return res.status(400).json({ ok: false, error: 'Only JPEG, PNG, WEBP, or GIF images are allowed.' })
        }
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ ok: false, error: 'Image must be 5MB or smaller.' })
        }
        console.error('[POST /api/posts] Upload error:', err)
        return res.status(400).json({ ok: false, error: 'Upload failed. Please try again.' })
      }
      next()
    })
  },
  [
    body('caption').optional().trim().isLength({ max: 2200 }).withMessage('Caption too long.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) {
      if (req.file?.buffer) {
        req.file.buffer = null
        delete req.file.buffer
      }
      return
    }

    let uploadedAsset = null
    try {
      const { caption = '' } = req.body
      const rawTags = req.body.tags || []
      const tags = normalizeTags(rawTags, caption)

      const mentionedUsernames = [...caption.matchAll(/@([a-z0-9._-]+)/gi)].map(match => match[1].toLowerCase())
      if (mentionedUsernames.length > 0) {
        const mentionedUsers = await User.find({ username: { $in: mentionedUsernames } })
          .select('username preferences')
          .lean()
        const blockedUser = mentionedUsers.find(user => user.preferences?.privacy?.tagged === false)
        if (blockedUser) {
          return res.status(403).json({
            ok: false,
            error: `@${blockedUser.username} does not allow tagging.`,
          })
        }
      }

      let imageUrl = req.body.imageUrl || null
      let imagePublicId = null

      if (req.file) {
        if (isCloudinaryConfigured()) {
          try {
            uploadedAsset = await uploadPostImage(req.file.buffer)
            imageUrl = uploadedAsset.secureUrl
            imagePublicId = uploadedAsset.publicId
          } catch (uploadErr) {
            console.warn('[POST /api/posts] Cloudinary upload failed, falling back to local disk storage:', uploadErr.message)
          }
        }

        // Resilient fallback: save directly to uploads/posts if Cloudinary is unconfigured or fails
        if (!imageUrl) {
          const UPLOAD_DIR = path.join(process.cwd(), 'uploads', 'posts')
          fs.mkdirSync(UPLOAD_DIR, { recursive: true })
          const ext = path.extname(req.file.originalname).toLowerCase() || '.jpg'
          const filename = `${req.user.id}-${crypto.randomBytes(16).toString('hex')}${ext}`
          fs.writeFileSync(path.join(UPLOAD_DIR, filename), req.file.buffer)
          imageUrl = `/uploads/posts/${filename}`
        }

        // Immediately free up memory buffer so it is not retained in heap
        if (req.file) {
          req.file.buffer = null
          delete req.file.buffer
        }
      }

      let music = null
      if (req.body.music) {
        try {
          music = typeof req.body.music === 'string' ? JSON.parse(req.body.music) : req.body.music
        } catch {
          music = null
        }
      }

      const post = await Post.create({
        user: req.user.id,
        caption,
        imageUrl,
        imagePublicId,
        music,
        tags,
        collegeId: req.user.collegeId || null,
        likeCount: 0,
      })
      await User.findByIdAndUpdate(req.user.id, { $inc: { posts: 1 } })

      if (mentionedUsernames.length > 0) {
        const mentionedUsers = await User.find({
          username: { $in: mentionedUsernames },
          _id: { $ne: req.user._id },
          'preferences.privacy.tagged': { $ne: false },
        }).select('_id username')
        for (const mentionedUser of mentionedUsers) {
          await createNotification({
            recipient: mentionedUser._id,
            sender: req.user.id,
            type: 'mention',
            post: post._id,
            text: 'mentioned you in a post',
            subtext: caption.slice(0, 50),
          })
        }
      }

      const populated = await post.populate('user', 'name username initials avatarColor profilePhoto')
      res.status(201).json({ ok: true, post: serializePost(populated, req.user.id) })
    } catch (err) {
      // Clean up orphaned Cloudinary asset if MongoDB document creation failed
      if (uploadedAsset?.publicId) {
        deletePostImage(uploadedAsset.publicId).catch(() => {})
      }
      console.error('[POST /api/posts] Error:', err)
      res.status(500).json({ ok: false, error: 'Failed to create post.' })
    }
  }
)

router.get('/', requireAuth, async (req, res) => {
  try {
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 20), 50)
    const cursor = req.query.cursor // ISO date string of last-seen createdAt

    const filter = { hidden: false }

    // College-specific feed for college_admin role
    if (req.user.role === 'college_admin' && req.user.collegeId) {
      // Get all users from the same college
      const collegeUsers = await User.find({ collegeId: req.user.collegeId }).select('_id').lean()
      const collegeUserIds = collegeUsers.map(u => u._id)
      filter.user = { $in: collegeUserIds }
    } else {
      // Standard feed for students and faculty
      const [follows, privateUsers] = await Promise.all([
        Follow.find({ follower: req.user._id }).select('following').lean(),
        User.find({ 'preferences.privacy.private': true }).select('_id').lean(),
      ])
      const visibleUserIds = [req.user._id, ...follows.map(follow => follow.following)]
      const privateUserIds = privateUsers.map(user => user._id)
      filter.$or = [
        { user: { $in: visibleUserIds } },
        { user: { $nin: privateUserIds } },
      ]
    }

    if (cursor) {
      filter.createdAt = { $lt: new Date(cursor) }
    }

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('user', 'name username initials avatarColor profilePhoto')
      .lean()

    const hasMore = posts.length > limit
    if (hasMore) posts.pop()

    const nextCursor = hasMore && posts.length > 0
      ? posts[posts.length - 1].createdAt.toISOString()
      : null

    res.json({
      ok: true,
      posts: posts.map(p => serializePost(p, req.user.id)),
      nextCursor,
      hasMore,
    })
  } catch (err) {
    console.error('[GET /api/posts] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch posts.' })
  }
})

// ── Save / unsave a post ────────────────────────────────────────────────────
router.post('/:postId/save', requireAuth, async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.postId, isDeleted: false },
      { $addToSet: { savedBy: req.user._id } },
      { new: true }
    )
    if (!post) return res.status(404).json({ ok: false, error: 'Post not found.' })
    res.json({ ok: true, saved: true })
  } catch (err) {
    console.error('[POST /api/posts/:postId/save] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to save post.' })
  }
})

router.delete('/:postId/save', requireAuth, async (req, res) => {
  try {
    const post = await Post.findOneAndUpdate(
      { _id: req.params.postId, isDeleted: false },
      { $pull: { savedBy: req.user._id } },
      { new: true }
    )
    if (!post) return res.status(404).json({ ok: false, error: 'Post not found.' })
    res.json({ ok: true, saved: false })
  } catch (err) {
    console.error('[DELETE /api/posts/:postId/save] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to unsave post.' })
  }
})

// ── GET /api/posts/:postId ──────────────────────────────────────────────────
router.get('/:postId', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('user', 'name username initials avatarColor profilePhoto preferences')
      .lean()
    if (!post) {
      return res.status(404).json({ ok: false, error: 'Post not found.' })
    }
    const isOwner = post.user._id.toString() === req.user.id
    const isPrivate = post.user.preferences?.privacy?.private === true
    if (isPrivate && !isOwner) {
      const isFollowing = await Follow.exists({ follower: req.user._id, following: post.user._id })
      if (!isFollowing) {
        return res.status(403).json({ ok: false, error: 'This account is private.' })
      }
    }
    res.json({ ok: true, post: serializePost(post, req.user.id) })
  } catch (err) {
    console.error('[GET /api/posts/:postId] Error:', err)
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: 'Post not found.' })
    }
    res.status(500).json({ ok: false, error: 'Failed to fetch post.' })
  }
})

// ── GET /api/posts/:postId/likes ─────────────────────────────────────────────
router.get('/:postId/likes', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('likes', 'name username initials avatarColor profilePhoto followers')
      .lean()

    if (!post) {
      return res.status(404).json({ ok: false, error: 'Post not found.' })
    }

    const currentUserId = req.user.id.toString()
    const users = (post.likes || []).map(u => ({
      id: u._id.toString(),
      name: u.name,
      username: u.username,
      initials: u.initials,
      avatarColor: u.avatarColor,
      profilePhoto: u.profilePhoto,
      isFollowing: Array.isArray(u.followers) && u.followers.some(f => f.toString() === currentUserId),
    }))

    res.json({ ok: true, users })
  } catch (err) {
    console.error('[GET /api/posts/:postId/likes] Error:', err)
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: 'Post not found.' })
    }
    res.status(500).json({ ok: false, error: 'Failed to fetch likes.' })
  }
})

router.post('/:postId/like', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
    if (!post) {
      return res.status(404).json({ ok: false, error: 'Post not found.' })
    }

    const alreadyLiked = post.likes.some(id => id.toString() === req.user.id)
    if (alreadyLiked) {
      return res.status(409).json({
        ok: false,
        error: 'You already liked this post.',
        liked: true,
        likeCount: post.likes.length,
      })
    }

    // $addToSet is the atomic, race-safe way to guarantee a user can only
    // like a post once, even under concurrent requests.
    const updated = await Post.findByIdAndUpdate(
      req.params.postId,
      {
        $addToSet: { likes: req.user.id },
        $inc: { likeCount: 1 },
      },
      { new: true }
    )
    if (updated && updated.likeCount !== updated.likes.length) {
      updated.likeCount = updated.likes.length
      await updated.save()
    }

    // Broadcast real-time like count scoped to college room (avoids global broadcast storm)
    const collegeId = post.user?.collegeId || req.user.collegeId
    broadcastEvent('post:like:update', {
      postId: updated.id,
      likeCount: updated.likes.length,
      userId: req.user.id,
      action: 'like',
    }, { collegeId })

    // Create & emit notification to post owner if someone else liked
    if (post.user.toString() !== req.user.id) {
      try {
        await createNotification({
          recipient: post.user,
          sender: req.user.id,
          type: 'like',
          post: post._id,
          text: 'liked your post',
          subtext: post.caption ? post.caption.slice(0, 50) : '',
        })
      } catch (notifErr) {
        console.error('[Notification like error]', notifErr)
      }
    }

    res.json({
      ok: true,
      liked: true,
      likeCount: updated.likes.length,
      postId: updated.id,
    })
  } catch (err) {
    console.error('[POST /api/posts/:postId/like] Error:', err)
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: 'Post not found.' })
    }
    res.status(500).json({ ok: false, error: 'Failed to like post.' })
  }
})

router.delete('/:postId/like', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
    if (!post) {
      return res.status(404).json({ ok: false, error: 'Post not found.' })
    }
    const updated = await Post.findByIdAndUpdate(
      req.params.postId,
      {
        $pull: { likes: req.user.id },
        $inc: { likeCount: -1 },
      },
      { new: true }
    )
    if (updated && (updated.likeCount < 0 || updated.likeCount !== updated.likes.length)) {
      updated.likeCount = Math.max(0, updated.likes.length)
      await updated.save()
    }

    // Broadcast real-time like count scoped to college room (avoids global broadcast storm)
    const collegeId = post.user?.collegeId || req.user.collegeId
    broadcastEvent('post:like:update', {
      postId: updated.id,
      likeCount: updated.likes.length,
      userId: req.user.id,
      action: 'unlike',
    }, { collegeId })

    res.json({
      ok: true,
      liked: false,
      likeCount: updated.likes.length,
      postId: updated.id,
    })
  } catch (err) {
    console.error('[DELETE /api/posts/:postId/like] Error:', err)
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: 'Post not found.' })
    }
    res.status(500).json({ ok: false, error: 'Failed to unlike post.' })
  }
})

router.get('/:postId/comments', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
    if (!post) {
      return res.status(404).json({ ok: false, error: 'Post not found.' })
    }

    const comments = await Comment.find({ post: req.params.postId, isDeleted: false, hidden: false })
      .populate('user', 'name username initials avatarColor profilePhoto')
      .sort({ createdAt: -1 })
      .lean()

    res.json({
      ok: true,
      comments: comments.map(c => ({
        id: c._id.toString(),
        userId: c.user?.id || (c.user?._id ? c.user._id.toString() : ''),
        userName: c.user?.name || 'User',
        userInitials: c.user?.initials || 'U',
        avatarColor: c.user?.avatarColor || '#6366f1',
        profilePhoto: c.user.profilePhoto || null,
        text: c.text,
        createdAt: c.createdAt,
      })),
    })
  } catch (err) {
    console.error('[GET /api/posts/:postId/comments] Error:', err)
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: 'Post not found.' })
    }
    res.status(500).json({ ok: false, error: 'Failed to fetch comments.' })
  }
})

router.post(
  '/:postId/comments',
  requireAuth,
  [
    body('text')
      .trim()
      .notEmpty().withMessage('Comment cannot be empty.')
      .isLength({ max: 1000 }).withMessage('Comment must be 1000 characters or fewer.'),
  ],
  async (req, res) => {
    const validationError = handleValidationErrors(req, res)
    if (validationError) return

    try {
      const post = await Post.findById(req.params.postId)
      if (!post) {
        return res.status(404).json({ ok: false, error: 'Post not found.' })
      }

      const comment = await Comment.create({
        post: req.params.postId,
        user: req.user.id,
        text: req.body.text,
      })

      // Atomic increment
      const updatedPost = await Post.findByIdAndUpdate(
        req.params.postId,
        { $inc: { commentCount: 1 } },
        { new: true }
      )

      const commentPayload = {
        id: comment._id.toString(),
        _id: comment._id.toString(),
        userId: req.user.id,
        userName: req.user.name,
        userInitials: req.user.initials,
        avatarColor: req.user.avatarColor,
        profilePhoto: req.user.profilePhoto || null,
        text: comment.text,
        createdAt: comment.createdAt,
      }

      // Broadcast real-time comment update scoped to college room (avoids global broadcast storm)
      const collegeId = post.user?.collegeId || req.user.collegeId
      broadcastEvent('post:comment:update', {
        postId: req.params.postId,
        commentCount: updatedPost ? updatedPost.commentCount : 1,
        comment: commentPayload,
      }, { collegeId })

      // Create & emit notification to post owner if someone else commented
      if (post.user.toString() !== req.user.id) {
        try {
          await createNotification({
            recipient: post.user,
            sender: req.user.id,
            type: 'comment',
            post: post._id,
            text: 'commented on your post',
            subtext: req.body.text ? req.body.text.slice(0, 50) : '',
          })
        } catch (notifErr) {
          console.error('[Notification comment error]', notifErr)
        }
      }

      res.status(201).json({
        ok: true,
        comment: commentPayload,
        commentCount: updatedPost ? updatedPost.commentCount : 1,
      })
    } catch (err) {
      console.error('[POST /api/posts/:postId/comments] Error:', err)
      if (err.name === 'CastError') {
        return res.status(404).json({ ok: false, error: 'Post not found.' })
      }
      res.status(500).json({ ok: false, error: 'Failed to add comment.' })
    }
  }
)

// ── DELETE POST ────────────────────────────────────────────────────────────────
router.delete('/:postId', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
    if (!post) {
      return res.status(404).json({ ok: false, error: 'Post not found.' })
    }
    const isAdmin = req.user.role === 'admin' || req.user.role === 'main_admin'
    // Ownership check — author or admin can delete
    if (post.user.toString() !== req.user.id && !isAdmin) {
      return res.status(403).json({ ok: false, error: 'You can only delete your own posts.' })
    }

    // Cascade: remove all comments on this post
    await Comment.deleteMany({ post: post._id })

    // Clean up Cloudinary asset if post has one
    if (post.imagePublicId) {
      await deletePostImage(post.imagePublicId).catch(err => {
        console.warn('[DELETE /api/posts] Failed to delete Cloudinary asset:', err)
      })
    }

    // Remove the post itself
    await Post.findByIdAndDelete(post._id)

    // Decrement author's post count atomically
    await User.findByIdAndUpdate(post.user, [
      { $set: { posts: { $max: [0, { $subtract: ['$posts', 1] }] } } }
    ])

    res.json({ ok: true, postId: req.params.postId })
  } catch (err) {
    console.error('[DELETE /api/posts/:postId] Error:', err)
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: 'Post not found.' })
    }
    res.status(500).json({ ok: false, error: 'Failed to delete post.' })
  }
})

// ── DELETE COMMENT ─────────────────────────────────────────────────────────────
router.delete('/:postId/comments/:commentId', requireAuth, async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId)
    if (!comment) {
      return res.status(404).json({ ok: false, error: 'Comment not found.' })
    }

    // Authorization: comment author OR post owner can delete
    const post = await Post.findById(req.params.postId)
    if (!post) {
      return res.status(404).json({ ok: false, error: 'Post not found.' })
    }

    const isCommentAuthor = comment.user.toString() === req.user.id
    const isPostOwner = post.user.toString() === req.user.id
    if (!isCommentAuthor && !isPostOwner) {
      return res.status(403).json({ ok: false, error: 'You cannot delete this comment.' })
    }

    await Comment.findByIdAndDelete(comment._id)

    // Decrement comment count atomically
    const updatedPost = await Post.findByIdAndUpdate(
      req.params.postId,
      [{ $set: { commentCount: { $max: [0, { $subtract: ['$commentCount', 1] }] } } }],
      { new: true }
    )

    res.json({
      ok: true,
      commentId: req.params.commentId,
      commentCount: updatedPost ? updatedPost.commentCount : 0,
    })
  } catch (err) {
    console.error('[DELETE /api/posts/:postId/comments/:commentId] Error:', err)
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: 'Not found.' })
    }
    res.status(500).json({ ok: false, error: 'Failed to delete comment.' })
  }
})

export default router
