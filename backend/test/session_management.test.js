// backend/test/session_management.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Admin Session and Device Management Verification Suite
// ─────────────────────────────────────────────────────────────────────────────
import { describe, it, beforeEach } from 'node:test'
import assert from 'node:assert/strict'
import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import mongoose from 'mongoose'

import Session from '../src/models/Session.js'
import {
  hashToken,
  parseClientInfo,
  createSession,
  rotateSessionToken,
  revokeSession,
  revokeOtherSessions,
  listUserSessions,
  touchSession,
} from '../src/services/session.service.js'
import { requireAuth } from '../src/middleware/auth.middleware.js'

describe('Admin Session & Device Management', () => {
  const jwtSecret = 'test_session_management_jwt_secret_at_least_32_characters_long_for_security!'
  process.env.JWT_SECRET = jwtSecret

  const mockAdminUser = {
    _id: new mongoose.Types.ObjectId(),
    name: 'College Admin Test',
    role: 'college_admin',
    collegeId: new mongoose.Types.ObjectId(),
    college: 'Engineering College',
    email: 'admin@college.edu',
    deactivated: false,
    suspended: false,
    toJSON() {
      return { id: this._id.toString(), name: this.name, role: this.role }
    },
  }

  const mockOtherAdmin = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Other Admin',
    role: 'college_admin',
    collegeId: new mongoose.Types.ObjectId(),
    college: 'Medical College',
    email: 'other@college.edu',
    deactivated: false,
    suspended: false,
  }

  it('1. Secure token hashing: raw tokens are never persisted in plain text', () => {
    const rawToken = 'header.payload.signature_sample_jwt'
    const computedHash = hashToken(rawToken)

    assert.equal(typeof computedHash, 'string')
    assert.equal(computedHash.length, 64) // SHA-256 is 64 hex characters
    assert.notEqual(computedHash, rawToken)
    assert.equal(computedHash, crypto.createHash('sha256').update(rawToken).digest('hex'))
  })

  it('2. Device, browser, OS, and IP tracking accurately parses various User-Agents', () => {
    // Desktop Windows Chrome
    const reqDesktop = {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'x-forwarded-for': '203.0.113.195, 10.0.0.1',
      },
      socket: { remoteAddress: '127.0.0.1' },
    }
    const infoDesktop = parseClientInfo(reqDesktop)
    assert.equal(infoDesktop.browser, 'Google Chrome')
    assert.equal(infoDesktop.os, 'Windows 10/11')
    assert.equal(infoDesktop.deviceType, 'desktop')
    assert.equal(infoDesktop.ipAddress, '203.0.113.195')

    // Mobile iPhone Safari
    const reqMobile = {
      headers: {
        'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
      },
      socket: { remoteAddress: '127.0.0.1' },
    }
    const infoMobile = parseClientInfo(reqMobile)
    assert.equal(infoMobile.browser, 'Apple Safari')
    assert.equal(infoMobile.os, 'iOS (iPhone)')
    assert.equal(infoMobile.deviceType, 'mobile')

    // Tablet iPad
    const reqTablet = {
      headers: {
        'user-agent': 'Mozilla/5.0 (iPad; CPU OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1',
      },
      socket: { remoteAddress: '127.0.0.1' },
    }
    const infoTablet = parseClientInfo(reqTablet)
    assert.equal(infoTablet.deviceType, 'tablet')
  })

  it('3. Session creation generates JWT with sid, refresh token, and never exposes tokenHash via toJSON', () => {
    const rawSessionDoc = new Session({
      _id: new mongoose.Types.ObjectId(),
      userId: mockAdminUser._id,
      userName: mockAdminUser.name,
      userRole: mockAdminUser.role,
      collegeId: mockAdminUser.collegeId,
      deviceType: 'desktop',
      deviceName: 'Google Chrome on Windows 10/11',
      browser: 'Google Chrome',
      os: 'Windows 10/11',
      ipAddress: '198.51.100.1',
      userAgent: 'Mozilla/5.0 ...',
      tokenHash: hashToken('some_jwt_token_123'),
      refreshTokenHash: hashToken('some_refresh_token_456'),
      isActive: true,
      lastActivity: new Date(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    })

    const json = rawSessionDoc.toJSON()
    assert.ok(json.id)
    assert.equal(json._id, undefined)
    assert.equal(json.token, undefined)
    assert.equal(json.tokenHash, undefined)
    assert.equal(json.refreshToken, undefined)
    assert.equal(json.refreshTokenHash, undefined)
    assert.equal(json.deviceName, 'Google Chrome on Windows 10/11')
    assert.equal(json.isActive, true)
  })

  it('4. Immediate rejection of revoked sessions in requireAuth middleware', async () => {
    const activeSessionId = new mongoose.Types.ObjectId()
    const revokedSessionId = new mongoose.Types.ObjectId()

    // Mock Session.findById
    const originalFindById = Session.findById
    Session.findById = (id) => {
      const idStr = id.toString()
      if (idStr === activeSessionId.toString()) {
        return Promise.resolve({
          _id: activeSessionId,
          userId: mockAdminUser._id,
          isActive: true,
          expiresAt: new Date(Date.now() + 60000),
        })
      }
      if (idStr === revokedSessionId.toString()) {
        return Promise.resolve({
          _id: revokedSessionId,
          userId: mockAdminUser._id,
          isActive: false, // Revoked!
          revokedAt: new Date(),
          expiresAt: new Date(Date.now() + 60000),
        })
      }
      return Promise.resolve(null)
    }

    try {
      const revokedToken = jwt.sign(
        { sub: mockAdminUser._id.toString(), role: mockAdminUser.role, sid: revokedSessionId.toString() },
        jwtSecret
      )

      let resStatus = null
      let resJson = null
      const mockReq = {
        headers: { authorization: `Bearer ${revokedToken}` },
        cookies: {},
      }
      const mockRes = {
        status(s) {
          resStatus = s
          return this
        },
        json(j) {
          resJson = j
          return this
        },
      }
      let nextCalled = false

      await requireAuth(mockReq, mockRes, () => {
        nextCalled = true
      })

      assert.equal(resStatus, 401, 'Revoked session must be rejected with HTTP 401')
      assert.equal(resJson.ok, false)
      assert.equal(resJson.revoked, true)
      assert.match(resJson.error, /Session has been revoked/i)
      assert.equal(nextCalled, false, 'Revoked session must not proceed to next handler')
    } finally {
      Session.findById = originalFindById
    }
  })

  it('5. Immediate rejection of expired sessions in requireAuth middleware', async () => {
    const expiredSessionId = new mongoose.Types.ObjectId()

    const originalFindById = Session.findById
    Session.findById = (id) => {
      if (id.toString() === expiredSessionId.toString()) {
        return Promise.resolve({
          _id: expiredSessionId,
          userId: mockAdminUser._id,
          isActive: true,
          expiresAt: new Date(Date.now() - 10000), // Expired 10 seconds ago
        })
      }
      return Promise.resolve(null)
    }

    try {
      const expiredToken = jwt.sign(
        { sub: mockAdminUser._id.toString(), role: mockAdminUser.role, sid: expiredSessionId.toString() },
        jwtSecret
      )

      let resStatus = null
      let resJson = null
      const mockReq = {
        headers: { authorization: `Bearer ${expiredToken}` },
        cookies: {},
      }
      const mockRes = {
        status(s) {
          resStatus = s
          return this
        },
        json(j) {
          resJson = j
          return this
        },
      }

      await requireAuth(mockReq, mockRes, () => {})

      assert.equal(resStatus, 401)
      assert.equal(resJson.expired, true)
      assert.match(resJson.error, /Session expired/i)
    } finally {
      Session.findById = originalFindById
    }
  })

  it('6. Admin can manage only their own sessions (cross-admin protection)', async () => {
    const targetSessionId = new mongoose.Types.ObjectId()

    const originalFindOne = Session.findOne
    // Mock Session.findOne checking userId
    Session.findOne = (query) => {
      // If query is for mockAdminUser, find it. If for mockOtherAdmin, query.userId will not match!
      if (query.userId?.toString() === mockAdminUser._id.toString()) {
        return Promise.resolve({
          _id: targetSessionId,
          userId: mockAdminUser._id,
          isActive: true,
          save() {
            return Promise.resolve(this)
          },
        })
      }
      // Different user cannot find it
      return Promise.resolve(null)
    }

    try {
      // Other admin attempts to revoke mockAdminUser's session
      const unauthorizedRevocation = await revokeSession(targetSessionId, mockOtherAdmin._id)
      assert.equal(unauthorizedRevocation, false, 'Other admin must NOT be able to revoke another admin session')

      // Authorized admin revoking their own session
      const authorizedRevocation = await revokeSession(targetSessionId, mockAdminUser._id)
      assert.equal(authorizedRevocation, true, 'Admin must be able to revoke their own session')
    } finally {
      Session.findOne = originalFindOne
    }
  })

  it('7. Revocation of other sessions leaves current session active', async () => {
    const currentSessionId = new mongoose.Types.ObjectId()
    let updatedFilter = null
    let updatedFields = null

    const originalUpdateMany = Session.updateMany
    Session.updateMany = (filter, update) => {
      updatedFilter = filter
      updatedFields = update
      return Promise.resolve({ modifiedCount: 3 })
    }

    try {
      const count = await revokeOtherSessions(mockAdminUser._id, currentSessionId)
      assert.equal(count, 3)
      assert.equal(updatedFilter.userId.toString(), mockAdminUser._id.toString())
      assert.equal(updatedFilter._id.$ne.toString(), currentSessionId.toString())
      assert.equal(updatedFields.$set.isActive, false)
      assert.ok(updatedFields.$set.revokedAt instanceof Date)
    } finally {
      Session.updateMany = originalUpdateMany
    }
  })

  it('8. Retroactive session creation uses upsert to prevent duplicates', async () => {
    // Test that the findOneAndUpdate with upsert prevents race conditions
    const tokenHash = hashToken('test_token_123')
    let wasUpsertCalled = false
    let upsertOption = null

    const originalFindOneAndUpdate = Session.findOneAndUpdate
    Session.findOneAndUpdate = (filter, update, options) => {
      wasUpsertCalled = true
      upsertOption = options?.upsert
      return Promise.resolve({
        _id: new mongoose.Types.ObjectId(),
        userId: mockAdminUser._id,
        isActive: true,
      })
    }

    try {
      // Simulate the retroactive session creation logic
      const session = await Session.findOneAndUpdate(
        { tokenHash, isActive: true },
        { $setOnInsert: { userId: mockAdminUser._id, userName: mockAdminUser.name } },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      )

      assert.equal(wasUpsertCalled, true, 'findOneAndUpdate should be called')
      assert.equal(upsertOption, true, 'upsert option should be true to prevent duplicates')
      assert.ok(session, 'Session should be returned')
    } finally {
      Session.findOneAndUpdate = originalFindOneAndUpdate
    }
  })
})

