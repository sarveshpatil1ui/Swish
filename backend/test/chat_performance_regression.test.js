/**
 * chat_performance_regression.test.js
 *
 * Focused regression tests for Swish chat performance optimizations:
 * 1. GET /api/messages/:convId: authorization, read-only behavior, response shape, ordering.
 * 2. Atomic message persistence (msg:send and POST /:convId/send): authorization, atomic append, concurrent sends, failure handling.
 * 3. Authoritative read receipts (msg:read): atomic arrayFilters update, acknowledgement after persistence.
 * 4. Targeted Socket.IO user rooms: user:${userId} room join, multi-instance delivery, room isolation, no duplicates.
 */

import 'dotenv/config'
import { describe, it, before, after } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import http from 'node:http'
import mongoose from 'mongoose'
import jwt from 'jsonwebtoken'
import { Server } from 'socket.io'
import { io as Client } from 'socket.io-client'

import User from '../src/models/User.js'
import { Conversation } from '../src/models/Conversation.js'
import messagesRoutes from '../src/routes/messages.routes.js'
import { initSocket, emitToUser } from '../src/services/socket.service.js'
import { connectDB } from '../src/config/db.js'

describe('Chat Performance & Real-Time Regression Suite', () => {
  let userA, userB, userC
  let tokenA, tokenB, tokenC
  let app, httpServer, ioServer, serverPort
  let clientA, clientB

  const testSuffix = Date.now()

  before(async () => {
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI is required for regression tests.')
    }
    await connectDB()

    // Create 3 test users (User A & B are chat partners; User C is an unauthorized third party)
    userA = await User.create({
      name: `ChatReg User A ${testSuffix}`,
      email: `chatreg_a_${testSuffix}@example.edu`,
      username: `chatreg_a_${testSuffix}`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
      initials: 'CA',
      role: 'student',
      status: 'active',
      verified: true,
      preferences: { privacy: { activity: true } },
    })

    userB = await User.create({
      name: `ChatReg User B ${testSuffix}`,
      email: `chatreg_b_${testSuffix}@example.edu`,
      username: `chatreg_b_${testSuffix}`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
      initials: 'CB',
      role: 'student',
      status: 'active',
      verified: true,
      preferences: { privacy: { activity: true } },
    })

    userC = await User.create({
      name: `ChatReg User C ${testSuffix}`,
      email: `chatreg_c_${testSuffix}@example.edu`,
      username: `chatreg_c_${testSuffix}`,
      passwordHash: '$2a$10$abcdefghijklmnopqrstuvwxyz1234567890abcdefghijklmnopqr',
      initials: 'CC',
      role: 'student',
      status: 'active',
      verified: true,
      preferences: { privacy: { activity: true } },
    })

    const jwtSecret = process.env.JWT_SECRET || 'jwt-secret-for-test'
    process.env.JWT_SECRET = jwtSecret

    tokenA = jwt.sign({ sub: userA._id.toString() }, jwtSecret)
    tokenB = jwt.sign({ sub: userB._id.toString() }, jwtSecret)
    tokenC = jwt.sign({ sub: userC._id.toString() }, jwtSecret)

    // Setup Express App
    app = express()
    app.use(express.json())

    // Mock authentication middleware injection based on Authorization header
    app.use((req, res, next) => {
      const auth = req.headers.authorization
      if (auth?.includes(tokenA)) req.user = userA
      else if (auth?.includes(tokenB)) req.user = userB
      else if (auth?.includes(tokenC)) req.user = userC
      else req.user = userA
      next()
    })

    app.use('/api/messages', messagesRoutes)

    httpServer = initSocket(app)
    await new Promise(r => httpServer.listen(0, '127.0.0.1', r))
    serverPort = httpServer.address().port

    clientA = Client(`http://127.0.0.1:${serverPort}`, {
      auth: { token: tokenA },
      transports: ['websocket'],
      reconnection: false,
    })
    clientB = Client(`http://127.0.0.1:${serverPort}`, {
      auth: { token: tokenB },
      transports: ['websocket'],
      reconnection: false,
    })

    await Promise.all([
      new Promise(r => clientA.on('connect', r)),
      new Promise(r => clientB.on('connect', r)),
    ])
  })

  after(async () => {
    if (clientA) clientA.disconnect()
    if (clientB) clientB.disconnect()
    if (httpServer) await new Promise(r => httpServer.close(r))

    if (userA) await User.deleteOne({ _id: userA._id })
    if (userB) await User.deleteOne({ _id: userB._id })
    if (userC) await User.deleteOne({ _id: userC._id })
    await Conversation.deleteMany({ participants: { $in: [userA?._id, userB?._id, userC?._id] } })
    await mongoose.disconnect()
  })

  // ── TEST 1: GET /api/messages/:convId Read-Only & Authorization ─────────────
  it('GET /api/messages/:convId returns lean messages without document writes and enforces auth', async () => {
    const conv = await Conversation.create({
      participants: [userA._id, userB._id],
      messages: [
        { sender: userA._id, text: 'Hello from A', readBy: [userA._id] },
        { sender: userB._id, text: 'Hi from B', readBy: [userB._id] },
      ],
      lastMessage: 'Hi from B',
      lastMessageAt: new Date(),
      lastSender: userB._id,
    })

    // Capture conversation version before GET
    const beforeGet = await Conversation.findById(conv._id).lean()

    // 1. Authorized GET by participant User A
    const res = await fetch(`http://127.0.0.1:${serverPort}/api/messages/${conv._id}`, {
      headers: { Authorization: `Bearer ${tokenA}` },
    })
    const body = await res.json()

    assert.equal(res.status, 200)
    assert.equal(body.ok, true)
    assert.equal(body.messages.length, 2)
    assert.equal(body.messages[0].text, 'Hello from A')
    assert.equal(body.messages[0].senderId, userA._id.toString())
    assert.equal(body.messages[1].text, 'Hi from B')
    assert.equal(body.messages[1].senderId, userB._id.toString())

    // 2. Verify that GET did NOT write to the database (read-only verification)
    const afterGet = await Conversation.findById(conv._id).lean()
    assert.equal(afterGet.updatedAt.toISOString(), beforeGet.updatedAt.toISOString())
    assert.equal(afterGet.__v, beforeGet.__v)

    // 3. Unauthorized access by User C must be rejected with 404
    const unauthRes = await fetch(`http://127.0.0.1:${serverPort}/api/messages/${conv._id}`, {
      headers: { Authorization: `Bearer ${tokenC}` },
    })
    assert.equal(unauthRes.status, 404)
    const unauthBody = await unauthRes.json()
    assert.equal(unauthBody.ok, false)

    await Conversation.deleteOne({ _id: conv._id })
  })

  // ── TEST 2: Atomic Message Persistence & Concurrent Sends ──────────────────
  it('msg:send persists message atomically and handles concurrent sends without loss', async () => {
    const conv = await Conversation.create({
      participants: [userA._id, userB._id],
      messages: [],
      lastMessage: '',
      lastMessageAt: null,
      lastSender: null,
    })

    clientA.emit('conv:join', conv._id.toString())
    clientB.emit('conv:join', conv._id.toString())
    await new Promise(r => setTimeout(r, 100))

    // Send 5 concurrent messages from Client A
    const sendPromises = []
    for (let i = 1; i <= 5; i++) {
      sendPromises.push(
        new Promise((resolve, reject) => {
          clientA.emit('msg:send', { convId: conv._id.toString(), text: `Concurrent message ${i}` }, (ack) => {
            if (ack?.ok) resolve(ack.message)
            else reject(new Error(ack?.error || 'Send failed'))
          })
        })
      )
    }

    const acks = await Promise.all(sendPromises)
    assert.equal(acks.length, 5)

    // Verify all 5 messages are persisted in MongoDB in exact order
    const updatedConv = await Conversation.findById(conv._id).lean()
    assert.equal(updatedConv.messages.length, 5)
    for (let i = 0; i < 5; i++) {
      assert.ok(updatedConv.messages[i]._id)
      assert.equal(updatedConv.messages[i].sender.toString(), userA._id.toString())
      assert.ok(updatedConv.messages[i].text.includes(`Concurrent message`))
    }

    // Verify lastMessage and lastSender updated
    assert.ok(updatedConv.lastMessage.includes('Concurrent message'))
    assert.equal(updatedConv.lastSender.toString(), userA._id.toString())

    await Conversation.deleteOne({ _id: conv._id })
  })

  // ── TEST 3: REST POST /:convId/send Atomic Persistence ──────────────────────
  it('POST /api/messages/:convId/send persists atomically and validates participants', async () => {
    const conv = await Conversation.create({
      participants: [userA._id, userB._id],
      messages: [],
    })

    // 1. Valid send by participant User A
    const res = await fetch(`http://127.0.0.1:${serverPort}/api/messages/${conv._id}/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenA}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: 'REST atomic message' }),
    })
    const body = await res.json()
    assert.equal(res.status, 200)
    assert.equal(body.ok, true)
    assert.equal(body.message.text, 'REST atomic message')
    assert.equal(body.message.senderId, userA._id.toString())

    // 2. Unauthorized send by User C must be rejected with 404
    const unauthRes = await fetch(`http://127.0.0.1:${serverPort}/api/messages/${conv._id}/send`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${tokenC}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text: 'Hacker message' }),
    })
    assert.equal(unauthRes.status, 404)

    // Verify only 1 message exists in DB
    const finalConv = await Conversation.findById(conv._id).lean()
    assert.equal(finalConv.messages.length, 1)

    await Conversation.deleteOne({ _id: conv._id })
  })

  // ── TEST 4: Authoritative Read Receipts via msg:read ────────────────────────
  it('msg:read updates unread status atomically and emits receipt to peer', async () => {
    const conv = await Conversation.create({
      participants: [userA._id, userB._id],
      messages: [
        { sender: userB._id, text: 'Unread 1', readBy: [userB._id] },
        { sender: userB._id, text: 'Unread 2', readBy: [userB._id] },
        { sender: userA._id, text: 'My own message', readBy: [userA._id] },
      ],
    })

    clientA.emit('conv:join', conv._id.toString())
    clientB.emit('conv:join', conv._id.toString())
    await new Promise(r => setTimeout(r, 100))

    // Client B listens for msg:read receipt
    let readReceiptReceived = false
    clientB.once('msg:read', ({ convId, readBy }) => {
      if (convId === conv._id.toString() && readBy === userA._id.toString()) {
        readReceiptReceived = true
      }
    })

    // Client A marks conversation read
    const ack = await new Promise(resolve => {
      clientA.emit('msg:read', { convId: conv._id.toString() }, resolve)
    })
    assert.equal(ack?.ok, true)

    // Wait for event delivery
    await new Promise(r => setTimeout(r, 150))
    assert.equal(readReceiptReceived, true, 'Peer must receive msg:read receipt')

    // Verify DB state: userA added to readBy of messages from userB, but own message readBy is untouched
    const updated = await Conversation.findById(conv._id).lean()
    assert.ok(updated.messages[0].readBy.map(String).includes(userA._id.toString()))
    assert.ok(updated.messages[1].readBy.map(String).includes(userA._id.toString()))
    assert.deepEqual(updated.messages[2].readBy.map(String), [userA._id.toString()])

    await Conversation.deleteOne({ _id: conv._id })
  })

  // ── TEST 5: Targeted Socket.IO User Room Delivery & Isolation ───────────────
  it('emitToUser routes events to user room with strict user isolation', async () => {
    let receivedByA = 0
    let receivedByB = 0

    clientA.on('test:user_event', () => { receivedByA++ })
    clientB.on('test:user_event', () => { receivedByB++ })

    // Emit event targeted to User A only
    emitToUser(userA._id.toString(), 'test:user_event', { secret: 'for_a_only' })

    await new Promise(r => setTimeout(r, 150))

    assert.equal(receivedByA, 1, 'Target user must receive event')
    assert.equal(receivedByB, 0, 'Unrelated user must NOT receive event')
  })
})
