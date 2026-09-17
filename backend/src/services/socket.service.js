import { Server } from 'socket.io'
import { createServer } from 'http'
import jwt from 'jsonwebtoken'
import User from '../models/User.js'
import { Conversation } from '../models/Conversation.js'

// ── In-memory online users map: userId → socketId ─────────────────────────────
const onlineUsers = new Map()

export function getIO() { return _io }
export function isUserOnline(userId) { return onlineUsers.has(String(userId)) }
export function getOnlineUsers() { return [...onlineUsers.keys()] }

let _io

export function initSocket(app) {
  const httpServer = createServer(app)

  _io = new Server(httpServer, {
    cors: {
      origin:      process.env.CLIENT_ORIGIN || 'http://localhost:5173',
      credentials: true,
      methods:     ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  })

  // ── Auth middleware: verify JWT cookie on connect ───────────────────────────
  _io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie || ''
      const match = cookieHeader.match(/swish_token=([^;]+)/)
      if (!match) return next(new Error('Not authenticated'))

      const payload = jwt.verify(match[1], process.env.JWT_SECRET)
      const user = await User.findById(payload.sub).select('name username initials avatarColor profilePhoto')
      if (!user) return next(new Error('User not found'))

      socket.user = user
      next()
    } catch {
      next(new Error('Invalid token'))
    }
  })

  _io.on('connection', (socket) => {
    const userId = socket.user._id.toString()
    onlineUsers.set(userId, socket.id)

    // Notify all online users that this user came online
    socket.broadcast.emit('user:online', { userId })
    // Send the full online list to the newly connected client
    socket.emit('online:list', getOnlineUsers())

    console.log(`[Socket] Connected: ${socket.user.name} (${userId})`)

    // ── Join a conversation room ──────────────────────────────────────────────
    socket.on('conv:join', async (convId) => {
      try {
        const conv = await Conversation.findOne({
          _id: convId, participants: userId,
        })
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

        const conv = await Conversation.findOne({
          _id: convId, participants: userId,
        })
        if (!conv) return ack?.({ ok: false, error: 'Conversation not found.' })

        const msg = {
          sender:  socket.user._id,
          text:    text.trim(),
          readBy:  [socket.user._id],
        }
        conv.messages.push(msg)
        conv.lastMessage    = text.trim().slice(0, 100)
        conv.lastMessageAt  = new Date()
        conv.lastSender     = socket.user._id
        await conv.save()

        const saved = conv.messages[conv.messages.length - 1]
        const payload = {
          id:        saved._id.toString(),
          convId,
          senderId:  userId,
          senderName: socket.user.name,
          text:      saved.text,
          createdAt: saved.createdAt,
          readBy:    saved.readBy.map(r => r.toString()),
        }

        // Emit to everyone in the conversation room (including sender)
        _io.to(`conv:${convId}`).emit('msg:new', payload)

        // Also emit a lightweight notification to participants NOT in the room
        for (const participantId of conv.participants) {
          const pid = participantId.toString()
          if (pid === userId) continue
          const participantSocketId = onlineUsers.get(pid)
          if (participantSocketId) {
            const participantSocket = _io.sockets.sockets.get(participantSocketId)
            // If they haven't joined this conversation room, send them a notification
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

        ack?.({ ok: true, message: payload })
      } catch (err) {
        console.error('[Socket msg:send]', err)
        ack?.({ ok: false, error: 'Failed to send.' })
      }
    })

    // ── Typing indicator ──────────────────────────────────────────────────────
    socket.on('typing:start', ({ convId }) => {
      socket.to(`conv:${convId}`).emit('typing:start', {
        convId,
        userId,
        name: socket.user.name,
      })
    })

    socket.on('typing:stop', ({ convId }) => {
      socket.to(`conv:${convId}`).emit('typing:stop', { convId, userId })
    })

    // ── Mark messages as read ─────────────────────────────────────────────────
    socket.on('msg:read', async ({ convId }) => {
      try {
        const conv = await Conversation.findOne({
          _id: convId, participants: userId,
        })
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
          // Tell the sender their messages were read
          socket.to(`conv:${convId}`).emit('msg:read', { convId, readBy: userId })
        }
      } catch (err) {
        console.error('[Socket msg:read]', err)
      }
    })

    // ── Follow notification ───────────────────────────────────────────────────
    socket.on('follow:notify', ({ targetUserId }) => {
      const targetSocketId = onlineUsers.get(String(targetUserId))
      if (targetSocketId) {
        _io.to(targetSocketId).emit('follow:received', {
          fromUserId:   userId,
          fromUserName: socket.user.name,
          fromInitials: socket.user.initials,
          fromColor:    socket.user.avatarColor,
        })
      }
    })

    // ── Disconnect ────────────────────────────────────────────────────────────
    socket.on('disconnect', () => {
      onlineUsers.delete(userId)
      socket.broadcast.emit('user:offline', { userId })
      console.log(`[Socket] Disconnected: ${socket.user.name} (${userId})`)
    })
  })

  return httpServer
}
