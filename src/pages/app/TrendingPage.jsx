import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame, Sparkles, Hash, GraduationCap,
  Heart, MessageCircle, UserPlus, Check,
  Loader2, RefreshCw, X, TrendingUp, Users, AlertCircle, Compass
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { useSocket } from '../../context/SocketContext'
import {
  apiGetTrendingPosts,
  apiGetTrendingHashtags,
  apiGetHashtagPosts,
  apiGetSuggestedAccounts,
  apiFollowUser,
  apiUnfollowUser,
} from '../../utils/auth'
import { resolveImageUrl } from '../../utils/posts'
import PostViewerModal from '../../components/app/PostViewerModal'

// Pre-curated gradient palettes for text-only posts
const GRADIENTS = [
  'from-indigo-600 via-purple-600 to-pink-500',
  'from-blue-600 via-teal-500 to-emerald-500',
  'from-amber-500 via-orange-600 to-rose-600',
  'from-violet-600 via-fuchsia-600 to-indigo-700',
  'from-rose-500 via-purple-600 to-blue-600',
  'from-emerald-600 via-cyan-600 to-indigo-600',
]

function getGradientForId(id = '') {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash << 5) - hash + id.charCodeAt(i)
  const index = Math.abs(hash) % GRADIENTS.length
  return GRADIENTS[index]
}

// ── Small Avatar ─────────────────────────────────────────────────────────────
function UserAvatar({ user, size = 'w-7 h-7', textSize = 'text-xs' }) {
  const [err, setErr] = useState(false)
  const src = resolveImageUrl(user?.profilePhoto)

  if (src && !err) {
    return (
      <img
        src={src}
        alt={user?.name || 'User'}
        onError={() => setErr(true)}
        className={`${size} rounded-full object-cover flex-shrink-0 border border-white/20`}
      />
    )
  }

  return (
    <div
      className={`${size} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 ${textSize}`}
      style={{ backgroundColor: user?.avatarColor || '#6366f1' }}
    >
      {user?.initials || user?.name?.[0]?.toUpperCase() || 'U'}
    </div>
  )
}

// ── Suggested Account Card ───────────────────────────────────────────────────
function SuggestedAccountCard({ account, onToggleFollow }) {
  const [following, setFollowing] = useState(Boolean(account.isFollowing))
  const [loading, setLoading] = useState(false)

  const handleToggle = async (e) => {
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    const nextState = !following
    setFollowing(nextState)

    try {
      const res = nextState
        ? await apiFollowUser(account.id)
        : await apiUnfollowUser(account.id)
      if (!res.ok) {
        setFollowing(!nextState) // rollback
      } else if (onToggleFollow) {
        onToggleFollow(account.id, nextState)
      }
    } catch {
      setFollowing(!nextState)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-shrink-0 w-44 bg-white dark:bg-gray-900 border border-slate-200/80 dark:border-gray-800 rounded-2xl p-3.5 flex flex-col items-center text-center shadow-sm hover:shadow-md transition-all">
      <Link to={`/profile/${account.id}`} className="flex flex-col items-center group">
        <UserAvatar user={account} size="w-12 h-12" textSize="text-sm" />
        <p className="mt-2 text-xs font-bold text-slate-900 dark:text-white truncate max-w-[140px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
          {account.name}
        </p>
        <p className="text-[11px] text-slate-400 dark:text-gray-500 truncate max-w-[140px]">
          @{account.username}
        </p>
        <p className="text-[10px] text-indigo-600 dark:text-indigo-400 mt-1 font-medium truncate max-w-[140px]">
          {account.dept || account.college || 'Student'}
        </p>
      </Link>

      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`mt-3 w-full py-1.5 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
          following
            ? 'bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700'
            : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm shadow-indigo-500/20 active:scale-95'
        }`}
      >
        {loading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : following ? (
          <>
            <Check size={13} strokeWidth={2.5} />
            <span>Following</span>
          </>
        ) : (
          <>
            <UserPlus size={13} />
            <span>Follow</span>
          </>
        )}
      </button>
    </div>
  )
}

