import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import { X, Send } from 'lucide-react'
import { useAuth } from '../../context/AuthContext'

export default function CommentDrawer({ post, onClose, onAddComment }) {
  const { user: currentUser } = useAuth()
  const [text, setText] = useState('')
  const inputRef = useRef(null)

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!text.trim()) return
    onAddComment(text.trim())
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
          {post.comments.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-slate-400 dark:text-gray-500 text-sm">No comments yet.</p>
              <p className="text-slate-300 dark:text-gray-600 text-xs mt-1">Be the first to comment!</p>
            </div>
          ) : (
            post.comments.map((c) => (
              <div key={c.id} className="flex gap-3">
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
                  <p className="text-slate-400 dark:text-gray-600 text-[11px] mt-1 ml-2">{c.time}</p>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Add comment input */}
        <div className="px-5 py-4 border-t border-slate-100 dark:border-gray-800">
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
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 resize-none transition-all"
                style={{ minHeight: '42px', maxHeight: '120px' }}
                onInput={e => {
                  e.target.style.height = 'auto'
                  e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
                }}
                aria-label="Comment text"
              />
            </div>
            <button
              type="submit"
              disabled={!text.trim()}
              className="w-9 h-9 bg-indigo-600 disabled:bg-slate-200 dark:disabled:bg-gray-700 text-white disabled:text-slate-400 dark:disabled:text-gray-500 rounded-xl flex items-center justify-center hover:bg-indigo-700 disabled:cursor-not-allowed transition-all flex-shrink-0"
              aria-label="Post comment"
            >
              <Send size={15} />
            </button>
          </form>
        </div>
      </motion.div>
    </>
  )
}
