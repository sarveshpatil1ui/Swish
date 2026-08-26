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
  apiLogin, apiRegister, apiLogout, apiMe,
  apiGetUsers, apiToggleUserStatus,
  apiGetColleges, apiAddCollege, apiToggleCollege,
  loadPosts, savePosts,
  loadReports, saveReports,
  loadNotifications, saveNotifications,
  redirectPathForRole,
} from '../utils/auth'

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

  // ── Colleges (fetched from MongoDB via API) ────────────────────────────────
  const [colleges, setColleges] = useState([])

  // ── Posts ──────────────────────────────────────────────────────────────────
  const [posts, setPosts] = useState(() => {
    // Force clear any old mockData stuck in localStorage
    savePosts([])
    return []
  })

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

  // ── Fetch colleges from API on mount ──────────────────────────────────────
  const fetchColleges = async () => {
    try {
      const res = await apiGetColleges()
      if (res.ok) setColleges(res.colleges)
    } catch (err) {
      console.error('[fetchColleges] Failed:', err)
    }
  }

  useEffect(() => {
    fetchColleges()
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
  // Uses the fetched colleges array for instant UI feedback.
  // The backend also enforces domain validation during registration.
  const domainApproved = (email) => {
    if (!email || !email.includes('@')) return false
    const domain = email.trim().toLowerCase().split('@')[1]
    if (email.trim().toLowerCase() === 'admin@swish.com') return true
    return colleges.some(c => c.active && c.domain === domain)
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

  // ── College management (MongoDB-backed via API) ────────────────────────────
  const addCollege = async ({ name, code, domain, location }) => {
    const res = await apiAddCollege({ name, code, domain, location })
    if (res.ok) {
      await fetchColleges() // refresh from DB
    } else {
      console.error('[addCollege] failed:', res.error)
      alert(res.error || 'Failed to add college.')
    }
  }

  const toggleCollege = async (id) => {
    const res = await apiToggleCollege(id)
    if (res.ok) {
      await fetchColleges() // refresh from DB
    } else {
      console.error('[toggleCollege] failed:', res.error)
      alert(res.error || 'Failed to toggle college status.')
    }
  }

  // ── Post Management ───────────────────────────────────────────────────────
  const deletePost = (id) => {
    const updated = posts.filter(p => p.id !== id)
    setPosts(updated)
    savePosts(updated)
  }

  const hidePost = (id) => {
    const updated = posts.map(p => p.id === id ? { ...p, hidden: true } : p)
    setPosts(updated)
    savePosts(updated)
  }

  const showPost = (id) => {
    const updated = posts.map(p => p.id === id ? { ...p, hidden: false } : p)
    setPosts(updated)
    savePosts(updated)
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
        // Posts
        posts,
        deletePost,
        hidePost,
        showPost,
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
