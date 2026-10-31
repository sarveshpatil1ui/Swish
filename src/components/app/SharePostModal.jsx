import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Search, Send, Check, Copy, Share2, Loader2, MessageSquare, ExternalLink
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { apiFetch } from '../../utils/auth'
import { resolveImageUrl } from '../../utils/posts'

// ── Simple Avatar Helper ───────────────────────────────────────────────────────
function Avatar({ name, initials, avatarColor, profilePhoto, size = 'sm' }) {
  const [imgError, setImgError] = useState(false)
  const sizes = { sm: 'w-9 h-9 text-xs', md: 'w-10 h-10 text-sm' }
  const src = profilePhoto ? resolveImageUrl(profilePhoto) : null

  return (
    <div className="relative flex-shrink-0">
      {src && !imgError ? (
        <img
          src={src}
          alt={name}
          onError={() => setImgError(true)}
          className={`${sizes[size]} rounded-full object-cover`}
        />
      ) : (
        <div
          className={`${sizes[size]} rounded-full flex items-center justify-center text-white font-bold`}
          style={{ backgroundColor: avatarColor || '#6366f1' }}
        >
          {initials || name?.[0]?.toUpperCase() || '?'}
        </div>
      )}
    </div>
  )
}

// ── Brand SVG Icons ────────────────────────────────────────────────────────────
function WhatsAppIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2.05 22l5.25-1.38c1.45.79 3.08 1.21 4.74 1.21 5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2m.01 1.67c2.2 0 4.26.86 5.82 2.42a8.23 8.23 0 0 1 2.41 5.83c0 4.54-3.7 8.24-8.24 8.24-1.48 0-2.93-.4-4.2-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.19 8.19 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24m4.52 11.66c-.25-.13-1.47-.72-1.7-.81-.23-.08-.39-.13-.56.13-.17.25-.64.81-.79.97-.14.17-.29.19-.54.06-.25-.13-1.06-.39-2.02-1.25-.75-.67-1.26-1.5-1.4-1.76-.15-.25-.02-.39.11-.51.11-.11.25-.29.38-.44.12-.14.17-.25.25-.42.08-.17.04-.31-.02-.44s-.56-1.35-.77-1.85c-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.44.06-.67.31-.23.25-.88.86-.88 2.1 0 1.24.9 2.44 1.03 2.61.12.17 1.78 2.72 4.31 3.81.6.26 1.07.42 1.44.53.61.19 1.16.17 1.6.1.49-.07 1.47-.6 1.68-1.18.21-.58.21-1.08.15-1.18-.06-.1-.23-.16-.48-.28" />
    </svg>
  )
}

function TwitterIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function TelegramIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
    </svg>
  )
}

function LinkedInIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.46 8.76a1.64 1.64 0 1 0 0-3.28 1.64 1.64 0 0 0 0 3.28m1.4 9.74v-8.37H5.06v8.37h2.8z" />
    </svg>
  )
}

