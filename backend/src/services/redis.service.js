/**
 * redis.service.js
 *
 * Optional Redis client for Swish backend.
 *
 * KEY DESIGN DECISIONS:
 * - Redis is entirely optional: when REDIS_URL is absent the module exports null
 *   clients and the rest of the app degrades silently to in-process behaviour.
 * - ioredis is used because it supports Upstash's TLS Redis URL format
 *   (rediss://…) out of the box, the same format used by @socket.io/redis-adapter.
 * - Connection/error events are logged without leaking the URL or credentials.
 * - A 3-second connect timeout prevents API requests from hanging while Redis
 *   is unavailable at startup.
 * - Two separate ioredis instances (pub + sub) are created for the Socket.io
 *   Redis adapter (it requires two connections per the adapter's contract).
 * - closeRedis() must be called during graceful shutdown.
 */

import Redis from 'ioredis'

const REDIS_URL = process.env.REDIS_URL

let _pubClient  = null
let _subClient  = null
let _cacheClient = null

export function normalizeRedisUrl(raw) {
  if (!raw || typeof raw !== 'string') return null
  let s = raw.trim()
  if (!s) return null
  if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) {
    s = s.slice(1, -1).trim()
    if (!s) return null
  }
  // If prefixed with CLI invocation like 'redis-cli ... -u <url>' or 'redis://redis-cli ... -u <url>'
  const cliMatch = s.match(/-u\s+["']?(rediss?:\/\/[^\s"']+)/)
  if (cliMatch) {
    s = cliMatch[1]
  } else {
    const urlMatch = s.match(/(rediss?:\/\/[^\s"']+)/)
    if (urlMatch) {
      s = urlMatch[1]
    }
  }
  // Upstash cloud endpoints require TLS (rediss://)
  if (s.includes('.upstash.io') && s.startsWith('redis://')) {
    s = s.replace(/^redis:\/\//, 'rediss://')
  }
  // Must be a valid redis:// or rediss:// URI
  if (!s.startsWith('redis://') && !s.startsWith('rediss://')) {
    return null
  }
  try {
    new URL(s)
    return s
  } catch {
    return null
  }
}

export function redactedUrl(url) {
  // Never log credentials or the full host — just scheme + masked host
  try {
    const clean = normalizeRedisUrl(url) || url
    const u = new URL(clean)
    return `${u.protocol}//*****`
  } catch {
    return '[invalid url]'
  }
}


/**
 * Calculates the retry delay in milliseconds for reconnection attempts.
 *
 * - pub/sub clients: retry indefinitely with backoff capped at 10s, ensuring
 *   multi-instance broadcast recovery whenever Redis recovers.
 * - cache client: retry indefinitely with capped 10s backoff. Immediate fail-fast
 *   for API requests is guaranteed by maxRetriesPerRequest: 1 and synchronous
 *   isRedisReady() checks that bypass Redis instantly on outage.
 */
export function calculateRetryDelay(times, isPubSub = false) {
  // Back off: 200ms, 400ms, 800ms … capped at 10,000ms (10s)
  return Math.min(times * 200, 10_000)
}

function makeClient(url, label, isPubSub = false) {
  const client = new Redis(url, {
    connectTimeout:      3000,  // ms — don't stall API requests on startup
    maxRetriesPerRequest: isPubSub ? null : 1, // fail fast for cache ops; keep retrying for pub/sub
    enableReadyCheck:    true,
    lazyConnect:         false,
    retryStrategy(times) {
      return calculateRetryDelay(times, isPubSub)
    },
  })

  client.on('connect', () => {
    console.log(`[Redis:${label}] Connected to ${redactedUrl(url)}`)
  })
  client.on('ready', () => {
    console.log(`[Redis:${label}] Ready`)
  })
  client.on('error', (err) => {
    // Log the error class/message but never the URL or auth credentials
    console.error(`[Redis:${label}] Error: ${err.message}`)
  })
  client.on('close', () => {
    console.log(`[Redis:${label}] Connection closed`)
  })
  client.on('reconnecting', (delay) => {
    console.log(`[Redis:${label}] Reconnecting in ${delay}ms…`)
  })

  return client
}

/**
 * Initialise Redis connections.
 * Safe to call multiple times — subsequent calls are no-ops.
 * Returns false when Redis is disabled (no REDIS_URL).
 */
export function initRedis(urlOverride) {
  const raw = urlOverride !== undefined ? urlOverride : process.env.REDIS_URL
  const url = normalizeRedisUrl(raw)
  if (!url) {
    console.log('[Redis] REDIS_URL not set or invalid — Redis disabled. App runs in single-instance mode.')
    return false
  }
  if (_pubClient) return true  // already initialised

  _pubClient   = makeClient(url, 'pub', true)
  _subClient   = makeClient(url, 'sub', true)
  _cacheClient = makeClient(url, 'cache', false)
  return true
}

/** Returns true only when Redis is configured AND the cache client is ready. */
export function isRedisReady() {
  return !!(_cacheClient && _cacheClient.status === 'ready')
}

/** Returns the publish client (for Socket.io adapter). May be null. */
export function getRedisPubClient()  { return _pubClient  }
/** Returns the subscribe client (for Socket.io adapter). May be null. */
export function getRedisSubClient()  { return _subClient  }
/** Returns the general-purpose cache client. May be null. */
export function getRedisCacheClient() { return _cacheClient }

/** Test helper to inject mock clients or reset state deterministically in tests. */
export function _setClientsForTest({ pubClient = null, subClient = null, cacheClient = null } = {}) {
  _pubClient = pubClient
  _subClient = subClient
  _cacheClient = cacheClient
}

/**
 * Close all Redis connections cleanly.
 * Should be called in the graceful-shutdown handler.
 */
export async function closeRedis() {
  const clients = [_pubClient, _subClient, _cacheClient].filter(Boolean)
  await Promise.allSettled(
    clients.map(c => {
      if (typeof c?.quit === 'function') return c.quit()
      if (typeof c?.disconnect === 'function') return c.disconnect()
      return Promise.resolve()
    })
  )
  _pubClient   = null
  _subClient   = null
  _cacheClient = null
  console.log('[Redis] All connections closed')
}
