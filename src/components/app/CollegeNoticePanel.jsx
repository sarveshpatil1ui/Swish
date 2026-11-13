import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Megaphone, Calendar, User, Clock, AlertCircle,
  RefreshCw, X, ChevronRight, Building2, ShieldAlert, ChevronDown, ChevronUp
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { apiGetCollegeNotices } from '../../utils/auth'

function formatDate(dateStr) {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  })
}


function getNoticeAuthor(createdBy) {
  if (!createdBy) return 'College Admin'

  if (typeof createdBy === 'object') {
    const name = createdBy.name?.trim()
    const role = createdBy.role

    let roleLabel = 'College Admin'
    if (role === 'faculty') {
      roleLabel = 'Faculty'
    } else if (role === 'college_admin') {
      roleLabel = 'College Admin'
    } else if (role === 'admin' || role === 'main_admin') {
      roleLabel = 'Admin'
    }

    if (name) {
      return `${name} (${roleLabel})`
    }
    return roleLabel
  }

  return 'College Admin'
}

export function NoticeDetailModal({ notice, onClose }) {
  if (!notice) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-lg bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-xl shadow-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-base-100 dark:border-[rgba(255,255,255,0.07)]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent-50 dark:bg-accent-900/40 flex items-center justify-center text-accent-600 dark:text-accent-400">
              <Megaphone size={18} />
            </div>
            <div>
              <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                {notice.college || 'College Notice'}
              </span>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-base-400 hover:text-base-600 dark:hover:text-base-200 hover:bg-base-100 dark:hover:bg-base-800 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Priority & Audience Badges */}
          <div className="flex flex-wrap items-center gap-2">
            {notice.priority === 'urgent' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-400 border border-rose-200/50 dark:border-rose-900/50">
                <ShieldAlert size={12} /> Urgent
              </span>
            )}
            {notice.priority === 'high' && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200/50 dark:border-amber-900/50">
                High Priority
              </span>
            )}
            {notice.department && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-950/50 text-violet-700 dark:text-violet-400 border border-violet-200/50 dark:border-violet-900/50">
                <Building2 size={12} /> {notice.department}
              </span>
            )}
            {notice.targetAudience && notice.targetAudience !== 'all' && (
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 capitalize">
                Audience: {notice.targetAudience}
              </span>
            )}
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-base-900 dark:text-white leading-snug">
            {notice.title}
          </h2>

          {/* Meta Info */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-base-500 dark:text-base-400 py-2 border-y border-base-100 dark:border-[rgba(255,255,255,0.07)]">
            <span className="flex items-center gap-1.5 font-medium text-base-700 dark:text-base-300">
              <User size={14} className="text-indigo-500" />
              {getNoticeAuthor(notice.createdBy)}
            </span>
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              {formatDate(notice.publishedAt || notice.createdAt)}
            </span>
            {notice.expiresAt && (
              <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                <Clock size={14} /> Valid until {formatDate(notice.expiresAt)}
              </span>
            )}
          </div>

          {/* Main Notice Body */}
          <div className="text-sm text-base-700 dark:text-base-300 leading-relaxed whitespace-pre-line pt-2">
            {notice.content}
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-base-100 dark:border-[rgba(255,255,255,0.07)] bg-base-50/50 dark:bg-base-900/50">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-accent-500 text-white text-xs font-semibold rounded-lg hover:bg-accent-600 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function CollegeNoticePanel({ title = 'College Notices', className = '', collapsible = false, defaultOpen = true, showHeader = true }) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const { currentUser: user } = useSwish()
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedNotice, setSelectedNotice] = useState(null)

  // Explicitly do not render for Main/Super Admin
  if (user?.role === 'admin' || user?.role === 'main_admin') {
    return null
  }

  useEffect(() => {
    fetchNotices()
  }, [])

  const fetchNotices = async () => {
    try {
      setLoading(true)
      setError(null)
      const res = await apiGetCollegeNotices()
      if (res.ok && Array.isArray(res.notices)) {
        const seen = new Set()
        const unique = []
        for (const n of res.notices) {
          const id = (n.id || n._id)?.toString()
          if (id && !seen.has(id)) {
            seen.add(id)
            unique.push(n)
          }
        }
        setNotices(unique)
      } else {
        setError(res.error || 'Unable to load notices.')
      }
    } catch (err) {
      console.error('[CollegeNoticePanel] Error fetching notices:', err)
      setError('Failed to connect to campus notice service.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <div className={`bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-xl p-4 ${className}`}>
        {/* Header */}
        {showHeader && (
          <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center text-amber-600 dark:text-amber-400">
              <Megaphone size={15} />
            </div>
            <div>
              <h3 className="text-base-900 dark:text-white font-semibold text-sm leading-tight">
                {title}
              </h3>
              {user?.college && (
                <p className="text-[11px] text-base-400 dark:text-base-500 truncate max-w-[170px]">
                  {user.college}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={fetchNotices}
            disabled={loading}
            title="Refresh notices"
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          </button>
          {collapsible && (
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="p-1 rounded-lg text-slate-500 hover:text-slate-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={isOpen ? "Collapse notices" : "Expand notices"}
            >
              {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          )}
        </div>
      </div>
        )}

        {(!collapsible || isOpen) && (
          <>
        {/* Loading State */}
        {loading && notices.length === 0 && (
          <div className="space-y-3 py-2">
            {[1, 2].map(i => (
              <div key={i} className="animate-pulse p-3.5 bg-base-50 dark:bg-base-800/40 rounded-xl space-y-2">
                <div className="h-3.5 bg-base-200 dark:bg-base-700 rounded w-3/4" />
                <div className="h-2.5 bg-base-200 dark:bg-base-700 rounded w-full" />
                <div className="h-2 bg-base-200 dark:bg-base-700 rounded w-1/3 pt-1" />
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="py-4 text-center">
            <AlertCircle size={22} className="text-rose-500 mx-auto mb-1.5" />
            <p className="text-xs text-rose-600 dark:text-rose-400 mb-2">{error}</p>
            <button
              onClick={fetchNotices}
              className="text-[11px] font-semibold text-accent-500 dark:text-accent-400 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && notices.length === 0 && (
          <div className="text-center py-6 px-2">
            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center mx-auto mb-2 text-base-400 dark:text-base-500">
              <Megaphone size={18} />
            </div>
            <p className="text-base-700 dark:text-base-300 font-medium text-xs">
              No new notices
            </p>
            <p className="text-base-400 dark:text-base-500 text-[11px] mt-0.5">
              No new notices from your college.
            </p>
          </div>
        )}

        {/* Notice List */}
        {!error && notices.length > 0 && (
          <div className="space-y-2.5">
            {notices.slice(0, 5).map(notice => {
              const isUrgent = notice.priority === 'urgent'
              const isHigh = notice.priority === 'high'

              return (
                <div
                  key={notice.id || notice._id}
                  onClick={() => setSelectedNotice(notice)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setSelectedNotice(notice) }}
                  className={`group relative text-left p-3.5 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isUrgent
                      ? 'bg-rose-50/60 dark:bg-rose-950/20 border-rose-200/80 dark:border-rose-900/40 hover:border-rose-300 dark:hover:border-rose-800'
                      : isHigh
                      ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200/70 dark:border-amber-900/40 hover:border-amber-300 dark:hover:border-amber-800'
                      : 'bg-base-50/80 dark:bg-base-800/40 border-base-100 dark:border-[rgba(255,255,255,0.07)] hover:border-accent-300 dark:hover:border-accent-800/60 hover:bg-accent-50/30 dark:hover:bg-accent-900/20'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h4 className="text-xs font-bold text-base-900 dark:text-white line-clamp-2 group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">
                      {notice.title}
                    </h4>
                    {isUrgent && (
                      <span className="flex-shrink-0 text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-600 text-white flex items-center gap-1 shadow-sm shadow-rose-600/30">
                        <span className="h-1.5 w-1.5 rounded-full bg-white animate-pulse" />
                        Urgent
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-base-500 dark:text-base-400 line-clamp-2 mb-2 leading-relaxed">
                    {notice.content}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-base-400 dark:text-base-500 pt-1 border-t border-slate-200/40 dark:border-gray-800/60">
                    <span className="font-medium text-slate-600 dark:text-gray-400 truncate max-w-[180px]">
                      {getNoticeAuthor(notice.createdBy)}
                    </span>
                    <span>
                      {formatDate(notice.publishedAt || notice.createdAt)}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
          </>
        )}

      </div>

      {/* Notice Detail Modal */}
      <AnimatePresence>
        {selectedNotice && (
          <NoticeDetailModal
            notice={selectedNotice}
            onClose={() => setSelectedNotice(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
