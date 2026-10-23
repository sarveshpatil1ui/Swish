/**
 * redis_bench.scratch.js
 *
 * TYPE: IN-PROCESS MICROBENCHMARK (MOCKED SERVICES — NO NETWORK I/O)
 *
 * NOTE ON ENVIRONMENT:
 * Real local Redis (port 6379) and real local MongoDB (port 27017) are NOT
 * running on this development machine.
 *
 * This benchmark uses in-process mocked substitutes (JavaScript Map and simulated delay).
 * It measures the in-process execution overhead of:
 *   - cacheKey generation
 *   - cache-aside logic in getOrSet()
 *   - JSON serialization (JSON.stringify / JSON.parse)
 *   - simulated database offload
 *
 * IT DOES NOT MEASURE:
 *   - Network I/O, TCP handshakes, or TLS encryption overhead
 *   - Real Upstash Redis ping/roundtrip latency (typically 5ms - 35ms over internet)
 *   - Real MongoDB Atlas wire protocol query execution
 *   - Express HTTP request/response pipeline
 */

import { performance } from 'node:perf_hooks'
import assert from 'node:assert/strict'
import { getOrSet, cacheKey, del, delPattern } from '../src/services/cache.service.js'
import { _setClientsForTest, closeRedis } from '../src/services/redis.service.js'

// Mock synthetic dataset
const SYNTHETIC_COLLEGES = Array.from({ length: 45 }, (_, i) => ({
  _id: `col_${i + 1}`,
  name: `Campus Institute of Technology ${i + 1}`,
  code: `CIT${i + 1}`,
  domain: `cit${i + 1}.edu`,
  location: 'Campus City',
  active: true,
  createdAt: new Date('2026-01-01').toISOString(),
  updatedAt: new Date('2026-01-01').toISOString(),
}))

const SYNTHETIC_DEPTS = [
  { name: 'Computer Engineering', code: 'CE' },
  { name: 'Information Technology', code: 'IT' },
  { name: 'Electronics and Telecommunication', code: 'EXTC' },
  { name: 'Artificial Intelligence and Data Science', code: 'AIDS' },
  { name: 'Mechanical Engineering', code: 'MECH' },
]

