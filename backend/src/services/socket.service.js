import { Server } from 'socket.io'
import { createServer } from 'http'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { Conversation } from '../models/Conversation.js'
import { isOriginAllowed } from '../config/cors.js'

// ── In-memory online users: userId → Set<socketId> (handles multiple tabs) ────
const onlineUsers = new Map()

export function getIO() { return _io }
export function isUserOnline(userId) { return onlineUsers.has(String(userId)) }
export function getOnlineUsers() { return [...onlineUsers.keys()] }

export function emitToUser(userId, event, data) {
  if (!_io) return
  const socketIds = onlineUsers.get(String(userId))
  if (socketIds) {
    for (const sid of socketIds) {
      _io.to(sid).emit(event, data)
    }
  }
}

export function broadcastEvent(event, data) {
  if (!_io) return
  _io.emit(event, data)
}

let _io

export function initSocket(app) {
  const httpServer = createServer(app)

  _io = new Server(httpServer, {
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
  })

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
      const user = await User.findById(payload.sub).select('name username initials avatarColor profilePhoto preferences')
      if (!user) return next(new Error('User not found'))

      socket.user = user
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  _io.on('connection', async (socket) => {
    const userId = socket.user._id.toString()

    // Track this socket (a user may have multiple tabs open)
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set())
    }
    const wasAlreadyOnline = onlineUsers.get(userId).size > 0
    onlineUsers.get(userId).add(socket.id)

    // Only broadcast online event on first tab
    if (!wasAlreadyOnline && socket.user.preferences?.privacy?.activity !== false) {
      socket.broadcast.emit('user:online', { userId })
    }
    const visibleOnlineUsers = await User.find({
      _id: { $in: getOnlineUsers() },
      'preferences.privacy.activity': { $ne: false },
    }).select('_id').lean()
    socket.emit('online:list', visibleOnlineUsers.map(user => user._id.toString()))

    console.log(`[Socket] Connected: ${socket.user.name} (${userId}) tab=${socket.id}`)

    // ── Join a conversation room ──────────────────────────────────────────────
    socket.on('conv:join', async (convId) => {
      try {
        const conv = await Conversation.findOne({ _id: convId, participants: userId })
        if (!conv) return
        socket.join(`conv:${convId}`)
      } catch (err) {
        console.error('[Socket conv:join]', err)
      }
    })

    socket.on('conv:leave', (convId) => {
      socket.leave(`conv:${convId}`)
    })

    // ── Send a message ────────────────────────────────────────────────────────
    socket.on('msg:send', async ({ convId, text }, ack) => {
      try {
        if (!text?.trim() || !convId) return ack?.({ ok: false, error: 'Invalid message.' })

        const conv = await Conversation.findOne({ _id: convId, participants: userId })
        if (!conv) return ack?.({ ok: false, error: 'Conversation not found.' })

        const msg = {
          sender: socket.user._id,
          text:   text.trim(),
          readBy: [socket.user._id],
        }
        conv.messages.push(msg)
        conv.lastMessage   = text.trim().slice(0, 100)
        conv.lastMessageAt = new Date()
        conv.lastSender    = socket.user._id
        await conv.save()

        const saved = conv.messages[conv.messages.length - 1]
        const payload = {
          id:         saved._id.toString(),
          convId,
          senderId:   userId,
          senderName: socket.user.name,
          text:       saved.text,
          createdAt:  saved.createdAt,
          readBy:     saved.readBy.map(r => r.toString()),
        }

        // Emit to other participants in the conversation room (sender gets message via ack)
        socket.to(`conv:${convId}`).emit('msg:new', payload)

        // Also notify participants who are online but NOT in the room
        for (const participantId of conv.participants) {
          const pid = participantId.toString()
          if (pid === userId) continue
          const socketIds = onlineUsers.get(pid)
          if (socketIds && socket.user.preferences?.privacy?.activity !== false) {
            for (const sid of socketIds) {
              const participantSocket = _io.sockets.sockets.get(sid)
              if (participantSocket && !participantSocket.rooms.has(`conv:${convId}`)) {
                participantSocket.emit('msg:notification', {
                  convId,
                  senderId:   userId,
                  senderName: socket.user.name,
                  text:       saved.text,
                  createdAt:  saved.createdAt,
                })
              }
            }
          }
        }

        ack?.({ ok: true, message: payload })
      } catch (err) {
        console.error('[Socket msg:send]', err)
        ack?.({ ok: false, error: 'Failed to send.' })
      }
    })

    // ── Typing indicator (direct room broadcast — no DB reads per keystroke) ──
    socket.on('typing:start', ({ convId }) => {
      if (!convId) return
      const payload = { convId, userId, name: socket.user.name }
      socket.to(`conv:${convId}`).emit('typing:start', payload)
    })

    socket.on('typing:stop', ({ convId }) => {
      if (!convId) return
      const payload = { convId, userId }
      socket.to(`conv:${convId}`).emit('typing:stop', payload)
    })

    // ── Mark messages as read ─────────────────────────────────────────────────
    socket.on('msg:read', async ({ convId }) => {
      try {
        const conv = await Conversation.findOne({ _id: convId, participants: userId })
        if (!conv) return

        let modified = false
        for (const msg of conv.messages) {
          if (msg.sender.toString() !== userId && !msg.readBy.map(r => r.toString()).includes(userId)) {
            msg.readBy.push(socket.user._id)
            modified = true
          }
        }
        if (modified) {
          await conv.save()
          socket.to(`conv:${convId}`).emit('msg:read', { convId, readBy: userId })
        }
      } catch (err) {
        console.error('[Socket msg:read]', err)
      }
    })

    // ── Follow notification ───────────────────────────────────────────────────
    socket.on('follow:notify', ({ targetUserId }) => {
      const socketIds = onlineUsers.get(String(targetUserId))
      if (socketIds) {
        for (const sid of socketIds) {
          _io.to(sid).emit('follow:received', {
            fromUserId:   userId,
            fromUserName: socket.user.name,
            fromInitials: socket.user.initials,
            fromColor:    socket.user.avatarColor,
          })
        }
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
          socket.broadcast.emit('user:offline', { userId })
        }
      }
      console.log(`[Socket] Disconnected: ${socket.user.name} (${userId}) tab=${socket.id}`)
    })
  })

  return httpServer
}
