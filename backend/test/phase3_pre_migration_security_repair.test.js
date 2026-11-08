// backend/test/phase3_pre_migration_security_repair.test.js
// ─────────────────────────────────────────────────────────────────────────────
// SWISH — PRE-MIGRATION SECURITY REPAIR & SOCKET.IO INTEGRATION TEST SUITE
// Architecture: Option A — Complete College Isolation
// Focus:
//   1. verifyConversationTenantAccess fail-closed enforcement
//   2. Real socket.io-client integration tests (port 0)
//   3. Legacy cross-college conversation lockdown (REST & Socket.IO)
//   4. Global presence broadcast elimination for accounts without collegeId
// ─────────────────────────────────────────────────────────────────────────────
import test from 'node:test'
import assert from 'node:assert/strict'
import http from 'node:http'
import express from 'express'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'
import { io as Client } from 'socket.io-client'

import { verifyConversationTenantAccess } from '../src/middleware/collegeAuth.middleware.js'
import { initSocket, getIO } from '../src/services/socket.service.js'
import User from '../src/models/User.js'
import { Conversation } from '../src/models/Conversation.js'
import PlatformConfig from '../src/models/PlatformConfig.js'

test('Pre-Migration Security Repair & Socket.IO Integration Suite', async (t) => {
  const TEST_JWT_SECRET = 'swish-test-pre-migration-secret-key-32chars!'
  const origJwtSecret = process.env.JWT_SECRET
  process.env.JWT_SECRET = TEST_JWT_SECRET

  // Setup Tenancy Identifiers
  const collegeAId = new mongoose.Types.ObjectId()
  const collegeBId = new mongoose.Types.ObjectId()

  // User Identifiers
  const userA1Id = new mongoose.Types.ObjectId()
  const userA2Id = new mongoose.Types.ObjectId()
  const userB1Id = new mongoose.Types.ObjectId()
  const userNoCollegeId = new mongoose.Types.ObjectId()

  // Mock User Profiles
  const userA1 = {
    _id: userA1Id,
    id: userA1Id.toString(),
    name: 'Alice (KC)',
    username: 'alice.kc',
    initials: 'AK',
    avatarColor: '#6366f1',
    role: 'student',
    collegeId: collegeAId,
    preferences: { privacy: { activity: true } },
  }

  const userA2 = {
    _id: userA2Id,
    id: userA2Id.toString(),
    name: 'Andrew (KC)',
    username: 'andrew.kc',
    initials: 'AK',
    avatarColor: '#10b981',
    role: 'student',
    collegeId: collegeAId,
    preferences: { privacy: { activity: true } },
  }

  const userB1 = {
    _id: userB1Id,
    id: userB1Id.toString(),
    name: 'Bob (DMCE)',
    username: 'bob.dmce',
    initials: 'BD',
    avatarColor: '#ec4899',
    role: 'student',
    collegeId: collegeBId,
    preferences: { privacy: { activity: true } },
  }

  const userNoCollege = {
    _id: userNoCollegeId,
    id: userNoCollegeId.toString(),
    name: 'System Admin',
    username: 'swish.admin',
    initials: 'SA',
    avatarColor: '#000000',
    role: 'main_admin',
    collegeId: null,
    preferences: { privacy: { activity: true } },
  }

  const userDbMap = new Map([
    [userA1Id.toString(), userA1],
    [userA2Id.toString(), userA2],
    [userB1Id.toString(), userB1],
    [userNoCollegeId.toString(), userNoCollege],
  ])

  // Mock Conversation IDs
  const legacyCrossConvId = new mongoose.Types.ObjectId()
  const legacySameConvId = new mongoose.Types.ObjectId()
  const migratedSameConvId = new mongoose.Types.ObjectId()
  const archivedConvId = new mongoose.Types.ObjectId()

  // Conversations in Mock DB
  const convDbMap = new Map([
    [
      legacyCrossConvId.toString(),
      {
        _id: legacyCrossConvId,
        participants: [userA1, userB1], // Different colleges!
        collegeId: undefined, // Unmigrated
        isArchived: false,
        messages: [],
      },
    ],
    [
      legacySameConvId.toString(),
      {
        _id: legacySameConvId,
        participants: [userA1, userA2], // Same college
        collegeId: undefined, // Unmigrated
        isArchived: false,
        messages: [],
      },
    ],
    [
      migratedSameConvId.toString(),
      {
        _id: migratedSameConvId,
        participants: [userA1, userA2],
        collegeId: collegeAId, // Migrated
        isArchived: false,
        messages: [],
      },
    ],
    [
      archivedConvId.toString(),
      {
        _id: archivedConvId,
        participants: [userA1, userB1],
        collegeId: null,
        isArchived: true, // Archived
        messages: [],
      },
    ],
  ])

  // ───────────────────────────────────────────────────────────────────────────
  // PART 1: verifyConversationTenantAccess Unit Tests
  // ───────────────────────────────────────────────────────────────────────────
  await t.test('1. verifyConversationTenantAccess: Rejects archived conversations unconditionally', async () => {
    const res = await verifyConversationTenantAccess({ isArchived: true, collegeId: collegeAId }, userA1)
    assert.equal(res, false, 'Archived conversations must fail closed')
  })

  await t.test('2. verifyConversationTenantAccess: Rejects users without valid collegeId', async () => {
    const res = await verifyConversationTenantAccess({ collegeId: collegeAId, isArchived: false }, userNoCollege)
    assert.equal(res, false, 'Users without collegeId must never access college conversations')
  })

  await t.test('3. verifyConversationTenantAccess: Authorizes migrated same-college conversation', async () => {
    const res = await verifyConversationTenantAccess(
      { collegeId: collegeAId, isArchived: false, participants: [userA1, userA2] },
      userA1
    )
    assert.equal(res, true, 'Same-college conversation must succeed')
  })

  await t.test('4. verifyConversationTenantAccess: Rejects migrated conversation for foreign college user', async () => {
    const res = await verifyConversationTenantAccess(
      { collegeId: collegeAId, isArchived: false, participants: [userA1, userA2] },
      userB1
    )
    assert.equal(res, false, 'Foreign college user must be rejected')
  })

  await t.test('5. verifyConversationTenantAccess: Authorizes legacy unmigrated same-college conversation', async () => {
    const legacySameConv = {
      collegeId: null,
      isArchived: false,
      participants: [userA1, userA2],
    }
    const res = await verifyConversationTenantAccess(legacySameConv, userA1)
    assert.equal(res, true, 'Unmigrated same-college conversation must succeed')
  })

  await t.test('6. verifyConversationTenantAccess: Rejects legacy unmigrated cross-college conversation', async () => {
    const legacyCrossConv = {
      collegeId: null,
      isArchived: false,
      participants: [userA1, userB1], // KC and DMCE
    }
    const res = await verifyConversationTenantAccess(legacyCrossConv, userA1)
    assert.equal(res, false, 'Cross-college unmigrated conversation must strictly fail closed')
  })

  await t.test('7. verifyConversationTenantAccess: Rejects legacy conversation if any participant lacks collegeId', async () => {
    const convWithAdmin = {
      collegeId: null,
      isArchived: false,
      participants: [userA1, userNoCollege], // Alice and swish.admin
    }
    const res = await verifyConversationTenantAccess(convWithAdmin, userA1)
    assert.equal(res, false, 'Conversation involving participant with null collegeId must fail closed')
  })

  await t.test('8. verifyConversationTenantAccess: Resolves unpopulated ObjectId participants via UserModel', async () => {
    const mockUserModel = {
      find: (filter) => ({
        select: () => ({
          lean: async () => {
            const ids = filter._id.$in.map(id => id.toString())
            return ids.map(id => userDbMap.get(id)).filter(Boolean)
          },
        }),
      }),
    }

    const unpopulatedSameConv = {
      collegeId: null,
      isArchived: false,
      participants: [userA1Id, userA2Id], // Raw ObjectIds
    }
    const sameRes = await verifyConversationTenantAccess(unpopulatedSameConv, userA1, mockUserModel)
    assert.equal(sameRes, true, 'Unpopulated same-college participants must be verified and allowed')

    const unpopulatedCrossConv = {
      collegeId: null,
      isArchived: false,
      participants: [userA1Id, userB1Id], // Raw ObjectIds across colleges
    }
    const crossRes = await verifyConversationTenantAccess(unpopulatedCrossConv, userA1, mockUserModel)
    assert.equal(crossRes, false, 'Unpopulated cross-college participants must be verified and rejected')
  })

  // ───────────────────────────────────────────────────────────────────────────
  // PART 2: Real Socket.IO Server & socket.io-client Integration Tests
  // ───────────────────────────────────────────────────────────────────────────
  // Setup Mock Mongoose User & Conversation query methods for Socket.IO runtime
  const origUserFindById = User.findById
  const origUserFind = User.find
  const origConvFindOne = Conversation.findOne
  const origConvFindOneAndUpdate = Conversation.findOneAndUpdate
  const origConvUpdateOne = Conversation.updateOne
  const origPlatformConfigFindOne = PlatformConfig.findOne

  PlatformConfig.findOne = () => ({
    lean: async () => ({
      maintenance: { enabled: false },
      features: { allowDirectMessaging: true },
      broadcast: { active: false },
    }),
  })

  User.findById = (id) => ({
    select: () => ({
      lean: async () => userDbMap.get(id.toString()) || null,
      then: (resolve) => resolve(userDbMap.get(id.toString()) || null),
    }),
    lean: async () => userDbMap.get(id.toString()) || null,
  })

  User.find = (filter) => ({
    select: () => ({
      lean: async () => {
        if (filter?._id?.$in) {
          const ids = filter._id.$in.map(id => id.toString())
          return ids.map(id => userDbMap.get(id)).filter(Boolean)
        }
        return [...userDbMap.values()]
      },
    }),
  })

  Conversation.findOne = (filter) => ({
    select: () => ({
      populate: () => ({
        lean: async () => convDbMap.get(filter._id.toString()) || null,
      }),
      lean: async () => convDbMap.get(filter._id.toString()) || null,
    }),
  })

  Conversation.findOneAndUpdate = async (filter, update) => {
    const conv = convDbMap.get(filter._id.toString())
    if (!conv) return null
    return { ...conv, ...update.$set }
  }

  Conversation.updateOne = async (filter, update) => {
    const conv = convDbMap.get(filter._id.toString())
    if (!conv) return { matchedCount: 0, modifiedCount: 0 }
    return { matchedCount: 1, modifiedCount: 1 }
  }

  // Create Express App & Socket Server
  const app = express()
  const httpServer = initSocket(app)

  await new Promise((resolve) => httpServer.listen(0, '127.0.0.1', resolve))
  const serverPort = httpServer.address().port
  const serverUrl = `http://127.0.0.1:${serverPort}`

  // Helper to generate JWT
  const makeToken = (user) => {
    return jwt.sign({ sub: user._id.toString(), role: user.role }, TEST_JWT_SECRET, { expiresIn: '1h' })
  }

  // Helper to create client
  const createClientSocket = (user) => {
    const token = makeToken(user)
    return Client(serverUrl, {
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
      reconnection: false,
    })
  }

  let clientA1, clientA2, clientB1, clientNoCollege

  await t.test('9. Real Socket.IO: Multi-client connection and presence isolation', async () => {
    let collegeAOnlineNotifs = []
    let collegeBOnlineNotifs = []

    // Connect Client A1
    clientA1 = createClientSocket(userA1)
    await new Promise((resolve) => clientA1.on('connect', resolve))

    // Connect Client B1
    clientB1 = createClientSocket(userB1)
    await new Promise((resolve) => clientB1.on('connect', resolve))

    clientA1.on('user:online', (data) => collegeAOnlineNotifs.push(data))
    clientB1.on('user:online', (data) => collegeBOnlineNotifs.push(data))

    // Connect Client A2 (same college as A1)
    clientA2 = createClientSocket(userA2)
    await new Promise((resolve) => clientA2.on('connect', resolve))

    // Small delay to collect events
    await new Promise((r) => setTimeout(r, 80))

    // Client A1 must have received Client A2's online notification
    const a1ReceivedA2 = collegeAOnlineNotifs.some(n => n.userId === userA2Id.toString())
    assert.equal(a1ReceivedA2, true, 'College A student must receive online presence of same-college peer')

    // Client B1 (foreign college) must NOT have received Client A2's online notification
    const b1ReceivedA2 = collegeBOnlineNotifs.some(n => n.userId === userA2Id.toString())
    assert.equal(b1ReceivedA2, false, 'Foreign college student must NEVER receive presence of another college')
  })

  await t.test('10. Real Socket.IO: User without collegeId NEVER triggers global presence broadcast', async () => {
    let anyOnlineReceived = []
    clientA1.on('user:online', (d) => anyOnlineReceived.push({ recipient: 'A1', ...d }))
    clientB1.on('user:online', (d) => anyOnlineReceived.push({ recipient: 'B1', ...d }))

    // Connect Client without collegeId (e.g. swish.admin)
    clientNoCollege = createClientSocket(userNoCollege)
    await new Promise((resolve) => clientNoCollege.on('connect', resolve))

    await new Promise((r) => setTimeout(r, 80))

    const leakedAdminPresence = anyOnlineReceived.some(d => d.userId === userNoCollegeId.toString())
    assert.equal(leakedAdminPresence, false, 'User without collegeId must NEVER emit global presence broadcast on connect')
  })

  await t.test('11. Real Socket.IO: Legacy cross-college conversation cannot be joined (conv:join rejected)', async () => {
    // Client A1 attempts to join legacy unmigrated cross-college room
    clientA1.emit('conv:join', legacyCrossConvId.toString())

    await new Promise((r) => setTimeout(r, 80))

    // Verify room was NOT joined by inspecting server socket instance
    const io = getIO()
    let serverSocketA1 = null
    for (const [_, s] of io.sockets.sockets) {
      if (s.user?._id?.toString() === userA1Id.toString()) {
        serverSocketA1 = s
        break
      }
    }

    assert.ok(serverSocketA1, 'Server socket for Client A1 must be found')
    const inLegacyRoom = serverSocketA1.rooms.has(`conv:${legacyCrossConvId.toString()}`)
    assert.equal(inLegacyRoom, false, 'Client A1 must NOT be permitted to join legacy cross-college conversation room')
  })

  await t.test('12. Real Socket.IO: Legacy cross-college messaging is rejected (msg:send fail-closed)', async () => {
    let ackResult = null
    await new Promise((resolve) => {
      clientA1.emit(
        'msg:send',
        {
          convId: legacyCrossConvId.toString(),
          text: 'Attempted illicit cross-college message',
        },
        (ack) => {
          ackResult = ack
          resolve()
        }
      )
    })

    assert.equal(ackResult?.ok, false, 'Legacy cross-college message send must be rejected')
    assert.match(ackResult?.error || '', /Conversation not found or archived/i, 'Must report conversation not found/archived')
  })

  await t.test('13. Real Socket.IO: Legacy cross-college mark-as-read is rejected (msg:read fail-closed)', async () => {
    let ackResult = null
    await new Promise((resolve) => {
      clientA1.emit('msg:read', { convId: legacyCrossConvId.toString() }, (ack) => {
        ackResult = ack
        resolve()
      })
    })

    assert.equal(ackResult?.ok, false, 'Legacy cross-college read receipt must be rejected')
    assert.equal(ackResult?.error, 'Conversation not found.', 'Must fail closed on read receipt')
  })

  await t.test('14. Real Socket.IO: Legacy same-college conversation CAN be joined and messaged', async () => {
    // Client A1 joins same-college unmigrated conversation
    clientA1.emit('conv:join', legacySameConvId.toString())
    await new Promise((r) => setTimeout(r, 80))

    const io = getIO()
    let serverSocketA1 = null
    for (const [_, s] of io.sockets.sockets) {
      if (s.user?._id?.toString() === userA1Id.toString()) {
        serverSocketA1 = s
        break
      }
    }
    assert.ok(serverSocketA1)
    const inSameCollegeRoom = serverSocketA1.rooms.has(`conv:${legacySameConvId.toString()}`)
    assert.equal(inSameCollegeRoom, true, 'Same-college unmigrated conversation room MUST be joined successfully')

    // Client A1 sends message in same-college unmigrated conversation
    let ackResult = null
    await new Promise((resolve) => {
      clientA1.emit(
        'msg:send',
        {
          convId: legacySameConvId.toString(),
          text: 'Legitimate same-college message',
        },
        (ack) => {
          ackResult = ack
          resolve()
        }
      )
    })
    assert.equal(ackResult?.ok, true, 'Same-college unmigrated message send must succeed')
    assert.equal(ackResult?.message?.text, 'Legitimate same-college message')
  })

  await t.test('15. Real Socket.IO: follow:notify strictly blocks cross-college and null-college dispatch', async () => {
    let clientB1FollowNotifs = []
    let clientNoCollegeFollowNotifs = []
    let clientA2FollowNotifs = []

    clientB1.on('follow:received', (d) => clientB1FollowNotifs.push(d))
    clientNoCollege.on('follow:received', (d) => clientNoCollegeFollowNotifs.push(d))
    clientA2.on('follow:received', (d) => clientA2FollowNotifs.push(d))

    // 1. Cross-college follow attempt (A1 -> B1)
    clientA1.emit('follow:notify', { targetUserId: userB1Id.toString() })

    // 2. Unaffiliated admin follow attempt (A1 -> NoCollege)
    clientA1.emit('follow:notify', { targetUserId: userNoCollegeId.toString() })

    // 3. Same-college follow attempt (A1 -> A2)
    clientA1.emit('follow:notify', { targetUserId: userA2Id.toString() })

    await new Promise((r) => setTimeout(r, 80))

    assert.equal(clientB1FollowNotifs.length, 0, 'Cross-college follow:notify must NEVER deliver notification')
    assert.equal(clientNoCollegeFollowNotifs.length, 0, 'Follow to user without collegeId must NEVER deliver notification')
    assert.equal(clientA2FollowNotifs.length, 1, 'Same-college follow:notify must successfully deliver notification')
    assert.equal(clientA2FollowNotifs[0].fromUserId, userA1Id.toString())
  })

  await t.test('16. Real Socket.IO: Disconnection of user without collegeId does not emit user:offline broadcast', async () => {
    let offlineEventsReceived = []
    clientA1.on('user:offline', (d) => offlineEventsReceived.push(d))
    clientB1.on('user:offline', (d) => offlineEventsReceived.push(d))

    clientNoCollege.disconnect()
    await new Promise((r) => setTimeout(r, 80))

    const leakedOfflineEvent = offlineEventsReceived.some(d => d.userId === userNoCollegeId.toString())
    assert.equal(leakedOfflineEvent, false, 'User without collegeId must NEVER emit global user:offline broadcast on disconnect')
  })

  // Cleanup Sockets and Server
  clientA1?.disconnect()
  clientA2?.disconnect()
  clientB1?.disconnect()
  clientNoCollege?.disconnect()

  await new Promise((resolve) => httpServer.close(resolve))

  // Restore mocks and environment
  User.findById = origUserFindById
  User.find = origUserFind
  Conversation.findOne = origConvFindOne
  Conversation.findOneAndUpdate = origConvFindOneAndUpdate
  Conversation.updateOne = origConvUpdateOne
  PlatformConfig.findOne = origPlatformConfigFindOne
  process.env.JWT_SECRET = origJwtSecret
})
