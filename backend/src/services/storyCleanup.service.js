import { cleanupExpiredStories } from '../routes/stories.routes.js'

/**
 * Creates a robust background scheduler for story cleanup.
 *
 * Guarantees:
 * - At most one cleanupExpiredStories() execution is active at any time.
 * - Next run is scheduled strictly AFTER the current run completes (15m post-settle).
 * - Startup cleanup is the initial run of the loop; it never races with a concurrent timer.
 * - Promise rejections are caught and logged without breaking future scheduled runs.
 * - Timers are unref'd so they do not keep node processes or tests artificially alive.
 * - Graceful shutdown clears pending timers and prevents subsequent executions.
 */
export function createStoryCleanupScheduler({
  cleanupFn = cleanupExpiredStories,
  intervalMs = 15 * 60 * 1000,
  initialDelayMs = 5000,
  logger = console,
} = {}) {
  let isRunning = false
  let timer = null
  let stopped = false

  async function run() {
    if (stopped) return
    if (isRunning) return

    isRunning = true
    try {
      await cleanupFn()
    } catch (err) {
      logger.error('[Stories Background Cleanup Error]', err?.message || err)
    } finally {
      isRunning = false
      if (!stopped) {
        timer = setTimeout(run, intervalMs)
        if (timer && typeof timer.unref === 'function') {
          timer.unref()
        }
      }
    }
  }

  // Schedule the first execution
  timer = setTimeout(run, initialDelayMs)
  if (timer && typeof timer.unref === 'function') {
    timer.unref()
  }

  return {
    get isRunning() {
      return isRunning
    },
    get isStopped() {
      return stopped
    },
    triggerNow: () => run(),
    stop: () => {
      stopped = true
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
    },
  }
}
