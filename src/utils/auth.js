
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const TOKEN_KEY = 'swish_token'

export function getStoredToken() {
  try {
    return localStorage.getItem(TOKEN_KEY)
  } catch {
    return null
  }
}

export function setStoredToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token)
  } catch {}
}

export function clearStoredToken() {
  try {
    localStorage.removeItem(TOKEN_KEY)
  } catch {}
}

export function isTokenExpired(token) {
  if (!token || typeof token !== 'string') return true
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return true
    const base64Url = parts[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    )
    const payload = JSON.parse(jsonPayload)
    if (!payload.exp) return false
    return payload.exp * 1000 < Date.now()
  } catch {
    return true
  }
}

/**
 * Thin wrapper around fetch for JSON API calls.
 * Always includes credentials (httpOnly cookie) AND Authorization: Bearer token (dual auth).
 *
 * @param {string} path    - e.g. '/api/auth/login'
 * @param {object} options - fetch options (method, body, etc.)
 * @returns {Promise<object>} parsed JSON response body
 */
export async function apiFetch(path, options = {}) {
  try {
    const token = getStoredToken()
    const headers = { 'Content-Type': 'application/json', ...options.headers }
    if (token) {
      headers['Authorization'] = `Bearer ${token}`
    }

    const res = await fetch(`${BASE_URL}${path}`, {
      credentials: 'include', // send httpOnly cookie on every request
      ...options,
      headers,
      body: options.body
        ? (typeof options.body === 'string' ? options.body : JSON.stringify(options.body))
        : undefined,
    })

    const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected server response.' }))
    // Attach HTTP status to the result for callers to inspect if needed
    data._status = res.status
    if (!res.ok && data.ok !== false) {
      data.ok = false
    }
    return data
  } catch (err) {
    console.error(`[apiFetch] Request to ${BASE_URL}${path} failed:`, err)
    return {
      ok: false,
      error:
        err?.message === 'Failed to fetch' || err?.name === 'TypeError'
          ? `Backend server is unreachable at ${BASE_URL}. Please ensure the backend is running.`
          : (err?.message || 'Connection error.'),
      isNetworkError: true,
    }
  }
}

export async function apiRegister(userData) {
  return apiFetch('/api/auth/register', { method: 'POST', body: userData })
}

export async function apiVerifyOtp(email, otp) {
  const data = await apiFetch('/api/auth/verify-otp', { method: 'POST', body: { email, otp } })
  if (data.ok && data.token) {
    setStoredToken(data.token)
  }
  return data
}

export async function apiResendOtp(email, turnstileToken = null) {
  const body = { email }
  if (turnstileToken) body.turnstileToken = turnstileToken
  return apiFetch('/api/auth/resend-otp', { method: 'POST', body })
}

export async function apiForgotPassword(email, turnstileToken = null) {
  const body = { email }
  if (turnstileToken) body.turnstileToken = turnstileToken
  return apiFetch('/api/auth/forgot-password', { method: 'POST', body })
}

export async function apiVerifyResetOtp(email, otp) {
  return apiFetch('/api/auth/verify-reset-otp', { method: 'POST', body: { email, otp } })
}

export async function apiResetPassword(email, resetToken, newPassword) {
  return apiFetch('/api/auth/reset-password', { method: 'POST', body: { email, resetToken, newPassword } })
}

export async function apiLogin(email, password, turnstileToken = null) {
  const body = { email, password }
  if (turnstileToken) body.turnstileToken = turnstileToken
  const data = await apiFetch('/api/auth/login', { method: 'POST', body })
  if (data.ok && data.token) {
    setStoredToken(data.token)
  }
  return data
}

export async function apiMe() {
  return apiFetch('/api/auth/me')
}

export async function apiLogout() {
  clearStoredToken()
  return apiFetch('/api/auth/logout', { method: 'POST' })
}

/**
 * Returns the correct post-login path for a given role.
 * @param {'student'|'faculty'|'admin'|'college_admin'} role
 * @returns {string}
 */
