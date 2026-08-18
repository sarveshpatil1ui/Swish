import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search, Edit, Phone, Video, Info, Send, Smile,
  Image, Heart, ChevronLeft,
  CheckCheck, Check, Mic, Plus, X, Circle,
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'

// ─── Mock conversation data ────────────────────────────────────────────────
const MOCK_CONVERSATIONS = [
  {
    id: 'conv-1',
    userId: 'user-1',
    name: 'Rahul Sharma',
    username: 'rahul.sharma',
    initials: 'RS',
    avatarColor: '#6366f1',
    online: true,
    lastMessage: 'Bro did you see the new project announcement? 🔥',
    lastTime: '2m',
    unread: 3,
    messages: [
      { id: 'm1', from: 'them', text: 'Hey! What\'s up?', time: '10:30 AM', status: 'read' },
      { id: 'm2', from: 'me', text: 'Not much, just working on the assignment 😅', time: '10:31 AM', status: 'read' },
      { id: 'm3', from: 'them', text: 'Ohh right, the DSA one? I barely started lol', time: '10:32 AM', status: 'read' },
      { id: 'm4', from: 'me', text: 'Same here, the binary tree part is killing me', time: '10:33 AM', status: 'read' },
      { id: 'm5', from: 'them', text: 'Dude let\'s do a study group tonight?', time: '10:35 AM', status: 'read' },
      { id: 'm6', from: 'me', text: 'Yes 100%! Library at 7?', time: '10:35 AM', status: 'read' },
      { id: 'm7', from: 'them', text: 'Let\'s goo 🙌', time: '10:36 AM', status: 'read' },
      { id: 'm8', from: 'them', text: 'Bro did you see the new project announcement? 🔥', time: '11:20 AM', status: 'delivered' },
      { id: 'm9', from: 'them', text: 'They\'re giving extra credit!!', time: '11:20 AM', status: 'delivered' },
      { id: 'm10', from: 'them', text: 'Reply karna yaar 😭', time: '11:22 AM', status: 'delivered' },
    ],
  },
  {
    id: 'conv-2',
    userId: 'demo-student',
    name: 'Demo Student',
    username: 'demo.student',
    initials: 'DS',
    avatarColor: '#8b5cf6',
    online: false,
    lastMessage: 'Thanks for the notes! 🙏',
    lastTime: '1h',
    unread: 0,
    messages: [
      { id: 'm1', from: 'me', text: 'Hey can you share your notes from yesterday\'s lecture?', time: '9:00 AM', status: 'read' },
      { id: 'm2', from: 'them', text: 'Sure! Give me a sec', time: '9:05 AM', status: 'read' },
      { id: 'm3', from: 'them', text: 'Sent it on WhatsApp', time: '9:06 AM', status: 'read' },
      { id: 'm4', from: 'me', text: 'Got it, thanks a lot!', time: '9:10 AM', status: 'read' },
      { id: 'm5', from: 'them', text: 'Thanks for the notes! 🙏', time: '9:11 AM', status: 'read' },
    ],
  },
  {
    id: 'conv-3',
    userId: 'demo-faculty',
    name: 'Dr. Demo Faculty',
    username: 'demo.faculty',
    initials: 'DF',
    avatarColor: '#10b981',
    online: true,
    lastMessage: 'Submit your assignments by Friday.',
    lastTime: '3h',
    unread: 1,
    messages: [
      { id: 'm1', from: 'them', text: 'Hello everyone, reminder about the upcoming test.', time: '8:00 AM', status: 'read' },
      { id: 'm2', from: 'me', text: 'Got it sir, thank you for the reminder!', time: '8:05 AM', status: 'read' },
      { id: 'm3', from: 'them', text: 'Submit your assignments by Friday.', time: '8:10 AM', status: 'delivered' },
    ],
  },
  {
    id: 'conv-4',
    userId: 'u-priya',
    name: 'Priya Patel',
    username: 'priya.patel',
    initials: 'PP',
    avatarColor: '#ec4899',
    online: true,
    lastMessage: 'Are you coming to the fest tomorrow?',
    lastTime: '5h',
    unread: 0,
    messages: [
      { id: 'm1', from: 'them', text: 'Heyy! Are you coming to the fest tomorrow?', time: '7:00 PM', status: 'read' },
      { id: 'm2', from: 'me', text: 'Yes!! Can\'t wait 🎉', time: '7:02 PM', status: 'read' },
      { id: 'm3', from: 'them', text: 'Same! Meet at the entrance at 5?', time: '7:03 PM', status: 'read' },
      { id: 'm4', from: 'me', text: 'Done ✅', time: '7:04 PM', status: 'read' },
      { id: 'm5', from: 'them', text: 'Are you coming to the fest tomorrow?', time: '7:05 PM', status: 'read' },
    ],
  },
  {
    id: 'conv-5',
    userId: 'u-arjun',
    name: 'Arjun Mehta',
    username: 'arjun.mehta',
    initials: 'AM',
    avatarColor: '#f59e0b',
    online: false,
    lastMessage: 'You: Sounds good 👍',
    lastTime: 'Yesterday',
    unread: 0,
    messages: [
      { id: 'm1', from: 'them', text: 'Hey, wanna join the coding club?', time: 'Yesterday', status: 'read' },
      { id: 'm2', from: 'me', text: 'Oh that sounds interesting! When do you guys meet?', time: 'Yesterday', status: 'read' },
      { id: 'm3', from: 'them', text: 'Every Saturday 11am, Seminar Hall B', time: 'Yesterday', status: 'read' },
      { id: 'm4', from: 'me', text: 'Sounds good 👍', time: 'Yesterday', status: 'read' },
    ],
  },
  {
    id: 'conv-6',
    userId: 'u-sneha',
    name: 'Sneha Iyer',
    username: 'sneha.iyer',
    initials: 'SI',
    avatarColor: '#06b6d4',
    online: false,
    lastMessage: 'Check the group project doc I shared',
    lastTime: '2d',
    unread: 0,
    messages: [
      { id: 'm1', from: 'them', text: 'Check the group project doc I shared', time: '2 days ago', status: 'read' },
      { id: 'm2', from: 'me', text: 'Checking now!', time: '2 days ago', status: 'read' },
    ],
  },
]

