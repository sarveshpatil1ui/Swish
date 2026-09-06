import { useState, useRef, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Edit, Info, Send, Smile,
  ChevronLeft, CheckCheck, Check,
  X, MessageSquare, Loader2, UserSearch, Wifi, WifiOff,
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { useSocket } from '../../context/SocketContext'

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

async function api(path, opts = {}) {
  const res = await fetch(`${API}${path}`, {
    headers: { 'Content-Type': 'application/json', ...opts.headers },
    credentials: 'include',
    ...opts,
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
  const sizes = { sm: 'w-9 h-9 text-xs', md: 'w-11 h-11 text-sm', lg: 'w-14 h-14 text-base' }
  const dots  = { sm: 'w-2.5 h-2.5 border-[1.5px]', md: 'w-3 h-3 border-2', lg: 'w-3.5 h-3.5 border-2' }
  const src = profilePhoto
    ? (profilePhoto.startsWith('blob:') ? profilePhoto : `${API}${profilePhoto}`)
    : null

  return (
    <div className="relative flex-shrink-0">
      {src
        ? <img src={src} alt={name} className={`${sizes[size]} rounded-full object-cover`} />
        : <div className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-bold`} style={{ backgroundColor: avatarColor || '#6366f1' }}>{initials || '?'}</div>
      }
      {online !== undefined && (
        <span className={`absolute bottom-0 right-0 ${dots[size]} rounded-full border-white dark:border-gray-950 ${online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-gray-600'}`} />
      )}
    </div>
  )
}

// ─── Message Bubble ────────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.16 }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}
    >
      <div className={`max-w-[72%] group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
          isMe
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : 'bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-slate-100 dark:border-gray-700 rounded-bl-sm'
        }`}>
          {msg.text}
        </div>
        <div className={`flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-slate-400 dark:text-gray-500">{msgTime(msg.createdAt)}</span>
          {isMe && (
            msg.readBy?.length > 1
              ? <CheckCheck size={12} className="text-indigo-400" />
              : <Check size={12} className="text-slate-400" />
          )}
        </div>
      </div>
    </motion.div>
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
      <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1.5">
        {[0, 1, 2].map(i => (
          <motion.span
            key={i}
            className="w-1.5 h-1.5 bg-slate-400 dark:bg-gray-400 rounded-full block"
            animate={{ y: [0, -4, 0] }}
            transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
          />
        ))}
        <span className="text-slate-400 text-[11px] ml-1">{name} is typing…</span>
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
        isActive ? 'bg-indigo-50 dark:bg-indigo-950/40' : 'hover:bg-slate-50 dark:hover:bg-gray-800/60'
      }`}
    >
      <Avatar
        name={conv.name} initials={conv.initials} avatarColor={conv.avatarColor}
        profilePhoto={conv.profilePhoto} size="md" online={isOnline}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-sm truncate ${conv.unread > 0 ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>
            {conv.name}
          </span>
          <span className={`text-[11px] flex-shrink-0 ml-2 ${conv.unread > 0 ? 'text-indigo-500 font-semibold' : 'text-slate-400 dark:text-gray-500'}`}>
            {relativeTime(conv.lastMessageAt)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={`text-xs truncate ${conv.unread > 0 ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-gray-500'}`}>
            {conv.lastSenderId === myId ? `You: ${conv.lastMessage}` : conv.lastMessage || 'Start a conversation'}
          </p>
          {conv.unread > 0 && (
            <span className="flex-shrink-0 w-5 h-5 bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
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
      <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
        <MessageSquare size={32} className="text-indigo-400" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Your Messages</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">Send private messages to a friend or classmate.</p>
      </div>
      <button onClick={onNewChat} className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
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
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="relative bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-gray-800">
          <h3 className="font-bold text-slate-900 dark:text-white text-sm">New Message</h3>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-4 py-3 border-b border-slate-100 dark:border-gray-800">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input autoFocus type="text" placeholder="Search people…" value={q} onChange={e => setQ(e.target.value)}
              className="w-full bg-slate-100 dark:bg-gray-800 rounded-xl pl-9 pr-4 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all" />
          </div>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {loading && <div className="flex items-center justify-center py-8"><Loader2 size={20} className="animate-spin text-indigo-400" /></div>}
          {!loading && results.length === 0 && q.trim() && (
            <div className="py-10 text-center text-slate-400 dark:text-gray-500 text-sm flex flex-col items-center gap-2">
              <UserSearch size={28} className="opacity-40" />No users found
            </div>
          )}
          {!loading && !q.trim() && <div className="py-10 text-center text-slate-400 dark:text-gray-500 text-sm">Search for someone to message</div>}
          {results.map(user => (
            <button key={user.id} onClick={() => onStart(user.id)}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-gray-800/60 transition-colors">
              <Avatar name={user.name} initials={user.initials} avatarColor={user.avatarColor} profilePhoto={user.profilePhoto} size="sm" />
              <div className="text-left min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user.name}</p>
                <p className="text-xs text-slate-400 dark:text-gray-500">@{user.username}</p>
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
  const { currentUser }                            = useSwish()
  const { emit, on, off, isOnline, connected }     = useSocket()

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

  const messagesEndRef = useRef(null)
  const inputRef       = useRef(null)
  const textareaRef    = useRef(null)
  const activeConvRef  = useRef(null)   // always holds current activeConvId
  const convsRef       = useRef([])     // always holds current convs (for use inside socket handlers)
  const typingTimer    = useRef(null)

  // Keep refs in sync with state
  useEffect(() => { activeConvRef.current = activeConvId }, [activeConvId])
  useEffect(() => { convsRef.current = convs }, [convs])

  // ── Load conversations via REST (on mount) ──────────────────────────────────
  const loadConvs = useCallback(async () => {
    const data = await api('/api/messages')
    if (data.ok) setConvs(data.conversations)
    setLoadingConvs(false)
  }, [])

  useEffect(() => { loadConvs() }, [loadConvs])

  // ── Socket.io real-time events ──────────────────────────────────────────────
  // IMPORTANT: This effect must run ONCE. Do NOT add convs/loadConvs to deps —
  // that causes the effect to re-run on every message, re-registering listeners
  // and producing duplicate messages. Use refs to access current state.
  useEffect(() => {
    // ── New message received ────────────────────────────────────────────────
    const onNewMsg = (msg) => {
      const { convId } = msg
      const currentConvId = activeConvRef.current

      if (currentConvId === convId) {
        setMessages(prev => {
          // Deduplicate: if we already have this message (from optimistic send), skip
          if (prev.some(m => m.id === msg.id)) return prev
          return [...prev, msg]
        })
        emit('msg:read', { convId })
      }

      // Update conversation list preview
      setConvs(prev => prev.map(c =>
        c.id === convId
          ? {
              ...c,
              lastMessage:   msg.text,
              lastMessageAt: msg.createdAt,
              lastSenderId:  msg.senderId,
              // Only increment unread if this chat is NOT currently open
              unread: currentConvId === convId
                ? 0
                : (c.unread || 0) + (msg.senderId !== currentUser?.id ? 1 : 0),
            }
          : c
      ))
    }

    // ── Notification for messages in other (non-open) convs ─────────────────
    const onNotification = (msg) => {
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
      if (uid === currentUser?.id) return
      setTypingUsers(prev => ({ ...prev, [convId]: { userId: uid, name } }))
    }
    const onTypingStop = ({ convId, userId: uid }) => {
      if (uid === currentUser?.id) return
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
  }, [on, off, emit, currentUser?.id])
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
    setMobileShowChat(true)
    setShowInfo(false)
    setMessages([])
    setTypingUsers(prev => { const n = {...prev}; delete n[conv.id]; return n })

    // Mark as read locally
    setConvs(prev => prev.map(c => c.id === conv.id ? { ...c, unread: 0 } : c))

    // Join socket room + load messages via REST
    emit('conv:join', conv.id)
    emit('msg:read', { convId: conv.id })
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
    }
  }

  // ── Send message via Socket.io ──────────────────────────────────────────────
  const sendMessage = () => {
    const text = inputText.trim()
    if (!text || !activeConvId || sending) return

    // Stop typing indicator
    emit('typing:stop', { convId: activeConvId })
    clearTimeout(typingTimer.current)

    // Optimistic UI
    const tempId = `temp-${Date.now()}`
    const tempMsg = {
      id:        tempId,
      senderId:  currentUser?.id,
      text,
      createdAt: new Date().toISOString(),
      readBy:    [currentUser?.id],
      _temp:     true,
    }
    setMessages(prev => [...prev, tempMsg])
    setInputText('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    inputRef.current?.focus()

    setSending(true)
    // Capture the conv ID now so the ack closure doesn't stale
    const sentToConvId = activeConvId
    emit('msg:send', { convId: sentToConvId, text }, (ack) => {
      setSending(false)
      if (ack?.ok) {
        // Replace the temp bubble with the server-confirmed message.
        // The `msg:new` socket echo from the server will be deduplicated
        // by the id-check in onNewMsg, so no duplicate will appear.
        setMessages(prev => prev.map(m => m.id === tempId ? ack.message : m))
        setConvs(prev => prev.map(c =>
          c.id === sentToConvId
            ? { ...c, lastMessage: text, lastMessageAt: new Date().toISOString(), lastSenderId: currentUser?.id }
            : c
        ))
      } else {
        // Remove optimistic bubble on failure
        setMessages(prev => prev.filter(m => m.id !== tempId))
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
    <div className="flex h-screen max-h-screen overflow-hidden">

      {/* ── Toast notifications for messages in other convs ─────────────── */}
      <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
        <AnimatePresence>
          {unreadNotifs.map((n, i) => (
            <motion.div key={i}
              initial={{ opacity: 0, x: 80 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 80 }}
              className="pointer-events-auto bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-xl px-4 py-3 flex items-center gap-3 max-w-xs">
              <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {n.senderName?.[0]?.toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-slate-900 dark:text-white text-xs font-semibold">{n.senderName}</p>
                <p className="text-slate-500 dark:text-gray-400 text-xs truncate">{n.text}</p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Conversation List ─────────────────────────────────────────────── */}
      <div className={`flex flex-col border-r border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-950 flex-shrink-0 w-full md:w-80 lg:w-96 ${mobileShowChat ? 'hidden md:flex' : 'flex'}`}>

        <div className="px-5 pt-6 pb-4 border-b border-slate-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">Messages</h1>
              {totalUnread > 0 && (
                <span className="text-xs font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">{totalUnread}</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Connection status */}
              <span className={`text-[10px] font-medium flex items-center gap-1 ${connected ? 'text-emerald-500' : 'text-slate-400'}`}>
                {connected ? <Wifi size={11} /> : <WifiOff size={11} />}
                {connected ? 'Live' : 'Offline'}
              </span>
              <button onClick={() => setShowNewChat(true)}
                className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-400 transition-colors" aria-label="New message">
                <Edit size={18} />
              </button>
            </div>
          </div>

          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input type="text" placeholder="Search messages…" value={query} onChange={e => setQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-gray-800 rounded-xl pl-9 pr-9 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all" />
            {query && (
              <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-2 px-2">
          {loadingConvs ? (
            <div className="flex items-center justify-center py-16"><Loader2 size={22} className="animate-spin text-indigo-400" /></div>
          ) : filteredConvs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-gray-500 text-sm flex flex-col items-center gap-2 px-4">
              <MessageSquare size={28} className="opacity-30" />
              {query ? 'No conversations found' : 'No messages yet.'}
              {!query && <button onClick={() => setShowNewChat(true)} className="mt-1 text-indigo-600 dark:text-indigo-400 font-semibold text-sm">New Message</button>}
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
      <div className={`flex-1 flex min-w-0 bg-white dark:bg-gray-950 ${!mobileShowChat ? 'hidden md:flex' : 'flex'}`}>
        {!activeConv ? (
          <EmptyState onNewChat={() => setShowNewChat(true)} />
        ) : (
          <div className="flex-1 flex flex-col min-w-0">

            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { emit('conv:leave', activeConvId); setMobileShowChat(false); setActiveConvId(null); setActiveConv(null) }}
                  className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-400 transition-colors -ml-1"
                >
                  <ChevronLeft size={22} />
                </button>
                <Link to={`/profile/${activeConv.participantId}`} className="flex-shrink-0 hover:opacity-80 transition-opacity">
                  <Avatar name={activeConv.name} initials={activeConv.initials} avatarColor={activeConv.avatarColor}
                    profilePhoto={activeConv.profilePhoto} size="sm" online={isOnline(activeConv.participantId)} />
                </Link>
                <Link to={`/profile/${activeConv.participantId}`} className="min-w-0 group">
                  <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{activeConv.name}</p>
                  <p className="text-xs leading-tight">
                    {isOnline(activeConv.participantId)
                      ? <span className="text-emerald-500 font-medium">● Active now</span>
                      : <span className="text-slate-400 dark:text-gray-500">@{activeConv.username}</span>
                    }
                  </p>
                </Link>
              </div>
              <button
                onClick={() => setShowInfo(v => !v)}
                className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${showInfo ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400' : 'hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-400'}`}
              >
                <Info size={18} />
              </button>
            </div>

            {/* Messages + info panel */}
            <div className="flex flex-1 min-h-0">
              <div className="flex-1 overflow-y-auto px-5 py-4 bg-slate-50/60 dark:bg-gray-900/40">
                {loadingMsgs ? (
                  <div className="flex items-center justify-center h-full"><Loader2 size={22} className="animate-spin text-indigo-400" /></div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full gap-2 text-sm text-slate-400 dark:text-gray-500">
                    <Avatar name={activeConv.name} initials={activeConv.initials} avatarColor={activeConv.avatarColor} profilePhoto={activeConv.profilePhoto} size="lg" />
                    <p className="font-medium text-slate-700 dark:text-gray-300 mt-1">{activeConv.name}</p>
                    <p className="text-xs">Say hi to start the conversation 👋</p>
                  </div>
                ) : (
                  messages.map(msg => (
                    <MessageBubble key={msg.id} msg={msg} isMe={msg.senderId === currentUser?.id} />
                  ))
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
                    className="border-l border-slate-100 dark:border-gray-800 overflow-hidden flex-shrink-0">
                    <div className="w-60 p-5 flex flex-col items-center gap-4">
                      <Avatar name={activeConv.name} initials={activeConv.initials} avatarColor={activeConv.avatarColor} profilePhoto={activeConv.profilePhoto} size="lg" online={isOnline(activeConv.participantId)} />
                      <div className="text-center">
                        <p className="font-bold text-slate-900 dark:text-white">{activeConv.name}</p>
                        <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">@{activeConv.username}</p>
                        {isOnline(activeConv.participantId) && (
                          <span className="inline-block mt-2 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">Active now</span>
                        )}
                      </div>
                      <Link to={`/profile/${activeConv.participantId}`}
                        className="w-full text-center py-2 text-sm font-semibold text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 rounded-xl hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors">
                        View Profile
                      </Link>
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 border-t border-slate-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-end gap-2">
                <div className="flex-1 relative">
                  <textarea
                    ref={el => { inputRef.current = el; textareaRef.current = el }}
                    rows={1}
                    value={inputText}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Message…"
                    className="w-full bg-slate-100 dark:bg-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-2xl px-4 py-2.5 text-sm resize-none outline-none focus:ring-2 focus:ring-indigo-400/30 transition-all leading-relaxed"
                    style={{ maxHeight: 120 }}
                  />
                </div>
                <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-500 dark:text-gray-400 transition-colors flex-shrink-0">
                  <Smile size={18} />
                </button>
                <AnimatePresence mode="wait">
                  {inputText.trim() && (
                    <motion.button key="send"
                      initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.7, opacity: 0 }} transition={{ duration: 0.14 }}
                      onClick={sendMessage} disabled={sending || !connected}
                      className="w-9 h-9 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 active:scale-95 disabled:opacity-60 rounded-xl transition-all flex-shrink-0">
                      {sending ? <Loader2 size={15} className="text-white animate-spin" /> : <Send size={15} className="text-white" />}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
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
