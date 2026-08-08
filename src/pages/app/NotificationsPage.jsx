import { useState } from 'react'
import { Heart, MessageCircle, UserPlus, Bell, Check, CheckCircle, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { notifications as initialNotifications } from '../../data/mockData'

const iconMap = {
  like:    { icon: Heart,         bg: 'bg-rose-50 dark:bg-rose-950/40',    color: 'text-rose-500'    },
  comment: { icon: MessageCircle, bg: 'bg-indigo-50 dark:bg-indigo-950/50', color: 'text-indigo-500'  },
  follow:  { icon: UserPlus,      bg: 'bg-emerald-50 dark:bg-emerald-950/40', color: 'text-emerald-500'},
}

function NotificationItem({ notification: n, index, onRead }) {
  const cfg  = iconMap[n.type] || iconMap.like
  const Icon = cfg.icon

  return (
    <motion.div
      initial={{ opacity: 0, x: -12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 12, height: 0, marginBottom: 0, padding: 0 }}
      transition={{ duration: 0.3, delay: index * 0.04 }}
      onClick={onRead}
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

      {/* User avatar */}
      <div
        className="w-9 h-9 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 mt-0.5"
        style={{ backgroundColor: n.user.avatarColor }}
      >
        {n.user.initials}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-slate-800 dark:text-gray-200 text-sm leading-snug">
          <span className="font-semibold">{n.user.name}</span>{' '}
          <span className="text-slate-600 dark:text-gray-400">{n.text}</span>
        </p>
        {n.subtext && (
          <p className="text-slate-400 dark:text-gray-500 text-xs mt-0.5 truncate italic">
            "{n.subtext}"
          </p>
        )}
        <p className="text-slate-300 dark:text-gray-600 text-xs mt-1.5">{n.time}</p>
      </div>

      {/* Unread dot */}
      {!n.read && (
        <div className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0 mt-2" />
      )}
    </motion.div>
  )
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState(initialNotifications)

  const markAllRead = () =>
    setNotifications(ns => ns.map(n => ({ ...n, read: true })))

  const markOneRead = (id) =>
    setNotifications(ns => ns.map(x => x.id === id ? { ...x, read: true } : x))

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
              <NotificationItem key={n.id} notification={n} index={i} onRead={() => {}} />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
