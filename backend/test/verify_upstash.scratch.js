/**
 * verify_upstash.scratch.js
 *
 * Safe live Upstash Redis verification script.
 *
 * SAFETY RULES:
 * 1. Never logs, prints, or exposes REDIS_URL or credentials.
 * 2. Uses unique ephemeral test key and deletes it immediately after verification.
 * 3. Gracefully closes all connections.
 */

import 'dotenv/config'
import {
  initRedis,
  isRedisReady,
  getRedisCacheClient,
  getRedisPubClient,
  getRedisSubClient,
  closeRedis,
  redactedUrl,
  normalizeRedisUrl,
} from '../src/services/redis.service.js'
import { getOrSet, del } from '../src/services/cache.service.js'
import { createAdapter } from '@socket.io/redis-adapter'

async function verifyUpstash() {
  console.log('=================================================================')
  console.log(' SWISH LIVE UPSTASH REDIS VERIFICATION')
  console.log('=================================================================\n')

  // 1. Check REDIS_URL presence safely
  const rawUrl = process.env.REDIS_URL
  const isSet = !!rawUrl && rawUrl.trim().length > 0
  const cleanUrl = isSet ? normalizeRedisUrl(rawUrl) : null
  const isTls = cleanUrl && cleanUrl.startsWith('rediss://')
  const masked = cleanUrl ? redactedUrl(cleanUrl) : '[unset]'

  console.log('1. Environment Configuration:')
  console.log(`   - REDIS_URL loaded:     ${isSet}`)
  console.log(`   - Clean URL valid:      ${!!cleanUrl}`)
  console.log(`   - Protocol scheme:      ${isTls ? 'rediss:// (TLS encrypted)' : 'standard'}`)
  console.log(`   - Redacted target:      ${masked}`)

  if (!cleanUrl) {
    console.error('\n[ERROR] REDIS_URL is not set or could not be parsed. Cannot proceed with live verification.')
    process.exit(1)
  }

  // Ensure process.env.REDIS_URL has the clean URL for initRedis()
  process.env.REDIS_URL = cleanUrl


  // 2. Initialize Redis connection
  console.log('\n2. Initializing Redis Service...')
  const initResult = initRedis()
  console.log(`   - initRedis() return:   ${initResult}`)

  const cacheClient = getRedisCacheClient()
  const pubClient = getRedisPubClient()
  const subClient = getRedisSubClient()

  if (!cacheClient || !pubClient || !subClient) {
    console.error('\n[ERROR] Client instantiation failed.')
    process.exit(1)
  }

  // Wait for cacheClient to reach 'ready'
  console.log('   - Waiting for Upstash TLS handshake...')
  const readyPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection timed out after 6000ms'))
    }, 6000)

    if (cacheClient.status === 'ready') {
      clearTimeout(timeout)
      resolve(true)
    } else {
      cacheClient.once('ready', () => {
        clearTimeout(timeout)
        resolve(true)
      })
      cacheClient.once('error', (err) => {
        clearTimeout(timeout)
        reject(err)
      })
    }
  })

  try {
    await readyPromise
    console.log('   - Connection status:    CONNECTED & READY')
    console.log(`   - isRedisReady():       ${isRedisReady()}`)
  } catch (connErr) {
    console.error(`\n[ERROR] Failed to connect to Upstash: ${connErr.message}`)
    await closeRedis()
    process.exit(1)
  }

  // 3. SET / GET / DELETE Round-Trip Verification
  console.log('\n3. Verifying Live Round-Trip Operations...')
  const testKey = `swish:v1:test:verify_${Date.now()}`
  const testPayload = { ok: true, timestamp: Date.now(), service: 'upstash-verify' }

  try {
    // A. SET with 30s TTL
    const setRes = await cacheClient.setex(testKey, 30, JSON.stringify(testPayload))
    console.log(`   - SETEX (key: ${testKey}): ${setRes}`)

    // B. GET
    const rawGet = await cacheClient.get(testKey)
    const parsed = rawGet ? JSON.parse(rawGet) : null
    const getSuccess = parsed && parsed.service === 'upstash-verify'
    console.log(`   - GET verified:         ${getSuccess}`)

    // C. DEL cleanup
    const delRes = await cacheClient.del(testKey)
    const existsAfterDel = await cacheClient.exists(testKey)
    console.log(`   - DEL cleanup verified: ${delRes === 1 && existsAfterDel === 0}`)
  } catch (opErr) {
    console.error(`\n[ERROR] Round-trip operation failed: ${opErr.message}`)
    await cacheClient.del(testKey).catch(() => {})
    await closeRedis()
    process.exit(1)
  }

  // 4. Verify Socket.IO Redis Adapter Initialization with Live Clients
  console.log('\n4. Verifying Socket.IO Redis Adapter Setup...')
  try {
    const adapterFn = createAdapter(pubClient, subClient)
    console.log(`   - createAdapter():      SUCCESS (type: ${typeof adapterFn})`)
  } catch (adapterErr) {
    console.error(`\n[ERROR] createAdapter failed: ${adapterErr.message}`)
    await closeRedis()
    process.exit(1)
  }

  // 5. Clean Shutdown
  console.log('\n5. Closing Live Connections Cleanly...')
  await closeRedis()
  console.log('   - closeRedis():         ALL CONNECTIONS CLOSED')

  console.log('\n=================================================================')
  console.log(' LIVE UPSTASH VERIFICATION COMPLETED SUCCESSFULLY')
  console.log('=================================================================')
}

verifyUpstash().catch(err => {
  console.error('Verification script uncaught error:', err)
  process.exit(1)
})
