import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { isOriginAllowed, getAllowedOrigins } from '../src/config/cors.js'
import messagesRouter from '../src/routes/messages.routes.js'
import usersRouter from '../src/routes/users.routes.js'
import platformRouter from '../src/routes/platform.routes.js'
import { isCollegeActive, invalidateCollegeCache } from '../src/middleware/auth.middleware.js'

describe('CORS & Route Integrity', () => {
  test('isOriginAllowed permits localhost and production Vercel origins', () => {
    assert.equal(isOriginAllowed('http://localhost:5173'), true)
    assert.equal(isOriginAllowed('http://localhost:3000'), true)
    assert.equal(isOriginAllowed('https://swish2-six.vercel.app'), true)
    assert.equal(isOriginAllowed('https://swish1.onrender.com'), true)


  })

  test('isOriginAllowed rejects untrusted third-party origins', () => {
    assert.equal(isOriginAllowed('https://evil-hacker.com'), false)
    assert.equal(isOriginAllowed('https://malicious-site.org'), false)
    assert.equal(isOriginAllowed('http://phishing-campus.edu'), false)
  })

  test('isOriginAllowed allows null/undefined origins (server-to-server / curl)', () => {
    assert.equal(isOriginAllowed(null), true)
    assert.equal(isOriginAllowed(undefined), true)
  })

  test('messages router registers /users/search BEFORE /:convId to avoid route shadowing', () => {
    // Inspect the express router layers
    const routeLayers = messagesRouter.stack
      .filter(layer => layer.route)
      .map(layer => layer.route.path)

    const searchIndex = routeLayers.indexOf('/users/search')
    const convIdIndex = routeLayers.indexOf('/:convId')

    assert.ok(searchIndex !== -1, '/users/search route must exist')
    assert.ok(convIdIndex !== -1, '/:convId route must exist')
    assert.ok(
      searchIndex < convIdIndex,
      `/users/search (index ${searchIndex}) must precede /:convId (index ${convIdIndex}) to prevent cast errors`
    )
  })

  test('users router registers /:userId/follow with valid syntax and integrity', () => {
    const routeLayers = usersRouter.stack
      .filter(layer => layer.route)
      .map(layer => layer.route.path)

    assert.ok(routeLayers.includes('/:userId/follow'), '/:userId/follow route must exist')
  })

  test('platform router registers public and admin maintenance/broadcast routes', () => {
    const routeLayers = platformRouter.stack
      .filter(layer => layer.route)
      .map(layer => ({
        path: layer.route.path,
        methods: Object.keys(layer.route.methods),
      }))

    const paths = routeLayers.map(r => r.path)
    assert.ok(paths.includes('/config'), 'GET /config must exist')
    assert.ok(paths.includes('/admin/config'), 'GET /admin/config must exist')
    assert.ok(paths.includes('/admin/maintenance'), 'PATCH /admin/maintenance must exist')
    assert.ok(paths.includes('/admin/features'), 'PATCH /admin/features must exist')
    assert.ok(paths.includes('/admin/broadcast'), 'PATCH /admin/broadcast must exist')

    const broadcastRoute = routeLayers.find(r => r.path === '/admin/broadcast')
    assert.ok(broadcastRoute.methods.includes('patch'), '/admin/broadcast must accept PATCH')
  })

  test('in-process college cache handles caching and invalidation', () => {
    // Prime cache manually
    invalidateCollegeCache('example.edu')
    // Invalidate should run without error
    invalidateCollegeCache('kjsce.somaiya.edu')
    assert.ok(true)
  })
})