// ── Instagram-Style Post Grid Tile ───────────────────────────────────────────
function PostTile({ post, onClick }) {
  const [imgError, setImgError] = useState(false)
  const imageUrl = resolveImageUrl(post.imageUrl)
  const hasImage = Boolean(imageUrl && !imgError)
  const gradientClass = useMemo(() => getGradientForId(post.id || post._id), [post.id, post._id])

  const likeCount = post.likeCount ?? post.likes ?? 0
  const commentCount = post.commentCount ?? post.commentsCount ?? 0

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      role="button"
      tabIndex={0}
      onClick={() => onClick(post)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onClick(post)
        }
      }}
      aria-label={`View post by ${post.user?.name || 'User'}: ${post.caption?.slice(0, 50) || 'photo'}`}
      className="group relative aspect-square w-full rounded-xl sm:rounded-2xl overflow-hidden bg-slate-100 dark:bg-gray-900 border border-slate-200/60 dark:border-gray-800/80 cursor-pointer select-none shadow-sm hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
    >
      {/* Tile Content: Photo or Gradient Card */}
      {hasImage ? (
        <img
          src={imageUrl}
          alt={post.caption || 'Trending post'}
          onError={() => setImgError(true)}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className={`w-full h-full bg-gradient-to-br ${gradientClass} p-4 sm:p-5 flex flex-col justify-between text-white transition-transform duration-500 group-hover:scale-105`}>
          <div className="flex items-center gap-2">
            <UserAvatar user={post.user} size="w-6 h-6" textSize="text-[10px]" />
            <span className="text-xs font-medium text-white/90 truncate">@{post.user?.username || 'user'}</span>
          </div>

          <p className="text-xs sm:text-sm font-semibold line-clamp-4 leading-snug drop-shadow-sm">
            {post.caption || post.content}
          </p>

          <div className="flex flex-wrap gap-1 mt-1">
            {(post.tags || []).slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="text-[10px] font-medium bg-black/25 backdrop-blur-md px-2 py-0.5 rounded-full"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Floating Score Badge on Top Right */}
      {typeof post.score === 'number' && (
        <div className="absolute top-2 right-2 z-10 pointer-events-none">
          <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md text-amber-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-amber-400/20 shadow-sm">
            <Flame size={11} className="fill-amber-400 text-amber-400 animate-pulse" />
            {post.score.toFixed(1)}
          </span>
        </div>
      )}

      {/* Hover & Focus Overlay */}
      <div className="absolute inset-0 z-20 bg-black/55 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 group-focus:opacity-100 transition-opacity duration-200 flex flex-col items-center justify-center p-3 text-white">
        <div className="flex items-center gap-5 sm:gap-7">
          <div className="flex items-center gap-1.5 font-bold text-sm sm:text-base">
            <Heart size={18} className={post.liked || post.isLiked ? 'fill-rose-500 text-rose-500' : 'text-white'} />
            <span>{likeCount}</span>
          </div>
          <div className="flex items-center gap-1.5 font-bold text-sm sm:text-base">
            <MessageCircle size={18} className="fill-white text-white" />
            <span>{commentCount}</span>
          </div>
        </div>

        {post.caption && (
          <p className="mt-3 text-[11px] sm:text-xs text-center text-white/80 line-clamp-2 px-2 hidden sm:block">
            {post.caption}
          </p>
        )}

        <div className="mt-2 flex items-center gap-1.5 text-[11px] text-white/70">
          <span>by {post.user?.name}</span>
        </div>
      </div>
    </motion.div>
  )
}

