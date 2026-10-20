import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { X, Search, Loader2, Heart } from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { apiFetch } from '../../utils/auth'

export default function PostLikesModal({ postId, onClose }) {
  const { followUser, unfollowUser, currentUser } = useSwish()
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [followLoadingIds, setFollowLoadingIds] = useState(new Set())

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')

    apiFetch(`/api/posts/${postId}/likes`).then(res => {
      if (cancelled) return
      if (res.ok && Array.isArray(res.users)) {
        setUsers(res.users)
      } else {
        setError(res.error || 'Failed to load likes.')
      }
      setLoading(false)
    }).catch(() => {
      if (!cancelled) {
        setError('Failed to load likes.')
        setLoading(false)
      }
    })

    return () => { cancelled = true }
  }, [postId])

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
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[60] backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col" style={{ maxHeight: '70vh' }}>
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-800">
            <div className="flex items-center gap-2">
              <Heart size={18} className="text-rose-500 fill-rose-500" />
              <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-bold text-lg">
                Likes
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-700 dark:hover:text-gray-300 transition-all"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Search */}
          {!loading && users.length > 5 && (
            <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-800">
              <div className="relative">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
                />
              </div>
            </div>
          )}

          {/* Body */}
          <div className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-gray-800">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 dark:text-gray-500">
                <Loader2 size={24} className="animate-spin text-indigo-500" />
                <p className="text-xs">Loading likes...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12 px-4">
                <p className="text-rose-500 text-sm mb-2">{error}</p>
                <button onClick={onClose} className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-gray-300">Close</button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Heart size={32} className="mx-auto text-slate-300 dark:text-gray-600 mb-2 stroke-1" />
                <p className="text-sm font-medium text-slate-700 dark:text-gray-300">
                  {query ? 'No matching users' : 'No likes yet'}
                </p>
                <p className="text-xs text-slate-400 dark:text-gray-500 mt-1">
                  {query ? 'Try a different search term.' : 'Be the first to like this post.'}
                </p>
              </div>
            ) : (
              filtered.map(user => {
                const isMe = currentUser?.id === user.id
                return (
                  <div key={user.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 dark:hover:bg-gray-800/50 transition-colors">
                    <Link
                      to={`/profile/${user.id}`}
                      onClick={onClose}
                      className="flex items-center gap-3 min-w-0 flex-1 mr-3 group"
                    >
                      {user.profilePhoto ? (
                        <img
                          src={user.profilePhoto}
                          alt={user.name}
                          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                        />
                      ) : (
                        <div
                          className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                          style={{ backgroundColor: user.avatarColor || '#6366f1' }}
                        >
                          {user.initials || '??'}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-slate-900 dark:text-white truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {user.name}
                        </p>
                        <p className="text-xs text-slate-400 dark:text-gray-500 truncate">
                          @{user.username || user.name.toLowerCase().replace(/\s+/g, '')}
                        </p>
                      </div>
                    </Link>

                    {!isMe && (
                      <button
                        onClick={() => handleFollowToggle(user)}
                        disabled={followLoadingIds.has(user.id)}
                        className={`px-4 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center flex-shrink-0 min-w-[84px] disabled:opacity-60 ${
                          user.isFollowing
                            ? 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/40 dark:hover:text-rose-400'
                            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm'
                        }`}
                      >
                        {followLoadingIds.has(user.id) ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : user.isFollowing ? (
                          'Following'
                        ) : (
                          'Follow'
                        )}
                      </button>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </div>
      </motion.div>
    </>
  )
}
