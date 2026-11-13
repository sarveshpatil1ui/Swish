import { useState, useRef, useEffect, useCallback } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Edit, Info, Send, Smile,
  ChevronLeft, CheckCheck, Check,
  X, Reply, MessageSquare, Loader2, UserSearch, Wifi, WifiOff, ExternalLink, Lock,
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { useSocket } from '../../context/SocketContext'
import { getStoredToken, apiMarkConvRead } from '../../utils/auth'
import EmojiPicker from '../../components/app/EmojiPicker'
import { resolveImageUrl } from '../../utils/posts'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function api(path, opts = {}) {
  const token = getStoredToken()
  const headers = { 'Content-Type': 'application/json', ...opts.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API}${path}`, {
    credentials: 'include',
    ...opts,
    headers,
    body: opts.body ? JSON.stringify(opts.body) : undefined,
  })
  return res.json().catch(() => ({ ok: false, error: 'Unexpected response.' }))
}

// ─── Helpers ───────────────────────────────────────────────────────────────────
function relativeTime(dateStr) {
  if (!dateStr) return ''
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins  = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days  = Math.floor(diff / 86400000)
  if (mins  < 1)  return 'now'
  if (mins  < 60) return `${mins}m`
  if (hours < 24) return `${hours}h`
  if (days  < 7)  return `${days}d`
  return new Date(dateStr).toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function msgTime(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

// ─── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ name, initials, avatarColor, profilePhoto, online, size = 'md' }) {
  const [imgError, setImgError] = useState(false)
  const sizes = { sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-14 h-14 text-base' }
  const dots  = { sm: 'w-2.5 h-2.5 border-[1.5px]', md: 'w-3 h-3 border-2', lg: 'w-3.5 h-3.5 border-2' }
  const src = profilePhoto
    ? (profilePhoto.startsWith('http://') || profilePhoto.startsWith('https://') || profilePhoto.startsWith('blob:')
        ? profilePhoto
        : profilePhoto.startsWith('/uploads/')
        ? `${API}${profilePhoto}`
        : `${API}/${profilePhoto}`)
    : null

  return (
    <div className="relative flex-shrink-0">
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          crossOrigin="anonymous"
          referrerPolicy="no-referrer"
          className={`${sizes[size]} rounded-full object-cover`}
        />
      ) : (
        <div className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-bold`} style={{ backgroundColor: avatarColor || '#5B5FEF' }}>
          {initials || '?'}
        </div>
      )}
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 ${dots[size]} rounded-full border-white dark:border-base-950 ${online ? 'bg-emerald-500' : 'bg-base-300 dark:bg-base-600'}`} />
      )}
    </div>
  )
}

// ─── Shared Post Card ──────────────────────────────────────────────────────────
function SharedPostCard({ postShare, isMe }) {
  const [imgError, setImgError] = useState(false)
  const resolvedImg = postShare?.imageUrl ? resolveImageUrl(postShare.imageUrl) : null

  return (
    <div
      className={`rounded-xl overflow-hidden border transition-all ${
        isMe
          ? 'bg-accent-600 border-accent-400/50 text-white'
          : 'bg-base-50 dark:bg-base-850 border-base-200 dark:border-base-750 text-base-900 dark:text-white'
      }`}
    >
      {/* Header */}
      <div className="flex items-center gap-1.5 px-3 py-2 border-b border-white/10 dark:border-base-800">
        <span className="w-1.5 h-1.5 rounded-full bg-accent-400" />
        <span className="text-[11px] font-semibold truncate">
          {postShare.authorName || 'Swish user'}
        </span>
      </div>

      {/* Media thumbnail */}
      {resolvedImg && !imgError && (
        <div className="relative w-full h-44 sm:h-52 bg-base-950 overflow-hidden">
          <img
            src={resolvedImg}
            alt=""
            onError={() => setImgError(true)}
            className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      )}

      {/* Caption snippet */}
      {postShare.caption && (
        <div className="px-3 pt-2 pb-1">
          <p className="text-xs line-clamp-2 leading-relaxed opacity-90">
            {postShare.caption}
          </p>
        </div>
      )}

      {/* Action link */}
      <div className="p-2">
        <Link
          to={`/post/${postShare.postId}`}
          className={`flex items-center justify-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg transition-all ${
            isMe
              ? 'bg-white text-accent-700 hover:bg-white/90 shadow-xs'
              : 'bg-accent-500 hover:bg-accent-600 text-white shadow-xs'
          }`}
        >
          <span>View Post</span>
          <ExternalLink size={12} />
        </Link>
      </div>
    </div>
  )
}

// ─── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe, showSeen, onReply, onScrollToMessage }) {
  const storyReply = msg.storyReply
  const isReaction = msg.text?.startsWith('Reacted ') && msg.text?.includes(' to your story')
  const reactionEmoji =
    storyReply?.reaction ||
    (isReaction ? msg.text.replace('Reacted ', '').replace(' to your story', '').trim() : null)

  const resolvedStoryImg = storyReply?.imageUrl ? resolveImageUrl(storyReply.imageUrl) : null

  return (
    <div
      id={`msg-${msg.id}`}
      className={`relative flex ${isMe ? 'justify-end' : 'justify-start'} mb-2 group/bubble transition-all duration-300`}
    >
      {/* Draggable bubble wrapper */}
      <motion.div
        drag="x"
        dragDirectionLock
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={{ left: 0.05, right: 0.45 }}
        onDragEnd={(_e, info) => {
          if (info.offset.x > 50) {
            if (typeof navigator !== 'undefined' && navigator.vibrate) {
              navigator.vibrate(25)
            }
            onReply?.(msg)
          }
        }}
        className={`max-w-[85%] sm:max-w-[70%] flex flex-col ${isMe ? 'items-end' : 'items-start'} z-10`}
      >
        <div className={`relative flex items-center gap-1.5 ${isMe ? 'flex-row' : 'flex-row-reverse'}`}>
          {/* Quick reply action button (visible on hover on desktop only) */}
          <button
            type="button"
            onClick={() => onReply?.(msg)}
            title="Reply"
            className="opacity-0 md:group-hover/bubble:opacity-100 transition-opacity p-1.5 rounded-full hover:bg-base-200 dark:hover:bg-base-800 text-base-400 hover:text-accent-500 dark:hover:text-accent-400 flex-shrink-0 hidden md:flex items-center justify-center"
          >
            <Reply size={14} />
          </button>

          {/* Main bubble content */}
          <div className="flex-1 min-w-0">
            {/* ── Story Reaction / Reply Preview Card (Instagram Style) ── */}
            {storyReply && resolvedStoryImg ? (
              <div
                className={`rounded-2xl p-2 shadow-xs border transition-all ${
                  isMe
                    ? 'bg-accent-500 text-white border-accent-400 rounded-br-sm'
                    : 'bg-white dark:bg-base-800 text-base-900 dark:text-white border-base-100 dark:border-base-700 rounded-bl-sm'
                }`}
              >
                {/* Quoted Reply Preview inside story reply bubble if present */}
                {msg.replyTo && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      onScrollToMessage?.(msg.replyTo.messageId)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation()
                        onScrollToMessage?.(msg.replyTo.messageId)
                      }
                    }}
                    className={`mb-2 px-2.5 py-1.5 rounded-lg border-l-4 text-xs cursor-pointer select-none transition-all ${
                      isMe
                        ? 'bg-accent-700/60 hover:bg-accent-700/80 text-white/95 border-white/70'
                        : 'bg-base-100 dark:bg-base-700/70 hover:bg-base-200 dark:hover:bg-base-700 text-base-800 dark:text-base-100 border-accent-500'
                    }`}
                  >
                    <p className={`font-semibold text-[11px] truncate ${isMe ? 'text-accent-200' : 'text-accent-600 dark:text-accent-400'}`}>
                      {msg.replyTo.senderName || 'Replied message'}
                    </p>
                    <p className="truncate opacity-90 text-[11px] mt-0.5">
                      {msg.replyTo.text}
                    </p>
                  </div>
                )}

                {/* Header tag */}
                <div className="flex items-center gap-1.5 px-1 pb-1.5 text-[11px] font-semibold opacity-90">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                  <span>{isMe ? 'You replied to story' : 'Replied to your story'}</span>
                </div>

                {/* Story Thumbnail Card with vertical aspect ratio */}
                <div className="relative w-40 h-56 sm:w-48 sm:h-64 rounded-xl overflow-hidden bg-base-950 shadow-inner group/card">
                  <img
                    src={resolvedStoryImg}
                    alt="Story"
                    className="w-full h-full object-cover transition-transform duration-300 group-hover/card:scale-105"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />

                  {/* Story caption overlay if present */}
                  {storyReply.caption && (
                    <div className="absolute inset-x-0 bottom-0 p-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent">
                      <p className="text-white text-[11px] line-clamp-2 leading-tight drop-shadow-xs font-medium">
                        {storyReply.caption}
                      </p>
                    </div>
                  )}

                  {/* Floating Reaction Emoji Badge on bottom corner */}
                  {reactionEmoji && (
                    <div className="absolute -bottom-1 -right-1 bg-white/95 dark:bg-base-900/95 backdrop-blur-xs rounded-full p-1 shadow-lg ring-2 ring-white/30 transform scale-110 flex items-center justify-center">
                      <span className="text-2xl leading-none select-none">{reactionEmoji}</span>
                    </div>
                  )}
                </div>

                {/* Message text below story card */}
                {(!isReaction || (msg.text && !msg.text.startsWith('Reacted '))) && (
                  <div className="pt-2 px-1 text-sm font-medium leading-relaxed">
                    {msg.text}
                  </div>
                )}
                {isReaction && (
                  <div className="pt-2 px-1 text-xs opacity-90 font-medium flex items-center gap-1">
                    <span>Reacted {reactionEmoji}</span>
                  </div>
                )}
              </div>
            ) : isReaction ? (
              /* Fallback for older reaction messages: Instagram-like reaction pill */
              <div
                className={`px-3.5 py-2 rounded-2xl text-sm leading-relaxed flex items-center gap-2 border shadow-xs ${
                  isMe
                    ? 'bg-accent-500 text-white border-accent-400 rounded-br-sm'
                    : 'bg-white dark:bg-base-800 text-base-900 dark:text-white border-base-100 dark:border-base-700 rounded-bl-sm'
                }`}
              >
                <span className="text-2xl leading-none">{reactionEmoji}</span>
                <span className="text-xs font-semibold opacity-90">Reacted to story</span>
              </div>
            ) : msg.postShare?.postId ? (
              /* ── Shared Post Card ── */
              <div
                className={`rounded-2xl p-2.5 shadow-xs border transition-all w-64 sm:w-72 ${
                  isMe
                    ? 'bg-accent-500 text-white border-accent-400 rounded-br-sm'
                    : 'bg-white dark:bg-base-800 text-base-900 dark:text-white border-base-100 dark:border-base-700 rounded-bl-sm'
                }`}
              >
                {/* Quoted Reply Preview inside bubble */}
                {msg.replyTo && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      onScrollToMessage?.(msg.replyTo.messageId)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation()
                        onScrollToMessage?.(msg.replyTo.messageId)
                      }
                    }}
                    className={`mb-2 px-2.5 py-1.5 rounded-lg border-l-4 text-xs cursor-pointer select-none transition-all ${
                      isMe
                        ? 'bg-accent-700/60 hover:bg-accent-700/80 text-white/95 border-white/70'
                        : 'bg-base-100 dark:bg-base-700/70 hover:bg-base-200 dark:hover:bg-base-700 text-base-800 dark:text-base-100 border-accent-500'
                    }`}
                  >
                    <p className={`font-semibold text-[11px] truncate ${isMe ? 'text-accent-200' : 'text-accent-600 dark:text-accent-400'}`}>
                      {msg.replyTo.senderName || 'Replied message'}
                    </p>
                    <p className="truncate opacity-90 text-[11px] mt-0.5">
                      {msg.replyTo.text}
                    </p>
                  </div>
                )}

                {/* Shared Post Card */}
                <SharedPostCard postShare={msg.postShare} isMe={isMe} />

                {/* Custom note below card if typed by user */}
                {msg.text && msg.text !== 'Shared a post' && (
                  <div className="pt-2 px-1 text-sm font-medium leading-relaxed">
                    {msg.text}
                  </div>
                )}
              </div>
            ) : (
              /* Standard Message Bubble */
              <div
                className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  isMe
                    ? 'bg-accent-500 text-white rounded-br-sm shadow-xs'
                    : 'bg-white dark:bg-base-800 text-base-900 dark:text-white border border-base-100 dark:border-base-700 rounded-bl-sm shadow-xs'
                }`}
              >
                {/* Quoted Reply Preview inside bubble */}
                {msg.replyTo && (
                  <div
                    role="button"
                    tabIndex={0}
                    onClick={(e) => {
                      e.stopPropagation()
                      onScrollToMessage?.(msg.replyTo.messageId)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.stopPropagation()
                        onScrollToMessage?.(msg.replyTo.messageId)
                      }
                    }}
                    className={`mb-2 px-2.5 py-1.5 rounded-lg border-l-4 text-xs cursor-pointer select-none transition-all ${
                      isMe
                        ? 'bg-accent-700/60 hover:bg-accent-700/80 text-white/95 border-white/70'
                        : 'bg-base-100 dark:bg-base-700/70 hover:bg-base-200 dark:hover:bg-base-700 text-base-800 dark:text-base-100 border-accent-500'
                    }`}
                  >
                    <p className={`font-semibold text-[11px] truncate ${isMe ? 'text-accent-200' : 'text-accent-600 dark:text-accent-400'}`}>
                      {msg.replyTo.senderName || 'Replied message'}
                    </p>
                    <p className="truncate opacity-90 text-[11px] mt-0.5">
                      {msg.replyTo.text}
                    </p>
                  </div>
                )}

                <div>{msg.text}</div>
              </div>
            )}
          </div>
        </div>

        <div className={`flex items-center gap-1 mt-0.5 opacity-0 group-hover/bubble:opacity-100 transition-opacity ${isMe ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-base-400 dark:text-base-500">{msgTime(msg.createdAt)}</span>
          {isMe && (
            msg.readBy?.length > 1
              ? <CheckCheck size={12} className="text-accent-400" />
              : <Check size={12} className="text-base-400" />
          )}
        </div>

        {/* Instagram-style 'Seen' receipt below last sent message */}
        {showSeen && (
          <motion.div
            initial={{ opacity: 0, y: 3 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-end gap-1 mt-0.5 pr-1"
          >
            <span className="text-[11px] font-medium text-base-400 dark:text-base-500 select-none">
              Seen
            </span>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

// ─── Typing indicator ──────────────────────────────────────────────────────────
function TypingIndicator({ name }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="flex justify-start mb-2"
    >
      <div className="bg-white dark:bg-base-800 border border-base-100 dark:border-base-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5 shadow-xs">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 bg-base-400 dark:bg-base-400 rounded-full block"
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
          />
        ))}
        <span className="text-base-400 dark:text-base-500 text-[11px] ml-1">{name} is typing…</span>
      </div>
    </motion.div>
  )
}

// ─── Conversation Row ──────────────────────────────────────────────────────────
function ConvRow({ conv, myId, isActive, onClick, isOnline }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 text-left ${
        isActive ? 'bg-accent-50 dark:bg-accent-950/40 text-accent-700 dark:text-accent-300' : 'hover:bg-base-50 dark:hover:bg-base-800/60'
      }`}
    >
      <Avatar
        name={conv.name} initials={conv.initials} avatarColor={conv.avatarColor}
        profilePhoto={conv.profilePhoto} size="md" online={isOnline}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-sm truncate ${conv.unread > 0 ? 'font-bold text-base-900 dark:text-white' : 'font-semibold text-base-800 dark:text-base-200'}`}>
            {conv.name}
          </span>
          <span className={`text-[11px] flex-shrink-0 ml-2 ${conv.unread > 0 ? 'text-accent-500 font-semibold' : 'text-base-400 dark:text-base-500'}`}>
            {relativeTime(conv.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs truncate ${conv.unread > 0 ? 'text-base-700 dark:text-base-300 font-medium' : 'text-base-400 dark:text-base-500'}`}>
            {conv.lastSenderId === myId ? `You: ${conv.lastMessage}` : conv.lastMessage || 'Start a conversation'}
          </p>
          {conv.unread > 0 && (
            <span className="flex-shrink-0 w-5 h-5 bg-accent-500 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
              {conv.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ onNewChat }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-20 h-20 rounded-full bg-accent-50 dark:bg-accent-950/40 flex items-center justify-center">
        <MessageSquare size={32} className="text-accent-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-base-900 dark:text-white mb-1">Your Messages</h2>
        <p className="text-sm text-base-500 dark:text-base-400">Send private messages to a friend or classmate.</p>
      </div>
      <button onClick={onNewChat} className="mt-2 px-5 py-2.5 bg-accent-500 hover:bg-accent-600 text-white text-sm font-semibold rounded-xl transition-colors shadow-xs">
        New Message
      </button>
    </div>
  )
}

