
import { Router } from 'express'
import { body, validationResult } from 'express-validator'
import { requireAuth } from '../middleware/auth.middleware.js'
import { uploadPostPhoto } from '../middleware/upload.middleware.js'
import Post from '../models/Post.js'
import Comment from '../models/Comment.js'
import User from '../models/User.js'

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
    if (validationError) return

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
      if (req.file) {
        imageUrl = `/uploads/posts/${req.file.filename}`
      }

      const post = await Post.create({
        user: req.user.id,
        caption,
        imageUrl,
        tags: Array.isArray(tags) ? tags : [],
      })
      req.user.posts += 1
      await req.user.save()

      const populated = await post.populate('user', 'name username initials avatarColor')
      res.status(201).json({ ok: true, post: serializePost(populated, req.user.id) })
    } catch (err) {
      console.error('[POST /api/posts] Error:', err)
      res.status(500).json({ ok: false, error: 'Failed to create post.' })
    }
  }
)

router.get('/', requireAuth, async (req, res) => {
  try {
    const posts = await Post.find({})
      .sort({ createdAt: -1 })
      .populate('user', 'name username initials avatarColor')

    res.json({ ok: true, posts: posts.map(p => serializePost(p, req.user.id)) })
  } catch (err) {
    console.error('[GET /api/posts] Error:', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch posts.' })
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
      .populate('user', 'name username initials avatarColor')

    res.json({
      ok: true,
      comments: comments.map(c => ({
        id: c.id,
        userId: c.user.id,
        userName: c.user.name,
        userInitials: c.user.initials,
        avatarColor: c.user.avatarColor,
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

      post.commentCount += 1
      await post.save()

      res.status(201).json({
        ok: true,
        comment: {
          id: comment.id,
          userId: req.user.id,
          userName: req.user.name,
          userInitials: req.user.initials,
          avatarColor: req.user.avatarColor,
          text: comment.text,
          createdAt: comment.createdAt,
        },
        commentCount: post.commentCount,
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
    // Ownership check — only the post author can delete
    if (post.user.toString() !== req.user.id) {
      return res.status(403).json({ ok: false, error: 'You can only delete your own posts.' })
    }

    // Cascade: remove all comments on this post
    await Comment.deleteMany({ post: post._id })

    // Remove the post itself
    await Post.findByIdAndDelete(post._id)

    // Decrement user's post count
    req.user.posts = Math.max(0, req.user.posts - 1)
    await req.user.save()

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

    // Decrement comment count
    post.commentCount = Math.max(0, post.commentCount - 1)
    await post.save()

    res.json({ ok: true, commentId: req.params.commentId, commentCount: post.commentCount })
  } catch (err) {
    console.error('[DELETE /api/posts/:postId/comments/:commentId] Error:', err)
    if (err.name === 'CastError') {
      return res.status(404).json({ ok: false, error: 'Not found.' })
    }
    res.status(500).json({ ok: false, error: 'Failed to delete comment.' })
  }
})

export default router