// ─── Avatar ────────────────────────────────────────────────────────────────
function Avatar({ initials, avatarColor, online, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-9 h-9 text-xs',
    md: 'w-11 h-11 text-sm',
    lg: 'w-14 h-14 text-base',
  }
  const dotClasses = {
    sm: 'w-2.5 h-2.5 border-[1.5px]',
    md: 'w-3 h-3 border-2',
    lg: 'w-3.5 h-3.5 border-2',
  }
  return (
    <div className="relative flex-shrink-0">
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center text-white font-bold`}
        style={{ backgroundColor: avatarColor }}
      >
        {initials}
      </div>
      {online !== undefined && (
        <span
          className={`absolute bottom-0 right-0 ${dotClasses[size]} rounded-full border-white dark:border-gray-900 ${
            online ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-gray-600'
          }`}
        />
      )}
    </div>
  )
}

// ─── Message Bubble ────────────────────────────────────────────────────────
function MessageBubble({ msg, isMe }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.18 }}
      className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-1`}
    >
      <div className={`max-w-[70%] group flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
        <div
          className={`px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
            isMe
              ? 'bg-indigo-600 text-white rounded-br-sm'
              : 'bg-white dark:bg-gray-800 text-slate-900 dark:text-white border border-slate-100 dark:border-gray-700 rounded-bl-sm'
          }`}
        >
          {msg.text}
        </div>
        <div className={`flex items-center gap-1 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity ${isMe ? 'flex-row-reverse' : ''}`}>
          <span className="text-[10px] text-slate-400 dark:text-gray-500">{msg.time}</span>
          {isMe && (
            msg.status === 'read'
              ? <CheckCheck size={12} className="text-indigo-400" />
              : <Check size={12} className="text-slate-400" />
          )}
        </div>
      </div>
    </motion.div>
  )
}

// ─── Conversation List Item ────────────────────────────────────────────────
function ConvItem({ conv, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-150 ${
        isActive
          ? 'bg-indigo-50 dark:bg-indigo-950/40'
          : 'hover:bg-slate-50 dark:hover:bg-gray-800/60'
      }`}
    >
      <Avatar
        initials={conv.initials}
        avatarColor={conv.avatarColor}
        online={conv.online}
        size="md"
      />
      <div className="flex-1 min-w-0 text-left">
        <div className="flex items-center justify-between mb-0.5">
          <span className={`text-sm truncate ${conv.unread > 0 ? 'font-bold text-slate-900 dark:text-white' : 'font-semibold text-slate-800 dark:text-slate-200'}`}>
            {conv.name}
          </span>
          <span className={`text-[11px] flex-shrink-0 ml-2 ${conv.unread > 0 ? 'text-indigo-500 font-semibold' : 'text-slate-400 dark:text-gray-500'}`}>
            {conv.lastTime}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <p className={`text-xs truncate max-w-[160px] ${conv.unread > 0 ? 'text-slate-700 dark:text-slate-300 font-medium' : 'text-slate-400 dark:text-gray-500'}`}>
            {conv.lastMessage}
          </p>
          {conv.unread > 0 && (
            <span className="ml-2 flex-shrink-0 w-5 h-5 bg-indigo-600 text-white rounded-full text-[10px] font-bold flex items-center justify-center">
              {conv.unread}
            </span>
          )}
        </div>
      </div>
    </button>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────
