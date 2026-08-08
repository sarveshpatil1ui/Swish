import { createContext, useContext, useState } from 'react'

const AuthContext = createContext(null)

// ── Hardcoded test users ─────────────────────────────────────────────────────
// Remove / replace with real JWT backend calls later.
const HARDCODED_USERS = [
  {
    email: 'rahul@campus.edu',
    password: 'swish123',
    id: 'user-1',
    name: 'Rahul Sharma',
    username: 'rahul.sharma',
    initials: 'RS',
    avatarColor: '#6366f1',
    dept: 'Information Technology',
    year: '3rd Year',
    bio: 'Full Stack Developer 🚀 | Hackathon enthusiast | Building Swish',
    role: 'student',
    followers: 243,
    following: 118,
    posts: 12,
    campus: 'KJSCE Mumbai',
  },
  {
    email: 'admin@campus.edu',
    password: 'admin123',
    id: 'admin-1',
    name: 'Admin User',
    username: 'campus.admin',
    initials: 'AU',
    avatarColor: '#ef4444',
    dept: 'Administration',
    year: 'Admin',
    bio: 'Campus Swish Administrator',
    role: 'admin',
    followers: 0,
    following: 0,
    posts: 0,
    campus: 'KJSCE Mumbai',
  },
]

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loginError, setLoginError] = useState('')

  /**
   * Validates credentials against hardcoded list.
   * Returns { success, user, error }
   * 
   * TODO: Replace with:
   *   const res = await fetch('/api/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
   *   const data = await res.json()
   *   if (data.token) localStorage.setItem('token', data.token)
   */
  const login = (email, password) => {
    setLoginError('')
    const found = HARDCODED_USERS.find(
      u => u.email === email.trim().toLowerCase() && u.password === password
    )
    if (found) {
      const { password: _, ...safeUser } = found // don't store password in state
      setUser(safeUser)
      setIsAuthenticated(true)
      return { success: true }
    } else {
      const msg = 'Invalid email or password.'
      setLoginError(msg)
      return { success: false, error: msg }
    }
  }

  const logout = () => {
    setUser(null)
    setIsAuthenticated(false)
    setLoginError('')
  }

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loginError, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
