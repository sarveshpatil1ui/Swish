// ─────────────────────────────────────────────────────────────────────────────
// SwishContext.jsx  —  Swish unified state layer (real backend integration)
//
// Auth now uses the real API:
//   login()    → POST /api/auth/login    → sets httpOnly cookie → rehydrates user
//   register() → POST /api/auth/register → returns pendingVerification: true
//   logout()   → POST /api/auth/logout   → clears cookie
//
// On mount: GET /api/auth/me is called to rehydrate the session from the cookie
// (replaces the old localStorage-based loadCurrentUser()).
//
// Non-auth data (posts, colleges, reports, notifications) still uses localStorage
// for now — they will be migrated to real API routes in future phases.
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState, useEffect } from 'react'

import {
  apiLogin, apiRegister, apiLogout, apiMe,apiCheckCollegeDomain,
  apiGetUsers, apiToggleUserStatus,
  apiGetPosts, apiCreatePost, apiLikePost, apiUnlikePost,
  apiGetComments, apiAddComment, apiDeletePost, apiDeleteComment,
  apiFollowUser, apiUnfollowUser, apiGetProfile, apiUpdateProfile, apiUploadProfilePhoto,
  apiFetchFollowers, apiFetchFollowing,
  loadColleges, saveColleges,
  loadReports, saveReports,
  loadNotifications, saveNotifications,
  redirectPathForRole,
} from '../utils/auth'
import { normalizePost } from '../utils/posts'

const SwishContext = createContext(null)

// ── Default user preferences ──────────────────────────────────────────────────
export const DEFAULT_PREFERENCES = {
  notifications: {
    likes: true,
    comments: true,
    follows: true,
    mentions: true,
    events: false,
  },
  privacy: {
    private: false,
    showEmail: false,
    activity: true,
    tagged: true,
  },
  security: {
    twoFactor: false,
  },
}

// ── Seed colleges (demo data — will be replaced by Admin College API later) ───
const SEED_COLLEGES = [
  {
    id: 'col-1',
    name: 'KJSCE Mumbai',
    code: 'KJSCE',
    domain: 'campus.edu',
    location: 'Mumbai, Maharashtra',
    active: true,
  },
  {
    id: 'col-2',
    name: 'Demo College',
    code: 'DEMO',
    domain: 'abc.edu.in',
    location: 'Pune, Maharashtra',
    active: true,
  },
]

// ── Internal helpers ──────────────────────────────────────────────────────────

