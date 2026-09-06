import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Heart, MessageCircle, Share2, Bookmark,
  MoreHorizontal, Send, Loader2, Trash2, Check, ImageOff,
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { formatRelativeTime } from '../../utils/posts'
import DeleteConfirmModal from './DeleteConfirmModal'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export default function PostViewerModal({ post: initialPost, onClose }) {
  const {
    currentUser, likePost, unlikePost,
    fetchComments, addComment, deleteComment,
    deletePost, posts,
  } = useSwish()

  // Keep in sync with global state
  const post = posts.find(p => p.id === initialPost.id) || initialPost

  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [liking, setLiking] = useState(false)
  const [saved, setSaved] = useState(post.saved)
  const [copied, setCopied] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)

  const isOwnPost = currentUser?.id === post.userId

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

  const handleSubmitComment = async (e) => {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || submitting) return
    setSubmitting(true)
    setError('')
    const res = await addComment(post.id, trimmed)
    setSubmitting(false)
    if (!res.ok) { setError(res.error || 'Failed to post comment.'); return }
    setComments(prev => [
      { id: res.comment.id, userId: res.comment.userId, userName: res.comment.userName, userInitials: res.comment.userInitials, avatarColor: res.comment.avatarColor, text: res.comment.text, createdAt: res.comment.createdAt },
      ...prev,
    ])
    setText('')
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

  const handleShare = async () => {
    const url = `${window.location.origin}/post/${post.id}`
    try { await navigator.clipboard.writeText(url) } catch {}
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
          </div>

          {/* Info side */}
          <div className="lg:w-[380px] flex flex-col border-l-0 lg:border-l border-slate-100 dark:border-gray-800">
            {/* Author header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-gray-800">
              <Link to={`/profile/${post.userId}`} onClick={onClose} className="flex items-center gap-3 group">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                  style={{ backgroundColor: post.userAvatarColor, fontSize: '12px' }}
                >
                  {post.userInitials}
                </div>
                <div>
                  <p className="text-slate-900 dark:text-white text-sm font-semibold group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{post.userName}</p>
                  <p className="text-slate-400 dark:text-gray-500 text-xs">{post.createdAt}</p>
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
                        Copy link
                      </button>
                      {isOwnPost && (
                        <button
                          onClick={() => { setShowMenu(false); setShowDeleteConfirm(true) }}
                          className="w-full text-left px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors flex items-center gap-2"
                        >
                          <Trash2 size={14} /> Delete
                        </button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Caption */}
            {post.caption && post.imageUrl && (
              <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-800">
                <p className="text-slate-800 dark:text-gray-200 text-sm leading-relaxed">
                  <span className="font-semibold text-slate-900 dark:text-white mr-1.5">{post.userName.toLowerCase().replace(/\s+/g, '.')}</span>
                  {post.caption}
                </p>
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
                    <div
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5"
                      style={{ backgroundColor: c.avatarColor }}
                    >
                      {c.userInitials}
                    </div>
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
                  <button className="p-2 rounded-xl text-slate-400 dark:text-gray-500 hover:text-indigo-500 transition-all">
                    <MessageCircle size={22} />
                  </button>
                  <button
                    onClick={handleShare}
                    className={`p-2 rounded-xl transition-all ${copied ? 'text-emerald-600' : 'text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300'}`}
                  >
                    {copied ? <Check size={22} /> : <Share2 size={22} />}
                  </button>
                </div>
                <button
                  onClick={() => setSaved(s => !s)}
                  className={`p-2 rounded-xl transition-all ${saved ? 'text-indigo-600' : 'text-slate-400 dark:text-gray-500 hover:text-indigo-500'}`}
                >
                  <Bookmark size={22} className={saved ? 'fill-indigo-600 dark:fill-indigo-400 stroke-indigo-600 dark:stroke-indigo-400' : ''} />
                </button>
              </div>
              <p className="text-slate-900 dark:text-white text-sm font-semibold mb-1">
                {post.likes.toLocaleString()} {post.likes === 1 ? 'like' : 'likes'}
              </p>
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
    </>
  )
}
