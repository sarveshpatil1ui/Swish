import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Flag, X, AlertCircle } from 'lucide-react'
import { apiSubmitReport } from '../../utils/auth'

const CATEGORIES = [
  { value: 'inappropriate_content', label: 'Inappropriate Content' },
  { value: 'harassment', label: 'Harassment or Bullying' },
  { value: 'spam', label: 'Spam or Scam' },
  { value: 'misinformation', label: 'Misinformation' },
  { value: 'other', label: 'Other' },
]

export default function ReportModal({
  isOpen,
  onClose,
  reportedPostId,
  reportedUserId,
  reportedUserName,
}) {
  const [category, setCategory] = useState('inappropriate_content')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!description.trim()) {
      setError('Please provide a brief reason for reporting.')
      return
    }

    try {
      setSubmitting(true)
      setError('')
      const res = await apiSubmitReport({
        type: 'post',
        category,
        description: description.trim(),
        reportedPostId,
        reportedUserId,
      })

      if (!res.ok) {
        throw new Error(res.error || 'Failed to submit report.')
      }

      window.dispatchEvent(
        new CustomEvent('swish:toast', {
          detail: {
            title: 'Report submitted',
            body: 'Thank you for keeping our campus safe. Our moderators will review this post.',
            type: 'success',
          },
        })
      )
      onClose()
      setDescription('')
    } catch (err) {
      console.error('[ReportModal] submit failed:', err)
      setError(err.message || 'Failed to submit report. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-md bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-800 p-6 z-10"
        >
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-gray-800">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-rose-100 dark:bg-rose-950/40 text-rose-600 rounded-xl">
                <Flag size={18} />
              </div>
              <h3 className="font-bold text-slate-900 dark:text-white text-base">
                Report Post
              </h3>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 p-1.5 rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            {reportedUserName && (
              <p className="text-xs text-slate-500 dark:text-gray-400">
                Reporting content by <span className="font-semibold text-slate-700 dark:text-gray-200">{reportedUserName}</span>
              </p>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1.5">
                Reason
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-gray-200 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-gray-400 mb-1.5">
                Details
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Help us understand the issue (e.g. offensive language, personal info, copyright)..."
                maxLength={1000}
                rows={3}
                required
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl p-3 text-sm text-slate-800 dark:text-gray-200 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 resize-none"
              />
              <div className="text-right text-[11px] text-slate-400 mt-1">
                {description.length}/1000
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl text-xs text-rose-600 dark:text-rose-400">
                <AlertCircle size={14} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-slate-600 dark:text-gray-400 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-rose-600 hover:bg-rose-700 transition-colors shadow-xs disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? 'Submitting...' : 'Submit Report'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  )
}
