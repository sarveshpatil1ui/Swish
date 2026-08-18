// ─────────────────────────────────────────────────────────────────────────────
// SwishContext.jsx  —  Swish unified state layer
//
// ⚠️  SECURITY NOTICE — READ BEFORE PRODUCTION:
//   This is a MOCK / DEMO auth system. Passwords are in plain text in
//   localStorage. No real server, no JWT, no secure cookie.
//
//   Replacement points are marked: // TODO: replace with real API call
//
// What this context provides:
//   Auth         → login(), register(), logout(), currentUser, isAuthenticated
//   Profile      → updateUser()
//   Preferences  → updatePreferences()
//   Password     → changePassword()
//   Account mgmt → deactivateAccount(), deleteAccount()
//   Domain       → domainApproved(email)
//   Colleges     → colleges, addCollege(), toggleCollege()
//   Users        → users (demo + registered combined)
//   Posts        → posts (from mockData — static for now)
// ─────────────────────────────────────────────────────────────────────────────

import { createContext, useContext, useState } from 'react'
import { posts as mockPosts, adminReports, notifications as mockNotifications } from '../data/mockData'
import {
  loadUsers, saveUsers,
  loadColleges, saveColleges,
  loadCurrentUser, saveCurrentUser, clearCurrentUser,
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

// ── Seed colleges (demo data) ─────────────────────────────────────────────────
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

// ── Demo / pre-seeded accounts ────────────────────────────────────────────────
const DEMO_ACCOUNTS = [
  {
    id: 'user-1',
    name: 'Rahul Sharma',
    username: 'rahul.sharma',
    initials: 'RS',
    avatarColor: '#6366f1',
    email: 'rahul@campus.edu',
    password: 'swish123',
    role: 'student',
    college: 'KJSCE Mumbai',
    dept: 'Information Technology',
    year: '3rd Year',
    studentId: 'IT2024001',
    bio: 'Full Stack Developer 🚀 | Hackathon enthusiast | Building Swish',
    followers: 243,
    following: 118,
    posts: 12,
    preferences: DEFAULT_PREFERENCES,
  },
  {
    id: 'demo-student',
    name: 'Demo Student',
    username: 'demo.student',
    initials: 'DS',
    avatarColor: '#6366f1',
    email: 'student@campus.edu',
    password: 'student123',
    role: 'student',
    college: 'KJSCE Mumbai',
    dept: 'Computer Science',
    year: '2nd Year',
    studentId: 'CS2024099',
    bio: 'Campus explorer 🎓',
    followers: 0,
    following: 0,
    posts: 0,
    preferences: DEFAULT_PREFERENCES,
  },
  {
    id: 'demo-faculty',
    name: 'Demo Faculty',
    username: 'demo.faculty',
    initials: 'DF',
    avatarColor: '#10b981',
    email: 'faculty@campus.edu',
    password: 'faculty123',
    role: 'faculty',
    college: 'KJSCE Mumbai',
    dept: 'Computer Science',
    designation: 'Assistant Professor',
    employeeId: 'EMP2024001',
    bio: 'Educator & researcher 📚',
    followers: 0,
    following: 0,
    posts: 0,
    preferences: DEFAULT_PREFERENCES,
  },
  {
    id: 'admin-1',
    name: 'Admin User',
    username: 'swish.admin',
    initials: 'AU',
    avatarColor: '#ef4444',
    email: 'admin@swish.com',
    password: 'admin123',
    role: 'admin',
    college: '',
    dept: 'Administration',
    bio: 'Swish Platform Administrator',
    followers: 0,
    following: 0,
    posts: 0,
    preferences: DEFAULT_PREFERENCES,
  },
]

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Recompute initials from a name string.
 */
function computeInitials(name) {
  return name.trim()
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

/**
 * Deep-merge preferences, ensuring all default keys exist even for old stored
 * users that predate the preferences field.
 */
function mergePrefs(stored) {
  return {
    notifications: { ...DEFAULT_PREFERENCES.notifications, ...stored?.notifications },
    privacy: { ...DEFAULT_PREFERENCES.privacy, ...stored?.privacy },
    security: { ...DEFAULT_PREFERENCES.security, ...stored?.security },
  }
}

// ── Provider ──────────────────────────────────────────────────────────────────
export function SwishProvider({ children }) {

  // ── Colleges ───────────────────────────────────────────────────────────────
  const [colleges, setColleges] = useState(() => {
    const saved = loadColleges()
    return saved ?? SEED_COLLEGES
  })

  // ── Users (demo accounts always present; registered users from localStorage)
  const [registeredUsers, setRegisteredUsers] = useState(() => loadUsers())
  const users = [...DEMO_ACCOUNTS, ...registeredUsers]

  // ── Auth session ───────────────────────────────────────────────────────────
  const [currentUser, setCurrentUser] = useState(() => {
    const stored = loadCurrentUser()
    if (!stored) return null
    // Ensure preferences always exist (handles old stored sessions)
    return { ...stored, preferences: mergePrefs(stored.preferences) }
  })
  const [isAuthenticated, setIsAuthenticated] = useState(() => loadCurrentUser() !== null)

  // ── Posts ──────────────────────────────────────────────────────────────────
  const [posts, setPosts] = useState(() => {
    const saved = loadPosts()
    return saved ?? mockPosts
  })

  // ── Reports ────────────────────────────────────────────────────────────────
  const [reports, setReports] = useState(() => {
    const saved = loadReports()
    return saved ?? adminReports
  })

  // ── Notifications ──────────────────────────────────────────────────────────
  const [notifications, setNotifications] = useState(() => {
    const saved = loadNotifications()
    return saved ?? mockNotifications
  })

  // ── Internal: find the full user record (with password) ───────────────────
  const _findFullUser = (id) => {
    return users.find(u => u.id === id) ?? null
  }

  // ── Internal: write updated user back to registeredUsers or DEMO_ACCOUNTS ─
  // Returns the new registeredUsers array (may be unchanged if demo account).
  const _persistUserUpdate = (updatedUser) => {
    const isDemoAccount = DEMO_ACCOUNTS.some(d => d.id === updatedUser.id)
    if (isDemoAccount) {
      // Demo accounts live in-memory only; updates don't go to localStorage users array
      // but ARE saved to currentUser session + swish_users if they'd been "registered" before
      return registeredUsers
    }
    const newList = registeredUsers.map(u =>
      u.id === updatedUser.id ? updatedUser : u
    )
    saveUsers(newList)
    return newList
  }

  // ── domainApproved ────────────────────────────────────────────────────────
  const domainApproved = (email) => {
    if (!email || !email.includes('@')) return false
    const domain = email.trim().toLowerCase().split('@')[1]
    if (email.trim().toLowerCase() === 'admin@swish.com') return true
    return colleges.some(c => c.active && c.domain === domain)
  }

  // ── login ─────────────────────────────────────────────────────────────────
  const login = (email, password) => {
    const normalizedEmail = email.trim().toLowerCase()
    // Check if user is deactivated
    const allUsers = [...DEMO_ACCOUNTS, ...registeredUsers]
    const found = allUsers.find(
      u => u.email === normalizedEmail && u.password === password
    )
    if (!found) return { ok: false, error: 'Invalid email or password.' }
    if (found.deactivated) return { ok: false, error: 'This account has been deactivated.' }

    const { password: _pw, ...safeUser } = found
    const userWithPrefs = { ...safeUser, preferences: mergePrefs(safeUser.preferences) }
    setCurrentUser(userWithPrefs)
    setIsAuthenticated(true)
    saveCurrentUser(userWithPrefs)
    return { ok: true, role: userWithPrefs.role, redirectTo: redirectPathForRole(userWithPrefs.role) }
  }

  // ── register ──────────────────────────────────────────────────────────────
  const register = (userData) => {
    const normalizedEmail = userData.email.trim().toLowerCase()
    if (!domainApproved(normalizedEmail)) {
      return { ok: false, error: 'This email domain is not registered with Swish.' }
    }
    const allUsers = [...DEMO_ACCOUNTS, ...registeredUsers]
    const duplicate = allUsers.find(u => u.email === normalizedEmail)
    if (duplicate) {
      return { ok: false, error: 'An account with this email already exists.' }
    }
    const emailDomain = normalizedEmail.split('@')[1]
    const matchCollege = colleges.find(c => c.active && c.domain === emailDomain)
    const collegeName = matchCollege?.name ?? ''

    const newUser = {
      id: `user-${Date.now()}`,
      name: userData.name.trim(),
      username: userData.name.trim().toLowerCase().replace(/\s+/g, '.'),
      initials: computeInitials(userData.name),
      avatarColor: userData.role === 'faculty' ? '#10b981' : '#6366f1',
      email: normalizedEmail,
      password: userData.password,
      role: userData.role,
      college: collegeName,
      dept: userData.dept,
      bio: '',
      followers: 0,
      following: 0,
      posts: 0,
      preferences: DEFAULT_PREFERENCES,
      ...(userData.role === 'student' && { year: userData.year, studentId: userData.studentId }),
      ...(userData.role === 'faculty' && { designation: userData.designation, employeeId: userData.employeeId }),
    }

    const updated = [...registeredUsers, newUser]
    setRegisteredUsers(updated)
    saveUsers(updated)

    const { password: _pw, ...safeUser } = newUser
    setCurrentUser(safeUser)
    setIsAuthenticated(true)
    saveCurrentUser(safeUser)
    return { ok: true, redirectTo: redirectPathForRole(safeUser.role) }
  }

  // ── logout ────────────────────────────────────────────────────────────────
  const logout = () => {
    setCurrentUser(null)
    setIsAuthenticated(false)
    clearCurrentUser()
  }

  // ── updateUser ────────────────────────────────────────────────────────────
  /**
   * Updates mutable profile fields: name, username, bio.
   * Email and role are intentionally NOT changeable here.
   * Returns { ok: true } always (frontend-only, no conflicts to check).
   *
   * TODO: replace with PATCH /api/users/:id
   */
  const updateUser = ({ name, username, bio }) => {
    if (!currentUser) return { ok: false, error: 'Not authenticated.' }

    const newInitials = computeInitials(name || currentUser.name)
    const updatedUser = {
      ...currentUser,
      name: (name ?? currentUser.name).trim(),
      username: (username ?? currentUser.username).trim(),
      bio: (bio ?? currentUser.bio ?? '').trim(),
      initials: newInitials,
    }

    // Persist session
    setCurrentUser(updatedUser)
    saveCurrentUser(updatedUser)

    // Update inside registeredUsers list if applicable
    const newList = _persistUserUpdate(updatedUser)
    if (newList !== registeredUsers) setRegisteredUsers(newList)

    // Also update the DEMO_ACCOUNTS in-memory reference if needed
    // (only affects the current session — next cold-start re-uses constants)
    const demoIdx = DEMO_ACCOUNTS.findIndex(d => d.id === updatedUser.id)
    if (demoIdx !== -1) Object.assign(DEMO_ACCOUNTS[demoIdx], updatedUser)

    return { ok: true }
  }

  // ── updatePreferences ─────────────────────────────────────────────────────
  /**
   * Deep-merges a partial preferences object into currentUser.preferences.
   *
   * Example calls:
   *   updatePreferences({ notifications: { likes: false } })
   *   updatePreferences({ privacy: { private: true } })
   *   updatePreferences({ security: { twoFactor: true } })
   *
   * TODO: replace with PATCH /api/users/:id/preferences
   */
  const updatePreferences = (partial) => {
    if (!currentUser) return
    const merged = {
      notifications: { ...currentUser.preferences?.notifications, ...partial.notifications },
      privacy: { ...currentUser.preferences?.privacy, ...partial.privacy },
      security: { ...currentUser.preferences?.security, ...partial.security },
    }
    const updatedUser = { ...currentUser, preferences: merged }
    setCurrentUser(updatedUser)
    saveCurrentUser(updatedUser)

    const newList = _persistUserUpdate(updatedUser)
    if (newList !== registeredUsers) setRegisteredUsers(newList)

    const demoIdx = DEMO_ACCOUNTS.findIndex(d => d.id === updatedUser.id)
    if (demoIdx !== -1) Object.assign(DEMO_ACCOUNTS[demoIdx], updatedUser)
  }

  // ── changePassword ────────────────────────────────────────────────────────
  /**
   * Validates currentPassword, then updates to newPassword.
   * Returns { ok: true } or { ok: false, error }.
   *
   * ⚠️  DEMO ONLY — passwords stored plain-text in localStorage.
   * TODO: replace with POST /api/auth/change-password
   */
  const changePassword = (currentPassword, newPassword) => {
    if (!currentUser) return { ok: false, error: 'Not authenticated.' }

    // Find the full record (with password)
    const allUsers = [...DEMO_ACCOUNTS, ...registeredUsers]
    const fullUser = allUsers.find(u => u.id === currentUser.id)
    if (!fullUser) return { ok: false, error: 'User not found.' }
    if (fullUser.password !== currentPassword) {
      return { ok: false, error: 'Current password is incorrect.' }
    }
    if (!newPassword || newPassword.length < 8) {
      return { ok: false, error: 'New password must be at least 8 characters.' }
    }

    // Update in registeredUsers list
    const isDemoAccount = DEMO_ACCOUNTS.some(d => d.id === currentUser.id)
    if (isDemoAccount) {
      // Update the in-memory demo account
      const demoIdx = DEMO_ACCOUNTS.findIndex(d => d.id === currentUser.id)
      if (demoIdx !== -1) DEMO_ACCOUNTS[demoIdx].password = newPassword
    } else {
      const newList = registeredUsers.map(u =>
        u.id === currentUser.id ? { ...u, password: newPassword } : u
      )
      setRegisteredUsers(newList)
      saveUsers(newList)
    }

    return { ok: true }
  }

  // ── deactivateAccount ─────────────────────────────────────────────────────
  /**
   * Marks the current user as deactivated and logs them out.
   * A deactivated user cannot log back in (checked in login()).
   *
   * TODO: replace with POST /api/auth/deactivate
   */
  const deactivateAccount = () => {
    if (!currentUser) return
    const isDemoAccount = DEMO_ACCOUNTS.some(d => d.id === currentUser.id)
    if (!isDemoAccount) {
      const newList = registeredUsers.map(u =>
        u.id === currentUser.id ? { ...u, deactivated: true } : u
      )
      setRegisteredUsers(newList)
      saveUsers(newList)
    } else {
      const demoIdx = DEMO_ACCOUNTS.findIndex(d => d.id === currentUser.id)
      if (demoIdx !== -1) DEMO_ACCOUNTS[demoIdx].deactivated = true
    }
    logout()
  }

  // ── deleteAccount ─────────────────────────────────────────────────────────
  /**
   * Permanently removes the user record and logs them out.
   * Colleges and other users are NOT deleted.
   *
   * TODO: replace with DELETE /api/users/:id
   */
  const deleteAccount = () => {
    if (!currentUser) return
    const newList = registeredUsers.filter(u => u.id !== currentUser.id)
    setRegisteredUsers(newList)
    saveUsers(newList)
    // Demo accounts can't truly be deleted from constants, but we log out
    logout()
  }

  // ── addCollege ────────────────────────────────────────────────────────────
  const addCollege = ({ name, code, domain, location }) => {
    const newCollege = {
      id: `col-${Date.now()}`,
      name: name.trim(),
      code: code.trim().toUpperCase(),
      domain: domain.trim().toLowerCase(),
      location: location.trim(),
      active: true,
    }
    const updated = [...colleges, newCollege]
    setColleges(updated)
    saveColleges(updated)
  }

  // ── toggleCollege ─────────────────────────────────────────────────────────
  const toggleCollege = (id) => {
    const updated = colleges.map(c =>
      c.id === id ? { ...c, active: !c.active } : c
    )
    setColleges(updated)
    saveColleges(updated)
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

  // ── User Management ───────────────────────────────────────────────────────
  const toggleUserStatus = (id) => {
    const isDemoAccount = DEMO_ACCOUNTS.some(d => d.id === id)
    if (isDemoAccount) {
      const demoIdx = DEMO_ACCOUNTS.findIndex(d => d.id === id)
      if (demoIdx !== -1) {
        DEMO_ACCOUNTS[demoIdx].suspended = !DEMO_ACCOUNTS[demoIdx].suspended
      }
      setRegisteredUsers([...registeredUsers]) // force re-render
    } else {
      const updatedUsers = registeredUsers.map(u =>
        u.id === id ? { ...u, suspended: !u.suspended } : u
      )
      setRegisteredUsers(updatedUsers)
      saveUsers(updatedUsers)
    }
  }

  return (
    <SwishContext.Provider
      value={{
        // Auth
        currentUser,
        isAuthenticated,
        login,
        register,
        logout,
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
        setNotifications, // for mark all read, etc.
      }}
    >
      {children}
    </SwishContext.Provider>
  )
}

export const useSwish = () => useContext(SwishContext)
