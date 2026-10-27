import { Router } from 'express'
import mongoose from 'mongoose'
import { requireAuth } from '../middleware/auth.middleware.js'
import { Conversation } from '../models/Conversation.js'
import User from '../models/User.js'
import { emitToUser, getIO } from '../services/socket.service.js'

const router = Router()

// All routes require auth
router.use(requireAuth)

// ── Helper: format conversation for client ────────────────────────────────────
function formatConv(conv, myId) {
  const myIdStr = String(myId?._id || myId || '')
  const other = (conv.participants || []).find(p => {
    const pid = String(p?._id || p || '')
    return pid && pid !== myIdStr
  })

  // Count unread messages (sent by other, not read by me) from recent slice
  const unread = (conv.messages || []).filter(m => {
    if (!m) return false
    const senderId = String(m.sender?._id || m.sender || '')
    if (!senderId || senderId === myIdStr) return false
    const readBy = (m.readBy || []).map(r => String(r?._id || r || ''))
    return !readBy.includes(myIdStr)
  }).length

  return {
    id:           conv._id.toString(),
    participantId: other?._id ? other._id.toString() : other ? other.toString() : undefined,
    name:         other?.name         ?? 'Unknown',
    username:     other?.username     ?? '',
    initials:     other?.initials     ?? '??',
    avatarColor:  other?.avatarColor  ?? '#6366f1',
    profilePhoto: other?.profilePhoto ?? null,
    lastMessage:  conv.lastMessage    ?? '',
    lastMessageAt:conv.lastMessageAt  ?? conv.updatedAt,
    lastSenderId: conv.lastSender?._id ? conv.lastSender._id.toString() : conv.lastSender?.toString() ?? null,
    unread,
  }
}

// ── GET /api/messages — list all conversations for current user ───────────────
router.get('/', async (req, res) => {
  try {
    const limit = Math.min(Math.max(1, Number(req.query.limit) || 50), 100)
    const convs = await Conversation.find(
      { participants: req.user._id },
      {
        participants: 1,
        lastMessage: 1,
        lastMessageAt: 1,
        lastSender: 1,
        updatedAt: 1,
        messages: { $slice: -30 },
      }
    )
      .sort({ lastMessageAt: -1 })
      .limit(limit)
      .populate('participants', 'name username initials avatarColor profilePhoto')
      .lean({ virtuals: true })

    const result = convs.map(c => formatConv(c, req.user._id))
    const totalUnread = result.reduce((sum, c) => sum + (c.unread || 0), 0)
    res.json({ ok: true, conversations: result, unreadCount: totalUnread })
  } catch (err) {
    console.error('[GET /messages]', err)
    res.status(500).json({ ok: false, error: 'Failed to load conversations.' })
  }
})

// ── GET /api/messages/unread-count — get total unread message count ───────────
router.get('/unread-count', async (req, res) => {
  try {
    const myIdStr = String(req.user?._id || req.user?.id || '')
    const convs = await Conversation.find(
      { participants: req.user._id },
      { messages: { $slice: -30 } }
    ).lean()

    let count = 0
    for (const conv of convs) {
      for (const m of (conv.messages || [])) {
        if (!m) continue
        const senderId = String(m.sender?._id || m.sender || '')
        if (!senderId || senderId === myIdStr) continue
        const readBy = (m.readBy || []).map(r => String(r?._id || r || ''))
        if (!readBy.includes(myIdStr)) {
          count++
        }
      }
    }
    res.json({ ok: true, count })
  } catch (err) {
    console.error('[GET /messages/unread-count]', err)
    res.status(500).json({ ok: false, error: 'Failed to load unread count.' })
  }
})

// ── GET /api/messages/users/search?q= — search users to start a chat ─────────
// MUST be defined before /:convId to avoid route shadowing
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