export function redirectPathForRole(role) {
  if (role === 'admin' || role === 'main_admin') return '/admin'
  if (role === 'college_admin') return '/college-admin'
  if (role === 'faculty') return '/faculty'
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

export async function apiGetUserStats() {
  return apiFetch('/api/users/stats')
}

export async function apiToggleUserStatus(userId) {
  return apiFetch(`/api/users/${userId}/status`, { method: 'PATCH' })
}

export async function apiToggleVerifiedBadge(userId, verified) {
  return apiFetch(`/api/users/${userId}/verified-badge`, { method: 'PATCH', body: { verified } })
}

export async function apiToggleHOD(userId, isHOD, departmentId) {
  return apiFetch(`/api/users/${userId}/hod`, { method: 'PATCH', body: { isHOD, departmentId } })
}

export async function apiGetProfile(userId) {
  return apiFetch(`/api/users/${userId}`)
}

export async function apiUpdateProfile(userId, profileData) {
  return apiFetch(`/api/users/${userId}`, { method: 'PUT', body: profileData })
}

export async function apiUpdatePreferences(preferences) {
  return apiFetch('/api/users/preferences', { method: 'PATCH', body: { preferences } })
}

export async function apiDeleteAccount(userId) {
  return apiFetch(`/api/users/${userId}`, { method: 'DELETE' })
}

export async function apiUploadProfilePhoto(file) {
  const formData = new FormData()
  formData.append('photo', file)

  // FormData requests cannot use apiFetch (which sets Content-Type: application/json).
  // Must add the Authorization header manually so the backend receives the Bearer token
  // even when cross-origin cookies are unavailable (production: Firebase → Render).
  const token = getStoredToken()
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}/api/users/upload-photo`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  })
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected server response.' }))
  data._status = res.status
  return data
}

export async function apiRemoveProfilePhoto() {
  return apiFetch('/api/users/profile-photo', { method: 'DELETE' })
}

export async function apiFollowUser(userId) {
  return apiFetch(`/api/users/${userId}/follow`, { method: 'POST' })
}

/** On success: { ok: true, following: false, followerCount } */
export async function apiUnfollowUser(userId) {
  return apiFetch(`/api/users/${userId}/follow`, { method: 'DELETE' })
}

export async function apiAcceptFollowRequest(userId) {
  return apiFetch(`/api/users/${userId}/follow-request/accept`, { method: 'POST' })
}

export async function apiRejectFollowRequest(userId) {
  return apiFetch(`/api/users/${userId}/follow-request/reject`, { method: 'POST' })
}

export async function apiGetPendingFollowRequests() {
  return apiFetch('/api/users/follow-requests/pending')
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
export async function apiCreatePost({ caption, imageFile, tags, music }) {
  const formData = new FormData()
  if (caption) formData.append('caption', caption)
  if (imageFile) formData.append('photo', imageFile)
  if (tags && tags.length) formData.append('tags', JSON.stringify(tags))
  if (music) formData.append('music', JSON.stringify(music))

  // FormData requests cannot use apiFetch (which sets Content-Type: application/json).
  // Must add the Authorization header manually so the backend receives the Bearer token
  // even when cross-origin cookies are unavailable (production: Firebase → Render).
  const token = getStoredToken()
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}/api/posts`, {
    method: 'POST',
    headers,
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

export async function apiSavePost(postId) {
  return apiFetch(`/api/posts/${postId}/save`, { method: 'POST' })
}

export async function apiUnsavePost(postId) {
  return apiFetch(`/api/posts/${postId}/save`, { method: 'DELETE' })
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

/** On success: { ok: true, stories: Array } */
export async function apiGetStories() {
  return apiFetch('/api/stories')
}

/** On success: { ok: true, story } */
export async function apiCreateStory({ imageFile, caption, music, filter, sticker, expiresAt }) {
  const formData = new FormData()
  if (imageFile) formData.append('photo', imageFile)
  if (caption) formData.append('caption', caption)
  if (music) formData.append('music', JSON.stringify(music))
  if (filter) formData.append('filter', filter)
  if (sticker) formData.append('sticker', JSON.stringify(sticker))
  if (expiresAt) formData.append('expiresAt', expiresAt)

  const token = getStoredToken()
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}/api/stories`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: formData,
  })
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected server response.' }))
  data._status = res.status
  return data
}

/** On success: { ok: true, story } */
export async function apiGetStoryById(storyId) {
  return apiFetch(`/api/stories/${storyId}`)
}

/** On success: { ok: true, viewsCount } */
export async function apiRecordStoryView(storyId) {
  return apiFetch(`/api/stories/${storyId}/view`, { method: 'POST' })
}

/** On success: { ok: true, storyId, viewsCount, viewers: Array } */
export async function apiGetStoryViewers(storyId) {
  return apiFetch(`/api/stories/${storyId}/viewers`)
}

/** On success: { ok: true, isLiked: boolean, likesCount: number } */
export async function apiLikeStory(storyId) {
  return apiFetch(`/api/stories/${storyId}/like`, { method: 'POST' })
}

/** On success: { ok: true, message: string, reaction: string } */
export async function apiReactStory(storyId, emoji) {
  return apiFetch(`/api/stories/${storyId}/react`, {
    method: 'POST',
    body: { emoji },
  })
}

/** On success: { ok: true, message: string, reply: Object } */
export async function apiReplyStory(storyId, text) {
  return apiFetch(`/api/stories/${storyId}/reply`, {
    method: 'POST',
    body: { text },
  })
}

/** On success: { ok: true, replies: Array } */
export async function apiGetStoryReplies(storyId) {
  return apiFetch(`/api/stories/${storyId}/replies`)
}

/** On success: { ok: true, story } */
export async function apiUpdateStory(storyId, { imageFile, caption }) {
  const formData = new FormData()
  if (imageFile) formData.append('photo', imageFile)
  if (caption !== undefined) formData.append('caption', caption)

  const token = getStoredToken()
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}/api/stories/${storyId}`, {
    method: 'PUT',
    headers,
    credentials: 'include',
    body: formData,
  })
  const data = await res.json().catch(() => ({ ok: false, error: 'Unexpected server response.' }))
  data._status = res.status
  return data
}

/** On success: { ok: true, storyId } */
export async function apiDeleteStory(storyId) {
  return apiFetch(`/api/stories/${storyId}`, { method: 'DELETE' })
}

/** On success: { ok: true, users: Array } */
export async function apiFetchFollowers(userId) {
  return apiFetch(`/api/users/${userId}/followers`)
}

/** On success: { ok: true, users: Array } */
export async function apiFetchFollowing(userId) {
  return apiFetch(`/api/users/${userId}/following`)
}

// ── Colleges API ──────────────────────────────────────────────────────────────
export async function apiGetColleges() {
  return apiFetch('/api/colleges')
}

export async function apiGetMyCollege() {
  return apiFetch('/api/colleges/my-college')
}

export async function apiAddCollege(data) {
  return apiFetch('/api/colleges', { method: 'POST', body: data })
}

export async function apiToggleCollege(id) {
  return apiFetch(`/api/colleges/${id}/toggle`, { method: 'PATCH' })
}

export async function apiUpdateCollege(id, data) {
  return apiFetch(`/api/colleges/${id}`, { method: 'PUT', body: data })
}

export async function apiCheckDomain(domain) {
  return apiFetch(`/api/colleges/check-domain?domain=${encodeURIComponent(domain)}`)
}

// ── Change Password ─────────────────────────────────────────────────────────
export async function apiChangePassword(currentPassword, newPassword, confirmPassword) {
  const res = await apiFetch('/api/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword, confirmPassword: confirmPassword || newPassword },
  })
  if (res.ok && res.token) {
    setStoredToken(res.token)
  }
  return res
}