function NoChatSelected() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-8">
      <div className="w-20 h-20 rounded-full bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center">
        <Send size={32} className="text-indigo-400 -rotate-12" />
      </div>
      <div>
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-1">Your Messages</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Send private messages to a friend or classmate.
        </p>
      </div>
      <button className="mt-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors">
        Send Message
      </button>
    </div>
  )
}

// ─── Main MessagesPage ─────────────────────────────────────────────────────
export default function MessagesPage() {
  const { currentUser } = useSwish()

  const [conversations, setConversations] = useState(MOCK_CONVERSATIONS)
  const [activeConvId, setActiveConvId] = useState(null)
  const [query, setQuery] = useState('')
  const [inputText, setInputText] = useState('')
  const [showInfo, setShowInfo] = useState(false)
  const [mobileShowChat, setMobileShowChat] = useState(false)

  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)
  const textareaRef = useRef(null)

  const activeConv = conversations.find(c => c.id === activeConvId) ?? null

  const filteredConvs = conversations.filter(c =>
    c.name.toLowerCase().includes(query.toLowerCase()) ||
    c.username.toLowerCase().includes(query.toLowerCase())
  )

  const totalUnread = conversations.reduce((sum, c) => sum + c.unread, 0)

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeConvId, activeConv?.messages?.length])

  const openConv = (id) => {
    setActiveConvId(id)
    setMobileShowChat(true)
    setShowInfo(false)
    setConversations(prev =>
      prev.map(c => c.id === id ? { ...c, unread: 0 } : c)
    )
    setTimeout(() => inputRef.current?.focus(), 100)
  }

  const sendMessage = () => {
    const text = inputText.trim()
    if (!text || !activeConvId) return

    const newMsg = {
      id: `m-${Date.now()}`,
      from: 'me',
      text,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      status: 'delivered',
    }

    setConversations(prev =>
      prev.map(c =>
        c.id === activeConvId
          ? { ...c, messages: [...c.messages, newMsg], lastMessage: `You: ${text}`, lastTime: 'now' }
          : c
      )
    )
    setInputText('')
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }
    inputRef.current?.focus()
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }

  return (
    <div className="flex h-screen max-h-screen overflow-hidden">

      {/* ─── Conversation List ─────────────────────────────────────────── */}
      <div
        className={`flex flex-col border-r border-slate-100 dark:border-gray-800 bg-white dark:bg-gray-950 flex-shrink-0 w-full md:w-80 lg:w-96 ${
          mobileShowChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {/* Header */}
        <div className="px-5 pt-6 pb-4 border-b border-slate-100 dark:border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Messages
              </h1>
              {totalUnread > 0 && (
                <span className="text-xs font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">
                  {totalUnread}
                </span>
              )}
            </div>
            <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-400 transition-colors">
              <Edit size={18} />
            </button>
          </div>
          <div className="relative">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search messages…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              className="w-full bg-slate-100 dark:bg-gray-800 rounded-xl pl-9 pr-9 py-2.5 text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Conv list */}
        <div className="flex-1 overflow-y-auto py-2 px-2">
          {filteredConvs.length === 0 ? (
            <div className="text-center py-12 text-slate-400 dark:text-gray-500 text-sm">
              No conversations found
            </div>
          ) : (
            <div className="space-y-0.5">
              {filteredConvs.map(conv => (
                <ConvItem
                  key={conv.id}
                  conv={conv}
                  isActive={conv.id === activeConvId}
                  onClick={() => openConv(conv.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Chat Window ───────────────────────────────────────────────── */}
      <div
        className={`flex-1 flex min-w-0 bg-white dark:bg-gray-950 ${
          !mobileShowChat ? 'hidden md:flex' : 'flex'
        }`}
      >
        {!activeConv ? (
          <NoChatSelected />
        ) : (
          <div className="flex-1 flex flex-col min-w-0">

            {/* Chat header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => { setMobileShowChat(false); setActiveConvId(null) }}
                  className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-400 transition-colors -ml-1"
                >
                  <ChevronLeft size={22} />
                </button>
                <Avatar
                  initials={activeConv.initials}
                  avatarColor={activeConv.avatarColor}
                  online={activeConv.online}
                  size="sm"
                />
                <div className="min-w-0">
                  <p className="font-bold text-slate-900 dark:text-white text-sm leading-tight truncate">
                    {activeConv.name}
                  </p>
                  <p className="text-xs text-slate-400 dark:text-gray-500 leading-tight">
                    {activeConv.online
                      ? <span className="text-emerald-500 font-medium">● Active now</span>
                      : `@${activeConv.username}`
                    }
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-400 transition-colors">
                  <Phone size={18} />
                </button>
                <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-400 transition-colors">
                  <Video size={18} />
                </button>
                <button
                  onClick={() => setShowInfo(v => !v)}
                  className={`w-9 h-9 flex items-center justify-center rounded-xl transition-colors ${
                    showInfo
                      ? 'bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400'
                      : 'hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-600 dark:text-gray-400'
                  }`}
                >
                  <Info size={18} />
                </button>
              </div>
            </div>

            {/* Messages + info panel row */}
            <div className="flex flex-1 min-h-0">

              {/* Scrollable messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 bg-slate-50/60 dark:bg-gray-900/40">
                {/* Date chip */}
                <div className="flex justify-center mb-5">
                  <span className="bg-slate-200/70 dark:bg-gray-700/60 text-slate-500 dark:text-gray-400 text-[11px] font-medium px-3 py-1 rounded-full">
                    Today
                  </span>
                </div>

                {activeConv.messages.map((msg) => (
                  <MessageBubble
                    key={msg.id}
                    msg={msg}
                    isMe={msg.from === 'me'}
                  />
                ))}

                {/* Typing indicator */}
                {activeConv.online && (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex justify-start mb-2 mt-1"
                  >
                    <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-gray-700 rounded-2xl rounded-bl-sm px-4 py-3 flex items-center gap-1">
                      {[0, 1, 2].map(i => (
                        <motion.span
                          key={i}
                          className="w-1.5 h-1.5 bg-slate-400 dark:bg-gray-400 rounded-full block"
                          animate={{ y: [0, -4, 0] }}
                          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.15 }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}

                <div ref={messagesEndRef} />
              </div>

              {/* Info side panel */}
              <AnimatePresence>
                {showInfo && (
                  <motion.aside
                    key="info"
                    initial={{ width: 0, opacity: 0 }}
                    animate={{ width: 256, opacity: 1 }}
                    exit={{ width: 0, opacity: 0 }}
                    transition={{ duration: 0.22, ease: 'easeInOut' }}
                    className="border-l border-slate-100 dark:border-gray-800 overflow-hidden flex-shrink-0"
                  >
                    <div className="w-64 p-5 flex flex-col items-center gap-4">
                      <Avatar
                        initials={activeConv.initials}
                        avatarColor={activeConv.avatarColor}
                        online={activeConv.online}
                        size="lg"
                      />
                      <div className="text-center">
                        <p className="font-bold text-slate-900 dark:text-white">{activeConv.name}</p>
                        <p className="text-xs text-slate-400 dark:text-gray-500 mt-0.5">@{activeConv.username}</p>
                        {activeConv.online && (
                          <span className="inline-block mt-2 text-[11px] font-semibold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2.5 py-1 rounded-full">
                            Active now
                          </span>
                        )}
                      </div>

                      <div className="w-full space-y-1 pt-3 border-t border-slate-100 dark:border-gray-800">
                        {[
                          { label: 'Mute Messages', icon: Mic },
                          { label: 'Report', icon: Circle, danger: true },
                          { label: 'Block User', icon: X, danger: true },
                        ].map(({ label, icon: Icon, danger }) => (
                          <button
                            key={label}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                              danger
                                ? 'text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30'
                                : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-gray-800'
                            }`}
                          >
                            <Icon size={16} />
                            {label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </motion.aside>
                )}
              </AnimatePresence>
            </div>

            {/* Input bar */}
            <div className="px-4 py-3 border-t border-slate-100 dark:border-gray-800 flex-shrink-0">
              <div className="flex items-end gap-2">
                <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-500 dark:text-gray-400 transition-colors flex-shrink-0">
                  <Plus size={20} />
                </button>
                <button className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-500 dark:text-gray-400 transition-colors flex-shrink-0">
                  <Image size={18} />
                </button>

                <div className="flex-1 relative">
                  <textarea
                    ref={(el) => { inputRef.current = el; textareaRef.current = el }}
                    rows={1}
                    value={inputText}
                    onChange={e => {
                      setInputText(e.target.value)
                      e.target.style.height = 'auto'
                      e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
                    }}
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
                  {inputText.trim() ? (
                    <motion.button
                      key="send"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.7, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      onClick={sendMessage}
                      className="w-9 h-9 flex items-center justify-center bg-indigo-600 hover:bg-indigo-700 active:scale-95 rounded-xl transition-all flex-shrink-0"
                    >
                      <Send size={16} className="text-white" />
                    </motion.button>
                  ) : (
                    <motion.button
                      key="heart"
                      initial={{ scale: 0.7, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.7, opacity: 0 }}
                      transition={{ duration: 0.15 }}
                      className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/30 text-rose-400 hover:text-rose-500 transition-all flex-shrink-0 active:scale-95"
                    >
                      <Heart size={20} />
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