// ─── New Chat Modal ────────────────────────────────────────────────────────────
function NewChatModal({ onClose, onStart }) {
  const [q, setQ]             = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!q.trim()) { setResults([]); return }
    const t = setTimeout(async () => {
      setLoading(true)
      const data = await api(`/api/users/search?q=${encodeURIComponent(q)}`)
      setResults(data.ok ? data.users : [])
      setLoading(false)
    }, 300)
    return () => clearTimeout(t)
  }, [q])

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-xs" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="relative bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-base-100 dark:border-[rgba(255,255,255,0.07)]">
          <h3 className="font-bold text-base-900 dark:text-white text-sm">New Message</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-base-100 dark:hover:bg-base-800 text-base-400 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-base-100 dark:border-[rgba(255,255,255,0.07)]">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-base-400" />
            <input autoFocus type="text" placeholder="Search people…" value={q} onChange={e => setQ(e.target.value)}
              className="w-full bg-base-100 dark:bg-base-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-base-900 dark:text-white placeholder-base-400 outline-none focus:ring-2 focus:ring-accent-500/20 transition-all" />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {loading && <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-accent-400" /></div>}
          {!loading && results.length === 0 && q.trim() && (
            <div className="py-10 text-center text-base-400 dark:text-base-500 text-sm flex flex-col items-center gap-2">
              <UserSearch size={28} className="opacity-40" />No users found
            </div>
          )}
          {!loading && !q.trim() && <div className="py-10 text-center text-base-400 dark:text-base-500 text-sm">Search for someone to message</div>}
          {results.map(user => (
            <button key={user.id} onClick={() => onStart(user.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-base-50 dark:hover:bg-base-800/60 transition-colors">
              <Avatar name={user.name} initials={user.initials} avatarColor={user.avatarColor} profilePhoto={user.profilePhoto} size="sm" />
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-base-900 dark:text-white truncate">{user.name}</p>
                <p className="text-xs text-base-400 dark:text-base-500">@{user.username}</p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  )
}

// ─── Main MessagesPage ─────────────────────────────────────────────────────────
export default function MessagesPage() {
  const { currentUser, setUnreadMsgCount, setActiveChatConvId, platformConfig } = useSwish()
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'main_admin'
  const isMessagingPaused = platformConfig?.features?.allowDirectMessaging === false && !isAdmin
  const { emit, on, off, isOnline, connected }     = useSocket()
  const [searchParams]                             = useSearchParams()
  const queryConvId                                = searchParams.get('convId')

  const [convs,          setConvs]          = useState([])
  const [messages,       setMessages]       = useState([])
  const [activeConvId,   setActiveConvId]   = useState(null)
  const [activeConv,     setActiveConv]     = useState(null)
  const [query,          setQuery]          = useState('')
  const [inputText,      setInputText]      = useState('')
  const [showInfo,       setShowInfo]       = useState(false)
  const [mobileShowChat, setMobileShowChat] = useState(false)
  const [loadingConvs,   setLoadingConvs]   = useState(true)
  const [loadingMsgs,    setLoadingMsgs]    = useState(false)
  const [sending,        setSending]        = useState(false)
  const [showNewChat,    setShowNewChat]    = useState(false)
  const [typingUsers,    setTypingUsers]    = useState({}) // convId → {userId, name}
  const [unreadNotifs,   setUnreadNotifs]   = useState([]) // for toast-style notifs
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)
  const [replyingTo,      setReplyingTo]      = useState(null)

  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)
  const textareaRef    = useRef(null)
  const activeConvRef  = useRef(null)   // always holds current activeConvId
  const convsRef       = useRef([])     // always holds current convs (for use inside socket handlers)
  const typingTimer    = useRef(null)

  // Keep refs in sync with state
  useEffect(() => { activeConvRef.current = activeConvId }, [activeConvId])
  useEffect(() => { convsRef.current = convs }, [convs])

  // Clear activeChatConvId on unmount
  useEffect(() => {
    return () => {
      setActiveChatConvId?.(null)
    }
  }, [setActiveChatConvId])

  // ── Load conversations via REST (on mount) ──────────────────────────────────
  const loadConvs = useCallback(async () => {
    const data = await api('/api/messages')
    if (data.ok && Array.isArray(data.conversations)) {
      const currentActiveId = activeConvRef.current
      const updatedConvs = data.conversations.map(c =>
        currentActiveId && c.id === currentActiveId ? { ...c, unread: 0 } : c
      )
      setConvs(updatedConvs)
      const totalUnread = updatedConvs.reduce((s, c) => s + (c.unread || 0), 0)
      setUnreadMsgCount?.(totalUnread)
    }
    setLoadingConvs(false)
  }, [setUnreadMsgCount])

  useEffect(() => { loadConvs() }, [loadConvs])

  // ── Auto-open conversation if convId query parameter is present ─────────────
  useEffect(() => {
    if (queryConvId && convs.length > 0 && !activeConvId) {
      const match = convs.find(c => c.id === queryConvId)
      if (match) {
        openConv(match)
      }
    }
  }, [queryConvId, convs, activeConvId])

  // ── Socket.io real-time events ──────────────────────────────────────────────
  // IMPORTANT: This effect must run ONCE. Do NOT add convs/loadConvs to deps —
  // that causes the effect to re-run on every message, re-registering listeners
  // and producing duplicate messages. Use refs to access current state.
  useEffect(() => {
    const myId = String(currentUser?.id || currentUser?._id || '')

    // ── New message received ────────────────────────────────────────────────
    const onNewMsg = (msg) => {
      const { convId } = msg
      const currentConvId = activeConvRef.current
      const isFromMe = myId && String(msg.senderId) === myId

      if (currentConvId === convId) {
        setMessages(prev => {
          // Deduplicate: if we already have this message by ID, skip
          if (prev.some(m => m.id === msg.id)) return prev

          // If this message is from current user and matches a pending optimistic message, replace it
          if (isFromMe) {
            const tempIdx = prev.findIndex(m => m._temp && m.text === msg.text)
            if (tempIdx !== -1) {
              const next = [...prev]
              next[tempIdx] = msg
              return next
            }
          }

          return [...prev, msg]
        })
        if (!isFromMe) {
          emit('msg:read', { convId })
          apiMarkConvRead(convId).catch(() => {})
        }
      }

      // Update conversation list preview
      setConvs(prev => prev.map(c =>
        c.id === convId
          ? {
              ...c,
              lastMessage:   msg.text,
              lastMessageAt: msg.createdAt,
              lastSenderId:  msg.senderId,
              // Only increment unread if this chat is NOT currently open AND message was sent by someone else
              unread: (currentConvId === convId || isFromMe)
                ? 0
                : (c.unread || 0) + 1,
            }
          : c
      ))
    }

    // ── Notification for messages in other (non-open) convs ─────────────────
    const onNotification = (msg) => {
      const isFromMe = myId && String(msg.senderId) === myId
      const isOpen = activeConvRef.current === msg.convId

      // If message is from current user OR is for the currently open conversation, ignore
      if (isFromMe || isOpen) return

      setUnreadNotifs(prev => [...prev.slice(-4), msg])
      setTimeout(() => setUnreadNotifs(prev => prev.slice(1)), 4000)

      setConvs(prev => {
        const exists = prev.some(c => c.id === msg.convId)
        if (!exists) {
          // New conversation appeared — reload the full list once
          api('/api/messages').then(data => {
            if (data.ok) setConvs(data.conversations)
          })
          return prev
        }
        return prev.map(c =>
          c.id === msg.convId
            ? { ...c, lastMessage: msg.text, lastMessageAt: msg.createdAt, unread: (c.unread || 0) + 1 }
            : c
        )
      })
    }

    // ── Typing indicators ───────────────────────────────────────────────────
    const onTypingStart = ({ convId, userId: uid, name }) => {
      if (myId && String(uid) === myId) return
      setTypingUsers(prev => ({ ...prev, [convId]: { userId: uid, name } }))
    }
    const onTypingStop = ({ convId, userId: uid }) => {
      if (myId && String(uid) === myId) return
      setTypingUsers(prev => {
        const next = { ...prev }
        delete next[convId]
        return next
      })
    }

    // ── Read receipts ───────────────────────────────────────────────────────
    const onRead = ({ convId, readBy }) => {
      if (activeConvRef.current !== convId) return
      setMessages(prev => prev.map(m =>
        m.readBy && !m.readBy.includes(readBy)
          ? { ...m, readBy: [...m.readBy, readBy] }
          : m
      ))
    }

    on('msg:new',          onNewMsg)
    on('msg:notification', onNotification)
    on('typing:start',     onTypingStart)
    on('typing:stop',      onTypingStop)
    on('msg:read',         onRead)

    return () => {
      off('msg:new',          onNewMsg)
      off('msg:notification', onNotification)
      off('typing:start',     onTypingStart)
      off('typing:stop',      onTypingStop)
      off('msg:read',         onRead)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [on, off, emit, currentUser?.id, currentUser?._id])
  // ^ Only stable values here. `convs` and `loadConvs` are intentionally EXCLUDED.
  //   They would re-run this effect on every message, creating duplicate listeners.

  // ── Scroll to bottom on new messages ───────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  // ── Open conversation ───────────────────────────────────────────────────────
  const openConv = (conv) => {
    // Leave old room
    if (activeConvRef.current) emit('conv:leave', activeConvRef.current)

    setActiveConvId(conv.id)
    setActiveConv(conv)
    setActiveChatConvId?.(conv.id)
    setMobileShowChat(true)
    setShowInfo(false)
    setReplyingTo(null)
    setMessages([])
    setTypingUsers(prev => { const n = {...prev}; delete n[conv.id]; return n })

    // Mark as read locally and decrement global unread count
    if (conv.unread > 0) {
      setUnreadMsgCount?.(prev => Math.max(0, prev - conv.unread))
    }
    setConvs(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c))

    // Join socket room + mark read via socket AND REST fallback
    emit('conv:join', conv.id)
    emit('msg:read', { convId: conv.id })
    apiMarkConvRead(conv.id).catch(() => {})
    loadMessages(conv.id)

    setTimeout(() => inputRef.current?.focus(), 100)
  }

  // ── Load messages via REST ──────────────────────────────────────────────────
  const loadMessages = useCallback(async (convId) => {
    setLoadingMsgs(true)
    const data = await api(`/api/messages/${convId}`)
    if (data.ok) setMessages(data.messages)
    setLoadingMsgs(false)
  }, [])

  // ── Start new chat ──────────────────────────────────────────────────────────
  const startNewChat = async (participantId) => {
    setShowNewChat(false)
    if (isMessagingPaused) {
      alert('Direct messaging is temporarily paused by platform administration.')
      return
    }
    const data = await api('/api/messages', { method: 'POST', body: { participantId } })
    if (data.ok) {
      await loadConvs()
      setConvs(prev => {
        const exists = prev.find(c => c.id === data.convId)
        const conv   = exists || { ...data.conversation, id: data.convId }
        if (!exists) setTimeout(() => openConv(conv), 50)
        else openConv(conv)
        return exists ? prev : [conv, ...prev]
      })
    } else {
      alert(data.error || 'Failed to start conversation.')
    }
  }

  // ── Handle reply to message ───────────────────────────────────────────────
  const handleReply = useCallback((msg) => {
    const myId = String(currentUser?.id || currentUser?._id || '')
    const isFromMe = String(msg.senderId) === myId
    const senderName = isFromMe ? 'You' : (activeConv?.name || 'User')
    const textSnippet = msg.text || (msg.storyReply ? 'Story reply' : 'Message')
    setReplyingTo({
      messageId: msg.id,
      senderId: msg.senderId,
      senderName,
      text: textSnippet,
    })
    setTimeout(() => {
      inputRef.current?.focus()
    }, 50)
  }, [currentUser, activeConv])

  const scrollToMessage = useCallback((messageId) => {
    if (!messageId) return
    const el = document.getElementById(`msg-${messageId}`)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'rounded-2xl', 'transition-all', 'duration-300')
      setTimeout(() => {
        el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2')
      }, 1500)
    }
  }, [])

  // ── Send message via Socket.io ──────────────────────────────────────────────
  const sendMessage = () => {
    if (isMessagingPaused) {
      alert('Direct messaging is temporarily paused by platform administration.')
      return
    }
    const text = inputText.trim()
    if (!text || !activeConvId || sending) return

    const myId = currentUser?.id || currentUser?._id
    const currentReply = replyingTo

    // Stop typing indicator
    emit('typing:stop', { convId: activeConvId })
    clearTimeout(typingTimer.current)

    // Optimistic UI
    const tempId = `temp-${Date.now()}`
    const tempMsg = {
      id:        tempId,
      senderId:  myId,
      text,
      replyTo:   currentReply ? {
        messageId:  currentReply.messageId,
        senderId:   currentReply.senderId,
        senderName: currentReply.senderName,
        text:       currentReply.text,
      } : null,
      createdAt: new Date().toISOString(),
      readBy:    [myId],
      _temp:     true,
    }
    setMessages(prev => [...prev, tempMsg])
    setInputText('')
    setReplyingTo(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    inputRef.current?.focus()

    setSending(true)
    // Capture the conv ID now so the ack closure doesn't stale
    const sentToConvId = activeConvId
    emit('msg:send', { convId: sentToConvId, text, replyTo: currentReply }, (ack) => {
      setSending(false)
      if (ack?.ok && ack.message) {
        // Replace temp bubble with server-confirmed message, avoiding duplicates
        setMessages(prev => {
          if (prev.some(m => m.id === ack.message.id)) {
            return prev.filter(m => m.id !== tempId)
          }
          return prev.map(m => m.id === tempId ? ack.message : m)
        })
        setConvs(prev => prev.map(c =>
          c.id === sentToConvId
            ? { ...c, lastMessage: text, lastMessageAt: new Date().toISOString(), lastSenderId: myId, unread: 0 }
            : c
        ))
      } else {
        // Remove optimistic bubble on failure
        setMessages(prev => prev.filter(m => m.id !== tempId))
        if (ack?.error) {
          alert(ack.error)
        }
      }
    })
  }

  // ── Typing indicator emit ───────────────────────────────────────────────────
  const handleInput = (e) => {
    setInputText(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'

    if (!activeConvId) return
    emit('typing:start', { convId: activeConvId })
    clearTimeout(typingTimer.current)
    typingTimer.current = setTimeout(() => {
      emit('typing:stop', { convId: activeConvId })
    }, 2000)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const handleSelectEmoji = (emoji) => {
    const textarea = textareaRef.current
    if (textarea) {
      const start = textarea.selectionStart ?? inputText.length
      const end = textarea.selectionEnd ?? inputText.length
      const updated = inputText.slice(0, start) + emoji + inputText.slice(end)
      setInputText(updated)
      setTimeout(() => {
        textarea.focus()
        const newCursorPos = start + emoji.length
        textarea.setSelectionRange(newCursorPos, newCursorPos)
        textarea.style.height = 'auto'
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
      }, 0)
    } else {
      setInputText(prev => prev + emoji)
    }
  }

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (activeConvRef.current) emit('conv:leave', activeConvRef.current)
      clearTimeout(typingTimer.current)
    }
  }, [emit])

  const filteredConvs = convs.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.username.toLowerCase().includes(query.toLowerCase())
  )

  const totalUnread = convs.reduce((s, c) => s + (c.unread || 0), 0)
  const activeTyping = activeConvId ? typingUsers[activeConvId] : null

  return (
    <div className="flex h-[calc(100vh-56px)] md:h-screen max-h-screen overflow-hidden bg-white dark:bg-base-900 border-x border-base-100 dark:border-[rgba(255,255,255,0.07)]">

      {/* ── Toast notifications for messages in other convs ─────────────── */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {unreadNotifs.map((n, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }}
              className="pointer-events-auto bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-xl shadow-xl px-4 py-3 flex items-center gap-3 max-w-xs">
              <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {n.senderName?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-base-900 dark:text-white text-xs font-semibold">{n.senderName}</p>
                <p className="text-base-500 dark:text-base-400 text-xs truncate">{n.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Conversation List ─────────────────────────────────────────────── */}
      <div className={`flex flex-col border-r border-base-100 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-base-900 flex-shrink-0 w-full md:w-80 lg:w-96 ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>

        <div className="px-5 pt-6 pb-4 border-b border-base-100 dark:border-[rgba(255,255,255,0.07)]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-base-900 dark:text-white tracking-tight">Messages</h1>
              {totalUnread > 0 && (
                <span className="text-xs font-bold bg-accent-500 text-white px-2 py-0.5 rounded-full">{totalUnread}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Connection status */}
              <span className={`text-[10px] font-medium flex items-center gap-1 ${connected ? 'text-emerald-500' : 'text-base-400'}`}>
                {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
                {connected ? 'Live' : 'Offline'}
              </span>
              <button onClick={() => setShowNewChat(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-base-100 dark:hover:bg-base-800 text-base-600 dark:text-base-400 transition-colors" aria-label="New message">
                <Edit size={18} />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-base-400" />
            <input type="text" placeholder="Search messages…" value={query} onChange={e => setQuery(e.target.value)}
              className="w-full bg-base-100 dark:bg-base-800 rounded-xl pl-9 pr-9 py-2.5 text-sm text-base-900 dark:text-white placeholder-base-400 outline-none focus:ring-2 focus:ring-accent-500/20 transition-all" />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-accent-400" /></div>
          ) : filteredConvs.length === 0 ? (
            <div className="text-center py-12 text-base-400 dark:text-base-500 text-sm flex flex-col items-center gap-2 px-4">
              <MessageSquare size={28} className="opacity-30" />
              {query ? 'No conversations found' : 'No messages yet.'}
              {!query && <button onClick={() => setShowNewChat(true)} className="mt-1 text-accent-600 dark:text-accent-400 font-semibold text-sm">New Message</button>}
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredConvs.map(conv => (
                <ConvRow
                  key={conv.id} conv={conv} myId={currentUser?.id}
                  isActive={conv.id === activeConvId}
                  isOnline={isOnline(conv.participantId)}
                  onClick={() => openConv(conv)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Chat Window ───────────────────────────────────────────────────── */}
      <div className={`flex-1 flex min-w-0 bg-white dark:bg-base-950 ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        {!activeConv ? (
          <EmptyState onNewChat={() => setShowNewChat(true)} />
        ) : (
          <div className="flex-1 flex flex-col min-w-0">

            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-base-100 dark:border-[rgba(255,255,255,0.07)] flex-shrink-0 bg-white dark:bg-base-900">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { emit('conv:leave', activeConvId); setMobileShowChat(false); setActiveConvId(null); setActiveConv(null); setActiveChatConvId?.(null) }}
                  className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-base-100 dark:hover:bg-base-800 text-base-600 dark:text-base-400 transition-colors -ml-1"
                >
                  <ChevronLeft size={22} />
                </button>
                <Link to={`/profile/${activeConv.participantId}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
                  <Avatar name={activeConv.name} initials={activeConv.initials} avatarColor={activeConv.avatarColor}
                    profilePhoto={activeConv.profilePhoto} size="sm" online={isOnline(activeConv.participantId)} />
                </Link>
                <Link to={`/profile/${activeConv.participantId}`} className="min-w-0 group">
                  <p className="font-bold text-base-900 dark:text-white text-sm leading-tight truncate group-hover:text-accent-500 dark:group-hover:text-accent-400 transition-colors">{activeConv.name}</p>
                  <p className="text-xs leading-tight">
                    {isOnline(activeConv.participantId)
                      ? <span className="text-emerald-500 font-medium">● Active now</span>
                      : <span className="text-base-400 dark:text-base-500">@{activeConv.username}</span>
                    }
                  </p>
                </Link>
              </div>
              <button
                onClick={() => setShowInfo(v => !v)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${showInfo ? 'bg-accent-50 dark:bg-accent-950/40 text-accent-600 dark:text-accent-400' : 'hover:bg-base-100 dark:hover:bg-base-800 text-base-600 dark:text-base-400'}`}
              >
                <Info size={18} />
              </button>
            </div>

            {/* Messages + info panel */}
            <div className="flex flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-5 py-4 bg-base-50/60 dark:bg-base-950/40">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full"><Loader2 size={22} className="animate-spin text-accent-400" /></div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-sm text-base-400 dark:text-base-500">
                    <Avatar name={activeConv.name} initials={activeConv.initials} avatarColor={activeConv.avatarColor} profilePhoto={activeConv.profilePhoto} size="lg" />
                    <p className="font-medium text-base-700 dark:text-base-300 mt-1">{activeConv.name}</p>
                    <p className="text-xs">Say hi to start the conversation 👋</p>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isLast = idx === messages.length - 1
                    const isMe = String(msg.senderId) === String(currentUser?.id || currentUser?._id)
                    const otherSeen = isMe && msg.readBy && (
                      msg.readBy.length > 1 ||
                      msg.readBy.some(id => String(id) !== String(currentUser?.id || currentUser?._id))
                    )
                    return (
                      <MessageBubble
                        key={msg.id}
                        msg={msg}
                        isMe={isMe}
                        showSeen={isLast && isMe && otherSeen}
                        onReply={handleReply}
                        onScrollToMessage={scrollToMessage}
                      />
                    )
                  })
                )}

                {/* Typing indicator */}
                <AnimatePresence>
                  {activeTyping && <TypingIndicator key="typing" name={activeTyping.name} />}
                </AnimatePresence>

                <div ref={messagesEndRef} />
              </div>

              {/* Info side panel */}
              <AnimatePresence>
                {showInfo && (
                  <motion.aside key="info" initial={{ width: 0, opacity: 0 }} animate={{ width: 240, opacity: 1 }} exit={{ width: 0, opacity: 0 }} transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="border-l border-base-100 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-base-900 overflow-hidden flex-shrink-0">
                    <div className="w-60 p-5 flex flex-col items-center gap-4">
                      <Avatar name={activeConv.name} initials={activeConv.initials} avatarColor={activeConv.avatarColor} profilePhoto={activeConv.profilePhoto} size="lg" online={isOnline(activeConv.participantId)} />
                      <div className="text-center">
                        <p className="font-bold text-base-900 dark:text-white">{activeConv.name}</p>
                        <p className="text-xs text-base-400 dark:text-base-500 mt-0.5">@{activeConv.username}</p>
                        {isOnline(activeConv.participantId) && (
                          <span className="inline-block mt-2 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">Active now</span>
                        )}
                      </div>
                      <Link to={`/profile/${activeConv.participantId}`}
                        className="w-full text-center py-2 text-sm font-semibold text-accent-600 dark:text-accent-400 border border-accent-200 dark:border-accent-800 rounded-xl hover:bg-accent-50 dark:hover:bg-accent-950/30 transition-colors">
                        View Profile
                      </Link>
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 border-t border-base-100 dark:border-[rgba(255,255,255,0.07)] bg-white dark:bg-base-900 flex-shrink-0">
              {isMessagingPaused ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50 rounded-2xl flex items-center justify-center gap-2 text-xs font-semibold text-amber-800 dark:text-amber-300">
                  <Lock size={15} className="shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Direct messaging is temporarily paused for routine platform maintenance.</span>
                </div>
              ) : (
                <>
                  {/* Replying preview banner (WhatsApp style) */}
                  <AnimatePresence>
                    {replyingTo && (
                      <motion.div
                        initial={{ opacity: 0, height: 0, y: 8 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: 8 }}
                        transition={{ duration: 0.16 }}
                        className="mb-2 bg-base-100 dark:bg-base-800/90 border-l-4 border-accent-500 rounded-r-xl px-3 py-2 flex items-center justify-between gap-3 text-xs shadow-xs overflow-hidden"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 font-semibold text-accent-600 dark:text-accent-400">
                            <Reply size={13} className="inline-block" />
                            <span>Replying to {replyingTo.senderName}</span>
                          </div>
                          <p className="text-base-700 dark:text-base-300 truncate mt-0.5 max-w-full">
                            {replyingTo.text}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setReplyingTo(null)}
                          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-base-200 dark:hover:bg-base-700 text-base-400 hover:text-base-600 dark:hover:text-base-200 transition-colors flex-shrink-0"
                          aria-label="Cancel reply"
                        >
                          <X size={14} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="flex items-end gap-2">
                    <div className="flex-1 relative">
                      <textarea
                        ref={el => { inputRef.current = el; textareaRef.current = el }}
                        rows={1}
                        value={inputText}
                        onChange={handleInput}
                        onKeyDown={handleKeyDown}
                        placeholder="Message…"
                        className="w-full bg-base-100 dark:bg-base-800 text-base-900 dark:text-white placeholder-base-400 dark:placeholder-base-500 rounded-2xl px-4 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-accent-500/20 transition-all leading-relaxed"
                        style={{ maxHeight: 120 }}
                      />
                    </div>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowEmojiPicker(v => !v)}
                        className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors flex-shrink-0 ${
                          showEmojiPicker
                            ? 'bg-accent-50 dark:bg-accent-950/60 text-accent-600 dark:text-accent-400'
                            : 'hover:bg-base-100 dark:hover:bg-base-800 text-base-500 dark:text-base-400'
                        }`}
                        aria-label="Insert emoji"
                      >
                        <Smile size={18} />
                      </button>

                      <AnimatePresence>
                        {showEmojiPicker && (
                          <EmojiPicker
                            onSelect={handleSelectEmoji}
                            onClose={() => setShowEmojiPicker(false)}
                          />
                        )}
                      </AnimatePresence>
                    </div>
                    <AnimatePresence mode="wait">
                      {inputText.trim() && (
                        <motion.button key="send"
                          initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.14 }}
                          onClick={sendMessage} disabled={sending || !connected}
                          className="w-9 h-9 flex items-center justify-center bg-accent-500 hover:bg-accent-600 active:scale-95 disabled:opacity-60 rounded-xl transition-all flex-shrink-0 shadow-xs">
                          {sending ? <Loader2 size={15} className="text-white animate-spin" /> : <Send size={15} className="text-white" />}
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>

          </div>
        )}
      </div>

      {/* ── New Chat Modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} onStart={startNewChat} />}
      </AnimatePresence>
    </div>
  )
}
