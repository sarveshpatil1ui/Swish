/**
 * notification.js
 * In-app audio chime and browser notification utilities for Swish.
 */

/**
 * Plays a modern, pleasant 2-tone audio chime using the Web Audio API.
 * Requires zero external audio files and triggers with zero latency.
 */
export function playNotificationSound() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return

    const ctx = new AudioContextClass()
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.connect(gain)
    gain.connect(ctx.destination)

    // Two-tone harmonic chime: 587.33Hz (D5) quickly sliding to 880Hz (A5)
    osc.type = 'sine'
    const now = ctx.currentTime

    osc.frequency.setValueAtTime(587.33, now)
    osc.frequency.exponentialRampToValueAtTime(880, now + 0.08)

    gain.gain.setValueAtTime(0.18, now)
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35)

    osc.start(now)
    osc.stop(now + 0.35)
  } catch {
    // Autoplay policy or unsupported audio environment — safely ignore
  }
}

/**
 * Requests browser notification permission if not yet decided.
 */
export async function requestNotificationPermission() {
  try {
    if ('Notification' in window && Notification.permission === 'default') {
      await Notification.requestPermission()
    }
  } catch {
    // Ignore
  }
}

/**
 * Displays a system/browser desktop notification if permission was granted.
 */
export function showBrowserNotification(title, options = {}) {
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      const notif = new Notification(title, {
        badge: '/favicon.ico',
        icon: '/favicon.ico',
        silent: true, // We already play our own refined Web Audio chime
        ...options,
      })
      if (options.onClick) {
        notif.onclick = () => {
          window.focus()
          options.onClick()
          notif.close()
        }
      }
      setTimeout(() => notif.close(), 6000)
      return notif
    }
  } catch {
    // Ignore notification errors
  }
}
