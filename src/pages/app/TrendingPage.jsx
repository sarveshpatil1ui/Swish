import { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Flame, Sparkles, Hash, GraduationCap,
  Heart, MessageCircle, UserPlus, Check, Clock,
  Loader2, RefreshCw, X, TrendingUp, Users, AlertCircle, Compass, Search, Music2
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
      style={{ backgroundColor: user?.avatarColor || '#5B5FEF' }}
    >
      {user?.initials || user?.name?.[0]?.toUpperCase() || 'U'}
    </div>
  )
}

// ── Suggested Account Card ───────────────────────────────────────────────────
function SuggestedAccountCard({ account, onToggleFollow }) {
  const { followUser, unfollowUser, isUserFollowed, isUserRequested } = useSwish()
  const following = isUserFollowed ? isUserFollowed(account.id, account.isFollowing) : Boolean(account.isFollowing)
  const requested = isUserRequested ? isUserRequested(account.id, account.isRequested) : Boolean(account.isRequested)
  const [loading, setLoading] = useState(false)

  const handleToggle = async (e) => {
    e.stopPropagation()
    if (loading) return
    setLoading(true)
    try {
      const res = (following || requested)
        ? await unfollowUser(account.id)
        : await followUser(account.id)
      if (res?.ok && onToggleFollow) {
        onToggleFollow(account.id, Boolean(res.following))
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex-shrink-0 w-44 bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-3.5 flex flex-col items-center text-center shadow-xs hover:shadow-md transition-all">
      <Link to={`/profile/${account.id}`} className="flex flex-col items-center group">
        <UserAvatar user={account} size="w-12 h-12" textSize="text-sm" />
        <p className="mt-2 text-xs font-bold text-base-900 dark:text-white truncate max-w-[140px] group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">
          {account.name}
        </p>
        <p className="text-[11px] text-base-400 dark:text-base-500 truncate max-w-[140px]">
          @{account.username}
        </p>
        <p className="text-[10px] text-accent-600 dark:text-accent-400 mt-1 font-medium truncate max-w-[140px]">
          {account.dept || account.college || 'Student'}
        </p>
      </Link>

      <button
        type="button"
        onClick={handleToggle}
        disabled={loading}
        className={`mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${following
            ? 'sw-btn-following'
            : requested
              ? 'bg-base-100 dark:bg-base-800 text-base-700 dark:text-base-300 border border-base-200 dark:border-base-700 hover:bg-rose-50 hover:text-rose-600'
              : 'sw-btn-follow'
          }`}
      >
        {loading ? (
          <Loader2 size={13} className="animate-spin" />
        ) : following ? (
          <>
            <Check size={13} strokeWidth={2.5} />
            <span>Following</span>
          </>
        ) : requested ? (
          <>
            <Clock size={13} />
            <span>Requested</span>
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
function PostTile({ post, onClick, onSelectTag }) {
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
      className="group relative aspect-square w-full rounded-xl overflow-hidden bg-base-100 dark:bg-base-850 border border-base-100/60 dark:border-base-800/80 cursor-pointer select-none shadow-xs hover:shadow-md focus:outline-none focus:ring-2 focus:ring-accent-500"
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

          <div className="flex flex-wrap gap-1 mt-1 z-30">
            {(post.tags || []).slice(0, 2).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectTag?.(tag)
                }}
                className="text-[10px] font-medium bg-black/30 hover:bg-black/50 backdrop-blur-md px-2 py-0.5 rounded-full transition-colors pointer-events-auto"
              >
                #{tag.replace(/^#+/, '')}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Audio / Music Badge on Top Left */}
      {post.music && (
        <div className="absolute top-2 left-2 z-10 pointer-events-none">
          <span className="flex items-center gap-1 bg-black/60 backdrop-blur-md text-white text-[10px] font-medium px-2 py-0.5 rounded-full border border-white/20 shadow-sm">
            <Music2 size={11} className="text-indigo-400" />
            <span className="max-w-[70px] truncate">{post.music.title || post.music.name || 'Audio'}</span>
          </span>
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

        {post.tags && post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap justify-center gap-1 max-w-[90%]">
            {post.tags.slice(0, 3).map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onSelectTag?.(tag)
                }}
                className="text-[10px] bg-white/20 hover:bg-white/30 backdrop-blur-md px-2 py-0.5 rounded-full text-white/95 transition-colors pointer-events-auto"
              >
                #{tag.replace(/^#+/, '')}
              </button>
            ))}
          </div>
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
          className="aspect-square rounded-xl bg-base-100 dark:bg-base-850 animate-pulse"
        />
      ))}
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN TRENDING PAGE COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function TrendingPage() {
  const { currentUser, posts: globalPosts } = useSwish()
  const { emit, on, off } = useSocket()
  const [searchParams, setSearchParams] = useSearchParams()

  const activeTag = searchParams.get('tag') || ''
  const activeTab = searchParams.get('tab') || 'trending'

  const [posts, setPosts] = useState([])
  const [hashtags, setHashtags] = useState([])
  const [tagSearch, setTagSearch] = useState('')
  const [suggestedAccounts, setSuggestedAccounts] = useState([])
  const [loadingPosts, setLoadingPosts] = useState(true)
  const [loadingHashtags, setLoadingHashtags] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [nextCursor, setNextCursor] = useState(null)
  const [hasMore, setHasMore] = useState(false)
  const [error, setError] = useState(null)

  // Modal inspection
  const [selectedPost, setSelectedPost] = useState(null)

  // ── Sync with global posts (e.g. actions inside PostViewerModal) ──
  useEffect(() => {
    if (!globalPosts || globalPosts.length === 0) return
    setPosts((prev) =>
      prev.map((p) => {
        const found = globalPosts.find((gp) => (gp.id || gp._id) === (p.id || p._id))
        if (!found) return p
        return {
          ...p,
          likeCount: found.likeCount ?? found.likes ?? p.likeCount,
          likes: found.likeCount ?? found.likes ?? p.likes,
          liked: found.liked ?? found.isLiked ?? p.liked,
          isLiked: found.liked ?? found.isLiked ?? p.isLiked,
          commentCount: found.commentCount ?? found.commentsCount ?? p.commentCount,
          saved: found.saved ?? p.saved,
        }
      })
    )
  }, [globalPosts])

  // ── Real-Time Socket Listeners for Likes, Comments, and Deletions ──
  useEffect(() => {
    if (!on || !off) return

    const handleLikeUpdate = (data) => {
      if (!data?.postId) return
      setPosts((prev) =>
        prev.map((p) => {
          const pid = p.id || p._id
          if (pid === data.postId) {
            const isMe = currentUser && (currentUser._id === data.userId || currentUser.id === data.userId)
            return {
              ...p,
              likeCount: data.likeCount ?? p.likeCount,
              likes: data.likeCount ?? p.likes,
              ...(isMe ? { liked: data.action === 'like', isLiked: data.action === 'like' } : {}),
            }
          }
          return p
        })
      )
    }

    const handleCommentUpdate = (data) => {
      if (!data?.postId) return
      setPosts((prev) =>
        prev.map((p) => {
          const pid = p.id || p._id
          if (pid === data.postId) {
            return {
              ...p,
              commentCount: data.commentCount ?? p.commentCount,
            }
          }
          return p
        })
      )
    }

    const handlePostDelete = (data) => {
      if (!data?.postId) return
      setPosts((prev) => prev.filter((p) => (p.id || p._id) !== data.postId))
      setSelectedPost((curr) => ((curr?.id || curr?._id) === data.postId ? null : curr))
    }

    on('post:like:update', handleLikeUpdate)
    on('post:comment:update', handleCommentUpdate)
    on('post:delete', handlePostDelete)

    return () => {
      off('post:like:update', handleLikeUpdate)
      off('post:comment:update', handleCommentUpdate)
      off('post:delete', handlePostDelete)
    }
  }, [on, off, currentUser])

  // ── Load Trending Hashtags ──
  const fetchHashtags = useCallback(async () => {
    setLoadingHashtags(true)
    try {
      const res = await apiGetTrendingHashtags(30)
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
        // Defense-in-depth: strictly filter out any admin/college_admin accounts
        const filtered = res.accounts.filter((acc) => {
          const role = (acc.role || '').toLowerCase()
          const dept = (acc.dept || '').toLowerCase()
          const username = (acc.username || '').toLowerCase()
          const name = (acc.name || '').toLowerCase()
          if (['admin', 'college_admin', 'main_admin'].includes(role)) return false
          if (dept === 'administration') return false
          if (username === 'swish.admin' || username === 'admin' || username.startsWith('admin@')) return false
          if (name.includes('admin user') || name.includes('swish admin')) return false
          return true
        })
        setSuggestedAccounts(filtered)
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
    const clean = tag.replace(/^#+/, '')
    const next = new URLSearchParams(searchParams)
    next.set('tab', 'hashtags')
    next.set('tag', clean)
    setSearchParams(next)
  }

  // Clear hashtag filter
  const handleClearTag = () => {
    const next = new URLSearchParams(searchParams)
    next.delete('tag')
    if (activeTab !== 'hashtags') {
      next.set('tab', 'trending')
    }
    setSearchParams(next)
  }

  // Filtered hashtags based on search input
  const filteredHashtags = useMemo(() => {
    if (!tagSearch.trim()) return hashtags
    const q = tagSearch.trim().toLowerCase().replace(/^#+/, '')
    return hashtags.filter((h) => h.tag.toLowerCase().includes(q))
  }, [hashtags, tagSearch])

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

  const isHashtagsActive = activeTab === 'hashtags' || Boolean(activeTag)

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 py-5 sm:py-7 space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-rose-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Flame size={19} className="fill-white" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-base-900 dark:text-white tracking-tight">
              Trending
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-base-400 dark:text-base-500 mt-1">
            Discover what’s lighting up campus discussions, events, and creations
          </p>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          onClick={() => fetchPosts(false, null)}
          disabled={loadingPosts}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-base-200 dark:border-base-750 bg-white dark:bg-base-900 text-xs font-semibold text-base-600 dark:text-base-300 hover:bg-base-50 dark:hover:bg-base-800 transition-all shadow-xs active:scale-95 disabled:opacity-50"
        >
          <RefreshCw size={13} className={loadingPosts ? 'animate-spin text-accent-500' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* ── Tabs Navigation ── */}
      <div className="flex p-1 gap-1 bg-base-100 dark:bg-base-850 rounded-xl border border-base-200/60 dark:border-base-750/80 overflow-x-auto scrollbar-none">
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = tab.id === 'hashtags' ? isHashtagsActive : (!activeTag && activeTab === tab.id)
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex-1 min-w-[90px] py-2 sm:py-2.5 px-3 rounded-lg text-xs sm:text-sm font-bold flex items-center justify-center gap-1.5 transition-all ${isActive
                  ? 'bg-white dark:bg-base-900 text-accent-600 dark:text-accent-400 shadow-xs'
                  : 'text-base-500 dark:text-base-400 hover:text-base-800 dark:hover:text-base-200'
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
            className="flex items-center justify-between px-4 py-3 bg-accent-50 dark:bg-accent-950/40 border border-accent-200/80 dark:border-accent-800/60 rounded-xl"
          >
            <div className="flex items-center gap-2.5 text-accent-950 dark:text-accent-200">
              <div className="w-8 h-8 rounded-lg bg-accent-500 text-white flex items-center justify-center font-bold text-sm shadow-xs">
                #
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-base-700 dark:text-base-300">
                    Showing posts tagged <span className="font-black text-accent-600 dark:text-accent-400">#{activeTag}</span>
                  </span>
                </div>
                <p className="text-[11px] text-base-400 dark:text-base-500">
                  Campus posts & conversations filtered by hashtag
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClearTag}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-white dark:bg-base-900 text-base-700 dark:text-base-200 hover:bg-base-50 dark:hover:bg-base-800 border border-base-200 dark:border-base-750 transition-colors shadow-xs"
            >
              <X size={13} />
              <span>All #{activeTab === 'hashtags' ? 'hashtags' : 'trending'}</span>
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Dedicated Hashtags Explorer (when in Hashtags tab) ── */}
      {isHashtagsActive ? (
        <div className="p-4 sm:p-5 bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-xl space-y-4 shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-1.5 text-sm font-bold text-base-900 dark:text-white">
                <Hash size={16} className="text-accent-600 dark:text-accent-400" />
                <span>Explore Campus Hashtags</span>
              </div>
              <p className="text-xs text-base-400 dark:text-base-500 mt-0.5">
                Select a hashtag below or search to find targeted discussions
              </p>
            </div>

            {/* Hashtag search input */}
            <div className="relative min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
              <input
                type="text"
                value={tagSearch}
                onChange={(e) => setTagSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && tagSearch.trim()) {
                    handleSelectTag(tagSearch.trim())
                  }
                }}
                placeholder="Search hashtags..."
                className="w-full pl-8 pr-3 py-1.5 bg-base-100 dark:bg-base-800 text-xs text-base-900 dark:text-white rounded-lg border border-transparent focus:border-accent-400 focus:outline-none transition-all placeholder:text-base-400"
              />
              {tagSearch && (
                <button
                  type="button"
                  onClick={() => setTagSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-600 dark:hover:text-base-200"
                >
                  <X size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Hashtag Chips Grid */}
          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="button"
              onClick={handleClearTag}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${!activeTag
                  ? 'bg-accent-500 text-white shadow-xs'
                  : 'bg-base-100 dark:bg-base-800 text-base-700 dark:text-base-300 hover:bg-base-200 dark:hover:bg-base-700'
                }`}
            >
              <Sparkles size={13} />
              <span>All Tagged Posts</span>
            </button>

            {filteredHashtags.map((h) => {
              const isSelected = activeTag.toLowerCase() === h.tag.toLowerCase()
              return (
                <button
                  key={h.tag}
                  type="button"
                  onClick={() => handleSelectTag(h.tag)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${isSelected
                      ? 'bg-accent-500 text-white border-accent-500 shadow-xs'
                      : 'bg-white dark:bg-base-900 border-base-200 dark:border-base-750 text-base-700 dark:text-base-300 hover:border-accent-300 dark:hover:border-accent-700'
                    }`}
                >
                  <span className="font-bold">#{h.tag}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-md ${isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-base-100 dark:bg-base-800 text-base-500 dark:text-base-400 font-medium'
                      }`}
                  >
                    {h.count}
                  </span>
                </button>
              )
            })}

            {/* Custom search quick-select button if typed query not in list */}
            {tagSearch.trim() && !filteredHashtags.some(h => h.tag.toLowerCase() === tagSearch.trim().toLowerCase().replace(/^#+/, '')) && (
              <button
                type="button"
                onClick={() => handleSelectTag(tagSearch.trim())}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-dashed border-accent-400 text-accent-600 dark:text-accent-400 hover:bg-accent-50 dark:hover:bg-accent-950/40 transition-all"
              >
                <Search size={12} />
                <span>Explore #{tagSearch.trim().replace(/^#+/, '')}</span>
              </button>
            )}

            {filteredHashtags.length === 0 && !tagSearch && (
              <span className="text-xs text-base-400 dark:text-base-500 py-1">
                No hashtags indexed yet. Create a post with #tag to start trending!
              </span>
            )}
          </div>
        </div>
      ) : (
        /* ── Popular Tags Quick Strip on Non-Hashtag Tabs ── */
        hashtags.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-base-700 dark:text-base-300">
                <Hash size={14} className="text-accent-500" />
                <span>Popular Tags</span>
              </div>
              <button
                type="button"
                onClick={() => handleTabChange('hashtags')}
                className="text-[11px] font-semibold text-accent-600 dark:text-accent-400 hover:underline"
              >
                Explore all hashtags
              </button>
            </div>
            <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
              {hashtags.slice(0, 12).map((h) => {
                const isSelected = activeTag.toLowerCase() === h.tag.toLowerCase()
                return (
                  <button
                    key={h.tag}
                    type="button"
                    onClick={() => handleSelectTag(h.tag)}
                    className={`flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${isSelected
                        ? 'bg-accent-500 text-white border-accent-500 shadow-xs'
                        : 'bg-white dark:bg-base-900 border-base-200 dark:border-base-750 text-base-700 dark:text-base-300 hover:border-accent-300 dark:hover:border-accent-700'
                      }`}
                  >
                    <span>#{h.tag}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected
                          ? 'bg-white/20 text-white'
                          : 'bg-base-100 dark:bg-base-800 text-base-500 dark:text-base-400'
                        }`}
                    >
                      {h.count}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>
        )
      )}

      {/* ── Suggested Accounts Strip (Only on main trending tab without tag filter) ── */}
      {!activeTag && activeTab === 'trending' && suggestedAccounts.length > 0 && (
        <div className="space-y-2.5 pt-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-base-700 dark:text-base-300">
              <Users size={14} className="text-accent-500" />
              <span>Suggested Accounts on Campus</span>
            </div>
            <Link
              to="/explore"
              className="text-[11px] font-semibold text-accent-600 dark:text-accent-400 hover:underline"
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
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/60 rounded-xl flex items-center justify-between text-rose-800 dark:text-rose-200">
          <div className="flex items-center gap-2 text-xs sm:text-sm font-medium">
            <AlertCircle size={16} className="text-rose-600 flex-shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => fetchPosts(false, null)}
            className="px-3 py-1 bg-rose-600 text-white text-xs font-bold rounded-lg hover:bg-rose-700 transition-colors shadow-xs"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── Content Grid / Feed ── */}
      {loadingPosts ? (
        <GridSkeleton />
      ) : posts.length === 0 ? (
        <div className="text-center py-16 px-4 bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-xl space-y-3 shadow-xs">
          <div className="w-12 h-12 rounded-xl bg-accent-50 dark:bg-accent-950/60 text-accent-600 dark:text-accent-400 mx-auto flex items-center justify-center">
            {activeTab === 'college' ? (
              <GraduationCap size={24} />
            ) : activeTag ? (
              <Hash size={24} />
            ) : (
              <TrendingUp size={24} />
            )}
          </div>
          <h3 className="text-base-900 dark:text-white font-bold text-base">
            {activeTag
              ? `No posts found with #${activeTag}`
              : activeTab === 'college'
                ? 'No posts from your college yet'
                : activeTab === 'hashtags'
                  ? 'No posts with hashtags yet'
                  : activeTab === 'foryou'
                    ? 'Your personalized feed is being curated'
                    : 'No trending posts right now'}
          </h3>
          <p className="text-base-400 dark:text-base-500 text-xs sm:text-sm max-w-sm mx-auto">
            {activeTag
              ? 'Be the first to create a post and include this hashtag!'
              : activeTab === 'college'
                ? 'Posts created by students or faculty in your college will appear here.'
                : activeTab === 'hashtags'
                  ? 'Posts that include hashtags like #webdev, #design, or #campus will appear here.'
                  : 'Check back soon as new campus stories and discussions get posted!'}
          </p>
          {activeTag && (
            <button
              type="button"
              onClick={handleClearTag}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-accent-500 text-white rounded-lg text-xs font-bold hover:bg-accent-600 transition-colors shadow-xs"
            >
              <span>Back to all {activeTab === 'hashtags' ? 'hashtags' : 'trending'}</span>
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
                onSelectTag={handleSelectTag}
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
                className="px-6 py-2.5 rounded-xl bg-white dark:bg-base-900 border border-base-200 dark:border-base-750 text-xs sm:text-sm font-bold text-base-800 dark:text-base-200 hover:border-accent-400 dark:hover:border-accent-600 hover:text-accent-600 dark:hover:text-accent-400 shadow-xs transition-all active:scale-95 inline-flex items-center gap-2 disabled:opacity-50"
              >
                {loadingMore ? (
                  <>
                    <Loader2 size={15} className="animate-spin text-accent-500" />
                    <span>Loading more posts...</span>
                  </>
                ) : (
                  <span>Load more posts</span>
                )}
              </button>
            </div>
          )}

          {!hasMore && posts.length > 0 && (
            <div className="py-6 text-center text-xs text-base-400 dark:text-base-600 font-medium">
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
