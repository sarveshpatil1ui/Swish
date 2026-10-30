import { useState, useEffect } from 'react'
import { NoticeDetailModal } from '../../components/app/CollegeNoticePanel'
import { apiGetNoticeById, apiGetCollegeNotices } from '../../utils/auth'
import { useNavigate } from 'react-router-dom'
import { Heart, MessageCircle, UserPlus, UserCheck, Bell, Check, CheckCircle, AtSign, Calendar, Loader2, ShieldCheck, X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSwish } from '../../context/SwishContext'

const iconMap = {
  like:           { icon: Heart,         bg: 'bg-rose-50 dark:bg-rose-950/40',       color: 'text-rose-500'    },
  comment:        { icon: MessageCircle, bg: 'bg-indigo-50 dark:bg-indigo-950/50',   color: 'text-indigo-500'  },
  follow:         { icon: UserPlus,      bg: 'bg-emerald-50 dark:bg-emerald-950/40', color: 'text-emerald-500'},
  follow_request: { icon: UserPlus,      bg: 'bg-violet-50 dark:bg-violet-950/40',   color: 'text-violet-500'  },
  follow_accept:  { icon: UserCheck,     bg: 'bg-emerald-50 dark:bg-emerald-950/40', color: 'text-emerald-500'},
  mention:        { icon: AtSign,        bg: 'bg-violet-50 dark:bg-violet-950/40',   color: 'text-violet-500'  },
  event:          { icon: Calendar,      bg: 'bg-amber-50 dark:bg-amber-950/40',     color: 'text-amber-500'   },
  report_update:  { icon: ShieldCheck,   bg: 'bg-emerald-50 dark:bg-emerald-950/40', color: 'text-emerald-500'},
}

function ReportResolutionModal({ notification: n, onClose }) {
  if (!n) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Platform Report Update
              </h3>
              <p className="text-[11px] text-slate-400">Official Swish Support Team</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 rounded-lg transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        <div className="bg-slate-50 dark:bg-gray-800/50 p-3.5 rounded-xl text-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-gray-400">Status:</span>
            <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 capitalize">
              {n.text?.includes('resolved') ? 'Resolved' : n.text?.includes('reviewing') ? 'Under Review' : 'Closed'}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-500 dark:text-gray-400">Update Time:</span>
            <span className="text-slate-700 dark:text-gray-300 font-medium">{n.time}</span>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-500 dark:text-gray-400 mb-1.5">
            Admin Feedback / Resolution Note:
          </label>
          <div className="p-3.5 bg-slate-50 dark:bg-gray-800/40 border border-slate-200/80 dark:border-gray-700/80 rounded-xl text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
            {n.subtext?.replace(/^Admin Note:\s*"?/, '').replace(/"?$/, '') || 'Your report has been received and processed by the platform administration team.'}
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
          >
            Got It
          </button>
        </div>
      </motion.div>
    </div>
  )
}