// ── Departments API ─────────────────────────────────────────────────────────
export async function apiGetDepartments() {
  return apiFetch('/api/departments')
}

export async function apiGetDepartmentsByDomain(domain) {
  return apiFetch(`/api/departments/by-domain?domain=${encodeURIComponent(domain)}`)
}

export async function apiCreateDepartment(data) {
  return apiFetch('/api/departments', { method: 'POST', body: data })
}

export async function apiUpdateDepartment(id, data) {
  return apiFetch(`/api/departments/${id}`, { method: 'PUT', body: data })
}

export async function apiToggleDepartment(id) {
  return apiFetch(`/api/departments/${id}/toggle`, { method: 'PATCH' })
}

export async function apiDeleteDepartment(id) {
  return apiFetch(`/api/departments/${id}`, { method: 'DELETE' })
}

export async function apiGetCollegeDashboard() {
  return apiFetch('/api/colleges/dashboard')
}

// ── Notices API ───────────────────────────────────────────────────────────────
export async function apiGetNotices() {
  return apiFetch('/api/notices')
}

export async function apiGetCollegeNotices() {
  return apiFetch('/api/notices/college')
}

export async function apiGetNoticeById(id) {
  return apiFetch(`/api/notices/${id}`)
}

export async function apiCreateNotice(data) {
  return apiFetch('/api/notices', { method: 'POST', body: data })
}

