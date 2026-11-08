import { Server } from 'socket.io'
import { createServer } from 'http'
import { createAdapter } from '@socket.io/redis-adapter'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import User from '../models/User.js'
import { Conversation } from '../models/Conversation.js'
import { isOriginAllowed } from '../config/cors.js'
import { getPlatformConfig } from './platform-config.service.js'
import { verifyConversationTenantAccess } from '../middleware/collegeAuth.middleware.js'

// ── In-memory online users: userId → Set<socketId> (handles multiple tabs) ────
const onlineUsers = new Map()

export function getIO() { return _io }
export function isUserOnline(userId) { return onlineUsers.has(String(userId)) }
export function getOnlineUsers() { return [...onlineUsers.keys()] }

export function emitToUser(userId, event, data) {
  if (!_io || !userId) return
  _io.to(`user:${String(userId)}`).emit(event, data)
}

export function broadcastEvent(event, data, options = {}) {
  if (!_io) return
  if (options?.collegeId) {
    _io.to(`college:${String(options.collegeId)}`).emit(event, data)
  } else {
    _io.emit(event, data)
  }
}

export function emitToCollege(collegeId, event, data) {
  if (!_io || !collegeId) return
  _io.to(`college:${String(collegeId)}`).emit(event, data)
}

export function emitToAdmin(event, data) {
  if (!_io) return
  _io.to('admin').emit(event, data)
}

let _io