// ── Skeletons ────────────────────────────────────────────────────────────────
function GridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3.5">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="aspect-square rounded-xl sm:rounded-2xl bg-slate-200/80 dark:bg-gray-800 animate-pulse"
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TRENDING PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function TrendingPage() {
  const { currentUser } = useSwish()
  const { emit } = useSocket()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTag = searchParams.get('tag') || ''
  const activeTab = searchParams.get('tab') || 'trending'

  const [posts, setPosts] = useState([])
  const [hashtags, setHashtags] = useState([])
  const [suggestedAccounts, setSuggestedAccounts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingHashtags, setLoadingHashtags] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState(null)

  // Modal inspection
  const [selectedPost, setSelectedPost] = useState(null)

  // ── Load Trending Hashtags ──
  const fetchHashtags = useCallback(async () => {
    setLoadingHashtags(true)
    try {
      const res = await apiGetTrendingHashtags(12)
      if (res.ok && Array.isArray(res.hashtags)) {
        setHashtags(res.hashtags)
      }
    } catch (e) {
      console.error('Failed to load hashtags:', e)
    } finally {
      setLoadingHashtags(false)
    }
  }, [])

  // ── Load Suggested Accounts ──
  const fetchSuggested = useCallback(async () => {
    try {
      const res = await apiGetSuggestedAccounts(10)
      if (res.ok && Array.isArray(res.accounts)) {
        setSuggestedAccounts(res.accounts)
      }
    } catch (e) {
      console.error('Failed to load suggested accounts:', e)
    }
  }, [])

  // ── Load Posts (by tab or by activeTag) ──
  const fetchPosts = useCallback(async (isLoadMore = false, cursorToUse = null) => {
    if (isLoadMore) setLoadingMore(true)
    else {
      setLoadingPosts(true)
      setError(null)
    }

    try {
      let res
      if (activeTag) {
        res = await apiGetHashtagPosts(activeTag, { cursor: cursorToUse, limit: 18 })
      } else {
        res = await apiGetTrendingPosts({ tab: activeTab, cursor: cursorToUse, limit: 18 })
      }

      if (res.ok && Array.isArray(res.posts)) {
        setPosts((prev) => (isLoadMore ? [...prev, ...res.posts] : res.posts))
        setNextCursor(res.nextCursor || null)
        setHasMore(Boolean(res.hasMore))
      } else {
        setError(res.error || 'Failed to load posts. Please try again.')
      }
    } catch (err) {
      console.error('Error fetching trending posts:', err)
      setError('Network error. Could not connect to trending feed.')
    } finally {
      setLoadingPosts(false)
      setLoadingMore(false)
    }
  }, [activeTag, activeTab])

  // Initial load on mount and tab/tag change
  useEffect(() => {
    fetchPosts(false, null)
  }, [fetchPosts])

  useEffect(() => {
    fetchHashtags()
    fetchSuggested()
  }, [fetchHashtags, fetchSuggested])

  // Change tab helper
  const handleTabChange = (tabId) => {
    const next = new URLSearchParams(searchParams)
    next.set('tab', tabId)
    next.delete('tag') // clear tag filter on tab switch
    setSearchParams(next)
  }

  // Select hashtag chip
  const handleSelectTag = (tag) => {
    const next = new URLSearchParams(searchParams)
    next.set('tag', tag.replace(/^#+/, ''))
    setSearchParams(next)
  }

  // Clear hashtag filter
  const handleClearTag = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('tag')
    setSearchParams(next)
  }

  // Load more pagination handler
  const handleLoadMore = () => {
    if (loadingMore || !hasMore || !nextCursor) return
    fetchPosts(true, nextCursor)
  }

  // Socket notification on follow
  const handleToggleFollow = (targetUserId, isFollowing) => {
    if (isFollowing) {
      emit('follow:notify', { targetUserId })
    }
  }

  const tabs = [
    { id: 'trending', label: 'Trending Now', icon: Flame },
    { id: 'foryou', label: 'For You', icon: Sparkles },
    { id: 'hashtags', label: 'Hashtags', icon: Hash },
    { id: 'college', label: 'My College', icon: GraduationCap },
  ]

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-5 sm:py-7 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Flame size={19} className="fill-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              Trending
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-gray-400 mt-1">
            Discover what’s lighting up campus discussions, events, and creations
          </p>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={() => fetchPosts(false, null)}
          disabled={loadingPosts}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-xs font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-all shadow-sm active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loadingPosts ? 'animate-spin text-indigo-500' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex p-1 gap-1 bg-slate-100 dark:bg-gray-900/90 rounded-2xl border border-slate-200/60 dark:border-gray-800/80 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = !activeTag && activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 min-w-[90px] py-2 sm:py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-white dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
              }`}
            >
              <Icon size={15} className={isActive ? 'stroke-[2.5]' : 'stroke-2'} />
              <span>{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* ── Active Tag Filter Banner ── */}
      <AnimatePresence>
        {activeTag && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center justify-between px-4 py-3 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 rounded-2xl"
          >
            <div className="flex items-center gap-2 text-indigo-950 dark:text-indigo-200">
              <Hash size={18} className="text-indigo-600 dark:text-indigo-400" />
              <span className="text-xs sm:text-sm font-semibold">
                Showing posts tagged <span className="font-black text-indigo-600 dark:text-indigo-400">#{activeTag}</span>
              </span>
            </div>
            <button
              type="button"
              onClick={handleClearTag}
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-indigo-200/60 dark:bg-indigo-900/60 text-indigo-800 dark:text-indigo-200 hover:bg-indigo-300 dark:hover:bg-indigo-800 transition-colors"
            >
              <X size={13} />
              <span>Clear filter</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Trending Hashtags Pill Bar ── */}
      {hashtags.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-gray-300">
              <Hash size={14} className="text-indigo-500" />
              <span>Popular Tags</span>
            </div>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
            {hashtags.map((h) => {
              const isSelected = activeTag.toLowerCase() === h.tag.toLowerCase()
              return (
                <button
                  key={h.tag}
                  type="button"
                  onClick={() => handleSelectTag(h.tag)}
                  className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                    isSelected
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm shadow-indigo-500/20'
                      : 'bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 text-slate-700 dark:text-gray-300 hover:border-indigo-300 dark:hover:border-indigo-700'
                  }`}
                >
                  <span>#{h.tag}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400'
                    }`}
                  >
                    {h.count}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Suggested Accounts Strip (Only on main trending tab without tag filter) ── */}
      {!activeTag && activeTab === 'trending' && suggestedAccounts.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-gray-300">
              <Users size={14} className="text-indigo-500" />
              <span>Suggested Accounts on Campus</span>
            </div>
            <Link
              to="/explore"
              className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
            >
              See all
            </Link>
          </div>
          <div className="flex gap-3 overflow-x-auto scrollbar-none pb-2 pt-0.5">
            {suggestedAccounts.map((account) => (
              <SuggestedAccountCard
                key={account.id}
                account={account}
                onToggleFollow={handleToggleFollow}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── Error Banner ── */}
      {error && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-2xl flex items-center justify-between text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
            <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchPosts(false, null)}
            className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-xl hover:bg-rose-700 transition-colors shadow-sm"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Content Grid / Feed ── */}
      {loadingPosts ? (
        <GridSkeleton />
      ) : posts.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-gray-900 border border-slate-100 dark:border-gray-800 rounded-3xl space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 mx-auto flex items-center justify-center">
            {activeTab === 'college' ? (
              <GraduationCap size={24} />
            ) : activeTag ? (
              <Hash size={24} />
            ) : (
              <TrendingUp size={24} />
            )}
          </div>
          <h3 className="text-slate-900 dark:text-white font-bold text-base">
            {activeTag
              ? `No posts found with #${activeTag}`
              : activeTab === 'college'
              ? 'No posts from your college yet'
              : activeTab === 'foryou'
              ? 'Your personalized feed is being curated'
              : 'No trending posts right now'}
          </h3>
          <p className="text-slate-400 dark:text-gray-500 text-xs sm:text-sm max-w-sm mx-auto">
            {activeTag
              ? 'Be the first to create a post and include this hashtag!'
              : activeTab === 'college'
              ? 'Posts created by students or faculty in your college will appear here.'
              : 'Check back soon as new campus stories and discussions get posted!'}
          </p>
          {activeTag && (
            <button
              type="button"
              onClick={handleClearTag}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition-colors"
            >
              <span>Back to all trending</span>
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3.5">
            {posts.map((post) => (
              <PostTile
                key={post.id || post._id}
                post={post}
                onClick={setSelectedPost}
              />
            ))}
          </div>

          {/* Load More Button */}
          {hasMore && (
            <div className="pt-2 pb-6 flex justify-center">
              <button
                type="button"
                onClick={handleLoadMore}
                disabled={loadingMore}
                className="px-6 py-2.5 rounded-2xl bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-xs sm:text-sm font-bold text-slate-800 dark:text-gray-200 hover:border-indigo-400 dark:hover:border-indigo-600 hover:text-indigo-600 dark:hover:text-indigo-400 shadow-sm transition-all active:scale-95 inline-flex items-center gap-2 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-indigo-500" />
                    <span>Loading more posts...</span>
                  </>
                ) : (
                  <span>Load more posts</span>
                )}
              </button>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="py-6 text-center text-xs text-slate-400 dark:text-gray-600 font-medium">
              You're all caught up ✨
            </div>
          )}
        </div>
      )}

      {/* ── Modal for clicked post ── */}
      <AnimatePresence>
        {selectedPost && (
          <PostViewerModal
            post={selectedPost}
            onClose={() => setSelectedPost(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
