
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { requireAuth } from '../middleware/auth.middleware.js'
import { uploadPostPhoto } from '../middleware/upload.middleware.js'
import { uploadPostImage, deletePostImage } from '../services/cloudinary.service.js'
import Post from '../models/Post.js'
import Comment from '../models/Comment.js'
import User from '../models/User.js'
import Notification from '../models/Notification.js'
import { emitToUser, broadcastEvent } from '../services/socket.service.js'
import { formatNotification } from './notifications.routes.js'

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

function serializePost(post, viewerId) {
  const json = post.toJSON()
  return {
    ...json,
    likeCount: post.likes.length,
    liked: post.likes.some(id => id.toString() === viewerId),
    likes: undefined, // don't ship the full liker-id list to every client
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
      let tags = req.body.tags || []
      
      if (typeof tags === 'string') {
        try {
          tags = JSON.parse(tags)
        } catch {
          tags = []
        }
      }

      let imageUrl = req.body.imageUrl || null
      let imagePublicId = null

      if (req.file) {
        try {
          uploadedAsset = await uploadPostImage(req.file.buffer)
          imageUrl = uploadedAsset.secureUrl
          imagePublicId = uploadedAsset.publicId
        } catch (uploadErr) {
          console.error('[POST /api/posts] Cloudinary upload error:', uploadErr)
          return res.status(502).json({
            ok: false,
            error: 'Failed to upload image. Please try again.',
          })
        } finally {
          // Immediately free up memory buffer so it is not retained
          if (req.file) {
            req.file.buffer = null
            delete req.file.buffer
          }
        }
      }

      const post = await Post.create({
        user: req.user.id,
        caption,
        imageUrl,
        imagePublicId,
        tags: Array.isArray(tags) ? tags : [],
      })
      await User.findByIdAndUpdate(req.user.id, { $inc: { posts: 1 } })

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

    const filter = cursor
      ? { createdAt: { $lt: new Date(cursor) } }
      : {}

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .populate('user', 'name username initials avatarColor profilePhoto')

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

// ── GET /api/posts/:postId ──────────────────────────────────────────────────
router.get('/:postId', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId)
      .populate('user', 'name username initials avatarColor profilePhoto')
    if (!post) {
      return res.status(404).json({ ok: false, error: 'Post not found.' })
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
      { $addToSet: { likes: req.user.id } },
      { new: true }
    )

    // Broadcast real-time like count to all connected clients
    broadcastEvent('post:like:update', {
      postId: updated.id,
      likeCount: updated.likes.length,
      userId: req.user.id,
      action: 'like',
    })

    // Create & emit notification to post owner if someone else liked
    if (post.user.toString() !== req.user.id) {
      try {
        const notif = await Notification.create({
          recipient: post.user,
          sender: req.user.id,
          type: 'like',
          post: post._id,
          text: 'liked your post',
          subtext: post.caption ? post.caption.slice(0, 50) : '',
        })
        const populated = await notif.populate('sender', 'name username initials avatarColor profilePhoto')
        emitToUser(post.user, 'notification:new', formatNotification(populated))
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
      { $pull: { likes: req.user.id } },
      { new: true }
    )

    // Broadcast real-time like count to all connected clients
    broadcastEvent('post:like:update', {
      postId: updated.id,
      likeCount: updated.likes.length,
      userId: req.user.id,
      action: 'unlike',
    })

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

    const comments = await Comment.find({ post: req.params.postId })
      .sort({ createdAt: -1 })
      .populate('user', 'name username initials avatarColor profilePhoto')

    res.json({
      ok: true,
      comments: comments.map(c => ({
        id: c.id,
        userId: c.user.id,
        userName: c.user.name,
        userInitials: c.user.initials,
        avatarColor: c.user.avatarColor,
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

      // Broadcast real-time comment update to all connected clients
      broadcastEvent('post:comment:update', {
        postId: req.params.postId,
        commentCount: updatedPost ? updatedPost.commentCount : 1,
        comment: commentPayload,
      })

      // Create & emit notification to post owner if someone else commented
      if (post.user.toString() !== req.user.id) {
        try {
          const notif = await Notification.create({
            recipient: post.user,
            sender: req.user.id,
            type: 'comment',
            post: post._id,
            text: 'commented on your post',
            subtext: req.body.text ? req.body.text.slice(0, 50) : '',
          })
          const populated = await notif.populate('sender', 'name username initials avatarColor profilePhoto')
          emitToUser(post.user, 'notification:new', formatNotification(populated))
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
