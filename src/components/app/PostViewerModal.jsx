import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Heart, MessageCircle, Share2, Bookmark,
  MoreHorizontal, Send, Loader2, Trash2, Check, ImageOff,
  Music2, Volume2, VolumeX,
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { useSocket } from '../../context/SocketContext'
import { formatRelativeTime, resolveImageUrl } from '../../utils/posts'
import DeleteConfirmModal from './DeleteConfirmModal'
import PostLikesModal from './PostLikesModal'
import ReportModal from './ReportModal'
import SharePostModal from './SharePostModal'
import { resolveAudioUrl, playSharedAudio } from '../../utils/audioResolver'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function PostViewerModal({ post: initialPost, onClose }) {
  const {
    currentUser, likePost, unlikePost,
    fetchComments, addComment, deleteComment,
    deletePost, posts, toggleSavePost,
  } = useSwish()

  // Keep in sync with global state
  const post = posts.find(p => p.id === initialPost.id) || initialPost

  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const { on, off } = useSocket()
  const [liking, setLiking] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showShareModal, setShowShareModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const [showLikesModal, setShowLikesModal] = useState(false)
  const [isPlayingMusic, setIsPlayingMusic] = useState(false)
  const audioRef = useRef(null)

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause()
        audioRef.current = null
      }
    }
  }, [])

  const toggleMusic = (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    if (!post.music) return
    const url = resolveAudioUrl(post.music)
    if (!url) return

    if (!audioRef.current || audioRef.current.src !== url) {
      if (audioRef.current) {
        audioRef.current.pause()
      }
      audioRef.current = new Audio(url)
      audioRef.current.loop = true
      audioRef.current.volume = 0.85
      audioRef.current.onended = () => setIsPlayingMusic(false)
      audioRef.current.onerror = (err) => {
        console.warn('[PostViewerModal] Audio error:', err)
        setIsPlayingMusic(false)
      }
    }

    if (isPlayingMusic) {
      audioRef.current.pause()
      setIsPlayingMusic(false)
    } else {
      playSharedAudio(audioRef.current)
      audioRef.current.play().then(() => {
        setIsPlayingMusic(true)
      }).catch(err => {
        console.warn('[PostViewerModal] Playback failed:', err)
        setIsPlayingMusic(false)
      })
    }
  }

  const isOwnPost = currentUser?.id === post.userId

  const handleSave = async () => {
    const result = await toggleSavePost(post.id, !post.saved)
    if (!result.ok && result.error) console.error('[PostViewerModal] save/unsave failed:', result.error)
  }

  // Fetch comments
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetchComments(post.id).then(res => {
      if (cancelled) return
      if (res.ok) setComments(res.comments)
      else setError(res.error || 'Failed to load comments.')
      setLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id])

  // Keyboard
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  const handleLike = async () => {
    if (liking) return
    setLiking(true)
    await (post.liked ? unlikePost(post.id) : likePost(post.id))
    setLiking(false)
  }

  // Real-time comments sync
  useEffect(() => {
    if (!on || !off) return
    const handleRealtimeComment = (data) => {
      if (String(data?.postId) === String(post.id) && data?.comment) {
        const incomingId = String(data.comment.id || data.comment._id || '')
        setComments(prev => {
          if (incomingId && prev.some(c => String(c.id || c._id) === incomingId)) {
            return prev
          }
          return [data.comment, ...prev]
        })
      }
    }
    on('post:comment:update', handleRealtimeComment)
    return () => off('post:comment:update', handleRealtimeComment)
  }, [post.id, on, off])

  const handleSubmitComment = async (e) => {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || submitting || submittingRef.current) return

    submittingRef.current = true
    setSubmitting(true)
    setError('')
    setText('')

    try {
      const res = await addComment(post.id, trimmed)
      if (!res.ok) {
        setError(res.error || 'Failed to post comment.')
        setText(trimmed)
        return
      }

      if (res.comment) {
        const newComment = {
          id: res.comment.id || res.comment._id,
          userId: res.comment.userId,
          userName: res.comment.userName,
          userInitials: res.comment.userInitials,
          avatarColor: res.comment.avatarColor,
          profilePhoto: res.comment.profilePhoto || null,
          text: res.comment.text,
          createdAt: res.comment.createdAt,
        }
        setComments(prev => {
          const targetId = String(newComment.id || '')
          if (targetId && prev.some(c => String(c.id || c._id) === targetId)) {
            return prev
          }
          return [newComment, ...prev]
        })
      }
    } catch (err) {
      setError('Failed to post comment.')
      setText(trimmed)
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const handleDeleteComment = async (commentId) => {
    const res = await deleteComment(post.id, commentId)
    if (res.ok) {
      setComments(prev => prev.filter(c => c.id !== commentId))
    }
  }

  const handleDeletePost = async () => {
    setDeleting(true)
    const res = await deletePost(post.id)
    setDeleting(false)
    if (res.ok) onClose()
  }

  const handleCopyLink = async () => {
    const url = `${window.location.origin}/post/${post.id}`
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(url)
      } else {
        const input = document.createElement('input')
        input.value = url
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)

      window.dispatchEvent(
        new CustomEvent('swish:toast', {
          detail: {
            title: 'Link copied to clipboard!',
            body: 'Share this link anywhere so friends can view this post.',
            type: 'share',
          },
        })
      )
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  const handleShare = () => {
    setShowShareModal(true)
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/70 z-[55] backdrop-blur-sm"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[55] flex items-center justify-center p-3 sm:p-6"
      >
        <div className="w-full max-w-4xl bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden flex flex-col lg:flex-row" style={{ maxHeight: '90vh' }}>
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-3 right-3 sm:top-4 sm:right-4 z-10 p-2 rounded-full bg-black/40 text-white hover:bg-black/60 transition-all"
            aria-label="Close"
          >
            <X size={18} />
          </button>

          {/* Image side */}
          <div className="lg:flex-1 bg-black flex items-center justify-center relative min-h-[200px] max-h-[50vh] lg:max-h-none">
            {post.imageUrl ? (
              <>
                {!imgLoaded && <div className="absolute inset-0 bg-gray-800 animate-pulse" />}
                <img
                  src={post.imageUrl}
                  alt=""
                  onLoad={() => setImgLoaded(true)}
                  className={`w-full h-full object-contain transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                />
              </>
            ) : (
              <div className="w-full h-full min-h-[300px] flex flex-col items-center justify-center gap-3 bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/40 dark:to-purple-950/40 p-6">
                <span className="text-5xl">{post.emoji}</span>
                <p className="text-indigo-700 dark:text-indigo-300 text-sm font-medium text-center max-w-xs leading-relaxed">{post.caption}</p>
              </div>
            )}
            {/* Audio toggle button on media */}
            {post.music && (
              <button
                type="button"
                onClick={toggleMusic}
                className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 backdrop-blur-md text-white text-xs font-medium shadow-lg transition-all active:scale-95 border border-white/20 cursor-pointer"
                title={isPlayingMusic ? 'Pause song' : 'Play song'}
              >
                {isPlayingMusic ? (
                  <>
                    <Volume2 size={13} className="text-pink-400 animate-pulse" />
                    <span className="text-[11px] font-semibold text-pink-300">Playing</span>
                  </>
                ) : (
                  <>
                    <VolumeX size={13} className="text-white/80" />
                    <span className="text-[11px] text-white/90">Music</span>
                  </>
                )}
              </button>
            )}
          </div>

          {/* Info side */}
          <div className="lg:w-[380px] flex flex-col border-l-0 lg:border-l border-slate-100 dark:border-gray-800">
            {/* Author header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-gray-800">
              <Link to={`/profile/${post.userId || post.user?.id || post.user?._id}`} onClick={onClose} className="flex items-center gap-3 group min-w-0">
                {resolveImageUrl(post.userProfilePhoto || post.user?.profilePhoto) ? (
                  <img
                    src={resolveImageUrl(post.userProfilePhoto || post.user?.profilePhoto)}
                    alt=""
                    className="w-9 h-9 rounded-full object-cover flex-shrink-0"
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                    style={{ backgroundColor: post.userAvatarColor || post.user?.avatarColor || '#6366f1', fontSize: '12px' }}
                  >
                    {post.userInitials || post.user?.initials || (post.userName || post.user?.name || 'U')[0]?.toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-slate-900 dark:text-white text-sm font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors truncate">
                    {post.userName || post.user?.name || 'User'}
                  </p>
                  <p className="text-slate-400 dark:text-gray-500 text-xs">{post.createdAt}</p>
                  {post.music && (
                    <button
                      type="button"
                      onClick={toggleMusic}
                      className={`inline-flex items-center gap-1.5 text-[11px] font-medium mt-1 px-2.5 py-0.5 rounded-full transition-all max-w-[200px] truncate cursor-pointer ${
                        isPlayingMusic
                          ? 'bg-gradient-to-r from-pink-500/15 via-rose-500/15 to-purple-500/15 text-pink-600 dark:text-pink-400 border border-pink-500/30'
                          : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-slate-200 dark:hover:bg-gray-700'
                      }`}
                      title={`${post.music.title} · ${post.music.artist} (${post.music.language})`}
                    >
                      <Music2 size={11} className={`flex-shrink-0 ${isPlayingMusic ? 'animate-spin text-pink-500' : 'text-slate-400'}`} />
                      <span className="truncate">{post.music.title} · {post.music.artist}</span>
                      {isPlayingMusic ? (
                        <span className="flex items-center gap-0.5 flex-shrink-0 ml-1">
                          <span className="w-0.5 h-2 bg-pink-500 rounded-full animate-pulse" />
                          <span className="w-0.5 h-3 bg-pink-500 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                        </span>
                      ) : (
                        <Volume2 size={11} className="text-slate-400 flex-shrink-0 ml-0.5" />
                      )}
                    </button>
                  )}
                </div>
              </Link>

              {/* Post menu */}
              <div className="relative">
                <button
                  onClick={() => setShowMenu(m => !m)}
                  className="p-1.5 rounded-lg text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all"
                >
                  <MoreHorizontal size={16} />
                </button>
                <AnimatePresence>
                  {showMenu && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95, y: -4 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95, y: -4 }}
                      onMouseLeave={() => setShowMenu(false)}
                      className="absolute right-0 top-9 z-20 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-xl shadow-lg py-1 min-w-[140px]"
                    >
                      <button onClick={() => { handleShare(); setShowMenu(false) }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                        Share post
                      </button>
                      <button onClick={() => { handleCopyLink(); setShowMenu(false) }} className="w-full text-left px-4 py-2.5 text-sm text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors">
                        Copy link
                      </button>
                      {isOwnPost ? (
                        <button
                          onClick={() => { setShowMenu(false); setShowDeleteConfirm(true) }}
                          className="w-full text-left px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-2"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      ) : (
                        <button
                          onClick={() => { setShowMenu(false); setShowReportModal(true) }}
                          className="w-full text-left px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-2"
                        >
                          Report
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Caption & Tags */}
            {(post.caption || (post.tags && post.tags.length > 0)) && (
              <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-800">
                {post.caption && (
                  <p className="text-slate-800 dark:text-gray-200 text-sm leading-relaxed">
                    <span className="font-semibold text-slate-900 dark:text-white mr-1.5">
                      {(post.userName || post.user?.name || 'user').toLowerCase().replace(/\s+/g, '.')}
                    </span>
                    {post.caption}
                  </p>
                )}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {post.tags.map(tag => {
                      const clean = String(tag).replace(/^#+/, '')
                      return (
                        <Link
                          key={tag}
                          to={`/trending?tab=hashtags&tag=${encodeURIComponent(clean)}`}
                          onClick={onClose}
                          className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline transition-colors"
                        >
                          #{clean}
                        </Link>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {/* Comments */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4" style={{ minHeight: '120px' }}>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 size={18} className="animate-spin text-slate-300 dark:text-gray-600" />
                </div>
              ) : error && comments.length === 0 ? (
                <p className="text-rose-500 text-sm text-center py-6">{error}</p>
              ) : comments.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-slate-400 dark:text-gray-500 text-sm">No comments yet.</p>
                  <p className="text-slate-300 dark:text-gray-600 text-xs mt-0.5">Be the first to comment!</p>
                </div>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="flex gap-2.5 group">
                    {resolveImageUrl(c.profilePhoto) ? (
                      <img
                        src={resolveImageUrl(c.profilePhoto)}
                        alt=""
                        className="w-7 h-7 rounded-full object-cover flex-shrink-0 mt-0.5"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5"
                        style={{ backgroundColor: c.avatarColor }}
                      >
                        {c.userInitials}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">
                        <span className="font-semibold text-slate-900 dark:text-white mr-1.5">{c.userName}</span>
                        <span className="text-slate-700 dark:text-gray-300">{c.text}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-slate-400 dark:text-gray-600 text-[11px]">{formatRelativeTime(c.createdAt)}</span>
                        {(c.userId === currentUser?.id || isOwnPost) && (
                          <button
                            onClick={() => handleDeleteComment(c.id)}
                            className="text-slate-300 dark:text-gray-700 hover:text-rose-500 dark:hover:text-rose-400 text-[11px] opacity-0 group-hover:opacity-100 transition-all"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Action bar */}
            <div className="px-4 py-2.5 border-t border-slate-100 dark:border-gray-800">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-0">
                  <motion.button
                    onClick={handleLike}
                    disabled={liking}
                    whileTap={{ scale: 0.82 }}
                    className={`p-2 rounded-xl transition-all ${post.liked ? 'text-rose-500' : 'text-slate-400 dark:text-gray-500 hover:text-rose-400'}`}
                  >
                    <Heart size={22} className={post.liked ? 'fill-rose-500 stroke-rose-500' : ''} />
                  </motion.button>
                  <button className="p-2 rounded-xl text-slate-400 dark:text-gray-500 hover:text-indigo-500 transition-all flex items-center gap-1.5">
                    <MessageCircle size={22} />
                    {post.commentCount > 0 && (
                      <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                        {post.commentCount}
                      </span>
                    )}
                  </button>
                  <div className="relative flex items-center">
                    <button
                      onClick={handleShare}
                      className={`p-2 rounded-xl transition-all ${
                        copied
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30'
                          : 'text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
                      }`}
                      aria-label="Share"
                      title={copied ? 'Link copied!' : 'Share post'}
                    >
                      {copied ? <Check size={22} className="text-emerald-500" /> : <Share2 size={22} />}
                    </button>

                    <AnimatePresence>
                      {copied && (
                        <motion.div
                          initial={{ opacity: 0, y: 6, scale: 0.9 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 4, scale: 0.9 }}
                          transition={{ duration: 0.15 }}
                          className="absolute -top-9 left-1/2 -translate-x-1/2 px-2.5 py-1 bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-sm text-white text-[11px] font-semibold rounded-full shadow-xl whitespace-nowrap pointer-events-none z-30 flex items-center gap-1 border border-white/10"
                        >
                          <Check size={12} className="text-emerald-400" />
                          <span>Link copied!</span>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
                <button
                  onClick={handleSave}
                  className={`p-2 rounded-xl transition-all ${post.saved ? 'text-indigo-600' : 'text-slate-400 dark:text-gray-500 hover:text-indigo-500'}`}
                >
                  <Bookmark size={22} className={post.saved ? 'fill-indigo-600 dark:fill-indigo-400 stroke-indigo-600 dark:stroke-indigo-400' : ''} />
                </button>
              </div>
              <button
                type="button"
                onClick={() => setShowLikesModal(true)}
                disabled={!post.likes || post.likes === 0}
                className="text-slate-900 dark:text-white text-sm font-semibold mb-1 text-left hover:underline disabled:hover:no-underline disabled:cursor-default transition-colors block"
                title={post.likes > 0 ? 'View who liked' : undefined}
              >
                {post.likes.toLocaleString()} {post.likes === 1 ? 'like' : 'likes'}
              </button>
            </div>

            {/* Comment input */}
            <form onSubmit={handleSubmitComment} className="px-4 py-3 border-t border-slate-100 dark:border-gray-800 flex gap-2 items-center">
              <input
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Add a comment…"
                maxLength={1000}
                disabled={submitting}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmitComment() } }}
                className="flex-1 bg-transparent text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 text-sm focus:outline-none disabled:opacity-60"
              />
              <button
                type="submit"
                disabled={!text.trim() || submitting}
                className="text-indigo-600 dark:text-indigo-400 text-sm font-semibold disabled:opacity-30 disabled:cursor-not-allowed hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
              >
                {submitting ? <Loader2 size={14} className="animate-spin" /> : 'Post'}
              </button>
            </form>
          </div>
        </div>
      </motion.div>

      {/* Delete confirmation */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <DeleteConfirmModal
            title="Delete this post?"
            message="This action cannot be undone. All comments will also be removed."
            loading={deleting}
            onConfirm={handleDeletePost}
            onCancel={() => setShowDeleteConfirm(false)}
          />
        )}
      </AnimatePresence>

      {/* Likes modal */}
      <AnimatePresence>
        {showLikesModal && (
          <PostLikesModal
            postId={post.id}
            onClose={() => setShowLikesModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Report modal */}
      <ReportModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        reportedPostId={post.id}
        reportedUserId={post.userId}
        reportedUserName={post.userName}
      />

      {/* Share post modal */}
      <AnimatePresence>
        {showShareModal && (
          <SharePostModal
            post={post}
            onClose={() => setShowShareModal(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