function computeInitials(name) {
  return name.trim()
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function mergePrefs(stored) {
  return {
    notifications: { ...DEFAULT_PREFERENCES.notifications, ...stored?.notifications },
    privacy:       { ...DEFAULT_PREFERENCES.privacy,       ...stored?.privacy },
    security:      { ...DEFAULT_PREFERENCES.security,      ...stored?.security },
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function SwishProvider({ children }) {

  // ── Auth session ───────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser]       = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authLoading, setAuthLoading]       = useState(true) // true until /me check done

  // ── Colleges (still localStorage — pending Admin College API) ───────────────
  const [colleges, setColleges] = useState(() => {
    const saved = loadColleges()
    return saved ?? SEED_COLLEGES
  })

  // ── Posts (FR-05 Likes, FR-06 Comments — now backed by the real API) ────────
  const [posts, setPosts]           = useState([])
  const [postsLoading, setPostsLoading] = useState(false)

  // ── Reports ────────────────────────────────────────────────────────────────
  const [reports, setReports] = useState(() => {
    // Force clear any old mockData stuck in localStorage
    saveReports([])
    return []
  })

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState(() => {
    saveNotifications([])
    return []
  })

  // ── Rehydrate session on mount (replaces loadCurrentUser from localStorage) ─
  useEffect(() => {
    let cancelled = false
    apiMe()
      .then(result => {
        if (cancelled) return
        if (result.ok && result.user) {
          const userWithPrefs = {
            ...result.user,
            preferences: mergePrefs(result.user.preferences),
          }
          setCurrentUser(userWithPrefs)
          setIsAuthenticated(true)
        }
      })
      .catch(() => {
        // Cookie not present or invalid — stay logged out
      })
      .finally(() => {
        if (!cancelled) setAuthLoading(false)
      })
    return () => { cancelled = true }
  }, [])

  // ── Fetch users for Admin / Faculty ─────────────────────────────────────────
  const [users, setUsers] = useState([])
  useEffect(() => {
    if (isAuthenticated && (currentUser?.role === 'admin' || currentUser?.role === 'faculty')) {
      apiGetUsers().then(res => {
        if (res.ok) setUsers(res.users)
      })
    } else {
      setUsers([]) // Clear if logged out or student
    }
  }, [isAuthenticated, currentUser])

  // ── Fetch posts once authenticated ───────────────────────────────────────────
  const fetchPosts = async () => {
    setPostsLoading(true)
    try {
      const res = await apiGetPosts()
      if (res.ok) setPosts(res.posts.map(normalizePost))
    } finally {
      setPostsLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchPosts()
    } else {
      setPosts([])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated])

  // ── createPost — minimal, supports FR-05/FR-06 having real posts to attach to
  const createPost = async ({ caption, imageFile, tags }) => {
    const res = await apiCreatePost({ caption, imageFile, tags })
    if (!res.ok) return { ok: false, error: res.error || 'Failed to create post.' }
    setPosts(prev => [normalizePost(res.post), ...prev])
    return { ok: true }
  }

  // ── likePost / unlikePost (FR-05) ────────────────────────────────────────────
  // Optimistic update with rollback on failure, so the UI feels instant but
  // never drifts from server state on error (e.g. a stale duplicate-like 409).
  const likePost = async (postId) => {
    const prevPosts = posts
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, liked: true, likes: p.likes + 1 } : p))
    const res = await apiLikePost(postId)
    if (!res.ok) {
      setPosts(prevPosts) // rollback
      return { ok: false, error: res.error }
    }
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, liked: true, likes: res.likeCount } : p))
    return { ok: true }
  }

  const unlikePost = async (postId) => {
    const prevPosts = posts
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, liked: false, likes: Math.max(0, p.likes - 1) } : p))
    const res = await apiUnlikePost(postId)
    if (!res.ok) {
      setPosts(prevPosts) // rollback
      return { ok: false, error: res.error }
    }
    setPosts(ps => ps.map(p => p.id === postId ? { ...p, liked: false, likes: res.likeCount } : p))
    return { ok: true }
  }

  // ── Comments (FR-06) ──────────────────────────────────────────────────────────
  // Comments themselves aren't kept in the global posts array (they're fetched
  // on-demand by CommentDrawer when opened) — only the denormalized count is.
  const fetchComments = async (postId) => apiGetComments(postId)

  const addComment = async (postId, text) => {
    const res = await apiAddComment(postId, text)
    if (res.ok) {
      setPosts(ps => ps.map(p => p.id === postId ? { ...p, commentCount: res.commentCount } : p))
    }
    return res
  }

  // ── Delete Post ────────────────────────────────────────────────────────────────
  const deletePostAction = async (postId) => {
    const res = await apiDeletePost(postId)
    if (res.ok) {
      setPosts(prev => prev.filter(p => p.id !== postId))
    }
    return res
  }

  // ── Delete Comment ─────────────────────────────────────────────────────────────
  const deleteComment = async (postId, commentId) => {
    const res = await apiDeleteComment(postId, commentId)
    if (res.ok) {
      setPosts(ps => ps.map(p => p.id === postId ? { ...p, commentCount: res.commentCount } : p))
    }
    return res
  }

  // ── Follow / Unfollow (FR-07) ─────────────────────────────────────────────────
  const followUser = async (userId) => apiFollowUser(userId)
  const unfollowUser = async (userId) => apiUnfollowUser(userId)

  // ── Followers / Following lists ───────────────────────────────────────────────
  const fetchFollowers = async (userId) => apiFetchFollowers(userId)
  const fetchFollowing = async (userId) => apiFetchFollowing(userId)

  // ── Profile fetch/update (FR-02) ──────────────────────────────────────────────
  const fetchProfile = async (userId) => apiGetProfile(userId)

  const saveProfile = async (userId, { name, bio }) => {
    const res = await apiUpdateProfile(userId, { name, bio })
    if (res.ok && currentUser?.id === userId) {
      setCurrentUser(u => ({ ...u, name: res.user.name, bio: res.user.bio, initials: res.user.initials }))
    }
    return res
  }

  const uploadProfilePhoto = async (file) => {
    const res = await apiUploadProfilePhoto(file)
    if (res.ok) {
      setCurrentUser(u => ({ ...u, profilePhoto: res.profilePhoto }))
    }
    return res
  }

  // ── login ─────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const result = await apiLogin(email, password)

    if (!result.ok) {
      // If account is unverified, surface the verification flow to the caller
      if (result.pendingVerification) {
        return {
          ok: false,
          pendingVerification: true,
          email: result.email,
          error: result.error,
        }
      }
      return { ok: false, error: result.error || 'Login failed.' }
    }

    const userWithPrefs = {
      ...result.user,
      preferences: mergePrefs(result.user.preferences),
    }
    setCurrentUser(userWithPrefs)
    setIsAuthenticated(true)
    return { ok: true, role: userWithPrefs.role, redirectTo: result.redirectTo }
  }

  // ── register ──────────────────────────────────────────────────────────────
  // NOTE: Registration no longer auto-logs in. It returns pendingVerification: true
  // so the caller (JoinPage) can show the OTP step.
  const register = async (userData) => {
    // Prevent users from registering as admin
    if (userData.role === 'admin') {
      return { ok: false, error: 'You cannot register as a system admin.' }
    }

    const result = await apiRegister(userData)

    if (!result.ok) {
      return { ok: false, error: result.error || 'Registration failed.' }
    }

    // pendingVerification: true → JoinPage shows OTP step
    return {
      ok: true,
      pendingVerification: true,
      email: result.email,
    }
  }

  // ── Called after OTP is successfully verified (from JoinPage / LoginPage) ──
  // The backend already set the httpOnly cookie; we just update local state.
  const onVerified = (user) => {
    const userWithPrefs = {
      ...user,
      preferences: mergePrefs(user.preferences),
    }
    setCurrentUser(userWithPrefs)
    setIsAuthenticated(true)
  }

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    await apiLogout()
    setCurrentUser(null)
    setIsAuthenticated(false)
  }

  // ── domainApproved ────────────────────────────────────────────────────────