export async function apiUpdateNotice(id, data) {
  return apiFetch(`/api/notices/${id}`, { method: 'PUT', body: data })
}

export async function apiDeleteNotice(id) {
  return apiFetch(`/api/notices/${id}`, { method: 'DELETE' })
}

export async function apiPublishNotice(id) {
  return apiFetch(`/api/notices/${id}/publish`, { method: 'PATCH' })
}

// ── Notifications API ─────────────────────────────────────────────────────────

/** On success: { ok: true, notifications: Array } */
export async function apiGetNotifications() {
  return apiFetch('/api/notifications')
}

/** On success: { ok: true, notification } */
export async function apiMarkNotificationRead(notificationId) {
  return apiFetch(`/api/notifications/${notificationId}/read`, { method: 'PATCH' })
}

/** On success: { ok: true } */
export async function apiMarkAllNotificationsRead() {
  return apiFetch('/api/notifications/read-all', { method: 'PATCH' })
}

// ── Messages Unread & Read API ────────────────────────────────────────────────
/** On success: { ok: true, count: Number } */
export async function apiGetUnreadMessagesCount() {
  return apiFetch('/api/messages/unread-count')
}

/** On success: { ok: true, readBy: String } */
export async function apiMarkConvRead(convId) {
  return apiFetch(`/api/messages/${convId}/read`, { method: 'PATCH' })
}

// ── Reports API ───────────────────────────────────────────────────────────────
export async function apiSubmitReport(data) {
  return apiFetch('/api/reports', { method: 'POST', body: data })
}

export async function apiGetReports({ status, type, limit, skip }) {
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (type) params.append('type', type)
  if (limit) params.append('limit', limit)
  if (skip) params.append('skip', skip)
  const query = params.toString()
  return apiFetch(`/api/reports${query ? `?${query}` : ''}`)
}

export async function apiGetReportById(id) {
  return apiFetch(`/api/reports/${id}`)
}

export async function apiUpdateReportStatus(id, { status, resolutionNotes }) {
  return apiFetch(`/api/reports/${id}/status`, { method: 'PATCH', body: { status, resolutionNotes } })
}

export async function apiGetAnalyticsDashboard({ period, startDate, endDate, timezoneOffset } = {}) {
  const params = new URLSearchParams()
  if (period) params.append('period', period)
  if (startDate) params.append('startDate', startDate)
  if (endDate) params.append('endDate', endDate)
  const tz = timezoneOffset !== undefined ? timezoneOffset : new Date().getTimezoneOffset()
  params.append('timezoneOffset', String(tz))
  const query = params.toString()
  return apiFetch(`/api/analytics/dashboard${query ? `?${query}` : ''}`)
}

export async function apiPinNotice(id) {
  return apiFetch(`/api/notices/${id}/pin`, { method: 'PATCH' })
}

