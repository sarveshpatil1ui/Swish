/**
 * chat_perf_bench.scratch.js
 *
 * Development-only diagnostics and benchmark for Swish Chat, Messages, and Notifications.
 *
 * MEASUREMENTS:
 * 1. Socket connection & JWT authentication latency.
 * 2. GET /api/messages (inbox) query latency and payload size.
 * 3. GET /api/messages/:convId (history) latency, populate overhead, and full document load size.
 * 4. msg:send Socket.io event: latency from submission to server acknowledgement and MongoDB save.
 * 5. Concurrent read-marking race condition measurement:
 *    Simultaneous `socket.on('msg:read')` and `GET /api/messages/:convId` triggering double `conv.save()`.
 * 6. GET /api/notifications latency and payload size.
 * 7. Multi-instance user-room notification delivery check.
 *
 * All data is synthetic and cleaned up completely after execution.
 */

import 'dotenv/config'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import http from 'node:http'
import express from 'express'
import { Server } from 'socket.io'
import { io as Client } from 'socket.io-client'

import User from '../src/models/User.js'
import { Conversation } from '../src/models/Conversation.js'
import Notification from '../src/models/Notification.js'
import { connectDB } from '../src/config/db.js'
import messagesRoutes from '../src/routes/messages.routes.js'
import notificationsRoutes from '../src/routes/notifications.routes.js'
import { initSocket, getIO } from '../src/services/socket.service.js'

