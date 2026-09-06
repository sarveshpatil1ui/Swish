import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Search, TrendingUp, X, UserX, Loader2, Users } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSwish } from '../../context/SwishContext'
import { useSocket } from '../../context/SocketContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function apiFetch(path) {
  const res = await fetch(`${API}${path}`, { credentials: 'include' })
  return res.json().catch(() => ({ ok: false }))
}

async function apiPost(path, body) {
  const res = await fetch(`${API}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(body),
  })
  return res.json().catch(() => ({ ok: false }))
}

async function apiDelete(path) {
  const res = await fetch(`${API}${path}`, { method: 'DELETE', credentials: 'include' })
  return res.json().catch(() => ({ ok: false }))
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ user, size = 11 }) {
  const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'
  const src = user.profilePhoto
    ? (user.profilePhoto.startsWith('blob:') ? user.profilePhoto : `${API_BASE}${user.profilePhoto}`)
    : null
  const cls = `w-${size} h-${size} rounded-full flex-shrink-0`
  return src
    ? <img src={src} alt={user.name} className={`${cls} object-cover`} />
    : <div className={`${cls} flex items-center justify-center text-white font-bold text-sm`} style={{ backgroundColor: user.avatarColor || '#6366f1' }}>{user.initials}</div>
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
    // Optimistic update
    setUser(u => ({ ...u, isFollowing: !wasFollowing, followers: wasFollowing ? u.followers - 1 : u.followers + 1 }))
    const result = wasFollowing
      ? await apiDelete(`/api/users/${user.id}/follow`)
      : await apiPost(`/api/users/${user.id}/follow`, {})
    if (result.ok) {
      // Emit real-time follow notification to the target user if they're online
      if (!wasFollowing) emit('follow:notify', { targetUserId: user.id })
    } else {
      // Rollback on failure
      setUser(u => ({ ...u, isFollowing: wasFollowing, followers: wasFollowing ? u.followers + 1 : u.followers - 1 }))
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
          {user.role !== 'student' && <span className="ml-1 capitalize text-indigo-400 dark:text-indigo-500">· {user.role}</span>}
        </p>
      </Link>

      <button
        onClick={toggle}
        disabled={loading}
        className={`text-xs font-semibold px-3 py-1.5 rounded-xl transition-all flex-shrink-0 disabled:opacity-60 ${
          user.isFollowing
            ? 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        {loading ? '…' : user.isFollowing ? 'Following' : 'Follow'}
      </button>
    </motion.div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────────
export default function ExplorePage() {
  const { currentUser } = useSwish()
  const navigate = useNavigate()

  const [query,       setQuery]       = useState('')
  const [activeTab,   setActiveTab]   = useState('people')
  const [allUsers,    setAllUsers]    = useState([])
  const [searchUsers, setSearchUsers] = useState([])
  const [loadingAll,  setLoadingAll]  = useState(true)
  const [loadingSearch, setLoadingSearch] = useState(false)

  // Load all users on mount
  useEffect(() => {
    apiFetch('/api/users/all').then(data => {
      if (data.ok) setAllUsers(data.users)
      setLoadingAll(false)
    })
  }, [])

  // Debounced search
  useEffect(() => {
    if (!query.trim()) { setSearchUsers([]); return }
    const t = setTimeout(async () => {
      setLoadingSearch(true)
      const data = await apiFetch(`/api/users/search?q=${encodeURIComponent(query)}`)
      if (data.ok) setSearchUsers(data.users)
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
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-indigo-500" />
            <h2 className="text-slate-900 dark:text-white font-semibold text-sm">Trending Posts</h2>
          </div>
          <div className="text-center py-12 px-4 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-2xl">
            <p className="text-slate-900 dark:text-white font-semibold text-sm">Coming soon</p>
            <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">Trending posts will appear here.</p>
          </div>
        </div>
      )}
    </div>
  )
}
