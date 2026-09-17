
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'


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

export async function apiRegister(userData) {
  return apiFetch('/api/auth/register', { method: 'POST', body: userData })
}

export async function apiVerifyOtp(email, otp) {
  return apiFetch('/api/auth/verify-otp', { method: 'POST', body: { email, otp } })
}

export async function apiResendOtp(email) {
  return apiFetch('/api/auth/resend-otp', { method: 'POST', body: { email } })
}

export async function apiLogin(email, password) {
  return apiFetch('/api/auth/login', { method: 'POST', body: { email, password } })
}

export async function apiMe() {
  return apiFetch('/api/auth/me')
}

export async function apiLogout() {
  return apiFetch('/api/auth/logout', { method: 'POST' })
}

/**
 * Returns the correct post-login path for a given role.
 * @param {'student'|'faculty'|'admin'} role
 * @returns {string}
 */
export function redirectPathForRole(role) {
  if (role === 'admin')   return '/admin'
  if (role === 'faculty') return '/faculty'
  if (role=='college_admin')return '/college-admin'  //Change here clg admin route
  return '/home'
}

export const STORAGE_KEYS = {
  COLLEGES:      'swish_colleges',
  POSTS:         'swish_posts',
  REPORTS:       'swish_reports',
  NOTIFICATIONS: 'swish_notifications',
}

const _ls = {
  get: (key) => { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null } catch { return null } },
  set: (key, val) => { try { localStorage.setItem(key, JSON.stringify(val)) } catch {} },
}

export const loadColleges      = () => _ls.get(STORAGE_KEYS.COLLEGES)
export const saveColleges      = (v) => _ls.set(STORAGE_KEYS.COLLEGES, v)
export const loadPosts         = () => _ls.get(STORAGE_KEYS.POSTS)
export const savePosts         = (v) => _ls.set(STORAGE_KEYS.POSTS, v)
export const loadReports       = () => _ls.get(STORAGE_KEYS.REPORTS)
export const saveReports       = (v) => _ls.set(STORAGE_KEYS.REPORTS, v)
export const loadNotifications = () => _ls.get(STORAGE_KEYS.NOTIFICATIONS)
export const saveNotifications = (v) => _ls.set(STORAGE_KEYS.NOTIFICATIONS, v)

export async function apiGetUsers() {
  return apiFetch('/api/users')
}

export async function apiToggleUserStatus(userId) {
  return apiFetch(`/api/users/${userId}/status`, { method: 'PATCH' })
}

export async function apiGetProfile(userId) {
  return apiFetch(`/api/users/${userId}`)
}

export async function apiUpdateProfile(userId, { name, bio }) {
  return apiFetch(`/api/users/${userId}`, { method: 'PUT', body: { name, bio } })
}

export async function apiUploadProfilePhoto(file) {
  const formData = new FormData()
  formData.append('photo', file)

  const res = await fetch(`${BASE_URL}/api/users/upload-photo`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected server response.' }))
  data._status = res.status
  return data
}

export async function apiFollowUser(userId) {
  return apiFetch(`/api/users/${userId}/follow`, { method: 'POST' })
}

/** On success: { ok: true, following: false, followerCount } */
export async function apiUnfollowUser(userId) {
  return apiFetch(`/api/users/${userId}/follow`, { method: 'DELETE' })
}

// ── Post API calls (FR-05 Likes, FR-06 Comments) ──────────────────────────────

/** On success: { ok: true, posts: Array } */
export async function apiGetPosts() {
  return apiFetch('/api/posts')
}
export async function apiCheckCollegeDomain(domain) {
  return apiFetch(
    `/api/colleges/check-domain?domain=${encodeURIComponent(domain)}`
  )
}

/** On success: { ok: true, post } */
export async function apiCreatePost({ caption, imageFile, tags }) {
  const formData = new FormData()
  if (caption) formData.append('caption', caption)
  if (imageFile) formData.append('photo', imageFile)
  if (tags && tags.length) formData.append('tags', JSON.stringify(tags))

  const res = await fetch(`${BASE_URL}/api/posts`, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  })
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected server response.' }))
  data._status = res.status
  return data
}

/** On success: { ok: true, liked: true, likeCount } */
export async function apiLikePost(postId) {
  return apiFetch(`/api/posts/${postId}/like`, { method: 'POST' })
}

/** On success: { ok: true, liked: false, likeCount } */
export async function apiUnlikePost(postId) {
  return apiFetch(`/api/posts/${postId}/like`, { method: 'DELETE' })
}

/** On success: { ok: true, comments: Array } — newest first */
export async function apiGetComments(postId) {
  return apiFetch(`/api/posts/${postId}/comments`)
}

/** On success: { ok: true, comment, commentCount } */
export async function apiAddComment(postId, text) {
  return apiFetch(`/api/posts/${postId}/comments`, { method: 'POST', body: { text } })
}

/** On success: { ok: true, postId } */
export async function apiDeletePost(postId) {
  return apiFetch(`/api/posts/${postId}`, { method: 'DELETE' })
}

/** On success: { ok: true, commentId, commentCount } */
export async function apiDeleteComment(postId, commentId) {
  return apiFetch(`/api/posts/${postId}/comments/${commentId}`, { method: 'DELETE' })
}

/** On success: { ok: true, users: Array } */
export async function apiFetchFollowers(userId) {
  return apiFetch(`/api/users/${userId}/followers`)
}

/** On success: { ok: true, users: Array } */
export async function apiFetchFollowing(userId) {
  return apiFetch(`/api/users/${userId}/following`)
}
