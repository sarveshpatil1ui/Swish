import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Heart, MessageCircle, Share2, Bookmark,
  MoreHorizontal, Check, ImageOff,
} from 'lucide-react'
import { useAuth } from '../../context/AuthContext'
import CommentDrawer from './CommentDrawer'

// ── Tiny avatar ───────────────────────────────────────────────────────────────
function Avatar({ initials, color, size = 9 }) {
  return (
    <div
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-white font-bold flex-shrink-0`}
      style={{ backgroundColor: color, fontSize: size <= 8 ? '11px' : size <= 9 ? '12px' : '14px' }}
    >
      {initials}
    </div>
  )
}

// ── Gradient fallback shown when the image fails or is absent ─────────────────
function GradientCard({ emoji, label, gradientFrom, gradientTo }) {
  return (
    <div
      className="w-full h-full flex flex-col items-center justify-center gap-3"
      style={{ background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})` }}
    >
      <span style={{ fontSize: 56, lineHeight: 1 }}>{emoji}</span>
      <span className="bg-white/50 dark:bg-black/30 backdrop-blur-sm text-slate-800 dark:text-white text-sm font-semibold px-4 py-1.5 rounded-xl">
        {label}
      </span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function PostCard({ post: initialPost }) {
  const { user: currentUser } = useAuth()

  const [post,         setPost]         = useState(initialPost)
  const [showComments, setShowComments] = useState(false)
  const [copied,       setCopied]       = useState(false)
  const [followed,     setFollowed]     = useState(false)
  const [imgLoaded,    setImgLoaded]    = useState(false)
  const [imgError,     setImgError]     = useState(false)
  const [showMenu,     setShowMenu]     = useState(false)

  const isOwnPost = currentUser?.id === post.userId

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleLike = () => {
    setPost(p => ({
      ...p,
      liked: !p.liked,
      likes: p.liked ? p.likes - 1 : p.likes + 1,
    }))
  }

  const handleSave = () => setPost(p => ({ ...p, saved: !p.saved }))

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`
    try { await navigator.clipboard.writeText(url) } catch { /* ignore */ }
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleAddComment = (text) => {
    const newComment = {
      id: `c-${Date.now()}`,
      userId:       currentUser?.id       || 'user-1',
      userName:     currentUser?.name     || 'You',
      userInitials: currentUser?.initials || 'U',
      avatarColor:  currentUser?.avatarColor || '#6366f1',
      text,
      time: 'Just now',
    }
    setPost(p => ({ ...p, comments: [...p.comments, newComment] }))
  }

  const hasImage = post.imageUrl && !imgError

  return (
    <>
      <motion.article
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden"
        aria-label={`Post by ${post.userName}`}
      >
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between px-4 py-3.5">
          <Link
            to={`/profile/${post.userId}`}
            className="flex items-center gap-3 group min-w-0"
          >
            <Avatar initials={post.userInitials} color={post.userAvatarColor} size={9} />
            <div className="min-w-0">
              <p className="text-slate-900 dark:text-white text-sm font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors leading-tight truncate">
                {post.userName}
              </p>
              <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5">
                {post.userDept}&nbsp;·&nbsp;{post.createdAt}
              </p>
            </div>
          </Link>

          <div className="flex items-center gap-1 flex-shrink-0 ml-2">
            {/* Follow (other users' posts only) */}
            {!isOwnPost && (
              <motion.button
                onClick={() => setFollowed(f => !f)}
                whileTap={{ scale: 0.95 }}
                className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-all ${
                  followed
                    ? 'bg-slate-100 dark:bg-gray-800 text-slate-500 dark:text-gray-400'
                    : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
                }`}
              >
                {followed ? 'Following' : 'Follow'}
              </motion.button>
            )}

            {/* More options */}
            <div className="relative">
              <button
                onClick={() => setShowMenu(m => !m)}
                className="p-1.5 rounded-lg text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all"
                aria-label="Post options"
              >
                <MoreHorizontal size={16} />
              </button>
              <AnimatePresence>
                {showMenu && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -4 }}
                    transition={{ duration: 0.15 }}
                    onMouseLeave={() => setShowMenu(false)}
                    className="absolute right-0 top-9 z-20 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl shadow-lg py-1 min-w-[140px]"
                  >
                    {['Save post', 'Copy link', 'Report'].map(item => (
                      <button
                        key={item}
                        onClick={() => setShowMenu(false)}
                        className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                          item === 'Report'
                            ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                            : 'text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800'
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ── Image ───────────────────────────────────────────────────── */}
        <div className="relative w-full overflow-hidden bg-slate-100 dark:bg-gray-800" style={{ aspectRatio: '4/3' }}>
          {/* Loading skeleton */}
          {post.imageUrl && !imgError && !imgLoaded && (
            <div className="absolute inset-0 bg-slate-200 dark:bg-gray-700 animate-pulse" />
          )}

          {post.imageUrl && !imgError ? (
            <img
              src={post.imageUrl}
              alt={post.label}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
              className={`w-full h-full object-cover transition-opacity duration-500 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
            />
          ) : (
            /* Gradient fallback (if no imageUrl or image failed) */
            <GradientCard
              emoji={post.emoji}
              label={post.label}
              gradientFrom={post.gradientFrom}
              gradientTo={post.gradientTo}
            />
          )}

          {/* Error badge */}
          {imgError && (
            <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/30 backdrop-blur-sm text-white/70 text-[10px] px-2 py-1 rounded-full">
              <ImageOff size={10} /> Fallback
            </div>
          )}

          {/* Tags overlay on image (bottom-left) */}
          {hasImage && imgLoaded && post.tags && post.tags.length > 0 && (
            <div className="absolute bottom-3 left-3 flex gap-1.5 flex-wrap">
              {post.tags.slice(0, 2).map(tag => (
                <span
                  key={tag}
                  className="bg-black/35 backdrop-blur-sm text-white text-[11px] px-2.5 py-1 rounded-full font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* ── Action bar ──────────────────────────────────────────────── */}
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between mb-2.5">
            {/* Left: Like · Comment · Share */}
            <div className="flex items-center gap-0">
              {/* Like */}
              <motion.button
                onClick={handleLike}
                whileTap={{ scale: 0.82 }}
                className={`p-2 rounded-xl transition-all ${
                  post.liked
                    ? 'text-rose-500'
                    : 'text-slate-400 dark:text-gray-500 hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                }`}
                aria-label={post.liked ? 'Unlike' : 'Like'}
              >
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span
                    key={post.liked ? 'liked' : 'unliked'}
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.6, opacity: 0 }}
                    transition={{ duration: 0.14 }}
                    style={{ display: 'block' }}
                  >
                    <Heart size={22} className={post.liked ? 'fill-rose-500 stroke-rose-500' : ''} />
                  </motion.span>
                </AnimatePresence>
              </motion.button>

              {/* Comment */}
              <button
                onClick={() => setShowComments(true)}
                className="p-2 rounded-xl text-slate-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all"
                aria-label="View comments"
              >
                <MessageCircle size={22} />
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                className={`p-2 rounded-xl transition-all ${
                  copied
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                    : 'text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
                }`}
                aria-label="Share"
              >
                {copied ? <Check size={22} /> : <Share2 size={22} />}
              </button>
            </div>

            {/* Right: Save */}
            <button
              onClick={handleSave}
              className={`p-2 rounded-xl transition-all ${
                post.saved
                  ? 'text-indigo-600 dark:text-indigo-400'
                  : 'text-slate-400 dark:text-gray-500 hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30'
              }`}
              aria-label={post.saved ? 'Unsave' : 'Save'}
            >
              <Bookmark
                size={22}
                className={post.saved ? 'fill-indigo-600 dark:fill-indigo-400 stroke-indigo-600 dark:stroke-indigo-400' : ''}
              />
            </button>
          </div>

          {/* Like count */}
          <p className="text-slate-900 dark:text-white text-sm font-semibold mb-2">
            {post.likes.toLocaleString()} {post.likes === 1 ? 'like' : 'likes'}
          </p>

          {/* Caption */}
          <p className="text-slate-800 dark:text-gray-200 text-sm leading-relaxed mb-2">
            <Link
              to={`/profile/${post.userId}`}
              className="font-semibold text-slate-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors mr-1.5"
            >
              {post.userName.toLowerCase().replace(/\s+/g, '.')}
            </Link>
            {post.caption}
          </p>

          {/* Remaining hashtags (those not on the image) */}
          {post.tags && post.tags.length > 0 && (
            <div className="flex flex-wrap gap-x-2 gap-y-1 mb-2.5">
              {post.tags.map(tag => (
                <span
                  key={tag}
                  className="text-indigo-500 dark:text-indigo-400 text-xs font-medium hover:text-indigo-700 dark:hover:text-indigo-300 cursor-pointer transition-colors"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* View comments link */}
          {post.comments.length > 0 ? (
            <button
              onClick={() => setShowComments(true)}
              className="text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-400 text-sm transition-colors mb-1 block"
            >
              View all {post.comments.length} comment{post.comments.length !== 1 ? 's' : ''}
            </button>
          ) : (
            <p className="text-slate-300 dark:text-gray-700 text-xs mb-1">No comments yet. Be first!</p>
          )}
        </div>

        {/* ── Comment quick-input ──────────────────────────────────────── */}
        <div className="px-4 pb-4 pt-2 border-t border-slate-100 dark:border-gray-800 flex items-center gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
            style={{ backgroundColor: currentUser?.avatarColor || '#6366f1', fontSize: '10px' }}
          >
            {currentUser?.initials || 'U'}
          </div>
          <button
            onClick={() => setShowComments(true)}
            className="flex-1 text-left text-sm text-slate-400 dark:text-gray-500 bg-slate-50 dark:bg-gray-800 border border-slate-100 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors rounded-full px-4 py-2"
          >
            Add a comment…
          </button>
        </div>
      </motion.article>

      {/* Comment drawer */}
      <AnimatePresence>
        {showComments && (
          <CommentDrawer
            post={post}
            onClose={() => setShowComments(false)}
            onAddComment={handleAddComment}
          />
        )}
      </AnimatePresence>
    </>
  )
}
