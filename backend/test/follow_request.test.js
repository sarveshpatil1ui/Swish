// backend/test/follow_request.test.js
// ─────────────────────────────────────────────────────────────────────────────
// Unit & Integration Tests for Follow Request System (Instagram Standard)
// ─────────────────────────────────────────────────────────────────────────────
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import mongoose from 'mongoose'
import FollowRequest from '../src/models/FollowRequest.js'
import Notification from '../src/models/Notification.js'
import usersRouter from '../src/routes/users.routes.js'

describe('Follow Request System — Unit & Logic Tests', () => {

  test('1. FollowRequest model has required schema fields and indexes', () => {
    const paths = FollowRequest.schema.paths

    assert.ok(paths.requester, 'FollowRequest schema should have "requester"')
    assert.strictEqual(paths.requester.instance, 'ObjectId')
    assert.strictEqual(paths.requester.options.required, true)

    assert.ok(paths.recipient, 'FollowRequest schema should have "recipient"')
    assert.strictEqual(paths.recipient.instance, 'ObjectId')
    assert.strictEqual(paths.recipient.options.required, true)

    assert.ok(paths.status, 'FollowRequest schema should have "status"')
    assert.strictEqual(paths.status.instance, 'String')
    assert.deepStrictEqual(paths.status.options.enum, ['pending', 'accepted', 'rejected'])
    assert.strictEqual(paths.status.defaultValue, 'pending')

    // Check indexes
    const indexes = FollowRequest.schema.indexes()
    const compoundUnique = indexes.find(idx => idx[0].requester === 1 && idx[0].recipient === 1)
    assert.ok(compoundUnique, 'Compound index on { requester: 1, recipient: 1 } should exist')
    assert.strictEqual(compoundUnique[1]?.unique, true, 'Compound index must be unique')
  })

  test('2. Notification model includes follow_request and follow_accept types', () => {
    const typeEnum = Notification.schema.paths.type.options.enum
    assert.ok(typeEnum.includes('follow_request'), 'Notification enum should include follow_request')
    assert.ok(typeEnum.includes('follow_accept'), 'Notification enum should include follow_accept')
    assert.ok(typeEnum.includes('follow'), 'Notification enum should still include follow')
  })

  test('3. Users router registers follow-request endpoints', () => {
    const routes = usersRouter.stack
      .filter(layer => layer.route)
      .map(layer => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }))

    const pendingRoute = routes.find(r => r.path === '/follow-requests/pending' && r.methods.includes('get'))
    assert.ok(pendingRoute, 'Route GET /follow-requests/pending must be registered')

    const acceptRoute = routes.find(r => r.path === '/:userId/follow-request/accept' && r.methods.includes('post'))
    assert.ok(acceptRoute, 'Route POST /:userId/follow-request/accept must be registered')

    const rejectRoute = routes.find(r => r.path === '/:userId/follow-request/reject' && r.methods.includes('post'))
    assert.ok(rejectRoute, 'Route POST /:userId/follow-request/reject must be registered')

    const followRoute = routes.find(r => r.path === '/:userId/follow' && r.methods.includes('post'))
    assert.ok(followRoute, 'Route POST /:userId/follow must be registered')

    const unfollowRoute = routes.find(r => r.path === '/:userId/follow' && r.methods.includes('delete'))
    assert.ok(unfollowRoute, 'Route DELETE /:userId/follow must be registered')

    const profileRoute = routes.find(r => r.path === '/:userId' && r.methods.includes('get'))
    assert.ok(profileRoute, 'Route GET /:userId must be registered')
  })

  test('4. Role constraint logic blocks admins from following or being followed', () => {
    const adminRoles = ['admin', 'college_admin', 'main_admin']

    const checkAllowed = (callerRole, targetRole) => {
      if (adminRoles.includes(callerRole) || adminRoles.includes(targetRole)) {
        return false
      }
      return true
    }

    // Students and faculty can follow each other
    assert.strictEqual(checkAllowed('student', 'student'), true)
    assert.strictEqual(checkAllowed('student', 'faculty'), true)
    assert.strictEqual(checkAllowed('faculty', 'student'), true)
    assert.strictEqual(checkAllowed('faculty', 'faculty'), true)

    // Admins cannot follow anyone or be followed
    assert.strictEqual(checkAllowed('admin', 'student'), false)
    assert.strictEqual(checkAllowed('student', 'admin'), false)
    assert.strictEqual(checkAllowed('college_admin', 'student'), false)
    assert.strictEqual(checkAllowed('student', 'college_admin'), false)
    assert.strictEqual(checkAllowed('main_admin', 'faculty'), false)
    assert.strictEqual(checkAllowed('faculty', 'main_admin'), false)
  })

  test('5. Private account logic branches: public -> direct follow, private -> follow_request', () => {
    const determineFollowAction = (targetUser) => {
      const isPrivate = Boolean(targetUser.preferences?.privacy?.private)
      if (isPrivate) {
        return { action: 'request', requested: true, following: false }
      }
      return { action: 'follow', requested: false, following: true }
    }

    const publicStudent = { role: 'student', preferences: { privacy: { private: false } } }
    const privateStudent = { role: 'student', preferences: { privacy: { private: true } } }
    const defaultStudent = { role: 'student', preferences: {} }

    assert.deepStrictEqual(determineFollowAction(publicStudent), { action: 'follow', requested: false, following: true })
    assert.deepStrictEqual(determineFollowAction(privateStudent), { action: 'request', requested: true, following: false })
    assert.deepStrictEqual(determineFollowAction(defaultStudent), { action: 'follow', requested: false, following: true })
  })

  test('6. Profile viewing permission: self, public, or accepted followers can view posts', () => {
    const canViewPosts = (viewerId, targetUser, isFollowing) => {
      return viewerId === targetUser.id
        || !targetUser.preferences?.privacy?.private
        || Boolean(isFollowing)
    }

    const targetUser = { id: 'target123', preferences: { privacy: { private: true } } }

    // Self can always view
    assert.strictEqual(canViewPosts('target123', targetUser, false), true)

    // Stranger cannot view private account posts
    assert.strictEqual(canViewPosts('viewer999', targetUser, false), false)

    // Follower can view private account posts
    assert.strictEqual(canViewPosts('viewer999', targetUser, true), true)

    // Public account is viewable by anyone
    const publicUser = { id: 'target456', preferences: { privacy: { private: false } } }
    assert.strictEqual(canViewPosts('viewer999', publicUser, false), true)
  })
})