// ── Trending & Discovery API ────────────────────────────────────────────────
/** On success: { ok: true, posts: Array, nextCursor: string|null, hasMore: boolean } */
export async function apiGetTrendingPosts({ tab = 'trending', tag, cursor, limit = 20 } = {}) {
  const params = new URLSearchParams()
  if (tab) params.append('tab', tab)
  if (tag) params.append('tag', (tag || '').trim().replace(/^#+/, ''))
  if (cursor) params.append('cursor', cursor)
  if (limit) params.append('limit', limit)
  const q = params.toString()
  return apiFetch(`/api/trending/posts${q ? `?${q}` : ''}`)
}

/** On success: { ok: true, hashtags: Array<{ tag: string, count: number }> } */
export async function apiGetTrendingHashtags(limit = 12) {
  return apiFetch(`/api/trending/hashtags?limit=${limit}`)
}

/** On success: { ok: true, tag: string, posts: Array, nextCursor: string|null, hasMore: boolean } */
export async function apiGetHashtagPosts(tag, { cursor, limit = 20 } = {}) {
  const cleanTag = encodeURIComponent((tag || '').trim().replace(/^#+/, ''))
  const params = new URLSearchParams()
  if (cursor) params.append('cursor', cursor)
  if (limit) params.append('limit', limit)
  const q = params.toString()
  return apiFetch(`/api/trending/hashtags/${cleanTag}/posts${q ? `?${q}` : ''}`)
}

/** On success: { ok: true, accounts: Array } */
export async function apiGetSuggestedAccounts(limit = 8) {
  return apiFetch(`/api/trending/accounts?limit=${limit}`)
}

// ── Moderation API ──────────────────────────────────────────────────────────
export async function apiGetModerationPosts() {
  return apiFetch('/api/moderation/posts')
}

export async function apiGetModerationComments() {
  return apiFetch('/api/moderation/comments')
}

export async function apiHidePost(id, reason) {
  return apiFetch(`/api/moderation/posts/${id}/hide`, { method: 'PATCH', body: { reason } })
}

export async function apiRestorePost(id) {
  return apiFetch(`/api/moderation/posts/${id}/restore`, { method: 'PATCH' })
}

export async function apiHideComment(id, reason) {
  return apiFetch(`/api/moderation/comments/${id}/hide`, { method: 'PATCH', body: { reason } })
}

export async function apiRestoreComment(id) {
  return apiFetch(`/api/moderation/comments/${id}/restore`, { method: 'PATCH' })
}

// ── Activity Logs API ──────────────────────────────────────────────────────────
export async function apiGetActivityLogs(params = {}) {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value)
    }
  }
  const qStr = query.toString()
  return apiFetch(`/api/activity-logs${qStr ? `?${qStr}` : ''}`)
}

export async function apiGetActivityLogStats() {
  return apiFetch('/api/activity-logs/stats')
}

export function getAvatarUrl(url) {
  if (!url) return null
  if (url.startsWith('http://') || url.startsWith('https://')) return url
  const apiBase = BASE_URL || 'http://localhost:3001'
  return `${apiBase}${url.startsWith('/') ? '' : '/'}${url}`
}

// ── Main Admin Notifications API ───────────────────────────────────────────────
export async function apiGetAdminNotifications(params = {}) {
  const query = new URLSearchParams()
  if (params.limit) query.append('limit', params.limit)
  if (params.unreadOnly) query.append('unreadOnly', 'true')
  const qStr = query.toString()
  return apiFetch(`/api/admin/notifications${qStr ? `?${qStr}` : ''}`)
}

export async function apiMarkAdminNotificationRead(id) {
  return apiFetch(`/api/admin/notifications/${id}/read`, { method: 'PATCH' })
}

export async function apiMarkAllAdminNotificationsRead() {
  return apiFetch('/api/admin/notifications/read-all', { method: 'PATCH' })
}

export async function apiDeleteAdminNotification(id) {
  return apiFetch(`/api/admin/notifications/${id}`, { method: 'DELETE' })
}

// ── Platform Reports & Grievances API ──────────────────────────────────────────
export async function apiSubmitPlatformReport(data) {
  return apiFetch('/api/admin/reports/platform', { method: 'POST', body: data })
}

export async function apiGetAdminReports() {
  return apiFetch('/api/admin/reports')
}

export async function apiUpdateAdminReportStatus(id, data) {
  return apiFetch(`/api/admin/reports/${id}/status`, { method: 'PATCH', body: data })
}

// ── Platform Configuration & Maintenance API ─────────────────────────────────
export async function apiGetPlatformConfig() {
  return apiFetch('/api/platform/config')
}

export async function apiGetAdminPlatformConfig() {
  return apiFetch('/api/platform/admin/config')
}

export async function apiUpdateMaintenanceMode(data) {
  return apiFetch('/api/platform/admin/maintenance', { method: 'PATCH', body: data })
}

export async function apiUpdateFeatureFlags(features) {
  return apiFetch('/api/platform/admin/features', { method: 'PATCH', body: { features } })
}

export async function apiUpdateBroadcastBanner(broadcast) {
  return apiFetch('/api/platform/admin/broadcast', { method: 'PATCH', body: { broadcast } })
}

export async function apiTerminateOtherSessions() {
  return apiFetch('/api/admin/sessions/terminate-others', { method: 'POST' })
}

export async function apiGetSessions() {
  return apiFetch('/api/auth/sessions')
}

export async function apiRevokeOtherSessions() {
  return apiFetch('/api/auth/sessions/revoke-others', { method: 'POST' })
}

export async function apiRevokeSession(sessionId) {
  return apiFetch(`/api/auth/sessions/${sessionId}`, { method: 'DELETE' })
}

export async function apiRefreshToken(refreshToken = null) {
  const body = refreshToken ? { refreshToken } : undefined
  const data = await apiFetch('/api/auth/refresh-token', { method: 'POST', body })
  if (data.ok && data.token) {
    setStoredToken(data.token)
  }
  return data
}

export async function apiGetSystemHealth() {
  return apiFetch('/api/health')
}
