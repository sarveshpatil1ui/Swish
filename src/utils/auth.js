// ─────────────────────────────────────────────────────────────────────────────
// utils/auth.js  —  Swish frontend-only auth utilities
//
// ⚠️  SECURITY NOTICE — READ BEFORE PRODUCTION:
//   This file implements a MOCK / DEMO authentication system using localStorage.
//   Passwords are stored in plain text. Sessions are managed client-side.
//   This is intentional for the current frontend-only prototype stage.
//
//   Before production, replace every function marked
//   "// TODO: replace with real API call" with proper backend calls:
//     • Real backend API  (Express / FastAPI / Django / etc.)
//     • Proper password hashing  (bcrypt, argon2) on the server
//     • JWT or session-based auth
//     • HTTPS-only secure cookies
//     • Server-side role validation on every protected request
// ─────────────────────────────────────────────────────────────────────────────

// TODO: Replace localStorage with API call when backend is connected.

// ── localStorage key constants ────────────────────────────────────────────────
export const STORAGE_KEYS = {
  USERS: 'swish_users',        // array of registered (non-demo) users
  COLLEGES: 'swish_colleges',     // array of colleges managed by admin
  CURRENT_USER: 'swish_current_user', // currently logged-in user object
  POSTS: 'swish_posts',
  REPORTS: 'swish_reports',
  NOTIFICATIONS: 'swish_notifications',
}

// ── Registered-users helpers ──────────────────────────────────────────────────

/**
 * Loads registered users from localStorage.
 * Returns [] if nothing stored yet.
 * TODO: replace with GET /api/users
 */
export function loadUsers() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USERS)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

/**
 * Persists the registered-users array to localStorage.
 * TODO: individual user writes should be POST/PATCH /api/users
 */
export function saveUsers(users) {
  localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users))
}

// ── College helpers ────────────────────────────────────────────────────────────

/**
 * Loads the colleges array from localStorage.
 * Returns null if nothing stored (caller should use seed data instead).
 * TODO: replace with GET /api/colleges
 */
export function loadColleges() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.COLLEGES)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Persists the colleges array to localStorage.
 * TODO: individual college writes should be POST/PATCH /api/colleges
 */
export function saveColleges(colleges) {
  localStorage.setItem(STORAGE_KEYS.COLLEGES, JSON.stringify(colleges))
}

// ── Post, Report, and Notification helpers ────────────────────────────────────

export function loadPosts() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.POSTS)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
export function savePosts(posts) {
  localStorage.setItem(STORAGE_KEYS.POSTS, JSON.stringify(posts))
}

export function loadReports() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.REPORTS)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
export function saveReports(reports) {
  localStorage.setItem(STORAGE_KEYS.REPORTS, JSON.stringify(reports))
}

export function loadNotifications() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
export function saveNotifications(notifications) {
  localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications))
}

// ── Current-session helpers ───────────────────────────────────────────────────

/**
 * Restores the logged-in user from localStorage (handles F5 / page refresh).
 * Returns null if no active session.
 * TODO: replace with GET /api/auth/me  (validates JWT / cookie server-side)
 */
export function loadCurrentUser() {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

/**
 * Saves the logged-in user to localStorage (never stores password).
 * TODO: this persistence will be handled by a secure HttpOnly cookie in production
 */
export function saveCurrentUser(user) {
  const { password: _pw, ...safeUser } = user
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(safeUser))
}

/**
 * Removes the current session (logout).
 * Does NOT touch the registered-users list.
 * TODO: also call POST /api/auth/logout to invalidate server-side session
 */
export function clearCurrentUser() {
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
}

// ── Role → redirect path ──────────────────────────────────────────────────────

/**
 * Returns the correct post-login path for a given role.
 * TODO: roles should come from a JWT claim verified on the server.
 * @param {'student'|'faculty'|'admin'} role
 * @returns {string}
 */
export function redirectPathForRole(role) {
  if (role === 'admin') return '/admin'
  if (role === 'faculty') return '/faculty'
  return '/home'
}