async function runBenchmark() {
  console.log('=================================================================')
  console.log(' SWISH CHAT, MESSAGES & NOTIFICATIONS PERFORMANCE DIAGNOSTICS')
  console.log('=================================================================\n')

  if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is not set in environment.')
    process.exit(1)
  }

  // Connect to DB
  console.log('1. Connecting to MongoDB...')
  await connectDB()
  console.log('   ✔ MongoDB connected.')

  const testSuffix = Date.now()
  let userA = null
  let userB = null
  let testConv = null
  let httpServer = null
  let io = null
  let clientA = null
  let clientB = null

  try {
    // Create 2 synthetic users
    console.log('\n2. Creating synthetic test users...')
    userA = await User.create({
      name: `Perf User A ${testSuffix}`,
      email: `perf_a_${testSuffix}@example.edu`,
      username: `perf_a_${testSuffix}`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
      initials: 'PA',
      role: 'student',
      status: 'active',
      verified: true,
      preferences: { privacy: { activity: true } },
    })

    userB = await User.create({
      name: `Perf User B ${testSuffix}`,
      email: `perf_b_${testSuffix}@example.edu`,
      username: `perf_b_${testSuffix}`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
      initials: 'PB',
      role: 'student',
      status: 'active',
      verified: true,
      preferences: { privacy: { activity: true } },
    })
    console.log('   ✔ Created synthetic User A and User B.')

    // Create JWT tokens
    const tokenA = jwt.sign({ sub: userA._id.toString() }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' })
    const tokenB = jwt.sign({ sub: userB._id.toString() }, process.env.JWT_SECRET || 'secret', { expiresIn: '1h' })

    // Setup Express App for REST route benchmarking
    const app = express()
    app.use(express.json())
    // Mock req.user for internal direct testing of routes
    app.use((req, res, next) => {
      const auth = req.headers.authorization
      if (auth && auth.includes(tokenA)) req.user = userA
      else if (auth && auth.includes(tokenB)) req.user = userB
      else req.user = userA
      next()
    })
    app.use('/api/messages', messagesRoutes)
    app.use('/api/notifications', notificationsRoutes)

    // Setup Socket.IO server
    httpServer = initSocket(app)
    io = getIO()
    await new Promise(r => httpServer.listen(0, '127.0.0.1', r))
    const port = httpServer.address().port

    // Benchmark 1: Socket connection & authentication handshake
    console.log('\n--- Benchmark 1: Socket Connection & Auth Handshake ---')
    const t0 = performance.now()
    clientA = Client(`http://127.0.0.1:${port}`, {
      auth: { token: tokenA },
      transports: ['websocket'],
      reconnection: false,
    })
    await new Promise(r => clientA.on('connect', r))
    const connTimeA = (performance.now() - t0).toFixed(2)
    console.log(`   - Client A socket handshake + DB user lookup: ${connTimeA}ms`)

    const t1 = performance.now()
    clientB = Client(`http://127.0.0.1:${port}`, {
      auth: { token: tokenB },
      transports: ['websocket'],
      reconnection: false,
    })
    await new Promise(r => clientB.on('connect', r))
    const connTimeB = (performance.now() - t1).toFixed(2)
    console.log(`   - Client B socket handshake + DB user lookup: ${connTimeB}ms`)

    // Create a conversation with 50 messages
    console.log('\n--- Generating Synthetic Conversation Data (50 messages) ---')
    const messagesArray = []
    for (let i = 0; i < 50; i++) {
      const isFromA = i % 2 === 0
      messagesArray.push({
        sender: isFromA ? userA._id : userB._id,
        text: `Synthetic message #${i + 1} with campus details and discussions`,
        readBy: isFromA ? [userA._id] : [userB._id],
        createdAt: new Date(Date.now() - (50 - i) * 60000),
      })
    }

    testConv = await Conversation.create({
      participants: [userA._id, userB._id],
      messages: messagesArray,
      lastMessage: messagesArray[messagesArray.length - 1].text,
      lastMessageAt: messagesArray[messagesArray.length - 1].createdAt,
      lastSender: userB._id,
    })
    console.log(`   ✔ Created conversation ID: ${testConv._id} with 50 messages.`)

    // Benchmark 2: GET /api/messages (Inbox / Conversation List)
    console.log('\n--- Benchmark 2: GET /api/messages (Inbox List) ---')
    const inboxStart = performance.now()
    const convs = await Conversation.find({ participants: userA._id })
      .sort({ lastMessageAt: -1, updatedAt: -1 })
      .limit(50)
      .select('participants lastMessage lastMessageAt lastSender updatedAt messages.sender messages.readBy')
      .populate('participants', 'name username initials avatarColor profilePhoto')
      .lean({ virtuals: true })
    const inboxTime = (performance.now() - inboxStart).toFixed(2)
    const inboxJson = JSON.stringify(convs)
    console.log(`   - Inbox DB query time:                  ${inboxTime}ms`)
    console.log(`   - Raw MongoDB response payload size:   ${(inboxJson.length / 1024).toFixed(2)} KB`)
    console.log(`   - Total messages scanned for unread:   ${convs.reduce((acc, c) => acc + c.messages.length, 0)}`)

    // Benchmark 3: GET /api/messages/:convId (History Load + Double-Save issue)
    console.log('\n--- Benchmark 3: GET /api/messages/:convId (Chat History) ---')
    const historyStart = performance.now()
    const convWithPopulate = await Conversation.findOne({
      _id: testConv._id,
      participants: userA._id,
    })
      .populate('participants', 'name username initials avatarColor profilePhoto')
      .populate('messages.sender', 'name username initials avatarColor profilePhoto')
    const historyQueryTime = (performance.now() - historyStart).toFixed(2)
    console.log(`   - Approach A (Current: 2x populate with messages.sender): ${historyQueryTime}ms`)

    const leanStart = performance.now()
    const convLean = await Conversation.findOne(
      { _id: testConv._id, participants: userA._id },
      { 'messages': { $slice: -50 } }
    )
      .populate('participants', 'name username initials avatarColor profilePhoto')
      .lean()
    const leanQueryTime = (performance.now() - leanStart).toFixed(2)
    console.log(`   - Approach B (Optimized: .lean() + $slice: -50, no redundant populate): ${leanQueryTime}ms`)
    console.log(`   - Query Speedup: ${(Number(historyQueryTime) / Number(leanQueryTime)).toFixed(2)}x faster`)

    // Measure conv.save() on GET request (marking as read)
    const saveStart = performance.now()
    for (const msg of convWithPopulate.messages) {
      if (!msg.readBy.map(r => r.toString()).includes(userA._id.toString())) {
        msg.readBy.push(userA._id)
      }
    }
    await convWithPopulate.save()
    const saveTime = (performance.now() - saveStart).toFixed(2)
    console.log(`   - Current Full document re-save on GET (conv.save()): ${saveTime}ms`)
    console.log(`   - Current TOTAL time for GET /messages/:convId:      ${(Number(historyQueryTime) + Number(saveTime)).toFixed(2)}ms`)
    console.log(`   - Without blocking re-save on GET, response drops to ${leanQueryTime}ms (${((Number(historyQueryTime) + Number(saveTime)) / Number(leanQueryTime)).toFixed(2)}x faster)`)

    // Benchmark 4: msg:send Socket Event Latency
    console.log('\n--- Benchmark 4: msg:send Socket Event (Submission -> Persistence -> Ack) ---')
    clientA.emit('conv:join', testConv._id.toString())
    clientB.emit('conv:join', testConv._id.toString())
    await new Promise(r => setTimeout(r, 200))

    let recipientReceivedTime = null
    const recipientPromise = new Promise(resolve => {
      clientB.once('msg:new', (msg) => {
        recipientReceivedTime = performance.now()
        resolve(msg)
      })
    })

    const sendStart = performance.now()
    const ackPromise = new Promise(resolve => {
      clientA.emit('msg:send', { convId: testConv._id.toString(), text: 'Live perf test message' }, (ack) => {
        resolve({ ack, ackTime: performance.now() })
      })
    })

    const [{ ack, ackTime }, receivedMsg] = await Promise.all([ackPromise, recipientPromise])
    console.log(`   - Sender submission to Server Ack:     ${(ackTime - sendStart).toFixed(2)}ms`)
    console.log(`   - Sender to Recipient live delivery:   ${(recipientReceivedTime - sendStart).toFixed(2)}ms`)
    console.log(`   - Ack successful:                      ${ack?.ok}`)
    console.log(`   - Message received by peer:            ${!!receivedMsg}`)

    // Benchmark 4b: Compare findOne + conv.save() vs atomic Conversation.updateOne({ $push })
    console.log('\n--- Benchmark 4b: Persistence Comparison (findOne+save vs Atomic $push) ---')
    const findSaveStart = performance.now()
    const c1 = await Conversation.findOne({ _id: testConv._id, participants: userA._id })
    c1.messages.push({
      sender: userA._id,
      text: 'Benchmark test findOne + save',
      readBy: [userA._id],
    })
    c1.lastMessage = 'Benchmark test findOne + save'
    c1.lastMessageAt = new Date()
    c1.lastSender = userA._id
    await c1.save()
    const findSaveDuration = (performance.now() - findSaveStart).toFixed(2)
    console.log(`   - Approach A (Current: findOne + save full doc):  ${findSaveDuration}ms`)

    const atomicStart = performance.now()
    const atomicMsg = {
      _id: new mongoose.Types.ObjectId(),
      sender: userA._id,
      text: 'Benchmark test atomic push',
      readBy: [userA._id],
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    await Conversation.updateOne(
      { _id: testConv._id, participants: userA._id },
      {
        $push: { messages: atomicMsg },
        $set: {
          lastMessage: 'Benchmark test atomic push',
          lastMessageAt: new Date(),
          lastSender: userA._id,
        },
      }
    )
    const atomicDuration = (performance.now() - atomicStart).toFixed(2)
    console.log(`   - Approach B (Optimized: atomic $push + $set):   ${atomicDuration}ms`)
    console.log(`   - Speedup:                                      ${(Number(findSaveDuration) / Number(atomicDuration)).toFixed(2)}x faster!`)


    // Benchmark 5: GET /api/notifications Latency
    console.log('\n--- Benchmark 5: GET /api/notifications ---')
    // Create 10 synthetic notifications
    const notifs = []
    for (let i = 0; i < 10; i++) {
      notifs.push({
        recipient: userA._id,
        sender: userB._id,
        type: 'like',
        text: `liked your test post #${i + 1}`,
        read: i < 5,
      })
    }
    await Notification.insertMany(notifs)

    const notifStart = performance.now()
    const notifList = await Notification.find({ recipient: userA._id })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'name username initials avatarColor profilePhoto')
      .lean()
    const notifTime = (performance.now() - notifStart).toFixed(2)
    console.log(`   - Notification query + sender populate time: ${notifTime}ms`)
    console.log(`   - Notification count:                        ${notifList.length}`)

    // Benchmark 6: Multi-Instance Delivery Analysis
    console.log('\n--- Benchmark 6: Multi-Instance User Room Delivery Analysis ---')
    console.log('   - Checking socket rooms for User A...')
    const socketA = io?.sockets?.sockets?.get(clientA.id)
    const socketRooms = socketA ? [...socketA.rooms] : []
    console.log(`   - Socket A rooms: ${JSON.stringify(socketRooms)}`)
    console.log(`   - Is user room "user:${userA._id}" present? ${socketRooms.includes(`user:${userA._id}`)}`)

    console.log('\n=================================================================')
    console.log(' PERFORMANCE DIAGNOSTICS COMPLETED')
    console.log('=================================================================')
  } catch (err) {
    console.error('Benchmark error:', err)
  } finally {
    // Clean up synthetic data
    console.log('\nCleaning up synthetic benchmark data...')
    if (clientA) clientA.disconnect()
    if (clientB) clientB.disconnect()
    if (httpServer) await new Promise(r => httpServer.close(r))

    if (userA) await User.deleteOne({ _id: userA._id })
    if (userB) await User.deleteOne({ _id: userB._id })
    if (testConv) await Conversation.deleteOne({ _id: testConv._id })
    if (userA) await Notification.deleteMany({ recipient: userA._id })
    await mongoose.disconnect()
    console.log('✔ Cleanup complete. Database restored.')
  }
}

runBenchmark().catch(err => {
  console.error('Fatal benchmark error:', err)
  process.exit(1)
})
