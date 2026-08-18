import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Search, Hash, TrendingUp, X, UserX } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'


function UserCard({ user }) {
  const [followed, setFollowed] = useState(false)
  return (
    <motion.div
      whileHover={{ y: -2 }}
      className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-3"
    >
      <Link to={`/profile/${user.id}`}>
        <div className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 hover:opacity-80 transition-opacity" style={{ backgroundColor: user.avatarColor }}>
          {user.initials}
        </div>
      </Link>
      <Link to={`/profile/${user.id}`} className="flex-1 min-w-0 group">
        <p className="text-slate-900 dark:text-white text-sm font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">{user.name}</p>
        <p className="text-slate-400 dark:text-gray-500 text-xs">{user.dept} · {user.year}</p>
        <p className="text-slate-300 dark:text-gray-600 text-xs mt-0.5">{user.followers} followers</p>
      </Link>
      <button
        onClick={() => setFollowed(f => !f)}
        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all flex-shrink-0 ${
          followed
            ? 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 dark:hover:text-rose-400'
            : 'bg-indigo-600 text-white hover:bg-indigo-700'
        }`}
      >
        {followed ? 'Following' : 'Follow'}
      </button>
    </motion.div>
  )
}

function ExploreGridItem({ item }) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)

  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.18 }}
      className="relative rounded-2xl overflow-hidden cursor-pointer aspect-square group bg-slate-100 dark:bg-gray-800"
    >
      {/* Background Image / Fallback */}
      {item.imageUrl && !error ? (
        <>
          <img
            src={item.imageUrl}
            alt=""
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0'}`}
          />
          {!loaded && <div className="absolute inset-0 bg-slate-200 dark:bg-gray-800 animate-pulse" />}
        </>
      ) : (
        <div 
          className="absolute inset-0 flex flex-col items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${item.gradientFromDark || item.gradientFrom}, ${item.gradientToDark || item.gradientTo})` }}
        >
          <span className="text-5xl">{item.emoji}</span>
        </div>
      )}

      {/* Hover Overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-all flex items-end p-3">
        <div className="w-full translate-y-2 group-hover:translate-y-0 transition-transform">
          <p className="text-white text-xs font-semibold leading-tight line-clamp-2">{item.label}</p>
          <p className="text-white/80 text-[10px] mt-1 font-medium">❤️ {item.likes}</p>
        </div>
      </div>
    </motion.div>
  )
}

export default function ExplorePage() {
  const [query, setQuery] = useState('')
  const [activeTab, setActiveTab] = useState('posts')
  const navigate = useNavigate()

  // No backend API yet for user search — show empty state
  const filteredUsers = []
  // No backend API yet for trending topics
  const trendingTopics = []
  // No posts API yet — posts created in the session are in-memory on HomePage
  const exploreGrid = []

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
      {/* Search bar */}
      <div className="relative">
        <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none" />
        <input
          id="explore-search"
          type="text"
          placeholder="Search students, faculty, clubs, topics…"
          value={query}
          onChange={e => setQuery(e.target.value)}
          className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-2xl pl-11 pr-10 py-3 text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 transition-all shadow-sm"
          aria-label="Search Swish"
        />
        <AnimatePresence>
          {query && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.15 }}
              onClick={() => setQuery('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all"
              aria-label="Clear search"
            >
              <X size={14} />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 dark:bg-gray-800/60 p-1 rounded-xl">
        {['posts', 'people', 'topics'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-semibold rounded-lg capitalize transition-all ${
              activeTab === tab
                ? 'bg-white dark:bg-gray-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-500 dark:text-gray-400 hover:text-slate-700 dark:hover:text-gray-300'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Posts grid */}
      {activeTab === 'posts' && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp size={15} className="text-indigo-500" />
            <h2 className="text-slate-900 dark:text-white font-semibold text-sm">Trending Posts</h2>
          </div>
          {exploreGrid.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl">
              <p className="text-slate-900 dark:text-white font-semibold text-sm">No posts yet</p>
              <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">There are no trending posts to show right now.</p>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-2">
              {[...exploreGrid, ...exploreGrid].slice(0, 9).map((item, i) => (
                <ExploreGridItem key={`${item.id}-${i}`} item={item} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* People */}
      {activeTab === 'people' && (
        <div className="space-y-3">
          <h2 className="text-slate-900 dark:text-white font-semibold text-sm">
            {query ? `Results for "${query}"` : 'Popular Profiles'}
          </h2>
          {filteredUsers.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl">
              <UserX size={32} className="text-slate-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-slate-900 dark:text-white font-semibold text-sm">No people found</p>
              <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">We couldn't find anyone matching "{query}".</p>
            </div>
          ) : (
            filteredUsers.map(u => <UserCard key={u.id} user={u} />)
          )}
        </div>
      )}

      {/* Topics */}
      {activeTab === 'topics' && (
        <div>
          <h2 className="text-slate-900 dark:text-white font-semibold text-sm mb-4">Trending Topics</h2>
          {trendingTopics.length === 0 ? (
            <div className="text-center py-12 px-4 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl">
              <p className="text-slate-900 dark:text-white font-semibold text-sm">No topics found</p>
              <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">Check back later for trending conversations.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              {trendingTopics.map((t, i) => (
                <motion.button
                  key={t.tag}
                  onClick={() => navigate(`/home?q=${encodeURIComponent(t.tag)}`)}
                  whileHover={{ y: -2 }}
                  className="w-full text-left bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800 rounded-2xl p-4 cursor-pointer transition-all active:scale-[0.98]"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-8 h-8 bg-indigo-50 dark:bg-indigo-950/60 rounded-lg flex items-center justify-center">
                      <Hash size={14} className="text-indigo-600 dark:text-indigo-400" />
                    </div>
                    <p className="text-indigo-600 dark:text-indigo-400 font-semibold text-sm">{t.tag}</p>
                  </div>
                  <p className="text-slate-400 dark:text-gray-500 text-xs">{t.posts} posts this week</p>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
