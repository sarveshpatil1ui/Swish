import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSwish } from '../../context/SwishContext'
import PostCard from '../../components/app/PostCard'
import Stories from '../../components/app/Stories'
import RightPanel from '../../components/app/RightPanel'
import CreatePostModal from '../../components/app/CreatePostModal'
import { Bell, PenSquare, Zap, Search, X } from 'lucide-react'

// ── Empty feed ────────────────────────────────────────────────────────────────
function EmptyFeed({ onCreatePost }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center mx-auto mb-4">
        <PenSquare size={24} className="text-indigo-500" />
      </div>
      <h3 className="text-slate-900 dark:text-white font-semibold text-base mb-1">Your feed is empty</h3>
      <p className="text-slate-400 dark:text-gray-500 text-sm mb-5">
        Follow people or create your first post to get started.
      </p>
      <button
        onClick={onCreatePost}
        className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
      >
        Create your first post
      </button>
    </div>
  )
}

// ── No search results ─────────────────────────────────────────────────────────
function NoResults({ query }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-12 text-center"
    >
      <div className="text-4xl mb-4">🔍</div>
      <p className="text-slate-900 dark:text-white font-semibold text-base mb-1">No results found</p>
      <p className="text-slate-400 dark:text-gray-500 text-sm">
        Nothing matched <span className="text-slate-600 dark:text-gray-300 font-medium">"{query}"</span> — try a name, hashtag or keyword.
      </p>
    </motion.div>
  )
}


// ─────────────────────────────────────────────────────────────────────────────
export default function HomePage() {
  const { currentUser: user } = useSwish()
  const [posts,       setPosts]       = useState([])
  const [showCreate,  setShowCreate]  = useState(false)
  const [searchParams]               = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '')

  const handlePublish = (newPost) => setPosts(prev => [newPost, ...prev])

  // Sync URL ?q= param → search bar whenever the user navigates
  // (e.g., clicking a trending topic in the right panel)
  useEffect(() => {
    const q = searchParams.get('q') ?? ''
    setSearchQuery(q)
  }, [searchParams])

  // ── Search logic ─────────────────────────────────────────────────────────
  const hasSearch = searchQuery.trim().length > 0
  const rawQ      = searchQuery.trim().toLowerCase()
  // Strip leading # so we can match against both caption text and tag words
  const wordQ     = rawQ.replace(/^#/, '')

  const filteredPosts = hasSearch
    ? posts.filter(p =>
        p.userName.toLowerCase().includes(rawQ) ||
        p.caption.toLowerCase().includes(wordQ) ||   // caption search ignores #
        p.tags.some(tag => {
          const tagWord = tag.toLowerCase().replace('#', '')
          // Bi-directional partial: "#CampusHackathon" ↔ "#Hackathon" both match
          return tagWord.includes(wordQ) || wordQ.includes(tagWord)
        })
      )
    : posts

  const noResults = hasSearch && filteredPosts.length === 0

  return (
    <>
      {/* ── Mobile top bar ─────────────────────────────────────────────── */}
      <div className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 py-3 bg-white/90 dark:bg-gray-950/90 backdrop-blur-md border-b border-slate-100 dark:border-gray-800">
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center group-hover:bg-indigo-700 transition-colors">
            <Zap size={14} className="text-white fill-white" />
          </div>
          <span
            className="font-extrabold text-lg text-slate-900 dark:text-white"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Swish
          </span>
        </Link>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setShowCreate(true)}
            className="p-2 rounded-xl text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all"
            aria-label="Create post"
          >
            <PenSquare size={19} />
          </button>
          <Link
            to="/notifications"
            className="relative p-2 rounded-xl text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all"
            aria-label="Notifications"
          >
            <Bell size={19} />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-gray-950" />
          </Link>
        </div>
      </div>

      {/* ── Main layout ────────────────────────────────────────────────── */}
      <div className="flex gap-6 px-4 pt-5 pb-8 max-w-5xl mx-auto xl:max-w-none xl:mx-0">

        {/* Feed column */}
        <div className="flex-1 min-w-0 space-y-4 max-w-[560px] mx-auto xl:mx-0">

          {/* ── Search bar ──────────────────────────────────────────────── */}
          <div className="relative">
            <Search
              size={16}
              className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 pointer-events-none"
            />
            <input
              id="feed-search"
              type="search"
              placeholder="Search posts, people or #hashtags…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-600 rounded-2xl pl-11 pr-10 py-3 text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950 focus:bg-white dark:focus:bg-gray-900 transition-all shadow-sm"
            />
            <AnimatePresence>
              {searchQuery && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ duration: 0.15 }}
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-full text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all"
                  aria-label="Clear search"
                >
                  <X size={14} />
                </motion.button>
              )}
            </AnimatePresence>
          </div>

          {/* ── Stories (hidden while searching) ─────────────────────── */}
          <AnimatePresence>
            {!hasSearch && (
              <motion.div
                key="stories"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: 'hidden' }}
              >
                <Stories />
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Search results header ─────────────────────────────────── */}
          {hasSearch && filteredPosts.length > 0 && (
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-slate-100 dark:bg-gray-800" />
              <span className="text-slate-400 dark:text-gray-500 text-xs font-medium whitespace-nowrap">
                {filteredPosts.length} post{filteredPosts.length !== 1 ? 's' : ''} found
              </span>
              <div className="flex-1 h-px bg-slate-100 dark:bg-gray-800" />
            </div>
          )}

          {/* ── Posts ────────────────────────────────────────────────── */}
          {noResults ? (
            <NoResults query={searchQuery} />
          ) : filteredPosts.length === 0 && !hasSearch ? (
            <EmptyFeed onCreatePost={() => setShowCreate(true)} />
          ) : (
            filteredPosts.map(post => (
              <PostCard key={post.id} post={post} />
            ))
          )}

          {/* End-of-feed marker */}
          {!hasSearch && filteredPosts.length > 0 && (
            <div className="text-center py-4">
              <p className="text-slate-300 dark:text-gray-700 text-xs">
                You're all caught up on campus activity 🎓
              </p>
            </div>
          )}
        </div>

        {/* Right panel — xl only */}
        <RightPanel />
      </div>

      {/* Create post modal */}
      {showCreate && (
        <CreatePostModal
          onClose={() => setShowCreate(false)}
          onPublish={handlePublish}
        />
      )}
    </>
  )
}
