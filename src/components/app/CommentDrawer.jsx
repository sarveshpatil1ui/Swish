import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { X, Send, Loader2 } from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { useSocket } from '../../context/SocketContext'
import { formatRelativeTime, resolveImageUrl } from '../../utils/posts'

export default function CommentDrawer({ post, onClose }) {
  const { currentUser, fetchComments, addComment, deleteComment } = useSwish()
  const { on, off } = useSocket()
  const [text, setText]         = useState('')
  const [comments, setComments] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const inputRef = useRef(null)

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
        className="fixed right-0 top-0 bottom-0 z-50 w-full max-w-md bg-white dark:bg-base-900 border-l border-base-100 dark:border-[rgba(255,255,255,0.07)] shadow-2xl flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-100 dark:border-[rgba(255,255,255,0.07)]">
          <div>
            <h2 className="text-base-900 dark:text-white font-semibold text-base">Comments</h2>
            <p className="text-base-400 dark:text-base-500 text-xs mt-0.5">{post.userName}'s post</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-base-400 dark:text-base-500 hover:text-base-700 dark:hover:text-base-300 hover:bg-base-100 dark:hover:bg-base-800 transition-all"
            aria-label="Close comments"
          >
            <X size={18} />
          </button>
        </div>

        {/* Post mini preview */}
        <div className="px-5 py-3 border-b border-base-100 dark:border-[rgba(255,255,255,0.07)] bg-base-50 dark:bg-base-850/50">
          <div className="flex items-center gap-2.5">
            {resolveImageUrl(post.userProfilePhoto) ? (
              <img
                src={resolveImageUrl(post.userProfilePhoto)}
                alt=""
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: post.userAvatarColor }}
              >
                {post.userInitials}
              </div>
            )}
            <div>
              <p className="text-base-800 dark:text-base-200 text-xs font-semibold">{post.userName}</p>
              <p className="text-base-500 dark:text-base-400 text-xs line-clamp-1">{post.caption.slice(0, 60)}…</p>
            </div>
          </div>
        </div>

        {/* Comments list */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={20} className="animate-spin text-base-300 dark:text-base-600" />
            </div>
          ) : error && comments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-rose-500 text-sm">{error}</p>
            </div>
          ) : comments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-base-400 dark:text-base-500 text-sm">No comments yet.</p>
              <p className="text-base-300 dark:text-base-600 text-xs mt-1">Be the first to comment!</p>
            </div>
          ) : (
            comments.map((c) => (
              <div key={c.id} className="flex gap-3 group">
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
                <div className="flex-1">
                  <div className="bg-base-50 dark:bg-base-800 rounded-xl px-4 py-2.5">
                    <p className="text-base-900 dark:text-white text-xs font-semibold mb-0.5">{c.userName}</p>
                    <p className="text-base-700 dark:text-base-300 text-sm leading-relaxed">{c.text}</p>
                  </div>
                  <div className="flex items-center gap-3 mt-1 ml-2">
                    <p className="text-base-400 dark:text-base-500 text-[11px]">{formatRelativeTime(c.createdAt)}</p>
                    {(c.userId === currentUser?.id || currentUser?.id === post.userId) && (
                      <button
                        onClick={async () => {
                          const res = await deleteComment(post.id, c.id)
                          if (res.ok) setComments(prev => prev.filter(x => x.id !== c.id))
                        }}
                        className="text-base-300 dark:text-base-600 hover:text-rose-500 dark:hover:text-rose-400 text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-all"
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
        <div className="px-5 py-4 border-t border-base-100 dark:border-[rgba(255,255,255,0.07)]">
          {error && comments.length > 0 && (
            <p className="text-rose-500 text-xs mb-2">{error}</p>
          )}
          <form onSubmit={handleSubmit} className="flex gap-3 items-end">
            {resolveImageUrl(currentUser?.profilePhoto) ? (
              <img
                src={resolveImageUrl(currentUser.profilePhoto)}
                alt=""
                className="w-8 h-8 rounded-full object-cover flex-shrink-0"
              />
            ) : (
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                style={{ backgroundColor: currentUser?.avatarColor || '#5B5FEF', fontSize: '10px' }}
              >
                {currentUser?.initials || 'U'}
              </div>
            )}
            <div className="flex-1 relative">
              <textarea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                placeholder="Add a comment…"
                rows={1}
                maxLength={1000}
                disabled={submitting}
                className="w-full bg-base-50 dark:bg-base-800 border border-base-200 dark:border-base-700 text-base-900 dark:text-white placeholder-base-400 dark:placeholder-base-500 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-accent-400 dark:focus:border-accent-600 resize-none transition-all disabled:opacity-60"
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
              className="w-9 h-9 bg-accent-500 disabled:bg-base-200 dark:disabled:bg-base-700 text-white disabled:text-base-400 dark:disabled:text-base-500 rounded-xl flex items-center justify-center hover:bg-accent-600 disabled:cursor-not-allowed transition-all shadow-xs flex-shrink-0"
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
