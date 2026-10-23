/**
 * cache.service.js
 *
 * Centralized caching helper for Swish backend.
 *
 * DESIGN RULES (from spec):
 * - Uses a versioned key prefix so all keys can be invalidated by bumping a
 *   prefix without a FLUSHDB.
 * - getOrSet(): cache-aside pattern with JSON serialisation.
 * - On ANY Redis error the caller receives the un-cached result — Redis is
 *   never on the critical path.
 * - Never caches errors, null-ish values, or sensitive data.
 * - del() and delPattern() are used by write routes to invalidate stale entries.
 * - TTL is always explicit; no indefinitely-cached keys.
 *
 * KEY FORMAT: swish:v1:<namespace>:<discriminator>
 */

import { getRedisCacheClient, isRedisReady } from './redis.service.js'

// Bump this version string to invalidate ALL cached keys at once
const KEY_VERSION = 'v1'
const PREFIX      = `swish:${KEY_VERSION}`

/** Build a namespaced cache key. */
export function cacheKey(namespace, ...parts) {
  return [PREFIX, namespace, ...parts].filter(Boolean).join(':')
}

/**
 * Cache-aside read-through helper.
 *
 * @param {string}   key       - Full cache key (use cacheKey() helper)
 * @param {number}   ttlSec    - TTL in seconds
 * @param {Function} fetchFn   - Async function that returns the fresh value
 * @returns {Promise<*>}       - Cached or freshly-fetched value
 */
export async function getOrSet(key, ttlSec, fetchFn) {
  const client = getRedisCacheClient()

  // Fast path: Redis unavailable — bypass caching entirely
  if (!isRedisReady() || !client) {
    return fetchFn()
  }

  try {
    const cached = await client.get(key)
    if (cached !== null) {
      return JSON.parse(cached)
    }
  } catch (err) {
    console.error(`[Cache] GET error for "${key}": ${err.message}`)
    return fetchFn()  // fallback on error
  }

  // Cache miss: fetch from MongoDB
  const value = await fetchFn()

  // Only cache truthy, non-error values
  if (value !== null && value !== undefined) {
    try {
      await client.setex(key, ttlSec, JSON.stringify(value))
    } catch (err) {
      // Non-fatal: log and continue
      console.error(`[Cache] SETEX error for "${key}": ${err.message}`)
    }
  }

  return value
}

/**
 * Delete one or more exact cache keys.
 * Silently no-ops when Redis is unavailable.
 */
export async function del(...keys) {
  const client = getRedisCacheClient()
  if (!isRedisReady() || !client || keys.length === 0) return
  try {
    await client.del(...keys)
  } catch (err) {
    console.error(`[Cache] DEL error: ${err.message}`)
  }
}

/**
 * Delete all cache keys matching a glob pattern.
 * Uses SCAN to avoid blocking the Redis server (safe for production).
 * Silently no-ops when Redis is unavailable.
 *
 * @param {string} pattern - e.g. "swish:v1:colleges:*"
 */
export async function delPattern(pattern) {
  const client = getRedisCacheClient()
  if (!isRedisReady() || !client) return
  try {
    let cursor = '0'
    do {
      const [nextCursor, keys] = await client.scan(cursor, 'MATCH', pattern, 'COUNT', 100)
      cursor = nextCursor
      if (keys.length > 0) {
        await client.del(...keys)
      }
    } while (cursor !== '0')
  } catch (err) {
    console.error(`[Cache] SCAN/DEL pattern error "${pattern}": ${err.message}`)
  }
}