// ── GET /api/messages/:convId — get all messages in a conversation ────────────
router.get('/:convId', async (req, res) => {
  try {
    if (!req.params.convId || req.params.convId.length !== 24) {
      return res.status(404).json({ ok: false, error: 'Invalid conversation ID.' })
    }

    const limit = Math.min(Math.max(1, Number(req.query.limit) || 50), 100)

    // Slice recent messages using .lean() without pulling lifetime conversation history
    const conv = await Conversation.findOne(
      {
        _id:          req.params.convId,
        participants: req.user._id,
      },
      {
        messages: { $slice: -limit },
      }
    ).lean()

    if (!conv) return res.status(404).json({ ok: false, error: 'Conversation not found.' })

    const messages = (conv.messages || []).map(m => ({
      id:        m._id ? m._id.toString() : m.id,
      senderId:  m.sender ? (m.sender._id ? m.sender._id.toString() : m.sender.toString()) : '',
      text:      m.text,
      createdAt: m.createdAt,
      readBy:    (m.readBy || []).map(r => r.toString()),
      storyReply: m.storyReply && (m.storyReply.imageUrl || m.storyReply.storyId) ? {
        storyId:       m.storyReply.storyId ? m.storyReply.storyId.toString() : null,
        imageUrl:      m.storyReply.imageUrl || null,
        reaction:      m.storyReply.reaction || null,
        caption:       m.storyReply.caption || '',
        storyAuthorId: m.storyReply.storyAuthorId ? m.storyReply.storyAuthorId.toString() : null,
      } : null,
      postShare: m.postShare && m.postShare.postId ? {
        postId:     m.postShare.postId ? m.postShare.postId.toString() : null,
        imageUrl:   m.postShare.imageUrl || null,
        caption:    m.postShare.caption || '',
        authorName: m.postShare.authorName || '',
      } : null,
      replyTo: m.replyTo && m.replyTo.text ? {
        messageId:  m.replyTo.messageId ? m.replyTo.messageId.toString() : null,
        senderId:   m.replyTo.senderId ? m.replyTo.senderId.toString() : null,
        senderName: m.replyTo.senderName || '',
        text:       m.replyTo.text || '',
      } : null,
    }))

    return res.status(200).json({ ok: true, messages })
  } catch (err) {
    console.error('[GET /messages/:convId]', err)
    return res.status(500).json({ ok: false, error: 'Failed to load messages.' })
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

// ── PATCH /api/messages/:convId/read — mark all messages as read ────────────
router.patch('/:convId/read', async (req, res) => {
  try {
    const { convId } = req.params
    if (!convId || convId.length !== 24) {
      return res.status(404).json({ ok: false, error: 'Invalid conversation ID.' })
    }

    const updateRes = await Conversation.updateOne(
      { _id: convId, participants: req.user._id },
      { $addToSet: { 'messages.$[elem].readBy': req.user._id } },
      { arrayFilters: [{ 'elem.sender': { $ne: req.user._id }, 'elem.readBy': { $ne: req.user._id } }] }
    )

    if (updateRes.matchedCount === 0) {
      return res.status(404).json({ ok: false, error: 'Conversation not found.' })
    }

    const io = getIO?.()
    if (io && updateRes.modifiedCount > 0) {
      io.to(`conv:${convId}`).emit('msg:read', { convId, readBy: req.user._id.toString() })
    }

    res.json({ ok: true, readBy: req.user._id.toString() })
  } catch (err) {
    console.error('[PATCH /messages/:convId/read]', err)
    res.status(500).json({ ok: false, error: 'Failed to mark messages as read.' })
  }
})

// ── POST /api/messages/:convId/send — send a message ─────────────────────────
router.post('/:convId/send', async (req, res) => {
  try {
    const { text, storyReply, postShare, replyTo } = req.body
    if (!text?.trim()) return res.status(400).json({ ok: false, error: 'Message text is required.' })

    const cleanText = text.trim()
    const now = new Date()
    const msgId = new mongoose.Types.ObjectId()

    let sanitizedReplyTo = null
    if (replyTo && typeof replyTo === 'object' && replyTo.text) {
      sanitizedReplyTo = {
        messageId: replyTo.messageId ? new mongoose.Types.ObjectId(replyTo.messageId) : null,
        senderId: replyTo.senderId ? new mongoose.Types.ObjectId(replyTo.senderId) : null,
        senderName: String(replyTo.senderName || '').slice(0, 80),
        text: String(replyTo.text || '').slice(0, 300),
      }
    }

    const msg = {
      _id: msgId,
      sender: req.user._id,
      text: cleanText,
      readBy: [req.user._id],
      createdAt: now,
      updatedAt: now,
      ...(storyReply && { storyReply }),
      ...(postShare && { postShare }),
      ...(sanitizedReplyTo && { replyTo: sanitizedReplyTo }),
    }

    const conv = await Conversation.findOneAndUpdate(
      {
        _id: req.params.convId,
        participants: req.user._id,
      },
      {
        $push: { messages: msg },
        $set: {
          lastMessage: cleanText.slice(0, 100),
          lastMessageAt: now,
          lastSender: req.user._id,
        },
      },
      { new: false, select: 'participants' }
    )

    if (!conv) {
      return res.status(404).json({ ok: false, error: 'Conversation not found.' })
    }

    const payload = {
      id:                 msgId.toString(),
      convId:             req.params.convId,
      senderId:           req.user._id.toString(),
      senderName:         req.user.name,
      senderUsername:     req.user.username || '',
      senderAvatarColor:  req.user.avatarColor || '#6366f1',
      senderProfilePhoto: req.user.profilePhoto || null,
      senderInitials:     req.user.initials || '??',
      text:               cleanText,
      createdAt:          now.toISOString(),
      readBy:             [req.user._id.toString()],
      storyReply:         storyReply || null,
      postShare:          postShare || null,
      replyTo:            replyTo || null,
    }

    // Emit to conversation room and notify offline/out-of-room participants
    const io = getIO?.()
    if (io) {
      io.to(`conv:${req.params.convId}`).emit('msg:new', payload)
    }

    for (const participantId of (conv.participants || [])) {
      const pid = participantId.toString()
      if (pid === req.user._id.toString()) continue
      emitToUser(pid, 'msg:notification', {
        convId:             req.params.convId,
        senderId:           req.user._id.toString(),
        senderName:         req.user.name,
        senderUsername:     req.user.username || '',
        senderAvatarColor:  req.user.avatarColor || '#6366f1',
        senderProfilePhoto: req.user.profilePhoto || null,
        senderInitials:     req.user.initials || '??',
        text:               cleanText,
        createdAt:          now.toISOString(),
      })
    }

    return res.status(200).json({
      ok: true,
      message: payload,
    })
  } catch (err) {
    console.error('[POST /messages/:convId/send]', err)
    return res.status(500).json({ ok: false, error: 'Failed to send message.' })
  }
})

export default router
