import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Bell,
  Check,
  CheckCheck,
  Building2,
  AlertTriangle,
  ShieldCheck,
  Clock,
  Trash2,
  ExternalLink,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { playNotificationSound } from '../../utils/notification'
import {
  apiGetAdminNotifications,
  apiMarkAdminNotificationRead,
  apiMarkAllAdminNotificationsRead,
  apiDeleteAdminNotification,
} from '../../utils/auth'
import { useSocket } from '../../context/SocketContext'

function formatTimeAgo(dateString) {
  if (!dateString) return ''
  const date = new Date(dateString)
  const now = new Date()
  const diffSec = Math.floor((now - date) / 1000)

  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHour = Math.floor(diffMin / 60)
  if (diffHour < 24) return `${diffHour}h ago`
  const diffDay = Math.floor(diffHour / 24)
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export default function AdminNotificationsPopover({
  onNavigateToRequest = null,
  onNavigateToSection = null,
}) {
  const [isOpen, setIsOpen] = useState(false)
  const [filter, setFilter] = useState('all') // 'all' | 'unread'
  const [notifications, setNotifications] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [actionLoadingId, setActionLoadingId] = useState(null)
  const [soundEnabled, setSoundEnabled] = useState(true)

  const popoverRef = useRef(null)
  const socketCtx = useSocket()
  const socketOn = socketCtx?.on
  const socketOff = socketCtx?.off

  // ── Fetch notifications ────────────────────────────────────────────────────
  const loadNotifications = useCallback(async () => {
    try {
      setLoading(true)
      const res = await apiGetAdminNotifications({ limit: 40 })
      if (res && res.ok) {
        setNotifications(res.notifications || [])
        setUnreadCount(typeof res.unreadCount === 'number' ? res.unreadCount : 0)
      }
    } catch (err) {
      console.error('[AdminNotifications] Error loading notifications:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadNotifications()
  }, [loadNotifications])

  // ── Real-time Socket Listener for Admin Notifications ─────────────────────
  useEffect(() => {
    if (!socketOn || !socketOff) return

    const handleNewAdminNotif = (notif) => {
      if (!notif) return
      setNotifications((prev) => {
        const id = notif.id || notif._id
        const exists = prev.some((n) => (n.id || n._id) === id)
        if (exists) return prev
        return [{ ...notif, id: id?.toString() }, ...prev]
      })
      setUnreadCount((prev) => prev + 1)
      if (soundEnabled) {
        playNotificationSound()
      }
    }

    socketOn('admin:notification:new', handleNewAdminNotif)
    return () => {
      socketOff('admin:notification:new', handleNewAdminNotif)
    }
  }, [socketOn, socketOff])

  // ── Close on outside click ─────────────────────────────────────────────────
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick)
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick)
    }
  }, [isOpen])

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleMarkAsRead = async (e, id) => {
    e.stopPropagation()
    setActionLoadingId(id)
    try {
      const res = await apiMarkAdminNotificationRead(id)
      if (res && res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        )
        if (typeof res.unreadCount === 'number') {
          setUnreadCount(res.unreadCount)
        } else {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
      }
    } catch (err) {
      console.error('[AdminNotifications] Mark as read failed:', err)
    } finally {
      setActionLoadingId(null)
    }
  }

  const handleMarkAllRead = async () => {
    try {
      const res = await apiMarkAllAdminNotificationsRead()
      if (res && res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
        setUnreadCount(0)
      }
    } catch (err) {
      console.error('[AdminNotifications] Mark all read failed:', err)
    }
  }

  const handleDelete = async (e, id) => {
    e.stopPropagation()
    setActionLoadingId(id)
    try {
      const res = await apiDeleteAdminNotification(id)
      if (res && res.ok) {
        const target = notifications.find((n) => n.id === id)
        if (target && !target.read) {
          setUnreadCount((prev) => Math.max(0, prev - 1))
        }
        setNotifications((prev) => prev.filter((n) => n.id !== id))
      }
    } catch (err) {
      console.error('[AdminNotifications] Delete failed:', err)
    } finally {
      setActionLoadingId(null)
    }
  }

  // ── Click to Navigate ──────────────────────────────────────────────────────
  const handleNotificationClick = async (notif) => {
    // 1. Mark as read if not read
    if (!notif.read) {
      handleMarkAsRead({ stopPropagation: () => {} }, notif.id)
    }

    // 2. Perform contextual navigation
    setIsOpen(false)

    if (notif.type === 'college_request') {
      const requestId = notif.data?.requestId
      if (requestId && onNavigateToRequest) {
        onNavigateToRequest(requestId)
        return
      }
      if (onNavigateToSection) {
        onNavigateToSection('Pending Requests')
        return
      }
    }

    if (notif.type === 'platform_report') {
      if (onNavigateToSection) {
        onNavigateToSection('Reports')
        return
      }
    }

    if (onNavigateToSection) {
      onNavigateToSection('Dashboard')
    }
  }

  // Filtered list
  const displayList =
    filter === 'unread' ? notifications.filter((n) => !n.read) : notifications

  // Visual helper per type
  const getTypeMeta = (type) => {
    switch (type) {
      case 'college_request':
        return {
          icon: Building2,
          bgClass: 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400',
          badge: 'College Request',
          badgeClass: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-800/60',
        }
      case 'platform_report':
        return {
          icon: AlertTriangle,
          bgClass: 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400',
          badge: 'Grievance / Bug',
          badgeClass: 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300 border-amber-200/60 dark:border-amber-800/60',
        }
      case 'admin_security':
        return {
          icon: ShieldCheck,
          bgClass: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400',
          badge: 'Security',
          badgeClass: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-800/60',
        }
      default:
        return {
          icon: Bell,
          bgClass: 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300',
          badge: 'System',
          badgeClass: 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-300 border-slate-200/60 dark:border-gray-700',
        }
    }
  }

  return (
    <div className="relative" ref={popoverRef}>
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`relative p-2 rounded-xl transition-all duration-200 ${
          isOpen
            ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400'
            : 'text-slate-500 hover:text-slate-800 dark:text-gray-400 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800'
        }`}
        title="Admin Notifications"
        aria-label="Admin Notifications"
      >
        <Bell size={18} className="transition-transform active:scale-95" />

        {/* Dynamic Unread Badge */}
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-gray-950 shadow-sm animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white dark:bg-gray-900 border border-slate-200/90 dark:border-gray-800 rounded-2xl shadow-2xl shadow-slate-300/40 dark:shadow-black/60 z-50 overflow-hidden flex flex-col max-h-[85vh] animate-in fade-in slide-in-from-top-2 duration-150">
          {/* Header */}
          <div className="p-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/50 dark:bg-gray-900/50">
            <div className="flex items-center gap-2">
              <h3
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="text-sm font-bold text-slate-900 dark:text-white tracking-tight"
              >
                Notifications
              </h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 text-[11px] font-bold rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAllRead}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors"
                  title="Mark all as read"
                >
                  <CheckCheck size={13} />
                  <span>Mark all read</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const nextState = !soundEnabled
                  setSoundEnabled(nextState)
                  if (nextState) playNotificationSound()
                }}
                className={`p-1 rounded-md transition-colors ${
                  soundEnabled
                    ? 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-gray-300'
                }`}
                title={soundEnabled ? 'Notification chime active (Click to mute)' : 'Notification chime muted (Click to enable)'}
              >
                {soundEnabled ? <Volume2 size={13} /> : <VolumeX size={13} />}
              </button>
              <button
                type="button"
                onClick={loadNotifications}
                disabled={loading}
                className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 rounded-md transition-colors"
                title="Refresh"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              </button>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-1 px-3 py-2 border-b border-slate-100 dark:border-gray-800/80 bg-white dark:bg-gray-900 text-xs font-medium">
            <button
              type="button"
              onClick={() => setFilter('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filter === 'all'
                  ? 'bg-slate-100 dark:bg-gray-800 font-semibold text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              onClick={() => setFilter('unread')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                filter === 'unread'
                  ? 'bg-slate-100 dark:bg-gray-800 font-semibold text-slate-900 dark:text-white'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Unread ({unreadCount})
            </button>
          </div>

          {/* Notification List */}
          <div className="overflow-y-auto divide-y divide-slate-100 dark:divide-gray-800/80 max-h-[380px]">
            {loading && notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400 dark:text-gray-500 text-xs">
                <RefreshCw size={18} className="animate-spin text-indigo-600" />
                <span>Loading notifications...</span>
              </div>
            ) : displayList.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-400 dark:text-gray-500 mb-2">
                  <Sparkles size={18} />
                </div>
                <p className="text-xs font-semibold text-slate-700 dark:text-gray-300">
                  {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
                </p>
                <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">
                  {filter === 'unread'
                    ? 'No unread platform notifications at the moment.'
                    : 'High-signal platform alerts and onboarding requests will appear here.'}
                </p>
              </div>
            ) : (
              displayList.map((notif) => {
                const meta = getTypeMeta(notif.type)
                const IconComponent = meta.icon

                return (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`p-3.5 flex items-start gap-3 transition-colors cursor-pointer group ${
                      notif.read
                        ? 'hover:bg-slate-50 dark:hover:bg-gray-800/40 bg-white dark:bg-gray-900'
                        : 'bg-indigo-50/30 dark:bg-indigo-950/20 hover:bg-indigo-50/50 dark:hover:bg-indigo-950/40'
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${meta.bgClass}`}
                    >
                      <IconComponent size={16} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${meta.badgeClass}`}
                        >
                          {meta.badge}
                        </span>
                        <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-gray-500">
                          <Clock size={10} />
                          <span>{formatTimeAgo(notif.createdAt)}</span>
                        </div>
                      </div>

                      <p
                        className={`text-xs font-semibold truncate ${
                          notif.read
                            ? 'text-slate-800 dark:text-gray-200'
                            : 'text-slate-900 dark:text-white font-bold'
                        }`}
                      >
                        {notif.title}
                      </p>

                      <p className="text-[11px] text-slate-500 dark:text-gray-400 line-clamp-2 mt-0.5 leading-relaxed">
                        {notif.message}
                      </p>

                      {/* Click prompt */}
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-indigo-600 dark:text-indigo-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <span>View details</span>
                        <ExternalLink size={10} />
                      </div>
                    </div>

                    {/* Right action buttons */}
                    <div className="flex flex-col items-center gap-1 shrink-0 self-center">
                      {!notif.read && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(e, notif.id)}
                          disabled={actionLoadingId === notif.id}
                          className="p-1 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-950/60 rounded-md transition-colors"
                          title="Mark as read"
                        >
                          <Check size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(e) => handleDelete(e, notif.id)}
                        disabled={actionLoadingId === notif.id}
                        className="p-1 text-slate-300 dark:text-gray-600 hover:text-rose-500 dark:hover:text-rose-400 rounded-md transition-colors opacity-0 group-hover:opacity-100"
                        title="Delete notification"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 bg-slate-50/80 dark:bg-gray-900/80 border-t border-slate-100 dark:border-gray-800 text-center">
            <p className="text-[10px] text-slate-400 dark:text-gray-500">
              Only platform-level events & user grievances appear here
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