export function initSocket(app, { pubClient, subClient } = {}) {
  const httpServer = createServer(app)

  const serverOptions = {
    cors: {
      origin: (origin, cb) => {
        if (isOriginAllowed(origin)) {
          cb(null, true)
        } else {
          cb(new Error('Socket CORS: origin not allowed'))
        }
      },
      credentials: true,
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  }

  // ── Optional Redis adapter (Stage 2) ─────────────────────────────────────
  // Configure adapter directly on Server instantiation when clients are provided.
  // This avoids dynamic adapter swapping during active traffic and prevents
  // room memberships from being orphaned.
  if (pubClient && subClient) {
    try {
      serverOptions.adapter = createAdapter(pubClient, subClient)
      console.log('[Socket] Redis adapter configured (multi-instance broadcasts enabled)')
    } catch (adapterErr) {
      console.error('[Socket] Redis adapter attach failed — using in-memory adapter:', adapterErr.message)
    }
  } else {
    console.log('[Socket] Redis adapter not configured — using in-memory adapter (single-instance mode)')
  }

  _io = new Server(httpServer, serverOptions)

  // ── Auth middleware: verify JWT cookie or auth header on connect ───────────
  _io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || ''
      const match = cookieHeader.match(/swish_token=([^;]+)/)
      const token = match
        ? match[1]
        : (socket.handshake.auth?.token || socket.handshake.headers?.authorization?.replace(/^Bearer\s+/i, ''))

      if (!token) return next(new Error('Not authenticated'))

      const payload = jwt.verify(token, process.env.JWT_SECRET)
      const user = await User.findById(payload.sub).select('name username initials avatarColor profilePhoto preferences role collegeId')
      if (!user) return next(new Error('User not found'))

      socket.user = user
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  _io.on('connection', async (socket) => {
    const userId = socket.user._id.toString()

    // Join user-specific room for targeted, multi-instance delivery across tabs and instances
    socket.join(`user:${userId}`)

    // Join college-specific room so post likes and campus updates are scoped without global broadcast storms
    if (socket.user.collegeId) {
      socket.join(`college:${socket.user.collegeId.toString()}`)
    }

    // Join admin room for real-time platform & onboarding notifications
    if (socket.user.role === 'admin' || socket.user.role === 'main_admin') {
      socket.join('admin')
    }

    // Track this socket (a user may have multiple tabs open)
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set())
    }
    const wasAlreadyOnline = onlineUsers.get(userId).size > 0
    onlineUsers.get(userId).add(socket.id)

    // Only broadcast online event on first tab — scoped to user's college room
    if (!wasAlreadyOnline && socket.user.preferences?.privacy?.activity !== false) {
      if (socket.user.collegeId) {
        socket.to(`college:${socket.user.collegeId.toString()}`).emit('user:online', { userId })
      }
    }
    let visibleOnlineUsers = []
    if (socket.user.collegeId) {
      visibleOnlineUsers = await User.find({
        _id: { $in: getOnlineUsers() },
        collegeId: socket.user.collegeId,
        'preferences.privacy.activity': { $ne: false },
      }).select('_id').lean()
    }
    socket.emit('online:list', visibleOnlineUsers.map(user => user._id.toString()))

    console.log(`[Socket] Connected: ${socket.user.name} (${userId}) tab=${socket.id}`)

    // ── Join a conversation room ──────────────────────────────────────────────
    socket.on('conv:join', async (convId) => {
      try {
        if (!convId || String(convId).length !== 24) return
        const conv = await Conversation.findOne({
          _id: convId,
          participants: userId,
          isArchived: { $ne: true },
        }).select('collegeId participants').populate('participants', 'collegeId').lean()
        if (!conv) return

        const isAllowed = await verifyConversationTenantAccess(conv, socket.user, User)
        if (!isAllowed) return

        socket.join(`conv:${convId}`)
      } catch (err) {
        console.error('[Socket conv:join]', err)
      }
    })

    socket.on('conv:leave', (convId) => {
      socket.leave(`conv:${convId}`)
    })

    // ── Send a message ────────────────────────────────────────────────────────
    socket.on('msg:send', async ({ convId, text, storyReply, postShare, replyTo }, ack) => {
      try {
        const platformConfig = await getPlatformConfig()
        const userRole = socket.user?.role
        const isAdmin = userRole === 'admin' || userRole === 'main_admin'

        if (platformConfig?.maintenance?.enabled && !isAdmin) {
          return ack?.({ ok: false, error: 'Platform is currently undergoing scheduled maintenance.' })
        }

        if (platformConfig?.features?.allowDirectMessaging === false && !isAdmin) {
          return ack?.({ ok: false, error: 'Direct messaging is temporarily paused by platform administration.' })
        }

        const cleanText = (text && typeof text === 'string' ? text.trim() : '') || (postShare ? 'Shared a post' : (storyReply ? 'Replied to story' : ''))
        if (!cleanText || !convId) return ack?.({ ok: false, error: 'Invalid message.' })

        let sanitizedPostShare = null
        if (postShare && typeof postShare === 'object' && postShare.postId) {
          sanitizedPostShare = {
            postId: new mongoose.Types.ObjectId(postShare.postId),
            imageUrl: postShare.imageUrl ? String(postShare.imageUrl) : null,
            caption: postShare.caption ? String(postShare.caption).slice(0, 500) : '',
            authorName: postShare.authorName ? String(postShare.authorName).slice(0, 80) : 'Swish user',
          }
        }
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

        const newMsg = {
          _id: msgId,
          sender: socket.user._id,
          text: cleanText,
          readBy: [socket.user._id],
          createdAt: now,
          updatedAt: now,
          ...(storyReply && { storyReply }),
          ...(sanitizedPostShare && { postShare: sanitizedPostShare }),
          ...(sanitizedReplyTo && { replyTo: sanitizedReplyTo }),
        }

        const convCheck = await Conversation.findOne({
          _id: convId,
          participants: socket.user._id,
          isArchived: { $ne: true },
        }).select('collegeId participants').populate('participants', 'collegeId').lean()

        if (!convCheck) return ack?.({ ok: false, error: 'Conversation not found or archived.' })

        const isAllowed = await verifyConversationTenantAccess(convCheck, socket.user, User)
        if (!isAllowed) {
          return ack?.({ ok: false, error: 'Conversation not found or archived.' })
        }

        // Atomic append with authorization verification in the database filter
        const conv = await Conversation.findOneAndUpdate(
          { _id: convId, participants: socket.user._id, isArchived: { $ne: true } },
          {
            $push: { messages: newMsg },
            $set: {
              lastMessage: cleanText.slice(0, 100),
              lastMessageAt: now,
              lastSender: socket.user._id,
            },
          },
          { new: false, select: 'participants' }
        )

        if (!conv) return ack?.({ ok: false, error: 'Conversation not found.' })

        const payload = {
          id:                 msgId.toString(),
          convId,
          senderId:           userId,
          senderName:         socket.user.name,
          senderUsername:     socket.user.username || '',
          senderAvatarColor:  socket.user.avatarColor || '#6366f1',
          senderProfilePhoto: socket.user.profilePhoto || null,
          senderInitials:     socket.user.initials || '??',
          text:               cleanText,
          createdAt:          now.toISOString(),
          readBy:             [userId],
          storyReply:         storyReply || null,
          postShare:          sanitizedPostShare || null,
          replyTo:            replyTo || null,
        }

        // Emit to other participants in the conversation room (sender gets message via ack)
        socket.to(`conv:${convId}`).emit('msg:new', payload)

        // Also notify participants outside the room across all instances
        for (const participantId of conv.participants) {
          const pid = participantId.toString()
          if (pid === userId) continue
          emitToUser(pid, 'msg:notification', {
            convId,
            senderId:           userId,
            senderName:         socket.user.name,
            senderUsername:     socket.user.username || '',
            senderAvatarColor:  socket.user.avatarColor || '#6366f1',
            senderProfilePhoto: socket.user.profilePhoto || null,
            senderInitials:     socket.user.initials || '??',
            text:               cleanText,
            createdAt:          now.toISOString(),
          })
        }

        // Acknowledge sender only after persistence has fully succeeded
        ack?.({ ok: true, message: payload })
      } catch (err) {
        console.error('[Socket msg:send]', err)
        ack?.({ ok: false, error: 'Failed to send.' })
      }
    })

    // ── Typing indicator (direct room broadcast — no DB reads per keystroke) ──
    socket.on('typing:start', ({ convId }) => {
      if (!convId || !socket.rooms.has(`conv:${convId}`)) return
      const payload = { convId, userId, name: socket.user.name }
      socket.to(`conv:${convId}`).emit('typing:start', payload)
    })

    socket.on('typing:stop', ({ convId }) => {
      if (!convId || !socket.rooms.has(`conv:${convId}`)) return
      const payload = { convId, userId }
      socket.to(`conv:${convId}`).emit('typing:stop', payload)
    })

    // ── Mark messages as read ─────────────────────────────────────────────────
    socket.on('msg:read', async ({ convId }, ack) => {
      try {
        if (!convId) return ack?.({ ok: false, error: 'convId is required.' })

        const convCheck = await Conversation.findOne({
          _id: convId,
          participants: socket.user._id,
          isArchived: { $ne: true },
        }).select('collegeId participants').populate('participants', 'collegeId').lean()

        if (!convCheck) return ack?.({ ok: false, error: 'Conversation not found.' })

        const isAllowed = await verifyConversationTenantAccess(convCheck, socket.user, User)
        if (!isAllowed) {
          return ack?.({ ok: false, error: 'Conversation not found.' })
        }

        // Atomic read marking using arrayFilters without full-document fetch/save
        const updateRes = await Conversation.updateOne(
          { _id: convId, participants: socket.user._id, isArchived: { $ne: true } },
          { $addToSet: { 'messages.$[elem].readBy': socket.user._id } },
          { arrayFilters: [{ 'elem.sender': { $ne: socket.user._id }, 'elem.readBy': { $ne: socket.user._id } }] }
        )

        if (updateRes.matchedCount === 0) {
          return ack?.({ ok: false, error: 'Conversation not found.' })
        }

        // Broadcast to other participants in the room if unread messages were marked read
        if (updateRes.modifiedCount > 0) {
          socket.to(`conv:${convId}`).emit('msg:read', { convId, readBy: userId })
        }

        ack?.({ ok: true, readBy: userId })
      } catch (err) {
        console.error('[Socket msg:read]', err)
        ack?.({ ok: false, error: 'Failed to mark as read.' })
      }
    })

    // ── Follow notification ───────────────────────────────────────────────────
    socket.on('follow:notify', async ({ targetUserId }) => {
      try {
        if (!targetUserId) return
        const target = await User.findById(targetUserId).select('collegeId').lean()
        if (!target) return
        if (!socket.user.collegeId || !target.collegeId || socket.user.collegeId.toString() !== target.collegeId.toString()) {
          return
        }
        emitToUser(targetUserId, 'follow:received', {
          fromUserId:   userId,
          fromUserName: socket.user.name,
          fromInitials: socket.user.initials,
          fromColor:    socket.user.avatarColor,
        })
      } catch (err) {
        console.error('[Socket follow:notify]', err)
      }
    })

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      const socketIds = onlineUsers.get(userId)
      if (socketIds) {
        socketIds.delete(socket.id)
        if (socketIds.size === 0) {
          // Last tab closed — user is truly offline
          onlineUsers.delete(userId)
          if (socket.user.collegeId) {
            _io?.to(`college:${socket.user.collegeId.toString()}`).emit('user:offline', { userId })
          }
        }
      }
      console.log(`[Socket] Disconnected: ${socket.user.name} (${userId}) tab=${socket.id}`)
    })
  })

  return httpServer
}
