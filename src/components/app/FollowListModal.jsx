import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, Search, Loader2, Users } from 'lucide-react'
import { useSwish } from '../../context/SwishContext'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function FollowListModal({ userId, mode = 'followers', onClose }) {
  const { fetchFollowers, fetchFollowing, followUser, unfollowUser, currentUser } = useSwish()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [followLoadingIds, setFollowLoadingIds] = useState(new Set())

  const title = mode === 'followers' ? 'Followers' : 'Following'

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    const fetcher = mode === 'followers' ? fetchFollowers : fetchFollowing
    fetcher(userId).then(res => {
      if (cancelled) return
      if (res.ok) {
        setUsers(res.users)
      } else {
        setError(res.error || `Failed to load ${title.toLowerCase()}.`)
      }
      setLoading(false)
    })

    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, mode])

  const handleFollowToggle = async (user) => {
    if (followLoadingIds.has(user.id)) return
    setFollowLoadingIds(prev => new Set(prev).add(user.id))

    const result = user.isFollowing
      ? await unfollowUser(user.id)
      : await followUser(user.id)

    setFollowLoadingIds(prev => {
      const next = new Set(prev)
      next.delete(user.id)
      return next
    })

    if (result.ok) {
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, isFollowing: !u.isFollowing } : u))
    }
  }

  const filtered = query.trim()
    ? users.filter(u =>
        u.name.toLowerCase().includes(query.toLowerCase()) ||
        u.username.toLowerCase().includes(query.toLowerCase())
      )
    : users

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[55] backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[55] flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-800">
            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-bold text-lg">
              {title}
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-700 dark:hover:text-gray-300 transition-all"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search */}
          {!loading && users.length > 0 && (
            <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-800">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search…"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 transition-all"
                />
              </div>
            </div>
          )}

          {/* List */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 size={22} className="animate-spin text-slate-300 dark:text-gray-600" />
              </div>
            ) : error ? (
              <div className="text-center py-12 px-4">
                <p className="text-rose-500 text-sm">{error}</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-12 px-4">
                <Users size={28} className="text-slate-200 dark:text-gray-700 mx-auto mb-3" />
                <p className="text-slate-500 dark:text-gray-400 text-sm font-medium">
                  {query ? `No results for "${query}"` : mode === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
                </p>
              </div>
            ) : (
              <div className="py-2">
                {filtered.map(user => {
                  const avatarSrc = user.profilePhoto
                    ? (user.profilePhoto.startsWith('/uploads/') ? `${API_BASE}${user.profilePhoto}` : user.profilePhoto)
                    : null

                  return (
                    <div key={user.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors">
                      <Link to={`/profile/${user.id}`} onClick={onClose} className="flex-shrink-0">
                        {avatarSrc ? (
                          <img src={avatarSrc} alt="" className="w-11 h-11 rounded-full object-cover" />
                        ) : (
                          <div
                            className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold"
                            style={{ backgroundColor: user.avatarColor }}
                          >
                            {user.initials}
                          </div>
                        )}
                      </Link>
                      <Link to={`/profile/${user.id}`} onClick={onClose} className="flex-1 min-w-0">
                        <p className="text-slate-900 dark:text-white text-sm font-semibold truncate">{user.name}</p>
                        <p className="text-slate-400 dark:text-gray-500 text-xs truncate">@{user.username}</p>
                      </Link>
                      {!user.isSelf && (
                        <button
                          onClick={() => handleFollowToggle(user)}
                          disabled={followLoadingIds.has(user.id)}
                          className={`text-xs font-semibold px-4 py-2 rounded-xl transition-all flex-shrink-0 disabled:opacity-60 ${
                            user.isFollowing
                              ? 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400'
                              : 'bg-indigo-600 text-white hover:bg-indigo-700'
                          }`}
                        >
                          {user.isFollowing ? 'Following' : 'Follow'}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}
