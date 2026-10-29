import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, TrendingUp, X, UserX, Loader2, Users, Flame, ArrowRight, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSocket } from '../../context/SocketContext'
import { getStoredToken } from '../../utils/auth'
import { resolveImageUrl } from '../../utils/posts'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

function authHeaders(extra = {}) {
  const token = getStoredToken()
  const h = { ...extra }
  if (token) h['Authorization'] = `Bearer ${token}`
  return h
}

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`, { credentials: 'include', headers: authHeaders() })
  return res.json().catch(() => ({ ok: false }))
}

async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    credentials: 'include',
    body: JSON.stringify(body),
  })
  return res.json().catch(() => ({ ok: false }))
}

async function apiDelete(path) {
  const res = await fetch(`${API}${path}`, { method: 'DELETE', credentials: 'include', headers: authHeaders() })
  return res.json().catch(() => ({ ok: false }))
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ user, size = 11 }) {
  const [imgError, setImgError] = useState(false)
  const src = resolveImageUrl(user?.profilePhoto)
  const cls = `w-${size} h-${size} rounded-full flex-shrink-0`
  return src && !imgError
    ? <img src={src} alt={user.name} onError={() => setImgError(true)} className={`${cls} object-cover`} />
    : <div className={`${cls} flex items-center justify-center text-white font-bold text-sm`} style={{ backgroundColor: user.avatarColor || '#6366f1' }}>{user.initials}</div>
}

// ── Non-admin campus user filter ─────────────────────────────────────────────
function isRegularCampusUser(u) {
  const role = (u?.role || '').toLowerCase()
  const dept = (u?.dept || '').toLowerCase()
  const username = (u?.username || '').toLowerCase()
  const name = (u?.name || '').toLowerCase()
  if (['admin', 'college_admin', 'main_admin'].includes(role)) return false
  if (dept === 'administration') return false
  if (username === 'swish.admin' || username === 'admin' || username.startsWith('admin@')) return false
  if (name.includes('admin user') || name.includes('swish admin')) return false
  return true
}

// ── User Card ──────────────────────────────────────────────────────────────────
function UserCard({ user: initialUser }) {
  const [user, setUser] = useState(initialUser)
  const [loading, setLoading] = useState(false)
  const { emit } = useSocket()

  const toggle = async () => {
    if (loading) return
    setLoading(true)
    const wasFollowing = user.isFollowing
    const wasRequested = user.isRequested

    if (wasFollowing || wasRequested) {
      // Unfollow or cancel request
      const result = await apiDelete(`/api/users/${user.id}/follow`)
      if (result.ok) {
        setUser(u => ({
          ...u,
          isFollowing: false,
          isRequested: false,
          followers: typeof result.followerCount === 'number' ? result.followerCount : (wasFollowing ? Math.max(0, u.followers - 1) : u.followers),
        }))
      }
    } else {
      // Send follow or follow request
      const result = await apiPost(`/api/users/${user.id}/follow`, {})
      if (result.ok) {
        if (result.requested) {
          setUser(u => ({ ...u, isRequested: true, isFollowing: false }))
        } else {
          setUser(u => ({
            ...u,
            isFollowing: true,
            isRequested: false,
            followers: typeof result.followerCount === 'number' ? result.followerCount : u.followers + 1,
          }))
          emit('follow:notify', { targetUserId: user.id })
        }
      }
    }
    setLoading(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3"
    >
      <Link to={`/profile/${user.id}`} className="flex-shrink-0">
        <div className="hover:opacity-80 transition-opacity">
          <Avatar user={user} size={11} />
        </div>
      </Link>

      <Link to={`/profile/${user.id}`} className="flex-1 min-w-0 group">
        <p className="text-slate-900 dark:text-white text-sm font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{user.name}</p>
        <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5 truncate">
          @{user.username}
          {user.dept ? ` · ${user.dept}` : ''}
          {user.year ? ` · ${user.year}` : ''}
        </p>
        <p className="text-slate-300 dark:text-gray-600 text-xs mt-0.5">
          {user.followers ?? 0} {user.followers === 1 ? 'follower' : 'followers'}
          {user.role === 'faculty' && <span className="ml-1 capitalize text-indigo-400 dark:text-indigo-500">· {user.designation || 'Faculty'}</span>}
        </p>
      </Link>

      <button
        onClick={toggle}
        disabled={loading}
        className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex-shrink-0 disabled:opacity-60 flex items-center gap-1 ${
          user.isFollowing
            ? 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400'
            : user.isRequested
            ? 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border border-slate-300 dark:border-gray-700 hover:bg-rose-50 hover:text-rose-600'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        {loading ? (
          '…'
        ) : user.isFollowing ? (
          'Following'
        ) : user.isRequested ? (
          <>
            <Clock size={12} />
            <span>Requested</span>
          </>
        ) : (
          'Follow'
        )}
      </button>
    </motion.div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function ExplorePage() {

  const [query,       setQuery]       = useState('')
  const [activeTab,   setActiveTab]   = useState('people')
  const [allUsers,    setAllUsers]    = useState([])
  const [searchUsers, setSearchUsers] = useState([])
  const [loadingAll,  setLoadingAll]  = useState(true)
  const [loadingSearch, setLoadingSearch] = useState(false)

  // Load all users on mount (strictly non-admin campus users)
  useEffect(() => {
    apiFetch('/api/users/all').then(data => {
      if (data.ok && Array.isArray(data.users)) {
        setAllUsers(data.users.filter(isRegularCampusUser))
      }
      setLoadingAll(false)
    })
  }, [])

  // Debounced search (strictly non-admin campus users)
  useEffect(() => {
    if (!query.trim()) { setSearchUsers([]); return }
    const t = setTimeout(async () => {
      setLoadingSearch(true)
      const data = await apiFetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      if (data.ok && Array.isArray(data.users)) {
        setSearchUsers(data.users.filter(isRegularCampusUser))
      }
      setLoadingSearch(false)
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  const displayUsers = query.trim() ? searchUsers : allUsers
  const isSearching  = query.trim() && loadingSearch

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-5">

      {/* Search bar */}
      <div className="relative">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
        <input
          id="explore-search"
          type="text"
          placeholder="Search students, faculty, name, department…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-2xl pl-11 pr-10 py-3 text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all shadow-sm"
          aria-label="Search Swish"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all"
            >
              <X size={14} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-gray-800/60 p-1 rounded-xl">
        {['people', 'posts'].map(tab => (
          <button key={tab} onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg capitalize transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'
            }`}>
            {tab}
          </button>
        ))}
      </div>

      {/* ── People tab ── */}
      {activeTab === 'people' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users size={15} className="text-indigo-500" />
              <h2 className="text-slate-900 dark:text-white font-semibold text-sm">
                {query.trim() ? `Results for "${query}"` : 'Everyone on Swish'}
              </h2>
            </div>
            {!loadingAll && !query && (
              <span className="text-xs text-slate-400 dark:text-gray-500">{allUsers.length} people</span>
            )}
          </div>

          {(loadingAll && !query) || isSearching ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 size={24} className="animate-spin text-indigo-400" />
            </div>
          ) : displayUsers.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl">
              <UserX size={32} className="text-slate-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-slate-900 dark:text-white font-semibold text-sm">
                {query ? `No results for "${query}"` : 'No users yet'}
              </p>
              <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">
                {query ? 'Try a different name or department' : 'Be the first to join!'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {displayUsers.map(u => <UserCard key={u.id} user={u} />)}
            </div>
          )}
        </div>
      )}

      {/* ── Posts tab ── */}
      {activeTab === 'posts' && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={15} className="text-indigo-500" />
            <h2 className="text-slate-900 dark:text-white font-semibold text-sm">Trending Posts & Media</h2>
          </div>
          <div className="text-center py-10 px-6 bg-gradient-to-b from-indigo-50/50 to-white dark:from-gray-900 dark:to-gray-950 border border-indigo-100 dark:border-gray-800 rounded-3xl space-y-4 shadow-sm">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white mx-auto shadow-lg shadow-rose-500/25">
              <Flame size={28} className="fill-white" />
            </div>
            <div className="space-y-1 max-w-sm mx-auto">
              <h3 className="text-slate-900 dark:text-white font-bold text-base">Campus Trending Hub</h3>
              <p className="text-slate-500 dark:text-gray-400 text-xs leading-relaxed">
                Explore an Instagram-style tile grid of viral campus moments, trending hashtags, and suggested accounts.
              </p>
            </div>
            <div>
              <Link
                to="/trending"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs sm:text-sm font-bold shadow-md shadow-indigo-500/25 transition-all active:scale-95"
              >
                <span>Go to Trending</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