export default function SharePostModal({ post, onClose }) {
  const { currentUser, platformConfig } = useSwish()
  const isMessagingPaused = platformConfig?.features?.allowDirectMessaging === false
  const [conversations, setConversations] = useState([])
  const [searchResults, setSearchResults] = useState([])
  const [loadingChats, setLoadingChats] = useState(true)
  const [searching, setSearching] = useState(false)
  const [query, setQuery] = useState('')
  const [note, setNote] = useState('')
  const [sendingMap, setSendingMap] = useState({}) // id -> bool
  const [sentMap, setSentMap] = useState({}) // id -> bool
  const [copied, setCopied] = useState(false)

  const postId = post?.id || post?._id
  const postUrl = `${window.location.origin}/post/${postId}`
  const authorName = post?.userName || post?.user?.name || 'Swish user'
  const shareText = `Check out this post on Swish by ${authorName}:`
  const postImg = post?.imageUrl ? resolveImageUrl(post.imageUrl) : null
  const postSnippet = (post?.caption || post?.content || '').slice(0, 120)

  // ── Load recent conversations ───────────────────────────────────────────────
  useEffect(() => {
    let active = true
    setLoadingChats(true)

    apiFetch('/api/messages').then(res => {
      if (!active) return
      if (res.ok && Array.isArray(res.conversations)) {
        setConversations(res.conversations)
      }
      setLoadingChats(false)
    }).catch(() => {
      if (active) setLoadingChats(false)
    })

    return () => { active = false }
  }, [])

  // ── Search users when typing query ──────────────────────────────────────────
  useEffect(() => {
    const q = query.trim()
    if (!q) {
      setSearchResults([])
      setSearching(false)
      return
    }

    setSearching(true)
    const timer = setTimeout(async () => {
      try {
        const res = await apiFetch(`/api/users/search?q=${encodeURIComponent(q)}`)
        if (res.ok && Array.isArray(res.users)) {
          // Filter out myself
          const myId = String(currentUser?.id || currentUser?._id || '')
          setSearchResults(res.users.filter(u => String(u.id || u._id) !== myId))
        } else {
          setSearchResults([])
        }
      } catch (err) {
        console.error('[SharePostModal] search error:', err)
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 250)

    return () => clearTimeout(timer)
  }, [query, currentUser])

  // ── Send post in Direct Message ─────────────────────────────────────────────
  const handleSendToUser = async (target) => {
    // target can be a conversation or a searched user
    const targetKey = target.id || target._id
    if (isMessagingPaused || sendingMap[targetKey] || sentMap[targetKey]) return

    setSendingMap(prev => ({ ...prev, [targetKey]: true }))

    const postShare = {
      postId,
      imageUrl: post?.imageUrl || null,
      caption: (post?.caption || post?.content || '').slice(0, 300),
      authorName,
    }
    const messageText = note.trim() || 'Shared a post'

    try {
      let targetConvId = target.convId || target.id

      // If target is a direct user search result without convId, find/create conversation first
      if (target.participantId === undefined && !target.lastMessage) {
        // target is a User from search results
        const convRes = await apiFetch('/api/messages', {
          method: 'POST',
          body: { participantId: target.id || target._id }
        })
        if (convRes.ok && convRes.convId) {
          targetConvId = convRes.convId
        } else {
          throw new Error(convRes.error || 'Failed to start chat')
        }
      }

      // Send message with postShare payload
      const sendRes = await apiFetch(`/api/messages/${targetConvId}/send`, {
        method: 'POST',
        body: {
          text: messageText,
          postShare,
        }
      })

      if (sendRes.ok) {
        setSentMap(prev => ({ ...prev, [targetKey]: true }))
      } else {
        console.error('[SharePostModal] send failed:', sendRes.error)
      }
    } catch (err) {
      console.error('[SharePostModal] error sending post:', err)
    } finally {
      setSendingMap(prev => ({ ...prev, [targetKey]: false }))
    }
  }

  // ── Copy Link ───────────────────────────────────────────────────────────────
  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(postUrl)
      } else {
        const input = document.createElement('input')
        input.value = postUrl
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        document.body.removeChild(input)
      }
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)

      window.dispatchEvent(
        new CustomEvent('swish:toast', {
          detail: {
            title: 'Link copied to clipboard!',
            body: 'Share this link with your friends or classmates.',
            type: 'share',
          },
        })
      )
    } catch (err) {
      console.error('Failed to copy link:', err)
    }
  }

  // ── Native Share (Mobile) ───────────────────────────────────────────────────
  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `Post by ${authorName}`,
          text: shareText,
          url: postUrl,
        })
        onClose?.()
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err)
      }
    } else {
      handleCopyLink()
    }
  }

  // Determine which list to show
  const showSearchResults = query.trim().length > 0
  const displayList = showSearchResults ? searchResults : conversations

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70]"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="fixed inset-0 z-[70] flex items-center justify-center p-4 pointer-events-none"
      >
        <div
          className="w-full max-w-md bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
          style={{ maxHeight: '88vh' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-gray-800 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Share2 size={18} className="text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-slate-900 dark:text-white font-bold text-base">
                Share Post
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>

          {/* Post Preview Strip */}
          <div className="px-4 py-2.5 bg-slate-50 dark:bg-gray-800/40 border-b border-slate-100 dark:border-gray-800 flex items-center gap-3 flex-shrink-0">
            {postImg ? (
              <div className="w-11 h-11 rounded-lg overflow-hidden bg-slate-900 flex-shrink-0">
                <img src={postImg} alt="Preview" className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-11 h-11 rounded-lg bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0 font-bold text-xs">
                Post
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                {authorName}
              </p>
              <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate">
                {postSnippet || 'Swish campus post'}
              </p>
            </div>
          </div>

          {/* Optional Note Input */}
          <div className="px-4 pt-3 pb-1 flex-shrink-0">
            <input
              type="text"
              placeholder="Write a message... (optional)"
              value={note}
              onChange={e => setNote(e.target.value)}
              className="w-full bg-slate-100 dark:bg-gray-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all"
            />
          </div>

          {isMessagingPaused && (
            <div className="mx-4 mt-2 p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-[11px] text-amber-800 dark:text-amber-300 flex items-center gap-2">
              <span className="font-semibold">Direct messaging is paused for maintenance. You can still share via link or social apps below.</span>
            </div>
          )}

          {/* Search Contacts Bar */}
          <div className="px-4 py-2.5 flex-shrink-0">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search friends or classmates..."
                value={query}
                onChange={e => setQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-gray-800 text-slate-900 dark:text-white placeholder-slate-400 text-xs rounded-xl pl-8 pr-3 py-2 outline-none focus:ring-2 focus:ring-indigo-400/40 transition-all"
              />
            </div>
          </div>

          {/* Contacts / Recent Chats List */}
          <div className="flex-1 overflow-y-auto px-2 divide-y divide-slate-100 dark:divide-gray-800/60 min-h-[160px] max-h-64">
            {loadingChats || searching ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 size={20} className="animate-spin text-indigo-500" />
              </div>
            ) : displayList.length === 0 ? (
              <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-1.5">
                <MessageSquare size={22} className="opacity-40" />
                <span>{showSearchResults ? 'No users found' : 'No recent chats'}</span>
              </div>
            ) : (
              displayList.map(item => {
                const itemKey = item.id || item._id
                const isSent = Boolean(sentMap[itemKey])
                const isSending = Boolean(sendingMap[itemKey])

                return (
                  <div key={itemKey} className="flex items-center justify-between px-3 py-2.5 hover:bg-slate-50 dark:hover:bg-gray-800/40 rounded-xl transition-colors">
                    <div className="flex items-center gap-3 min-w-0 flex-1 mr-3">
                      <Avatar
                        name={item.name}
                        initials={item.initials}
                        avatarColor={item.avatarColor}
                        profilePhoto={item.profilePhoto}
                        size="sm"
                      />
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-white truncate">
                          {item.name}
                        </p>
                        <p className="text-[10px] text-slate-400 truncate">
                          @{item.username || 'user'}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => handleSendToUser(item)}
                      disabled={isSent || isSending || isMessagingPaused}
                      className={`text-xs font-semibold px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1.5 flex-shrink-0 ${
                        isSent
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400'
                          : isSending
                          ? 'bg-indigo-400 text-white cursor-wait'
                          : 'bg-indigo-600 hover:bg-indigo-700 text-white active:scale-95'
                      }`}
                    >
                      {isSent ? (
                        <>
                          <Check size={13} />
                          <span>Sent</span>
                        </>
                      ) : isSending ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <>
                          <Send size={12} />
                          <span>Send</span>
                        </>
                      )}
                    </button>
                  </div>
                )
              })
            )}
          </div>

          {/* Quick External Actions Row */}
          <div className="p-4 border-t border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-900/60 flex-shrink-0">
            <p className="text-[11px] font-semibold text-slate-500 dark:text-gray-400 mb-2.5">
              Share outside Swish:
            </p>

            <div className="grid grid-cols-5 gap-2 text-center">
              {/* WhatsApp */}
              <a
                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(shareText + ' ' + postUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 hover:bg-emerald-50 dark:hover:bg-emerald-950/30 text-emerald-600 transition-colors"
                title="Share to WhatsApp"
              >
                <WhatsAppIcon size={20} />
                <span className="text-[10px] font-medium text-slate-600 dark:text-gray-300">WhatsApp</span>
              </a>

              {/* Twitter / X */}
              <a
                href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(postUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-800 dark:text-white transition-colors"
                title="Share to Twitter / X"
              >
                <TwitterIcon size={18} />
                <span className="text-[10px] font-medium text-slate-600 dark:text-gray-300">X</span>
              </a>

              {/* Telegram */}
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(postUrl)}&text=${encodeURIComponent(shareText)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 hover:bg-sky-50 dark:hover:bg-sky-950/30 text-sky-500 transition-colors"
                title="Share to Telegram"
              >
                <TelegramIcon size={19} />
                <span className="text-[10px] font-medium text-slate-600 dark:text-gray-300">Telegram</span>
              </a>

              {/* LinkedIn */}
              <a
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(postUrl)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 hover:bg-blue-50 dark:hover:bg-blue-950/30 text-blue-600 transition-colors"
                title="Share to LinkedIn"
              >
                <LinkedInIcon size={19} />
                <span className="text-[10px] font-medium text-slate-600 dark:text-gray-300">LinkedIn</span>
              </a>

              {/* Copy Link / Native Share */}
              <button
                type="button"
                onClick={handleCopyLink}
                className="flex flex-col items-center gap-1 p-2 rounded-xl bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 text-indigo-600 transition-colors"
                title={copied ? 'Copied!' : 'Copy Link'}
              >
                {copied ? <Check size={19} className="text-emerald-500" /> : <Copy size={19} />}
                <span className="text-[10px] font-medium text-slate-600 dark:text-gray-300">{copied ? 'Copied!' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </>
  )
}

