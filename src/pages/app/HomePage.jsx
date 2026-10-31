import { useState, useEffect, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useSwish } from '../../context/SwishContext'
import PostCard from '../../components/app/PostCard'
import Stories from '../../components/app/Stories'
import RightPanel from '../../components/app/RightPanel'
import CreatePostModal from '../../components/app/CreatePostModal'
import { PenSquare, Search, X, ShieldAlert } from 'lucide-react'
import { apiGetCollegeNotices } from '../../utils/auth'
import { NoticeDetailModal } from '../../components/app/CollegeNoticePanel'


// ── Empty feed ────────────────────────────────────────────────────────────────
function EmptyFeed({ onCreatePost, isPostCreationPaused }) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-12 text-center">
      <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900 flex items-center justify-center mx-auto mb-4">
        <PenSquare size={24} className="text-indigo-500" />
      </div>
      <h3 className="text-slate-900 dark:text-white font-semibold text-base mb-1">Your feed is empty</h3>
      <p className="text-slate-400 dark:text-gray-500 text-sm mb-5">
        {isPostCreationPaused
          ? 'Post creation is temporarily paused for routine platform maintenance.'
          : 'Follow people or create your first post to get started.'}
      </p>
      <button
        onClick={onCreatePost}
        disabled={isPostCreationPaused}
        className="px-5 py-2.5 bg-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
      >
        {isPostCreationPaused ? 'Posting Paused' : 'Create your first post'}
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
  const { currentUser: user, posts, postsLoading, fetchPosts, platformConfig } = useSwish()
  const isAdmin = user?.role === 'admin' || user?.role === 'main_admin'
  const isPostCreationPaused = platformConfig?.features?.allowPostCreation === false && !isAdmin
  const [showCreate,  setShowCreate]  = useState(false)
  const [searchParams]               = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get('q') ?? '')
  const [urgentNotice, setUrgentNotice] = useState(null)
  const [isUrgentDismissed, setIsUrgentDismissed] = useState(false)
  const [selectedNotice, setSelectedNotice] = useState(null)

  // Fetch active urgent notice for emergency broadcast banner
  useEffect(() => {
    let mounted = true
    apiGetCollegeNotices()
      .then(res => {
        if (mounted && res?.ok && Array.isArray(res.notices)) {
          const urgent = res.notices.find(n => n.priority === 'urgent')
          if (urgent) {
            const isDismissed = sessionStorage.getItem(`dismiss_urgent_${urgent.id || urgent._id}`) === 'true'
            if (!isDismissed) {
              setUrgentNotice(urgent)
            }
          }
        }
      })
      .catch(() => {})
    return () => { mounted = false }
  }, [])

  useEffect(() => {
    fetchPosts()
  }, [])

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

  const filteredPosts = useMemo(() => {
    if (!hasSearch) return posts
    return posts.filter(p => {
      const userName = (p.userName || '').toLowerCase()
      const caption  = (p.caption || '').toLowerCase()
      const tags     = Array.isArray(p.tags) ? p.tags : []
      return (
        userName.includes(rawQ) ||
        caption.includes(wordQ) ||
        tags.some(tag => {
          const tagWord = (tag || '').toLowerCase().replace('#', '')
          return tagWord.includes(wordQ) || wordQ.includes(tagWord)
        })
      )
    })
  }, [posts, hasSearch, rawQ, wordQ])

  const noResults = hasSearch && filteredPosts.length === 0


  return (
    <>
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

          {/* ── Post Creation Paused Amber Notice ──────────────────── */}
          {isPostCreationPaused && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-900/60 rounded-2xl p-3.5 flex items-center gap-3 text-xs text-amber-800 dark:text-amber-300 shadow-xs">
              <ShieldAlert size={16} className="text-amber-600 shrink-0" />
              <div>
                <span className="font-bold">Post Creation Paused: </span>
                <span>Publishing new posts is temporarily paused for routine platform maintenance. You can still browse and interact with campus updates.</span>
              </div>
            </div>
          )}

          {/* ── Urgent Campus Alert Banner ────────────────────────── */}
          <AnimatePresence>
            {urgentNotice && !isUrgentDismissed && !hasSearch && (
              <motion.div
                key="urgent-banner"
                initial={{ opacity: 0, y: -8, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.98 }}
                onClick={() => setSelectedNotice(urgentNotice)}
                className="group relative p-3.5 rounded-2xl bg-gradient-to-r from-rose-500/15 via-rose-500/10 to-amber-500/10 border border-rose-300 dark:border-rose-900/60 shadow-sm hover:shadow-md hover:border-rose-400 dark:hover:border-rose-800 transition-all cursor-pointer flex items-center justify-between gap-3 overflow-hidden"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-rose-600 text-white flex items-center justify-center flex-shrink-0 shadow-sm shadow-rose-500/30">
                    <ShieldAlert size={17} className="animate-pulse" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-600 text-white">
                        Urgent Alert
                      </span>
                      <span className="text-xs text-slate-400">·</span>
                      <span className="text-xs font-semibold text-slate-500 dark:text-gray-400 truncate">
                        {urgentNotice.department || user?.college || 'College Notice'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-rose-600 dark:group-hover:text-rose-400 transition-colors mt-0.5">
                      {urgentNotice.title}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xs font-bold text-rose-600 dark:text-rose-400 hidden sm:inline group-hover:underline">
                    Read Notice →
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      sessionStorage.setItem(`dismiss_urgent_${urgentNotice.id || urgentNotice._id}`, 'true')
                      setIsUrgentDismissed(true)
                    }}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-rose-100/50 dark:hover:bg-rose-950/40 transition-colors"
                    title="Dismiss alert"
                  >
                    <X size={15} />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

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
          {postsLoading && posts.length === 0 ? (
            <div className="space-y-4">
              {[1, 2, 3].map(n => (
                <div key={n} className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-5 animate-pulse">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-800" />
                    <div className="space-y-2 flex-1">
                      <div className="h-4 bg-slate-200 dark:bg-gray-800 rounded w-1/3" />
                      <div className="h-3 bg-slate-200 dark:bg-gray-800 rounded w-1/4" />
                    </div>
                  </div>
                  <div className="h-4 bg-slate-200 dark:bg-gray-800 rounded w-3/4 mb-3" />
                  <div className="h-48 bg-slate-200 dark:bg-gray-800 rounded-xl" />
                </div>
              ))}
            </div>
          ) : noResults ? (
            <NoResults query={searchQuery} />
          ) : filteredPosts.length === 0 && !hasSearch ? (
            <EmptyFeed onCreatePost={() => setShowCreate(true)} isPostCreationPaused={isPostCreationPaused} />
          ) : (
            filteredPosts.map(post => (
              <PostCard key={post.id || post._id} post={post} />
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
        />
      )}

      {/* Notice Detail Modal for Urgent Campus Alert */}
      <AnimatePresence>
        {selectedNotice && (
          <NoticeDetailModal
            notice={selectedNotice}
            onClose={() => setSelectedNotice(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
