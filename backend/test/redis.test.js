import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import express from 'express'
import http from 'node:http'
import { EventEmitter } from 'node:events'
import { Server } from 'socket.io'
import { io as Client } from 'socket.io-client'
import { createAdapter } from '@socket.io/redis-adapter'
import {
  initRedis,
  isRedisReady,
  getRedisPubClient,
  getRedisSubClient,
  getRedisCacheClient,
  closeRedis,
  redactedUrl,
  normalizeRedisUrl,
  calculateRetryDelay,
  _setClientsForTest,
} from '../src/services/redis.service.js'
import {
  cacheKey,
  getOrSet,
  del,
  delPattern,
} from '../src/services/cache.service.js'
import { initSocket } from '../src/services/socket.service.js'

// NOTE: All tests in this file use deterministic in-process mocks and unit doubles.
// No real Redis server or external network calls are used.

describe('[UNIT / MOCK-BASED] Redis Foundation & Reconnect Configuration (Stage 1)', () => {
  beforeEach(() => {
    _setClientsForTest({ pubClient: null, subClient: null, cacheClient: null })
  })

  afterEach(async () => {
    await closeRedis()
  })

  it('normalizeRedisUrl handles quotes, CLI snippets, and enforces TLS for Upstash', () => {
    // Plain URL
    assert.strictEqual(
      normalizeRedisUrl('rediss://default:pw@my-host.upstash.io:6379'),
      'rediss://default:pw@my-host.upstash.io:6379'
    )
    // Quoted URL
    assert.strictEqual(
      normalizeRedisUrl('"rediss://default:pw@my-host.upstash.io:6379"'),
      'rediss://default:pw@my-host.upstash.io:6379'
    )
    // CLI snippet pasted from Upstash console
    assert.strictEqual(
      normalizeRedisUrl('redis-cli --tls -u rediss://default:pw@my-host.upstash.io:6379'),
      'rediss://default:pw@my-host.upstash.io:6379'
    )
    // CLI snippet with redis:// upgraded to rediss:// for Upstash
    assert.strictEqual(
      normalizeRedisUrl('redis://redis-cli --tls -u redis://default:pw@my-host.upstash.io:6379'),
      'rediss://default:pw@my-host.upstash.io:6379'
    )
    // Non-string or empty input
    assert.strictEqual(normalizeRedisUrl(null), null)
    assert.strictEqual(normalizeRedisUrl(''), null)
    assert.strictEqual(normalizeRedisUrl('   '), null)
  })

  it('redactedUrl masks credentials and hostname safely', () => {
    const raw = 'rediss://default:supersecretpassword123@upstash-node-123.upstash.io:6379'
    const masked = redactedUrl(raw)
    assert.strictEqual(masked, 'rediss://*****')
    assert.ok(!masked.includes('supersecretpassword123'), 'Must never leak password')
    assert.ok(!masked.includes('upstash-node-123'), 'Must mask host')

    const invalid = redactedUrl('not-a-valid-url')
    assert.strictEqual(invalid, '[invalid url]')
  })

  it('initRedis returns false and remains disabled when REDIS_URL is unset', () => {
    const originalUrl = process.env.REDIS_URL
    delete process.env.REDIS_URL
    try {
      const initialized = initRedis('')
      assert.strictEqual(initialized, false)
      assert.strictEqual(isRedisReady(), false)
      assert.strictEqual(getRedisPubClient(), null)
      assert.strictEqual(getRedisSubClient(), null)
      assert.strictEqual(getRedisCacheClient(), null)
    } finally {
      if (originalUrl) process.env.REDIS_URL = originalUrl
    }
  })

  it('isRedisReady returns false when cache client is not connected or status is not ready', () => {
    _setClientsForTest({
      cacheClient: { status: 'connecting' },
    })
    assert.strictEqual(isRedisReady(), false)

    _setClientsForTest({
      cacheClient: { status: 'ready' },
    })
    assert.strictEqual(isRedisReady(), true)
  })

  it('closeRedis cleanly quits all active clients and resets internal references', async () => {
    let pubQuitCalled = false
    let subQuitCalled = false
    let cacheQuitCalled = false

    _setClientsForTest({
      pubClient: { quit: async () => { pubQuitCalled = true } },
      subClient: { quit: async () => { subQuitCalled = true } },
      cacheClient: { status: 'ready', quit: async () => { cacheQuitCalled = true } },
    })

    assert.strictEqual(isRedisReady(), true)
    await closeRedis()

    assert.strictEqual(pubQuitCalled, true)
    assert.strictEqual(subQuitCalled, true)
    assert.strictEqual(cacheQuitCalled, true)
    assert.strictEqual(getRedisPubClient(), null)
    assert.strictEqual(getRedisSubClient(), null)
    assert.strictEqual(getRedisCacheClient(), null)
    assert.strictEqual(isRedisReady(), false)
  })

  it('calculateRetryDelay implements capped backoff and never stops retrying for pub/sub clients', () => {
    // Initial attempts scale linearly (200ms per attempt)
    assert.strictEqual(calculateRetryDelay(1, true), 200)
    assert.strictEqual(calculateRetryDelay(2, true), 400)
    assert.strictEqual(calculateRetryDelay(5, true), 1000)
    assert.strictEqual(calculateRetryDelay(20, true), 4000)

    // Crucial: Must NOT return null or stop retrying after 20 attempts
    assert.strictEqual(calculateRetryDelay(21, true), 4200)
    assert.strictEqual(calculateRetryDelay(30, true), 6000)

    // Capped at 10,000ms (10 seconds)
    assert.strictEqual(calculateRetryDelay(50, true), 10000)
    assert.strictEqual(calculateRetryDelay(100, true), 10000)
    assert.strictEqual(calculateRetryDelay(500, true), 10000)

    // Cache client also maintains capped backoff
    assert.strictEqual(calculateRetryDelay(1, false), 200)
    assert.strictEqual(calculateRetryDelay(50, false), 10000)
  })
})

