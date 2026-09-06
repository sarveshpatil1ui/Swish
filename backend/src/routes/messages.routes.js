import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { Conversation } from '../models/Conversation.js'
import User from '../models/User.js'

const router = Router()

// All routes require auth
router.use(requireAuth)

// ── Helper: format conversation for client ────────────────────────────────────
function formatConv(conv, myId) {
  const other = conv.participants.find(p => p._id.toString() !== myId.toString())

  // Count unread messages (sent by other, not read by me)
  const unread = conv.messages.filter(
    m => m.sender.toString() !== myId.toString() && !m.readBy.map(r => r.toString()).includes(myId.toString())
  ).length

  return {
    id:           conv._id.toString(),
    participantId: other?._id?.toString(),
    name:         other?.name         ?? 'Unknown',
    username:     other?.username     ?? '',
    initials:     other?.initials     ?? '??',
    avatarColor:  other?.avatarColor  ?? '#6366f1',
    profilePhoto: other?.profilePhoto ?? null,
    lastMessage:  conv.lastMessage    ?? '',
    lastMessageAt:conv.lastMessageAt  ?? conv.updatedAt,
    lastSenderId: conv.lastSender?.toString() ?? null,
    unread,
  }
}

// ── GET /api/messages — list all conversations for current user ───────────────
router.get('/', async (req, res) => {
  try {
    const convs = await Conversation.find({ participants: req.user._id })
      .sort({ lastMessageAt: -1 })
      .populate('participants', 'name username initials avatarColor profilePhoto')
      .lean({ virtuals: true })

    const result = convs.map(c => formatConv(c, req.user._id))
    res.json({ ok: true, conversations: result })
  } catch (err) {
    console.error('[GET /messages]', err)
    res.status(500).json({ ok: false, error: 'Failed to load conversations.' })
  }
})

// ── GET /api/messages/:convId — get all messages in a conversation ────────────
router.get('/:convId', async (req, res) => {
  try {
    const conv = await Conversation.findOne({
      _id:          req.params.convId,
      participants: req.user._id,
    }).populate('participants', 'name username initials avatarColor profilePhoto')
      .populate('messages.sender', 'name initials avatarColor')

    if (!conv) return res.status(404).json({ ok: false, error: 'Conversation not found.' })

    // Mark all unread messages as read
    let modified = false
    for (const msg of conv.messages) {
      const alreadyRead = msg.readBy.map(r => r.toString()).includes(req.user._id.toString())
      if (!alreadyRead && msg.sender.toString() !== req.user._id.toString()) {
        msg.readBy.push(req.user._id)
        modified = true
      }
    }
    if (modified) await conv.save()

    const messages = conv.messages.map(m => ({
      id:        m._id.toString(),
      senderId:  m.sender._id ? m.sender._id.toString() : m.sender.toString(),
      text:      m.text,
      createdAt: m.createdAt,
      readBy:    m.readBy.map(r => r.toString()),
    }))

    res.json({ ok: true, messages })
  } catch (err) {
    console.error('[GET /messages/:convId]', err)
    res.status(500).json({ ok: false, error: 'Failed to load messages.' })
  }
})

// ── POST /api/messages — start or get a conversation with a user ──────────────
router.post('/', async (req, res) => {
  try {
    const { participantId } = req.body
    if (!participantId) return res.status(400).json({ ok: false, error: 'participantId required.' })
    if (participantId === req.user._id.toString()) return res.status(400).json({ ok: false, error: 'Cannot message yourself.' })

    const other = await User.findById(participantId).lean()
    if (!other) return res.status(404).json({ ok: false, error: 'User not found.' })

    // Find or create conversation
    let conv = await Conversation.findOne({
      participants: { $all: [req.user._id, participantId], $size: 2 },
    }).populate('participants', 'name username initials avatarColor profilePhoto')

    if (!conv) {
      conv = await Conversation.create({
        participants: [req.user._id, participantId],
        messages:     [],
      })
      conv = await conv.populate('participants', 'name username initials avatarColor profilePhoto')
    }

    res.json({ ok: true, conversation: formatConv(conv, req.user._id), convId: conv._id.toString() })
  } catch (err) {
    console.error('[POST /messages]', err)
    res.status(500).json({ ok: false, error: 'Failed to create conversation.' })
  }
})

// ── POST /api/messages/:convId/send — send a message ─────────────────────────
router.post('/:convId/send', async (req, res) => {
  try {
    const { text } = req.body
    if (!text?.trim()) return res.status(400).json({ ok: false, error: 'Message text is required.' })

    const conv = await Conversation.findOne({
      _id:          req.params.convId,
      participants: req.user._id,
    })
    if (!conv) return res.status(404).json({ ok: false, error: 'Conversation not found.' })

    const msg = {
      sender:  req.user._id,
      text:    text.trim(),
      readBy:  [req.user._id],
    }

    conv.messages.push(msg)
    conv.lastMessage   = text.trim().slice(0, 100)
    conv.lastMessageAt = new Date()
    conv.lastSender    = req.user._id

    await conv.save()

    const saved = conv.messages[conv.messages.length - 1]
    res.json({
      ok: true,
      message: {
        id:        saved._id.toString(),
        senderId:  req.user._id.toString(),
        text:      saved.text,
        createdAt: saved.createdAt,
        readBy:    saved.readBy.map(r => r.toString()),
      },
    })
  } catch (err) {
    console.error('[POST /messages/:convId/send]', err)
    res.status(500).json({ ok: false, error: 'Failed to send message.' })
  }
})

// ── GET /api/messages/users/search?q= — search users to start a chat ─────────
router.get('/users/search', async (req, res) => {
  try {
    const q = req.query.q?.trim()
    if (!q || q.length < 1) return res.json({ ok: true, users: [] })

    const regex = new RegExp(q, 'i')
    const users = await User.find({
      _id:  { $ne: req.user._id },
      $or:  [{ name: regex }, { username: regex }],
      deactivated: false,
    })
      .limit(10)
      .select('name username initials avatarColor profilePhoto')
      .lean()

    res.json({ ok: true, users: users.map(u => ({ ...u, id: u._id.toString() })) })
  } catch (err) {
    res.status(500).json({ ok: false, error: 'Search failed.' })
  }
})

export default router
