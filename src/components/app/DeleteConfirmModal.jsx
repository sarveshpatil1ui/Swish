import { motion } from 'framer-motion'
import { AlertTriangle } from 'lucide-react'

export default function DeleteConfirmModal({ title = 'Delete this post?', message = 'This action cannot be undone.', onConfirm, onCancel, loading = false }) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onCancel}
        className="fixed inset-0 bg-black/50 dark:bg-black/70 z-[60] backdrop-blur-sm"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.92 }}
        transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      >
        <div className="w-full max-w-sm bg-white dark:bg-gray-900 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-6 text-center">
            <div className="w-12 h-12 bg-rose-100 dark:bg-rose-950/40 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle size={22} className="text-rose-500" />
            </div>
            <h3 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="text-slate-900 dark:text-white font-bold text-lg mb-1">
              {title}
            </h3>
            <p className="text-slate-500 dark:text-gray-400 text-sm">{message}</p>
          </div>
          <div className="flex border-t border-slate-100 dark:border-gray-800">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3.5 text-sm font-semibold text-slate-600 dark:text-gray-400 hover:bg-slate-50 dark:hover:bg-gray-800 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3.5 text-sm font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all border-l border-slate-100 dark:border-gray-800 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <span className="w-4 h-4 border-2 border-rose-300 border-t-rose-600 rounded-full animate-spin" /> : 'Delete'}
            </button>
          </div>
        </div>
      </motion.div>
    </>
  )
}
