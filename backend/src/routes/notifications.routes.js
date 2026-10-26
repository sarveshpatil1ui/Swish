import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import Notification from '../models/Notification.js'

const router = Router()

router.use(requireAuth)

function formatTimeAgo(date) {
  const diffSec = Math.floor((Date.now() - new Date(date).getTime()) / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return new Date(date).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

export function formatNotification(n) {
  return {
    id: n._id ? n._id.toString() : n.id,
    type: n.type,
    user: {
      id: n.sender?._id ? n.sender._id.toString() : (n.sender?.id || ''),
      name: n.sender?.name || 'Someone',
      username: n.sender?.username || '',
      initials: n.sender?.initials || '??',
      avatarColor: n.sender?.avatarColor || '#6366f1',
      profilePhoto: n.sender?.profilePhoto || null,
    },
    text: n.text,
    subtext: n.subtext || '',
    time: formatTimeAgo(n.createdAt || new Date()),
    createdAt: n.createdAt || new Date().toISOString(),
    read: Boolean(n.read),
    postId: n.post ? (n.post._id ? n.post._id.toString() : n.post.toString()) : null,
    noticeId: n.notice ? (n.notice._id ? n.notice._id.toString() : n.notice.toString()) : null,
  }
}

// ── GET /api/notifications ───────────────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const list = await Notification.find({ recipient: req.user._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'name username initials avatarColor profilePhoto')
      .lean()

    res.json({
      ok: true,
      notifications: list.map(formatNotification),
    })
  } catch (err) {
    console.error('[GET /api/notifications]', err)
    res.status(500).json({ ok: false, error: 'Failed to fetch notifications.' })
  }
})

// ── PATCH /api/notifications/:id/read ────────────────────────────────────────
router.patch('/read-all', async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, read: false },
      { $set: { read: true } }
    )
    res.json({ ok: true })
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to mark notifications as read.' })
  }
})

router.patch('/:id/read', async (req, res) => {
  try {
    const n = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { $set: { read: true } },
      { new: true }
    )
    if (!n) return res.status(404).json({ ok: false, error: 'Notification not found.' })
    res.json({ ok: true, id: n._id.toString() })
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Failed to update notification.' })
  }
})

export default router
