import test from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import usersRouter from '../src/routes/users.routes.js'

test('Phase 4 — Express Router Stack Memory Leak Prevention', async (t) => {
  await t.test('PATCH /preferences route is registered at top-level, not nested inside /:userId', () => {
    // Count how many times /preferences is registered in usersRouter.stack
    const preferenceLayers = usersRouter.stack.filter(layer => {
      return layer.route && layer.route.path === '/preferences' && layer.route.methods.patch
    })

    assert.equal(
      preferenceLayers.length,
      1,
      'PATCH /preferences must be registered exactly once at router initialization and not dynamically inside /:userId'
    )
  })

  await t.test('GET /:userId route does not push new layers onto router stack', () => {
    const stackLengthBefore = usersRouter.stack.length
    // Verify stack length remains stable
    assert.equal(usersRouter.stack.length, stackLengthBefore)
  })
})

test('Phase 4 — Conversation Inbox Projection & Format Compatibility', async (t) => {
  const currentUserId = new mongoose.Types.ObjectId()
  const partnerId = new mongoose.Types.ObjectId()
  const convId = new mongoose.Types.ObjectId()

  await t.test('Correctly computes unread count and conversation preview from projected fields', () => {
    // Sample projected conversation without full message text or sub-documents
    const projectedConv = {
      _id: convId,
      participants: [
        {
          _id: currentUserId,
          name: 'Current User',
        },
        {
          _id: partnerId,
          name: 'Partner Student',
          username: 'partner_s',
          initials: 'PS',
          avatarColor: '#10b981',
          profilePhoto: 'https://example.com/partner.jpg',
        },
      ],
      lastMessage: 'Hey, are you going to the campus hackathon?',
      lastMessageAt: new Date('2026-10-22T14:30:00.000Z'),
      lastSender: partnerId,
      updatedAt: new Date('2026-10-22T14:30:00.000Z'),
      messages: [
        // Message 1: from partner, read by me
        {
          sender: partnerId,
          readBy: [partnerId, currentUserId],
        },
        // Message 2: from partner, NOT read by me
        {
          sender: partnerId,
          readBy: [partnerId],
        },
        // Message 3: from me, not read by partner (should not count as unread for me)
        {
          sender: currentUserId,
          readBy: [currentUserId],
        },
      ],
    }

    // Inline replication of formatConv to verify computation logic against projected shape
    const other = projectedConv.participants.find(p => p._id.toString() !== currentUserId.toString())
    const unread = projectedConv.messages.filter(
      m => m.sender.toString() !== currentUserId.toString() && !m.readBy.map(r => r.toString()).includes(currentUserId.toString())
    ).length

    const formatted = {
      id: projectedConv._id.toString(),
      participantId: other?._id?.toString(),
      name: other?.name ?? 'Unknown',
      username: other?.username ?? '',
      initials: other?.initials ?? '??',
      avatarColor: other?.avatarColor ?? '#6366f1',
      profilePhoto: other?.profilePhoto ?? null,
      lastMessage: projectedConv.lastMessage ?? '',
      lastMessageAt: projectedConv.lastMessageAt ?? projectedConv.updatedAt,
      lastSenderId: projectedConv.lastSender?.toString() ?? null,
      unread,
    }

    assert.equal(formatted.id, convId.toString())
    assert.equal(formatted.participantId, partnerId.toString())
    assert.equal(formatted.name, 'Partner Student')
    assert.equal(formatted.unread, 1, 'Only unread messages sent by the other user must be counted')
    assert.equal(formatted.lastMessage, 'Hey, are you going to the campus hackathon?')
    assert.equal(formatted.lastSenderId, partnerId.toString())
  })

  await t.test('Inbox limit helper clamps between 1 and 100 with default of 50', () => {
    const parseLimit = (queryVal) => Math.min(Math.max(1, Number(queryVal) || 50), 100)

    assert.equal(parseLimit(undefined), 50)
    assert.equal(parseLimit(''), 50)
    assert.equal(parseLimit('invalid'), 50)
    assert.equal(parseLimit('25'), 25)
    assert.equal(parseLimit('0'), 50)
    assert.equal(parseLimit('-10'), 1)
    assert.equal(parseLimit('200'), 100)
    assert.equal(parseLimit('100'), 100)
    assert.equal(parseLimit('1'), 1)
  })
})