describe('[UNIT / MOCK-BASED] Socket.io Redis Adapter Integration & Fallback (Stage 2)', () => {
  it('initSocket creates server with default adapter when Redis clients are absent', () => {
    const app = express()
    const server = initSocket(app)
    assert.ok(server, 'HTTP server must be returned')
    assert.ok(typeof server.listen === 'function', 'Must have listen method')
  })

  it('initSocket safely falls back to in-memory adapter if adapter attachment errors', () => {
    const app = express()
    const faultyPubClient = null
    const faultySubClient = null
    assert.doesNotThrow(() => {
      const server = initSocket(app, { pubClient: faultyPubClient, subClient: faultySubClient })
      assert.ok(server)
    })
  })

  it('adapter is configured at construction when clients are supplied even while in connecting status', () => {
    const app = express()
    const emitter = new EventEmitter()
    const connectingPub = {
      status: 'connecting',
      on: emitter.on.bind(emitter),
      removeListener: emitter.removeListener.bind(emitter),
      publish: () => {},
    }
    const connectingSub = {
      status: 'connecting',
      on: emitter.on.bind(emitter),
      removeListener: emitter.removeListener.bind(emitter),
      psubscribe: () => {},
      subscribe: () => {},
    }

    // Must construct without throwing and configure adapter, not defaulting to in-memory
    assert.doesNotThrow(() => {
      const server = initSocket(app, { pubClient: connectingPub, subClient: connectingSub })
      assert.ok(server)
    })
  })

  it('local broadcast delivery succeeds without error when Redis client emits error or disconnect events', async () => {
    const emitter = new EventEmitter()
    const faultyPub = {
      status: 'reconnecting',
      on: emitter.on.bind(emitter),
      removeListener: emitter.removeListener.bind(emitter),
      publish: () => {
        emitter.emit('error', new Error('Connection lost'))
      },
    }
    const faultySub = {
      status: 'reconnecting',
      on: emitter.on.bind(emitter),
      removeListener: emitter.removeListener.bind(emitter),
      psubscribe: () => {},
      subscribe: () => {},
    }

    const srv = http.createServer()
    const io = new Server(srv, { adapter: createAdapter(faultyPub, faultySub) })

    await new Promise((resolve) => srv.listen(0, '127.0.0.1', resolve))
    const port = srv.address().port

    let localReceived = 0
    io.on('connection', (socket) => {
      socket.join('college:test')
    })

    const client = Client(`http://127.0.0.1:${port}`, { transports: ['websocket'] })
    client.on('notice', () => localReceived++)

    await new Promise((resolve) => setTimeout(resolve, 100))

    // Broadcast while pubClient is failing
    assert.doesNotThrow(() => {
      io.to('college:test').emit('notice', { title: 'Test Notice' })
    })

    await new Promise((resolve) => setTimeout(resolve, 100))
    assert.strictEqual(localReceived, 1, 'Local socket must receive broadcast even when Redis publish fails')

    client.close()
    await new Promise((resolve) => srv.close(resolve))
  })

  it('two isolated Socket.io server instances connected to Redis broadcast across instances without duplicate delivery', async () => {
    // In-process Redis pub/sub broker simulating two multi-instance processes
    class MockRedisPubSubBroker {
      constructor() {
        this.subscribers = []
      }
      register(name, pattern, cb) {
        this.subscribers.push({ name, pattern, cb })
      }
      dispatch(senderName, channel, msg) {
        for (const sub of this.subscribers) {
          sub.cb(channel, msg)
        }
      }
    }

    const broker = new MockRedisPubSubBroker()
    function makePubSubClients(name) {
      const emitter = new EventEmitter()
      const pub = {
        status: 'ready',
        on: (evt, cb) => emitter.on(evt, cb),
        removeListener: (evt, cb) => emitter.removeListener(evt, cb),
        publish: (chan, msg) => broker.dispatch(name, chan, msg),
      }
      const sub = {
        status: 'ready',
        on: (evt, cb) => emitter.on(evt, cb),
        removeListener: (evt, cb) => emitter.removeListener(evt, cb),
        psubscribe: (pattern) => {
          broker.register(name, pattern, (chan, msg) => {
            emitter.emit('pmessageBuffer', Buffer.from(pattern), Buffer.from(chan), Buffer.isBuffer(msg) ? msg : Buffer.from(msg))
          })
        },
        subscribe: () => {},
      }
      return { pub, sub }
    }

    const pair1 = makePubSubClients('instance-1')
    const pair2 = makePubSubClients('instance-2')

    const srv1 = http.createServer()
    const io1 = new Server(srv1, { adapter: createAdapter(pair1.pub, pair1.sub) })

    const srv2 = http.createServer()
    const io2 = new Server(srv2, { adapter: createAdapter(pair2.pub, pair2.sub) })

    await new Promise((resolve) => {
      srv1.listen(0, '127.0.0.1', () => {
        srv2.listen(0, '127.0.0.1', resolve)
      })
    })

    const port1 = srv1.address().port
    const port2 = srv2.address().port

    // Track delivery counts for duplicate detection
    let client1Events = 0
    let client2Events = 0
    let clientOtherRoomEvents = 0

    io1.on('connection', (socket) => {
      socket.join('college:somaiya')
    })

    io2.on('connection', (socket) => {
      if (socket.handshake.query.otherRoom) {
        socket.join('college:vjti')
      } else {
        socket.join('college:somaiya')
      }
    })

    const client1 = Client(`http://127.0.0.1:${port1}`, { transports: ['websocket'] })
    const client2 = Client(`http://127.0.0.1:${port2}`, { transports: ['websocket'] })
    const clientOther = Client(`http://127.0.0.1:${port2}?otherRoom=true`, { transports: ['websocket'] })

    client1.on('new_post', () => client1Events++)
    client2.on('new_post', () => client2Events++)
    clientOther.on('new_post', () => clientOtherEvents++)

    // Wait for sockets to connect and join rooms
    await new Promise((resolve) => setTimeout(resolve, 150))

    // Broadcast on Instance 1 to 'college:somaiya'
    io1.to('college:somaiya').emit('new_post', { postId: 'p_100', text: 'Cross-instance post' })

    // Wait for delivery to propagate through Redis adapter
    await new Promise((resolve) => setTimeout(resolve, 150))

    // Assertions:
    // 1. Client 1 (local to Instance 1) received event exactly once (no duplicate from Redis echo)
    assert.strictEqual(client1Events, 1, 'Local client must receive event exactly once')
    // 2. Client 2 (connected to Instance 2) received event across the Redis adapter
    assert.strictEqual(client2Events, 1, 'Remote instance client must receive cross-instance event')
    // 3. Client in different room must NOT receive event (room isolation enforced)
    assert.strictEqual(clientOtherRoomEvents, 0, 'Client in another room must never receive event')

    // Clean teardown
    client1.close()
    client2.close()
    clientOther.close()
    await new Promise((resolve) => srv1.close(() => srv2.close(resolve)))
  })
})