const domainApproved = async (email) => {
  if (!email || !email.includes('@')) return false

  const normalizedEmail = email.trim().toLowerCase()

  // Keep SWISH admin bypass
  if (normalizedEmail === 'admin@swish.com') {
    return true
  }

  const domain = normalizedEmail.split('@')[1]

  try {
    const result = await apiCheckCollegeDomain(domain)
    return result.ok && result.approved === true
  } catch (err) {
    console.error('[domainApproved] Domain check failed:', err)
    return false
  }
}

  // ── updateUser ────────────────────────────────────────────────────────────
  // TODO: replace with PATCH /api/users/:id when user-profile API is built
  const updateUser = ({ name, username, bio }) => {
    if (!currentUser) return { ok: false, error: 'Not authenticated.' }
    const updatedUser = {
      ...currentUser,
      name:     (name     ?? currentUser.name).trim(),
      username: (username ?? currentUser.username).trim(),
      bio:      (bio      ?? currentUser.bio ?? '').trim(),
      initials: computeInitials(name || currentUser.name),
    }
    setCurrentUser(updatedUser)
    return { ok: true }
  }

  // ── updatePreferences ─────────────────────────────────────────────────────
  // TODO: replace with PATCH /api/users/:id/preferences
  const updatePreferences = (partial) => {
    if (!currentUser) return
    const merged = {
      notifications: { ...currentUser.preferences?.notifications, ...partial.notifications },
      privacy:       { ...currentUser.preferences?.privacy,       ...partial.privacy },
      security:      { ...currentUser.preferences?.security,      ...partial.security },
    }
    setCurrentUser(u => ({ ...u, preferences: merged }))
  }

  // ── changePassword ────────────────────────────────────────────────────────
  // TODO: replace with POST /api/auth/change-password
  const changePassword = (_currentPassword, newPassword) => {
    if (!currentUser) return { ok: false, error: 'Not authenticated.' }
    if (!newPassword || newPassword.length < 8) {
      return { ok: false, error: 'New password must be at least 8 characters.' }
    }
    // Password change will be sent to the backend API when implemented
    console.warn('[changePassword] Backend API not yet implemented — password not actually changed.')
    return { ok: true }
  }

  // ── deactivateAccount ─────────────────────────────────────────────────────
  // TODO: replace with POST /api/auth/deactivate
  const deactivateAccount = async () => {
    await logout()
  }

  // ── deleteAccount ─────────────────────────────────────────────────────────
  // TODO: replace with DELETE /api/users/:id
  const deleteAccount = async () => {
    await logout()
  }

  // ── College management (still in-memory — pending Admin College API) ───────
  const addCollege = ({ name, code, domain, location }) => {
    const newCollege = {
      id: `col-${Date.now()}`,
      name:     name.trim(),
      code:     code.trim().toUpperCase(),
      domain:   domain.trim().toLowerCase(),
      location: location.trim(),
      active:   true,
    }
    const updated = [...colleges, newCollege]
    setColleges(updated)
    saveColleges(updated)
  }

  const toggleCollege = (id) => {
    const updated = colleges.map(c =>
      c.id === id ? { ...c, active: !c.active } : c
    )
    setColleges(updated)
    saveColleges(updated)
  }

  // ── Post Management (admin moderation) ──────────────────────────────────────
  // NOTE: these are local-only for now — outside FR-02/05/06/07 scope. A real
  // implementation needs backend moderation routes (e.g. DELETE /api/posts/:id,
  // PATCH /api/posts/:id/visibility) which don't exist yet. Left as local state
  // updates (matching pre-existing behavior) rather than silently no-op-ing.
  const deletePost = (id) => {
    setPosts(prev => prev.filter(p => p.id !== id))
  }

  const hidePost = (id) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, hidden: true } : p))
  }

  const showPost = (id) => {
    setPosts(prev => prev.map(p => p.id === id ? { ...p, hidden: false } : p))
  }

  // ── Report Management ─────────────────────────────────────────────────────
  const updateReportStatus = (id, status) => {
    const updated = reports.map(r => r.id === id ? { ...r, status } : r)
    setReports(updated)
    saveReports(updated)
  }

  // ── User Management (admin / faculty) ─────────────────────────────────────
  const toggleUserStatus = async (id) => {
    const res = await apiToggleUserStatus(id)
    if (res.ok) {
      setUsers(prev => prev.map(u => u.id === id ? { ...u, suspended: res.user.suspended } : u))
    } else {
      console.error('[toggleUserStatus] failed:', res.error)
      alert(res.error || 'Failed to update user status.')
    }
  }

  return (
    <SwishContext.Provider
      value={{
        // Auth
        currentUser,
        isAuthenticated,
        authLoading,
        login,
        register,
        logout,
        onVerified,
        // Profile & preferences
        updateUser,
        updatePreferences,
        changePassword,
        deactivateAccount,
        deleteAccount,
        // Domain
        domainApproved,
        // Colleges
        colleges,
        addCollege,
        toggleCollege,
        // Users
        users,
        toggleUserStatus,
        // Posts (FR-05 Likes, FR-06 Comments)
        posts,
        postsLoading,
        fetchPosts,
        createPost,
        likePost,
        unlikePost,
        fetchComments,
        addComment,
        deletePost: deletePostAction,
        deleteComment,
        hidePost,
        showPost,
        // Follow (FR-07)
        followUser,
        unfollowUser,
        fetchFollowers,
        fetchFollowing,
        // Profile (FR-02)
        fetchProfile,
        saveProfile,
        uploadProfilePhoto,
        // Reports
        reports,
        updateReportStatus,
        // Notifications
        notifications,
        setNotifications,
      }}
    >
      {children}
    </SwishContext.Provider>
  )
}

export const useSwish = () => useContext(SwishContext)
