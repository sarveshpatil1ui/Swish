import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MessageSquare,
  Heart,
  MessageCircle,
  UserPlus,
  Share2,
  X,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { useSocket } from '../../context/SocketContext'
import { useSwish } from '../../context/SwishContext'
import { resolveImageUrl } from '../../utils/posts'
import { playNotificationSound, showBrowserNotification } from '../../utils/notification'

export default function GlobalToast() {
  const { on, off } = useSocket()
  const { currentUser, setUnreadMsgCount, activeChatConvId } = useSwish()
  const navigate = useNavigate()
  const [toasts, setToasts] = useState([])

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }

  const addToast = (toast) => {
    const id = Date.now() + Math.random().toString(36).slice(2, 7)
    const newToast = { ...toast, id }
    setToasts((prev) => [...prev.slice(-3), newToast])

    const duration = toast.duration || 5000
    setTimeout(() => {
      removeToast(id)
    }, duration)
  }

  useEffect(() => {
    // ── Handle window custom event 'swish:toast' ───────────────────────────
    const onCustomToast = (e) => {
      if (e?.detail) {
        addToast(e.detail)
      }
    }
    window.addEventListener('swish:toast', onCustomToast)

    if (!on || !off) {
      return () => {
        window.removeEventListener('swish:toast', onCustomToast)
      }
    }

    // ── Real-time Direct Message Notification ─────────────────────────────
    const onMsgNotification = (data) => {
      if (!data) return
      // Ignore if sent by current user
      if (data.senderId && currentUser?.id && String(data.senderId) === String(currentUser.id)) {
        return
      }

      // If the user currently has this exact conversation open, don't show the popup toast
      if (activeChatConvId && String(activeChatConvId) === String(data.convId)) {
        return
      }

      // 1. Increment global unread count
      setUnreadMsgCount((prev) => prev + 1)

      // 2. Play subtle modern chime
      playNotificationSound()

      // 3. Optional desktop/mobile browser system notification
      showBrowserNotification(data.senderName || 'New Message', {
        body: data.text || 'Sent you a direct message',
        icon: resolveImageUrl(data.senderProfilePhoto) || '/favicon.ico',
        onClick: () => {
          const targetUrl =
            currentUser?.role === 'college_admin'
              ? `/college-admin/messages?convId=${data.convId}`
              : `/messages?convId=${data.convId}`
          navigate(targetUrl)
        },
      })

      // 4. In-App Floating Toast Popup
      addToast({
        type: 'message',
        title: data.senderName || 'New Message',
        body: data.text || '',
        avatarColor: data.senderAvatarColor || '#6366f1',
        profilePhoto: data.senderProfilePhoto || null,
        initials: data.senderInitials || '??',
        convId: data.convId,
        onClick: () => {
          const targetUrl =
            currentUser?.role === 'college_admin'
              ? `/college-admin/messages?convId=${data.convId}`
              : `/messages?convId=${data.convId}`
          navigate(targetUrl)
        },
      })
    }

    // ── Real-time Notification (like, comment, story reply) ───────────────
    const onNotificationNew = (notif) => {
      if (!notif) return
      playNotificationSound()

      addToast({
        type: notif.type || 'info',
        title: `${notif.user?.name || 'Someone'} ${notif.text || ''}`,
        body:
          notif.subtext ||
          (notif.type === 'like'
            ? 'Liked your post'
            : notif.type === 'comment'
            ? 'Commented on your post'
            : 'New activity on your profile'),
        onClick: () => {
          if (notif.postId) {
            navigate(`/post/${notif.postId}`)
          } else {
            navigate('/notifications')
          }
        },
      })
    }

    // ── Real-time Follow Notification ─────────────────────────────────────
    const onFollowReceived = ({ fromUserName, fromUserId }) => {
      playNotificationSound()
      addToast({
        type: 'follow',
        title: `${fromUserName || 'Someone'} followed you`,
        body: 'Check out their profile on Swish',
        onClick: () => {
          if (fromUserId) {
            navigate(`/profile/${fromUserId}`)
          }
        },
      })
    }

    on('msg:notification', onMsgNotification)
    on('notification:new', onNotificationNew)
    on('follow:received', onFollowReceived)

    return () => {
      off('msg:notification', onMsgNotification)
      off('notification:new', onNotificationNew)
      off('follow:received', onFollowReceived)
      window.removeEventListener('swish:toast', onCustomToast)
    }
  }, [on, off, currentUser?.id, currentUser?.role, activeChatConvId, setUnreadMsgCount, navigate])

  return (
    <div
      className="fixed top-3 sm:top-5 inset-x-3 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2 z-[100] w-auto sm:w-[420px] max-w-full flex flex-col items-center gap-2 pointer-events-none"
      aria-live="polite"
    >
      <AnimatePresence>
        {toasts.map((t) => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, y: -24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -16, scale: 0.94 }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            onClick={() => {
              if (t.onClick) {
                t.onClick()
                removeToast(t.id)
              }
            }}
            className={`pointer-events-auto w-full group relative overflow-hidden backdrop-blur-xl bg-white/95 dark:bg-gray-900/95 border border-slate-200/90 dark:border-gray-800/90 shadow-2xl shadow-indigo-900/10 dark:shadow-black/50 rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 transition-all ${
              t.onClick
                ? 'cursor-pointer hover:border-indigo-400 dark:hover:border-indigo-500 hover:shadow-indigo-500/15 active:scale-[0.98]'
                : ''
            }`}
          >
            {/* Top gradient highlight bar for visual polish */}
            <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-80" />

            {/* Avatar / Icon Container */}
            <div className="relative flex-shrink-0">
              {t.type === 'message' ? (
                resolveImageUrl(t.profilePhoto) ? (
                  <div className="relative">
                    <img
                      src={resolveImageUrl(t.profilePhoto)}
                      alt=""
                      className="w-10 h-10 rounded-xl object-cover ring-2 ring-indigo-500/20"
                    />
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-indigo-600 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
                      <MessageSquare size={8} className="text-white fill-white" />
                    </span>
                  </div>
                ) : (
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-xs font-bold ring-2 ring-indigo-500/20 relative"
                    style={{ backgroundColor: t.avatarColor || '#6366f1' }}
                  >
                    {t.initials || 'U'}
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-indigo-600 rounded-full flex items-center justify-center ring-2 ring-white dark:ring-gray-900">
                      <MessageSquare size={8} className="text-white fill-white" />
                    </span>
                  </div>
                )
              ) : (
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                    t.type === 'like'
                      ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-500'
                      : t.type === 'comment'
                      ? 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                      : t.type === 'follow'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : t.type === 'share'
                      ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400'
                      : 'bg-violet-100 dark:bg-violet-950/60 text-violet-600 dark:text-violet-400'
                  }`}
                >
                  {t.type === 'like' && <Heart size={18} className="fill-rose-500" />}
                  {t.type === 'comment' && <MessageCircle size={18} />}
                  {t.type === 'follow' && <UserPlus size={18} />}
                  {t.type === 'share' && <Share2 size={18} />}
                  {t.type !== 'like' &&
                    t.type !== 'comment' &&
                    t.type !== 'follow' &&
                    t.type !== 'share' && <Sparkles size={18} />}
                </div>
              )}
            </div>

            {/* Content Text */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-slate-900 dark:text-white text-sm font-bold truncate tracking-tight">
                  {t.title}
                </p>
                <span className="text-[10px] text-indigo-500 font-semibold uppercase tracking-wider flex-shrink-0">
                  {t.type === 'message' ? 'Message' : 'New'}
                </span>
              </div>
              <p className="text-slate-600 dark:text-slate-300 text-xs truncate mt-0.5 font-normal">
                {t.body}
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {t.onClick && (
                <span className="hidden sm:inline-flex items-center gap-1 text-[11px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 px-2.5 py-1 rounded-lg transition-colors">
                  Reply
                  <ChevronRight size={13} />
                </span>
              )}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  removeToast(t.id)
                }}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
                aria-label="Dismiss notification"
              >
                <X size={14} />
              </button>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