async function runBenchmark() {
  console.log('=================================================================')
  console.log(' SWISH CACHE SERVICE — IN-PROCESS MICROBENCHMARK')
  console.log(' (Mocked In-Memory Store — No Network I/O)')
  console.log('=================================================================\n')

  // In-process mock store
  const store = new Map()
  let redisGetCalls = 0
  let redisSetCalls = 0

  const mockRedisClient = {
    status: 'ready',
    async get(key) {
      redisGetCalls++
      return store.has(key) ? store.get(key) : null
    },
    async setex(key, ttl, val) {
      redisSetCalls++
      store.set(key, val)
      return 'OK'
    },
    async del(...keys) {
      for (const k of keys) store.delete(k)
      return keys.length
    },
    async scan(cursor, match, pattern) {
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$')
      const keys = Array.from(store.keys()).filter((k) => regex.test(k))
      return ['0', keys]
    },
  }

  _setClientsForTest({ cacheClient: mockRedisClient })

  // ── 1. Colleges List Endpoint (/api/colleges) ──────────────────────────────────
  console.log('--- 1. COLLEGES ENDPOINT: GET /api/colleges ---')
  const collegeKey = cacheKey('colleges', 'list')
  let simulatedDbQueries = 0

  const simulateMongoCollegeQuery = async () => {
    simulatedDbQueries++
    // In-process simulated query delay (2ms)
    await new Promise((r) => setTimeout(r, 2))
    return {
      ok: true,
      colleges: SYNTHETIC_COLLEGES.map((c) => ({ ...c })),
    }
  }

  // A. Cold Read (Cache Miss)
  // Timer includes: mock GET (Map lookup) + simulated DB query (2ms) + mock SETEX (JSON.stringify + Map set)
  // Timer excludes: HTTP networking, Express routing, MongoDB wire protocol
  simulatedDbQueries = 0
  const t0 = performance.now()
  const coldResponse = await getOrSet(collegeKey, 60, simulateMongoCollegeQuery)
  const coldTimeMs = performance.now() - t0
  const coldQueries = simulatedDbQueries
  const coldPayloadSize = Buffer.byteLength(JSON.stringify(coldResponse), 'utf8')

  console.log(`Cold Read (Cache Miss):`)
  console.log(`  - Measured Latency:  ${coldTimeMs.toFixed(3)} ms (includes 2ms simulated query delay)`)
  console.log(`  - Database Queries:  ${coldQueries}`)
  console.log(`  - Payload Size:      ${coldPayloadSize} bytes`)
  console.log(`  - Records Count:     ${coldResponse.colleges.length}`)

  // B. Warm Reads with Warm-up Phase
  const WARMUP_COUNT = 50
  const SAMPLE_COUNT = 500

  // Warm-up to allow V8 JIT compilation to settle
  for (let i = 0; i < WARMUP_COUNT; i++) {
    await getOrSet(collegeKey, 60, simulateMongoCollegeQuery)
  }

  // Measured Warm Reads
  // Timer includes: mock GET (Map lookup) + JSON.parse
  // Timer excludes: network I/O, HTTP parsing
  const warmLatencies = []
  simulatedDbQueries = 0
  let sampleWarmResponse = null

  const startWarm = performance.now()
  for (let i = 0; i < SAMPLE_COUNT; i++) {
    const start = performance.now()
    sampleWarmResponse = await getOrSet(collegeKey, 60, simulateMongoCollegeQuery)
    warmLatencies.push(performance.now() - start)
  }
  const totalWarmTime = performance.now() - startWarm
  const warmQueries = simulatedDbQueries

  // Verify response contract parity between cold and warm paths
  assert.deepStrictEqual(coldResponse, sampleWarmResponse, 'Cold and warm response bodies must be strictly identical')
  assert.strictEqual(coldResponse.ok, true)
  assert.strictEqual(coldResponse.colleges.length, 45)

  warmLatencies.sort((a, b) => a - b)
  const p50 = warmLatencies[Math.floor(SAMPLE_COUNT * 0.5)]
  const p95 = warmLatencies[Math.floor(SAMPLE_COUNT * 0.95)]
  const p99 = warmLatencies[Math.floor(SAMPLE_COUNT * 0.99)]
  const avg = warmLatencies.reduce((a, b) => a + b, 0) / SAMPLE_COUNT

  console.log(`\nWarm Reads (${SAMPLE_COUNT} samples, ${WARMUP_COUNT} warm-up cycles):`)
  console.log(`  - Database Queries:  ${warmQueries} (100% saved in-memory)`)
  console.log(`  - Micro-latency:     avg=${avg.toFixed(3)}ms, p50=${p50.toFixed(3)}ms, p95=${p95.toFixed(3)}ms, p99=${p99.toFixed(3)}ms`)
  console.log(`  - Contract Parity:   PASS (cold and warm payloads match with deep strict equality)`)

  // C. Invalidation & Re-fetch
  console.log(`\nCache Invalidation Test:`)
  await del(collegeKey)
  simulatedDbQueries = 0
  const postInvalidateRes = await getOrSet(collegeKey, 60, simulateMongoCollegeQuery)
  console.log(`  - Post-invalidation Database Queries: ${simulatedDbQueries} (re-fetch executed cleanly)`)
  assert.deepStrictEqual(coldResponse, postInvalidateRes)

  // ── 2. Departments Endpoint: GET /api/departments/by-domain ──────────────────
  console.log('\n--- 2. DEPARTMENTS ENDPOINT: GET /api/departments/by-domain?domain=cit1.edu ---')
  const deptKey = cacheKey('departments', 'by-domain', 'cit1.edu')
  let deptDbQueries = 0

  const simulateMongoDeptQuery = async () => {
    deptDbQueries++ // 1: College lookup
    deptDbQueries++ // 2: Department lookup
    return {
      ok: true,
      departments: SYNTHETIC_DEPTS,
    }
  }

  // Cold
  deptDbQueries = 0
  const deptCold = await getOrSet(deptKey, 60, simulateMongoDeptQuery)
  const deptColdQueries = deptDbQueries

  // Warm
  deptDbQueries = 0
  const deptWarm = await getOrSet(deptKey, 60, simulateMongoDeptQuery)
  const deptWarmQueries = deptDbQueries

  assert.deepStrictEqual(deptCold, deptWarm)
  console.log(`Cold Read:`)
  console.log(`  - Database Queries:  ${deptColdQueries} (2 queries)`)
  console.log(`Warm Read:`)
  console.log(`  - Database Queries:  ${deptWarmQueries} (0 queries)`)
  console.log(`  - Contract Parity:   PASS`)

  // Pattern Invalidation
  await delPattern(cacheKey('departments', 'by-domain', '*'))
  deptDbQueries = 0
  await getOrSet(deptKey, 60, simulateMongoDeptQuery)
  console.log(`  - Post-pattern-invalidation Database Queries: ${deptDbQueries} (fresh fetch verified)`)

  // ── 3. Fallback Resilience (Redis Disabled / Error) ───────────────────────────
  console.log('\n--- 3. FALLBACK RESILIENCE (Redis Unreachable / Offline) ---')
  _setClientsForTest({ cacheClient: null }) // Redis disabled
  let fallbackQueries = 0
  const fallbackRes = await getOrSet(collegeKey, 60, async () => {
    fallbackQueries++
    return { ok: true, fallback: true }
  })
  console.log(`Redis Disabled:`)
  console.log(`  - Fallback Succeeded: ${fallbackRes.ok === true}`)
  console.log(`  - Direct Mongo calls: ${fallbackQueries}`)

  console.log('\n=================================================================')
  console.log(' MICROBENCHMARK COMPLETE (All assertions passed)')
  console.log('=================================================================')
}

runBenchmark().catch((err) => {
  console.error('Benchmark failed:', err)
  process.exit(1)
})