function NotificationItem({ notification: n, index, onRead, onSelectNotice, onSelectReport, onAcceptRequest, onRejectRequest }) {
  const isSystemNotification = n.type === 'report_update' || n.user?.isSystem || !n.user?.id
  const navigate = useNavigate()
  const cfg  = iconMap[n.type] || iconMap.like
  const Icon = cfg.icon
  const [actionStatus, setActionStatus] = useState(null) // 'accepted' | 'rejected' | 'loading_accept' | 'loading_reject'

  const handleProfileClick = (e) => {
    e.stopPropagation()
    if (isSystemNotification) return
    if (n.user?.id) {
      navigate(`/profile/${n.user.id}`)
    }
  }

  const handleAccept = async (e) => {
    e.stopPropagation()
    if (!n.user?.id || actionStatus) return
    setActionStatus('loading_accept')
    try {
      const res = await onAcceptRequest?.(n.user.id)
      if (res?.ok) {
        setActionStatus('accepted')
        onRead?.(n.id)
      } else {
        setActionStatus(null)
      }
    } catch {
      setActionStatus(null)
    }
  }

  const handleReject = async (e) => {
    e.stopPropagation()
    if (!n.user?.id || actionStatus) return
    setActionStatus('loading_reject')
    try {
      const res = await onRejectRequest?.(n.user.id)
      if (res?.ok) {
        setActionStatus('rejected')
        onRead?.(n.id)
      } else {
        setActionStatus(null)
      }
    } catch {
      setActionStatus(null)
    }
  }

  const handleClick = () => {
    onRead(n.id)
    if (isSystemNotification || n.type === 'report_update') {
      if (onSelectReport) {
        onSelectReport(n)
      }
      return
    }
    if (n.type === 'event' || n.noticeId) {
      if (onSelectNotice) {
        onSelectNotice(n)
        return
      }
    }
    if (n.postId) {
      navigate(`/post/${n.postId}`)
    } else if (n.user?.id) {
      navigate(`/profile/${n.user.id}`)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0, padding: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      onClick={handleClick}
      className={`flex items-start gap-3 p-4 rounded-2xl border transition-all cursor-pointer select-none ${
        !n.read
          ? 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-100 dark:border-indigo-900/50 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 active:bg-indigo-100 dark:active:bg-indigo-950/50'
          : 'bg-white dark:bg-gray-900 border-slate-200 dark:border-gray-800 hover:bg-slate-50 dark:hover:bg-gray-800/60 active:bg-slate-100 dark:active:bg-gray-800'
      }`}
    >
      {/* Type icon chip */}
      <div className={`w-9 h-9 ${cfg.bg} rounded-full flex items-center justify-center flex-shrink-0 mt-0.5`}>
        <Icon size={16} className={cfg.color} />
      </div>

      {/* User / System avatar */}
      {isSystemNotification ? (
        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 mt-0.5 shadow-xs">
          <ShieldCheck size={16} />
        </div>
      ) : (
        <div onClick={handleProfileClick} className="cursor-pointer hover:opacity-85 transition-opacity">
          {n.user?.profilePhoto ? (
            <img
              src={n.user.profilePhoto}
              alt={n.user.name}
              className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5"
            />
          ) : (
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
              style={{ backgroundColor: n.user?.avatarColor || '#6366f1' }}
            >
              {n.user?.initials || '??'}
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-slate-800 dark:text-gray-200 text-sm leading-snug">
          {isSystemNotification ? (
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {n.user?.name || 'Swish Support Team'}
            </span>
          ) : (
            <span onClick={handleProfileClick} className="font-semibold hover:underline cursor-pointer">
              {n.user?.name}
            </span>
          )}{' '}
          <span className="text-slate-600 dark:text-gray-400">{n.text}</span>
        </p>
        {n.subtext && (
          <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5 truncate italic">
            "{n.subtext}"
          </p>
        )}
        <p className="text-slate-300 dark:text-gray-600 text-xs mt-1.5">{n.time}</p>

        {/* Follow request interactive actions */}
        {n.type === 'follow_request' && (
          <div className="mt-2.5">
            {actionStatus === 'accepted' ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <Check size={14} /> Request accepted
              </span>
            ) : actionStatus === 'rejected' ? (
              <span className="inline-flex items-center text-xs text-slate-400 dark:text-gray-500 italic">
                Request declined
              </span>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={Boolean(actionStatus)}
                  onClick={handleAccept}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white text-xs font-semibold rounded-lg shadow-sm transition-all disabled:opacity-60 flex items-center gap-1"
                >
                  {actionStatus === 'loading_accept' && <Loader2 size={12} className="animate-spin" />}
                  Confirm
                </button>
                <button
                  type="button"
                  disabled={Boolean(actionStatus)}
                  onClick={handleReject}
                  className="px-3.5 py-1.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 active:bg-slate-300 dark:active:bg-gray-600 text-slate-700 dark:text-gray-200 text-xs font-semibold rounded-lg transition-all disabled:opacity-60 flex items-center gap-1"
                >
                  {actionStatus === 'loading_reject' && <Loader2 size={12} className="animate-spin" />}
                  Delete
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Unread dot */}
      {!n.read && (
        <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />
      )}
    </motion.div>
  )
}

export default function NotificationsPage() {
  const {
    currentUser,
    notifications = [],
    fetchNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    acceptFollowRequest,
    rejectFollowRequest,
  } = useSwish()
  const [selectedNotice, setSelectedNotice] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)

  const handleSelectNotice = async (n) => {
    if (n.noticeId) {
      try {
        const res = await apiGetNoticeById(n.noticeId)
        if (res?.ok && res.notice) {
          setSelectedNotice(res.notice)
          return
        }
      } catch (err) {
        console.warn('[NotificationsPage] Notice by ID fetch error:', err)
      }
    }

    // Fallback: match by title from college notices
    try {
      const res = await apiGetCollegeNotices()
      if (res?.ok && Array.isArray(res.notices)) {
        const match = res.notices.find(item =>
          (n.noticeId && (item.id === n.noticeId || item._id === n.noticeId)) ||
          (n.subtext && item.title?.trim().toLowerCase() === n.subtext?.trim().toLowerCase())
        )
        if (match) {
          setSelectedNotice(match)
          return
        }
      }
    } catch (err) {
      console.warn('[NotificationsPage] College notices search error:', err)
    }

    // Graceful fallback modal object
    setSelectedNotice({
      title: n.subtext || 'Campus Notice',
      content: n.text || 'Official campus announcement.',
      createdBy: n.user,
      createdAt: n.createdAt,
      college: currentUser?.college || 'College Notice',
    })
  }

  useEffect(() => {
    fetchNotifications?.()
  }, [])

  const markAllRead = () => markAllNotificationsRead?.()
  const markOneRead = (id) => markNotificationRead?.(id)

  const unreadCount    = notifications.filter(n => !n.read).length
  const allRead        = unreadCount === 0
  const unreadItems    = notifications.filter(n => !n.read)
  const readItems      = notifications.filter(n => n.read)

  return (
    <div className="max-w-xl mx-auto px-4 py-6 pb-24 md:pb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="text-slate-900 dark:text-white font-bold text-xl"
          >
            Notifications
          </h1>
          {unreadCount > 0 && (
            <p className="text-slate-400 dark:text-gray-500 text-sm mt-0.5">
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={markAllRead}
            className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:text-indigo-700 dark:hover:text-indigo-300 px-3 py-1.5 rounded-lg hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-all"
          >
            <Check size={15} />
            Mark all read
          </button>
        )}
      </div>

      {/* All-caught-up celebration */}
      <AnimatePresence>
        {allRead && (
          <motion.div
            key="all-read"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.4 }}
            className="text-center py-20"
          >
            <div className="w-16 h-16 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900 rounded-2xl flex items-center justify-center mx-auto mb-5">
              <CheckCircle size={28} className="text-emerald-500" />
            </div>
            <h3
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="text-slate-900 dark:text-white font-bold text-base mb-1"
            >
              All caught up!
            </h3>
            <p className="text-slate-400 dark:text-gray-500 text-sm">
              No new notifications right now. Check back later.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unread section */}
      {unreadItems.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-semibold text-slate-400 dark:text-gray-600 uppercase tracking-wider mb-3">
            New
          </p>
          <div className="space-y-2">
            {unreadItems.map((n, i) => (
              <NotificationItem
                key={n.id}
                notification={n}
                index={i}
                onRead={() => markOneRead(n.id)}
                onSelectNotice={handleSelectNotice}
                onSelectReport={(reportNotif) => setSelectedReport(reportNotif)}
                onAcceptRequest={acceptFollowRequest}
                onRejectRequest={rejectFollowRequest}
              />
            ))}
          </div>
        </div>
      )}

      {/* Read section */}
      {readItems.length > 0 && !allRead && (
        <div>
          <p className="text-xs font-semibold text-slate-400 dark:text-gray-600 uppercase tracking-wider mb-3">
            Earlier
          </p>
          <div className="space-y-2">
            {readItems.map((n, i) => (
              <NotificationItem
                key={n.id}
                notification={n}
                index={i}
                onRead={() => {}}
                onSelectNotice={handleSelectNotice}
                onSelectReport={(reportNotif) => setSelectedReport(reportNotif)}
                onAcceptRequest={acceptFollowRequest}
                onRejectRequest={rejectFollowRequest}
              />
            ))}
          </div>
        </div>
      )}
            {/* Report Resolution Modal */}
      <AnimatePresence>
        {selectedReport && (
          <ReportResolutionModal
            notification={selectedReport}
            onClose={() => setSelectedReport(null)}
          />
        )}
      </AnimatePresence>
      {/* Notice Detail Modal */}
      <AnimatePresence>
        {selectedNotice && (
          <NoticeDetailModal
            notice={selectedNotice}
            onClose={() => setSelectedNotice(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
