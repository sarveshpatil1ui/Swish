// ─────────────────────────────────────────────────────────────────────────────
// src/utils/auth.js  —  Swish API client utilities (replaces mock auth)
//
// All auth now goes through the real Express backend at /api/auth.
// JWT is stored as an httpOnly cookie — the browser sends it automatically.
// We never touch the token directly from JS; the server sets/clears the cookie.
// ─────────────────────────────────────────────────────────────────────────────

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

// ── Internal fetch wrapper ────────────────────────────────────────────────────

/**
 * Thin wrapper around fetch for JSON API calls.
 * Always includes credentials (so the httpOnly cookie is sent).
 *
 * @param {string} path    - e.g. '/api/auth/login'
 * @param {object} options - fetch options (method, body, etc.)
 * @returns {Promise<object>} parsed JSON response body
 */
async function apiFetch(path, options = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    credentials: 'include', // send httpOnly cookie on every request
    ...options,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected server response.' }))
  // Attach HTTP status to the result for callers to inspect if needed
  data._status = res.status
  return data
}

// ── Auth API calls ────────────────────────────────────────────────────────────

/**
 * Register a new student or faculty account.
 * On success: { ok: true, pendingVerification: true, email }
 * On error:   { ok: false, error: string }
 */
export async function apiRegister(userData) {
  return apiFetch('/api/auth/register', { method: 'POST', body: userData })
}

/**
 * Verify the OTP sent to email after registration (or after login with unverified account).
 * On success: { ok: true, user, redirectTo }  — backend also sets httpOnly cookie
 * On error:   { ok: false, error, expired? }
 */
export async function apiVerifyOtp(email, otp) {
  return apiFetch('/api/auth/verify-otp', { method: 'POST', body: { email, otp } })
}

/**
 * Resend a fresh OTP to the given email.
 * On success: { ok: true, message }
 * On error:   { ok: false, error }
 */
export async function apiResendOtp(email) {
  return apiFetch('/api/auth/resend-otp', { method: 'POST', body: { email } })
}

/**
 * Log in with email + password.
 * On success: { ok: true, user, redirectTo }    — backend sets httpOnly cookie
 * If unverified: { ok: false, pendingVerification: true, email, error }
 * On error:   { ok: false, error }
 */
export async function apiLogin(email, password) {
  return apiFetch('/api/auth/login', { method: 'POST', body: { email, password } })
}

/**
 * Fetch the currently authenticated user (rehydrates session on page refresh).
 * Relies on the httpOnly cookie being sent automatically.
 * On success: { ok: true, user }
 * If not logged in: { ok: false, error } with status 401
 */
export async function apiMe() {
  return apiFetch('/api/auth/me')
}

/**
 * Log out — tells the server to clear the httpOnly cookie.
 */
export async function apiLogout() {
  return apiFetch('/api/auth/logout', { method: 'POST' })
}

// ── Role → redirect path (mirrors backend logic) ──────────────────────────────

/**
 * Returns the correct post-login path for a given role.
 * @param {'student'|'faculty'|'admin'} role
 * @returns {string}
 */
export function redirectPathForRole(role) {
  if (role === 'admin')   return '/admin'
  if (role === 'faculty') return '/faculty'
  return '/home'
}

// ── localStorage helpers for non-auth data (posts, reports, etc.) ─────────────
// These are kept for compatibility with the existing frontend store logic.
// When the backend is extended with post/report APIs, replace these too.

export const STORAGE_KEYS = {
  POSTS:         'swish_posts',
  REPORTS:       'swish_reports',
  NOTIFICATIONS: 'swish_notifications',
}

const _ls = {
  get: (key) => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null } catch { return null } },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} },
}

export const loadPosts         = () => _ls.get(STORAGE_KEYS.POSTS)
export const savePosts         = (v) => _ls.set(STORAGE_KEYS.POSTS, v)
export const loadReports       = () => _ls.get(STORAGE_KEYS.REPORTS)
export const saveReports       = (v) => _ls.set(STORAGE_KEYS.REPORTS, v)
export const loadNotifications = () => _ls.get(STORAGE_KEYS.NOTIFICATIONS)
export const saveNotifications = (v) => _ls.set(STORAGE_KEYS.NOTIFICATIONS, v)

// ── Admin / Faculty API calls ─────────────────────────────────────────────────

/**
 * Fetch all users for Admin/Faculty dashboards.
 * On success: { ok: true, users: Array }
 */
export async function apiGetUsers() {
  return apiFetch('/api/users')
}

/**
 * Toggle user suspended status (Admin/Faculty).
 * On success: { ok: true, user: Object }
 */
export async function apiToggleUserStatus(userId) {
  return apiFetch(`/api/users/${userId}/status`, { method: 'PATCH' })
}

// ── College API calls ─────────────────────────────────────────────────────────

/**
 * Fetch all colleges.
 * On success: { ok: true, colleges: Array }
 */
export async function apiGetColleges() {
  return apiFetch('/api/colleges')
}

/**
 * Add a new college (admin only).
 * On success: { ok: true, college: Object }
 */
export async function apiAddCollege(data) {
  return apiFetch('/api/colleges', { method: 'POST', body: data })
}

/**
 * Toggle college active/inactive (admin only).
 * On success: { ok: true, college: Object }
 */
export async function apiToggleCollege(collegeId) {
  return apiFetch(`/api/colleges/${collegeId}/toggle`, { method: 'PATCH' })
}

/**
 * Check if an email domain is registered & active.
 * On success: { ok: true, approved: boolean, college?: string }
 */
export async function apiCheckDomain(domain) {
  return apiFetch(`/api/colleges/check-domain?domain=${encodeURIComponent(domain)}`)
}