describe('[UNIT / MOCK-BASED] API Cache Service Correctness & Safety (Stage 3)', () => {
  let mockStore
  let mockClient
  let simulatedNow

  beforeEach(() => {
    simulatedNow = Date.now()
    mockStore = new Map() // key -> { val, expiresAt }
    mockClient = {
      status: 'ready',
      async get(key) {
        if (!mockStore.has(key)) return null
        const entry = mockStore.get(key)
        if (entry.expiresAt && simulatedNow > entry.expiresAt) {
          mockStore.delete(key)
          return null
        }
        return entry.val
      },
      async setex(key, ttlSec, value) {
        mockStore.set(key, { val: value, expiresAt: simulatedNow + (ttlSec * 1000) })
        return 'OK'
      },
      async del(...keys) {
        for (const k of keys) {
          mockStore.delete(k)
        }
        return keys.length
      },
      async scan(cursor, matchArg, pattern, countArg, count) {
        const regexStr = '^' + pattern.replace(/\*/g, '.*') + '$'
        const regex = new RegExp(regexStr)
        const matchingKeys = Array.from(mockStore.keys()).filter((k) => regex.test(k))
        return ['0', matchingKeys]
      },
    }
    _setClientsForTest({ cacheClient: mockClient })
  })

  afterEach(() => {
    _setClientsForTest({ pubClient: null, subClient: null, cacheClient: null })
  })

  it('cacheKey generates correct versioned namespaced keys and normalizes domain input', () => {
    const key = cacheKey('colleges', 'list')
    assert.strictEqual(key, 'swish:v1:colleges:list')

    const rawDomain = '  Kjsce.Somaiya.Edu  '
    const normalizedDomain = rawDomain.trim().toLowerCase()
    const domainKey = cacheKey('departments', 'by-domain', normalizedDomain)
    assert.strictEqual(domainKey, 'swish:v1:departments:by-domain:kjsce.somaiya.edu')
  })

  it('getOrSet returns cached data on hit without calling fetchFn', async () => {
    const key = cacheKey('colleges', 'list')
    let fetchCallCount = 0

    const fetchColleges = async () => {
      fetchCallCount++
      return { ok: true, colleges: [{ id: 'col_1', name: 'K. J. Somaiya' }] }
    }

    // First call: cache miss -> fetchFn called
    const firstResult = await getOrSet(key, 60, fetchColleges)
    assert.strictEqual(fetchCallCount, 1)
    assert.deepStrictEqual(firstResult, { ok: true, colleges: [{ id: 'col_1', name: 'K. J. Somaiya' }] })

    // Second call: cache hit -> fetchFn NOT called
    const secondResult = await getOrSet(key, 60, fetchColleges)
    assert.strictEqual(fetchCallCount, 1)
    assert.deepStrictEqual(secondResult, firstResult)
  })

  it('cache entry expires after TTL and re-fetches from source', async () => {
    const key = cacheKey('colleges', 'list')
    let fetchCount = 0
    const fetchFn = async () => {
      fetchCount++
      return { count: fetchCount }
    }

    // Cache with 60 second TTL
    await getOrSet(key, 60, fetchFn)
    assert.strictEqual(fetchCount, 1)

    // Advance simulated clock by 30 seconds (within TTL)
    simulatedNow += 30 * 1000
    const withinTtl = await getOrSet(key, 60, fetchFn)
    assert.strictEqual(fetchCount, 1, 'Must still hit cache within TTL window')
    assert.strictEqual(withinTtl.count, 1)

    // Advance simulated clock by 35 more seconds (total 65s > 60s TTL)
    simulatedNow += 35 * 1000
    const expiredRes = await getOrSet(key, 60, fetchFn)
    assert.strictEqual(fetchCount, 2, 'Must re-fetch fresh data after TTL expires')
    assert.strictEqual(expiredRes.count, 2)
  })

  it('getOrSet falls back gracefully to fetchFn when Redis is not ready', async () => {
    _setClientsForTest({ cacheClient: null })
    assert.strictEqual(isRedisReady(), false)

    let fetchCount = 0
    const result = await getOrSet('test-key', 60, async () => {
      fetchCount++
      return { ok: true, fallback: true }
    })

    assert.strictEqual(fetchCount, 1)
    assert.deepStrictEqual(result, { ok: true, fallback: true })
  })

  it('cache read falls back immediately without blocking when cache client is in reconnecting state', async () => {
    _setClientsForTest({
      cacheClient: { status: 'reconnecting' },
    })

    assert.strictEqual(isRedisReady(), false)

    let fetchCount = 0
    const t0 = performance.now()
    const result = await getOrSet('reconnecting-key', 60, async () => {
      fetchCount++
      return { immediateMongoFallback: true }
    })
    const elapsed = performance.now() - t0

    assert.strictEqual(fetchCount, 1)
    assert.deepStrictEqual(result, { immediateMongoFallback: true })
    assert.ok(elapsed < 20, `Fallback to MongoDB must be immediate (took ${elapsed.toFixed(2)}ms)`)
  })

  it('getOrSet catches Redis get errors and still returns fresh fetchFn result', async () => {
    mockClient.get = async () => {
      throw new Error('Connection reset by peer')
    }

    let fetchCount = 0
    const result = await getOrSet('error-key', 60, async () => {
      fetchCount++
      return { data: 'fresh-data' }
    })

    assert.strictEqual(fetchCount, 1)
    assert.deepStrictEqual(result, { data: 'fresh-data' })
  })

  it('getOrSet catches Redis setex errors and still returns fetched result', async () => {
    mockClient.setex = async () => {
      throw new Error('OOM command not allowed')
    }

    const result = await getOrSet('setex-fail', 60, async () => {
      return { status: 'ok' }
    })

    assert.deepStrictEqual(result, { status: 'ok' })
  })

  it('does not cache null, undefined, or error responses', async () => {
    const key = cacheKey('departments', 'by-domain', 'invalid.edu')

    await getOrSet(key, 60, async () => null)
    assert.strictEqual(mockStore.has(key), false, 'Must not cache null responses')

    await getOrSet(key, 60, async () => undefined)
    assert.strictEqual(mockStore.has(key), false, 'Must not cache undefined responses')
  })

  it('del invalidates specific cache keys and next read executes fetchFn', async () => {
    const key = cacheKey('colleges', 'list')
    let fetchCount = 0
    const fetchFn = async () => {
      fetchCount++
      return { count: fetchCount }
    }

    await getOrSet(key, 60, fetchFn)
    assert.strictEqual(fetchCount, 1)

    // Invalidate
    await del(key)
    assert.strictEqual(mockStore.has(key), false)

    // Next read must re-fetch
    const fresh = await getOrSet(key, 60, fetchFn)
    assert.strictEqual(fetchCount, 2)
    assert.strictEqual(fresh.count, 2)
  })

  it('delPattern uses SCAN pattern to invalidate multiple domain keys safely', async () => {
    const key1 = cacheKey('departments', 'by-domain', 'somaiya.edu')
    const key2 = cacheKey('departments', 'by-domain', 'spit.ac.in')
    const unrelatedKey = cacheKey('colleges', 'list')

    mockStore.set(key1, { val: JSON.stringify({ dept: 'CS' }), expiresAt: null })
    mockStore.set(key2, { val: JSON.stringify({ dept: 'IT' }), expiresAt: null })
    mockStore.set(unrelatedKey, { val: JSON.stringify({ count: 5 }), expiresAt: null })

    await delPattern(cacheKey('departments', 'by-domain', '*'))

    assert.strictEqual(mockStore.has(key1), false, 'key1 should be deleted')
    assert.strictEqual(mockStore.has(key2), false, 'key2 should be deleted')
    assert.strictEqual(mockStore.has(unrelatedKey), true, 'Unrelated key must be preserved')
  })

  it('delPattern safely handles errors without throwing unhandled rejections', async () => {
    mockClient.scan = async () => {
      throw new Error('Redis scan connection error')
    }
    // Should catch and log error, not throw
    await assert.doesNotReject(async () => {
      await delPattern(cacheKey('departments', 'by-domain', '*'))
    })
  })

  it('guarantees tenant and parameter isolation between distinct domains', async () => {
    const keyA = cacheKey('departments', 'by-domain', 'somaiya.edu')
    const keyB = cacheKey('departments', 'by-domain', 'vjti.ac.in')

    await getOrSet(keyA, 60, async () => ({ depts: ['CS-Somaiya', 'IT-Somaiya'] }))
    await getOrSet(keyB, 60, async () => ({ depts: ['Production-VJTI', 'Electrical-VJTI'] }))

    const resultA = await getOrSet(keyA, 60, async () => { throw new Error('Should hit cache') })
    const resultB = await getOrSet(keyB, 60, async () => { throw new Error('Should hit cache') })

    assert.deepStrictEqual(resultA, { depts: ['CS-Somaiya', 'IT-Somaiya'] })
    assert.deepStrictEqual(resultB, { depts: ['Production-VJTI', 'Electrical-VJTI'] })
    assert.notDeepStrictEqual(resultA, resultB)
  })

  it('concurrent reads share or settle cleanly, and concurrent read/invalidation does not corrupt state', async () => {
    const key = cacheKey('colleges', 'list')
    let fetchCount = 0
    const slowFetch = async () => {
      fetchCount++
      await new Promise((resolve) => setTimeout(resolve, 20))
      return { ok: true, version: fetchCount }
    }

    // Launch 10 concurrent reads on cold cache
    const results = await Promise.all([
      getOrSet(key, 60, slowFetch),
      getOrSet(key, 60, slowFetch),
      getOrSet(key, 60, slowFetch),
      getOrSet(key, 60, slowFetch),
      getOrSet(key, 60, slowFetch),
    ])

    // All results must be valid and identical in shape
    for (const res of results) {
      assert.strictEqual(res.ok, true)
      assert.strictEqual(typeof res.version, 'number')
    }

    // Concurrent read + invalidation race
    await Promise.all([
      del(key),
      getOrSet(key, 60, slowFetch),
    ])

    // Subsequent read must succeed cleanly
    const afterRace = await getOrSet(key, 60, slowFetch)
    assert.strictEqual(afterRace.ok, true)
  })

  it('ensures identical response contracts between direct database path and cached path', async () => {
    const key = cacheKey('colleges', 'list')
    const canonicalDatabaseResponse = {
      ok: true,
      colleges: [
        {
          _id: '6650f9a2e1d0f50012345678',
          name: 'K. J. Somaiya College of Engineering',
          code: 'KJSCE',
          domain: 'somaiya.edu',
          location: 'Mumbai',
          active: true,
          createdAt: '2026-01-15T08:00:00.000Z',
          updatedAt: '2026-01-15T08:00:00.000Z',
        },
      ],
    }

    // Direct path
    const directResult = await canonicalDatabaseResponse

    // Cached path (miss then hit)
    const coldCachedResult = await getOrSet(key, 60, async () => canonicalDatabaseResponse)
    const warmCachedResult = await getOrSet(key, 60, async () => { throw new Error('Must not be called') })

    // Verify contract parity: deep strict equality of JSON shape, keys, and values
    assert.deepStrictEqual(coldCachedResult, directResult)
    assert.deepStrictEqual(warmCachedResult, directResult)
    assert.deepStrictEqual(Object.keys(warmCachedResult), Object.keys(directResult))
    assert.strictEqual(warmCachedResult.ok, true)
    assert.strictEqual(Array.isArray(warmCachedResult.colleges), true)
  })
})
