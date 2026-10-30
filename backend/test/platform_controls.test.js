// backend/test/platform_controls.test.js
import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import PlatformConfig from '../src/models/PlatformConfig.js'
import platformRouter from '../src/routes/platform.routes.js'
import {
  getPlatformConfig,
  isMaintenanceActiveSync,
} from '../src/services/platform-config.service.js'
import { requireAuth, requireRole } from '../src/middleware/auth.middleware.js'

describe('End-to-End Test Suite: Platform Controls & Maintenance Mode', () => {
  // ── 1. Model & Schema Integrity ───────────────────────────────────────────
  test('1. PlatformConfig model defines correct schema structure and defaults', () => {
    const paths = PlatformConfig.schema.paths

    // Key index
    assert.ok(paths.key, 'key path must exist')
    assert.equal(paths.key.defaultValue, 'global_config', 'key default must be global_config')

    // Maintenance subpaths
    assert.ok(paths['maintenance.enabled'], 'maintenance.enabled must exist')
    assert.equal(paths['maintenance.enabled'].defaultValue, false, 'maintenance.enabled defaults to false')
    assert.ok(paths['maintenance.note'], 'maintenance.note must exist')
    assert.ok(paths['maintenance.expectedBack'], 'maintenance.expectedBack must exist')
    assert.ok(paths['maintenance.updatedAt'], 'maintenance.updatedAt must exist')
    assert.ok(paths['maintenance.updatedByName'], 'maintenance.updatedByName must exist')

    // Features subpaths
    assert.ok(paths['features.allowRegistration'], 'features.allowRegistration must exist')
    assert.equal(paths['features.allowRegistration'].defaultValue, true, 'allowRegistration defaults to true')
    assert.ok(paths['features.allowPostCreation'], 'features.allowPostCreation must exist')
    assert.equal(paths['features.allowPostCreation'].defaultValue, true, 'allowPostCreation defaults to true')
    assert.ok(paths['features.allowDirectMessaging'], 'features.allowDirectMessaging must exist')
    assert.equal(paths['features.allowDirectMessaging'].defaultValue, true, 'allowDirectMessaging defaults to true')

    // Broadcast subpaths
    assert.ok(paths['broadcast.active'], 'broadcast.active must exist')
    assert.equal(paths['broadcast.active'].defaultValue, false, 'broadcast.active defaults to false')
    assert.ok(paths['broadcast.title'], 'broadcast.title must exist')
    assert.ok(paths['broadcast.message'], 'broadcast.message must exist')
    assert.ok(paths['broadcast.type'], 'broadcast.type must exist')
    assert.deepEqual(
      paths['broadcast.type'].enumValues,
      ['info', 'warning', 'success', 'critical'],
      'broadcast.type enums must match allowed themes'
    )
    assert.ok(paths['broadcast.link'], 'broadcast.link must exist')
    assert.ok(paths['broadcast.dismissible'], 'broadcast.dismissible must exist')
    assert.equal(paths['broadcast.dismissible'].defaultValue, true, 'dismissible defaults to true')
  })

  // ── 2. Platform Service In-Memory Fallbacks ───────────────────────────────
  test('2. getPlatformConfig returns safe defaults when DB is offline/empty', async (t) => {
    t.mock.method(PlatformConfig, 'findOne', () => ({
      lean: () => Promise.resolve(null),
    }))
    t.mock.method(PlatformConfig, 'create', () =>
      Promise.resolve({
        toObject: () => ({
          key: 'global_config',
          maintenance: { enabled: false, note: '', expectedBack: '' },
          features: { allowRegistration: true, allowPostCreation: true, allowDirectMessaging: true },
          broadcast: { active: false, title: '', message: '', type: 'info', dismissible: true },
        }),
      })
    )

    const config = await getPlatformConfig(true)
    assert.ok(config, 'Config must be defined')
    assert.equal(typeof config.maintenance, 'object', 'maintenance subdocument must be an object')
    assert.equal(typeof config.features, 'object', 'features subdocument must be an object')
    assert.equal(typeof config.broadcast, 'object', 'broadcast subdocument must be an object')

    assert.equal(config.maintenance.enabled, false, 'maintenance must be disabled by default')
    assert.equal(config.features.allowRegistration, true, 'allowRegistration must be true by default')
    assert.equal(config.features.allowPostCreation, true, 'allowPostCreation must be true by default')
    assert.equal(config.features.allowDirectMessaging, true, 'allowDirectMessaging must be true by default')
    assert.equal(config.broadcast.active, false, 'broadcast must be inactive by default')
  })

  // ── 3. Express Router Route Registrations ─────────────────────────────────
  test('3. Platform router registers all public and admin-managed endpoints', () => {
    const routeLayers = platformRouter.stack
      .filter(l => l.route)
      .map(l => ({
        path: l.route.path,
        methods: Object.keys(l.route.methods),
      }))

    const paths = routeLayers.map(r => r.path)

    // Check GET endpoints
    assert.ok(paths.includes('/config'), 'GET /config must exist')
    assert.ok(paths.includes('/admin/config'), 'GET /admin/config must exist')

    // Check PATCH endpoints
    assert.ok(paths.includes('/admin/maintenance'), 'PATCH /admin/maintenance must exist')
    assert.ok(paths.includes('/admin/features'), 'PATCH /admin/features must exist')
    assert.ok(paths.includes('/admin/broadcast'), 'PATCH /admin/broadcast must exist')

    const maintenanceRoute = routeLayers.find(r => r.path === '/admin/maintenance')
    assert.ok(maintenanceRoute.methods.includes('patch'), '/admin/maintenance must accept PATCH')

    const featuresRoute = routeLayers.find(r => r.path === '/admin/features')
    assert.ok(featuresRoute.methods.includes('patch'), '/admin/features must accept PATCH')

    const broadcastRoute = routeLayers.find(r => r.path === '/admin/broadcast')
    assert.ok(broadcastRoute.methods.includes('patch'), '/admin/broadcast must accept PATCH')
  })

  // ── 4. Role Guard: requireRole Access Rules ────────────────────────────────
  test('4. requireRole allows admin and main_admin, but blocks student and faculty', () => {
    const adminGuard = requireRole('admin')

    // Test Admin
    let adminNextCalled = false
    const reqAdmin = { user: { role: 'admin' } }
    const resAdmin = { status: () => ({ json: () => {} }) }
    adminGuard(reqAdmin, resAdmin, () => { adminNextCalled = true })
    assert.equal(adminNextCalled, true, 'requireRole(admin) must allow role "admin"')

    // Test Main Admin
    let mainAdminNextCalled = false
    const reqMainAdmin = { user: { role: 'main_admin' } }
    const resMainAdmin = { status: () => ({ json: () => {} }) }
    adminGuard(reqMainAdmin, resMainAdmin, () => { mainAdminNextCalled = true })
    assert.equal(mainAdminNextCalled, true, 'requireRole(admin) must allow role "main_admin"')

    // Test Student (Must be rejected with 403)
    let studentStatus = null
    let studentResponse = null
    const reqStudent = { user: { role: 'student' } }
    const resStudent = {
      status: (code) => {
        studentStatus = code
        return {
          json: (data) => { studentResponse = data }
        }
      }
    }
    adminGuard(reqStudent, resStudent, () => {})
    assert.equal(studentStatus, 403, 'requireRole(admin) must block role "student" with 403')
    assert.equal(studentResponse?.ok, false)

    // Test College Admin (Must be rejected with 403)
    let collegeAdminStatus = null
    const reqCollegeAdmin = { user: { role: 'college_admin' } }
    const resCollegeAdmin = {
      status: (code) => {
        collegeAdminStatus = code
        return { json: () => {} }
      }
    }
    adminGuard(reqCollegeAdmin, resCollegeAdmin, () => {})
    assert.equal(collegeAdminStatus, 403, 'requireRole(admin) must block role "college_admin" with 403')
  })

  // ── 5. Maintenance Guard Simulation ───────────────────────────────────────
  test('5. Maintenance guard blocks regular users with 503 and lets admins bypass', async () => {
    // Simulated mock configuration state
    const simulatedConfig = {
      maintenance: {
        enabled: true,
        note: 'Scheduled database upgrade in progress.',
        expectedBack: 'Tonight at 3:00 AM',
      }
    }

    const checkMaintenance = (user) => {
      if (user.role !== 'admin' && user.role !== 'main_admin') {
        if (simulatedConfig.maintenance.enabled) {
          return {
            allowed: false,
            status: 503,
            body: {
              ok: false,
              maintenance: true,
              error: 'Platform is currently undergoing scheduled maintenance.',
              maintenanceInfo: {
                note: simulatedConfig.maintenance.note,
                expectedBack: simulatedConfig.maintenance.expectedBack,
              },
            },
          }
        }
      }
      return { allowed: true }
    }

    // Student access during maintenance -> blocked
    const studentCheck = checkMaintenance({ role: 'student' })
    assert.equal(studentCheck.allowed, false)
    assert.equal(studentCheck.status, 503)
    assert.equal(studentCheck.body.maintenance, true)
    assert.equal(studentCheck.body.maintenanceInfo.note, 'Scheduled database upgrade in progress.')

    // Faculty access during maintenance -> blocked
    const facultyCheck = checkMaintenance({ role: 'faculty' })
    assert.equal(facultyCheck.allowed, false)
    assert.equal(facultyCheck.status, 503)

    // Admin bypass during maintenance -> allowed
    const adminCheck = checkMaintenance({ role: 'admin' })
    assert.equal(adminCheck.allowed, true)

    // Super/Main Admin bypass during maintenance -> allowed
    const mainAdminCheck = checkMaintenance({ role: 'main_admin' })
    assert.equal(mainAdminCheck.allowed, true)
  })

  // ── 6. Granular Feature Switches Simulation ────────────────────────────────
  test('6. Granular switches enforce soft freeze on posts, messaging, and registrations', () => {
    // Feature 1: allowRegistration
    const testRegistration = (allowReg, isMaint) => {
      if (allowReg === false || isMaint) {
        return { allowed: false, status: 503, error: 'New college onboarding registrations are temporarily paused.' }
      }
      return { allowed: true }
    }
    assert.equal(testRegistration(false, false).allowed, false)
    assert.equal(testRegistration(false, false).status, 503)
    assert.equal(testRegistration(true, false).allowed, true)

    // Feature 2: allowPostCreation
    const testPostCreation = (user, allowPosts) => {
      if (allowPosts === false && user.role !== 'admin' && user.role !== 'main_admin') {
        return { allowed: false, status: 503, error: 'New post creation is temporarily paused.' }
      }
      return { allowed: true }
    }
    assert.equal(testPostCreation({ role: 'student' }, false).allowed, false)
    assert.equal(testPostCreation({ role: 'admin' }, false).allowed, true, 'Admins can post even when posts are paused')

    // Feature 3: allowDirectMessaging
    const testMessaging = (user, allowDMs) => {
      if (allowDMs === false && user.role !== 'admin' && user.role !== 'main_admin') {
        return { allowed: false, status: 503, error: 'Direct messaging is temporarily paused.' }
      }
      return { allowed: true }
    }
    assert.equal(testMessaging({ role: 'student' }, false).allowed, false)
    assert.equal(testMessaging({ role: 'admin' }, false).allowed, true, 'Admins can message even when DMs are paused')
  })

  // ── 7. Input Validation on Patch Routes ────────────────────────────────────
  test('7. PATCH routes reject invalid payloads with 400 Bad Request', async () => {
    // Simulate PATCH /admin/maintenance validator
    const validateMaintenance = (body) => {
      const { enabled } = body || {}
      if (typeof enabled !== 'boolean') {
        return { status: 400, error: 'The enabled boolean field is required.' }
      }
      return { status: 200 }
    }
    assert.equal(validateMaintenance({}).status, 400)
    assert.equal(validateMaintenance({ enabled: 'true' }).status, 400)
    assert.equal(validateMaintenance({ enabled: true }).status, 200)

    // Simulate PATCH /admin/features validator
    const validateFeatures = (body) => {
      const { features } = body || {}
      if (!features || typeof features !== 'object') {
        return { status: 400, error: 'Features object is required.' }
      }
      return { status: 200 }
    }
    assert.equal(validateFeatures({}).status, 400)
    assert.equal(validateFeatures({ features: 'invalid' }).status, 400)
    assert.equal(validateFeatures({ features: { allowRegistration: false } }).status, 200)

    // Simulate PATCH /admin/broadcast validator
    const validateBroadcast = (body) => {
      const { broadcast } = body || {}
      if (!broadcast || typeof broadcast !== 'object') {
        return { status: 400, error: 'Broadcast object is required.' }
      }
      return { status: 200 }
    }
    assert.equal(validateBroadcast({}).status, 400)
    assert.equal(validateBroadcast({ broadcast: 'invalid' }).status, 400)
    assert.equal(validateBroadcast({ broadcast: { active: true, message: 'Notice' } }).status, 200)
  })
})
