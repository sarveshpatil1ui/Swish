import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Send, Loader2 } from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { formatRelativeTime } from '../../utils/posts'

export default function CommentDrawer({ post, onClose }) {
  const { currentUser, fetchComments, addComment, deleteComment } = useSwish()
  const [text, setText]         = useState('')
  const [comments, setComments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const inputRef = useRef(null)

  // Fetch newest-first comments for this post when the drawer opens.
  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError('')
    fetchComments(post.id).then(res => {
      if (cancelled) return
      if (res.ok) {
        setComments(res.comments)
      } else {
        setError(res.error || 'Failed to load comments.')
      }
      setLoading(false)
    })
    return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [post.id])

  const handleSubmit = async (e) => {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || submitting) return

    setSubmitting(true)
    setError('')
    const res = await addComment(post.id, trimmed)
    setSubmitting(false)

    if (!res.ok) {
      setError(res.error || 'Failed to post comment.')
      return
    }

    // New comment goes on top — comments are ordered newest-first.
    setComments(prev => [
      {
        id: res.comment.id,
        userId: res.comment.userId,
        userName: res.comment.userName,
        userInitials: res.comment.userInitials,
        avatarColor: res.comment.avatarColor,
        text: res.comment.text,
        createdAt: res.comment.createdAt,
      },
      ...prev,
    ])
    setText('')
  }

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/40 dark:bg-black/60 z-50 backdrop-blur-sm"
      />

      {/* Drawer */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 280 }}
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-800">
          <div>
            <h2 className="text-slate-900 dark:text-white font-semibold text-base">Comments</h2>
            <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5">{post.userName}'s post</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-all"
            aria-label="Close comments"
          >
            <X size={18} />
          </button>
        </div>

        {/* Post mini preview */}
        <div className="px-5 py-3 border-b border-slate-100 dark:border-gray-800 bg-slate-50 dark:bg-gray-800/50">
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
              style={{ backgroundColor: post.userAvatarColor }}
            >
              {post.userInitials}
            </div>
            <div>
              <p className="text-slate-800 dark:text-gray-200 text-xs font-semibold">{post.userName}</p>
              <p className="text-slate-500 dark:text-gray-400 text-xs line-clamp-1">{post.caption.slice(0, 60)}…</p>
            </div>
          </div>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-slate-300 dark:text-gray-600" />
            </div>
          ) : error && comments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-rose-500 text-sm">{error}</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 dark:text-gray-500 text-sm">No comments yet.</p>
              <p className="text-slate-300 dark:text-gray-600 text-xs mt-1">Be the first to comment!</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3 group">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: c.avatarColor }}
                >
                  {c.userInitials}
                </div>
                <div className="flex-1">
                  <div className="bg-slate-50 dark:bg-gray-800 rounded-2xl px-4 py-2.5">
                    <p className="text-slate-900 dark:text-white text-xs font-semibold mb-0.5">{c.userName}</p>
                    <p className="text-slate-700 dark:text-gray-300 text-sm leading-relaxed">{c.text}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-2">
                    <p className="text-slate-400 dark:text-gray-600 text-[11px]">{formatRelativeTime(c.createdAt)}</p>
                    {(c.userId === currentUser?.id || currentUser?.id === post.userId) && (
                      <button
                        onClick={async () => {
                          const res = await deleteComment(post.id, c.id)
                          if (res.ok) setComments(prev => prev.filter(x => x.id !== c.id))
                        }}
                        className="text-slate-300 dark:text-gray-700 hover:text-rose-500 dark:hover:text-rose-400 text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-all"
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

        {/* Add comment input */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-gray-800">
          {error && comments.length > 0 && (
            <p className="text-rose-500 text-xs mb-2">{error}</p>
          )}
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
              style={{ backgroundColor: currentUser?.avatarColor || '#6366f1', fontSize: '10px' }}
            >
              {currentUser?.initials || 'U'}
            </div>
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Add a comment…"
                rows={1}
                maxLength={1000}
                disabled={submitting}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 resize-none transition-all disabled:opacity-60"
                style={{ minHeight: '42px', maxHeight: '120px' }}
                onInput={e => {
                  e.target.style.height = 'auto'
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                aria-label="Comment text"
              />
            </div>
            <button
              type="submit"
              disabled={!text.trim() || submitting}
              className="w-9 h-9 bg-indigo-600 disabled:bg-slate-200 dark:disabled:bg-gray-700 text-white disabled:text-slate-400 dark:disabled:text-gray-500 rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:cursor-not-allowed transition-all flex-shrink-0"
              aria-label="Post comment"
            >
              {submitting ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
            </button>
          </form>
        </div>
      </motion.div>
    </>
  )
}
