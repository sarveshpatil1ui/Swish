import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ChevronLeft, ChevronRight, Trash2, Edit2, Eye, Clock,
  Users, Loader2, Music2, Volume2, VolumeX, Heart, Send,
  MessageCircle, Sparkles
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { apiRecordStoryView, apiGetStoryViewers, apiGetStoryReplies } from '../../utils/auth'
import { STORY_FILTERS } from '../../data/storyMusic'
import { resolveAudioUrl } from '../../utils/audioResolver'

const DURATION = 5000 // 5 seconds per story
const QUICK_EMOJIS = ['❤️', '🔥', '😂', '😮', '👏', '🎉']

export default function StoryViewer({
  userGroups = [],
  initialUserIndex = 0,
  initialStoryIndex = 0,
  onClose,
  onDelete,
  onEdit,
  onStoryViewed,
}) {
  const { currentUser, likeStory, reactStory, replyStory } = useSwish()
  const [userGroupIdx, setUserGroupIdx] = useState(initialUserIndex)
  const [storyIdx, setStoryIdx] = useState(initialStoryIndex)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isHolding, setIsHolding] = useState(false)
  const [isMediaLoaded, setIsMediaLoaded] = useState(false)
  const [isMuted, setIsMuted] = useState(false)

  // Floating emoji reaction animations
  const [flyingReactions, setFlyingReactions] = useState([])

  // Direct reply state
  const [replyText, setReplyText] = useState('')
  const [isReplying, setIsReplying] = useState(false)
  const [replyStatus, setReplyStatus] = useState('')
  const [drawerCommentText, setDrawerCommentText] = useState('')

  // Viewers & Replies Modal state (for own and others' stories)
  const [showViewersModal, setShowViewersModal] = useState(false)
  const [activeOwnerTab, setActiveOwnerTab] = useState('replies') // 'viewers' | 'replies'
  const [viewers, setViewers] = useState([])
  const [storyReplies, setStoryReplies] = useState([])
  const [loadingOwnerData, setLoadingOwnerData] = useState(false)

  const cardRef = useRef(null)
  const audioRef = useRef(null)
  const pointerDownRef = useRef({ time: 0, x: 0, y: 0, moved: false })
  const elapsedRef = useRef(0)
  const lastTimeRef = useRef(null)
  const animFrameRef = useRef(null)

  const currentGroup = userGroups[userGroupIdx]
  const currentStories = currentGroup?.stories || []
  const currentStory = currentStories[storyIdx]
  const isOwnStory = currentStory?.userId === currentUser?.id || currentStory?.isOwnStory

  // ── Preload next image in line for zero-latency transitions ────────────────
  useEffect(() => {
    let nextUrl = null
    if (storyIdx < currentStories.length - 1) {
      nextUrl = currentStories[storyIdx + 1]?.imageUrl
    } else if (userGroupIdx < userGroups.length - 1) {
      const nextGroup = userGroups[userGroupIdx + 1]
      nextUrl = nextGroup?.stories?.[0]?.imageUrl
    }
    if (nextUrl) {
      const img = new Image()
      img.src = nextUrl
    }
  }, [storyIdx, currentStories, userGroupIdx, userGroups])

  // ── Reset story media loaded status & elapsed counter on story change ──────
  useEffect(() => {
    elapsedRef.current = 0
    setProgress(0)
    lastTimeRef.current = null
    setIsReplying(false)
    setReplyText('')
    setDrawerCommentText('')
    setReplyStatus('')
    setStoryReplies(currentStory?.replies || [])
    setShowViewersModal(false)

    if (!currentStory?.imageUrl) {
      setIsMediaLoaded(true)
    } else {
      setIsMediaLoaded(false)
    }
  }, [userGroupIdx, storyIdx, currentStory?.id, currentStory?.imageUrl])

  // ── Sync external story replies updates (from context or socket) ───────────
  useEffect(() => {
    if (currentStory?.replies) {
      setStoryReplies(currentStory.replies)
    }
  }, [currentStory?.replies])

  // ── Audio playback sync with story timer & pause state ─────────────────────
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const canPlay = isMediaLoaded && !isPaused && !isHolding && !showViewersModal && !isReplying
    if (canPlay) {
      audio.muted = isMuted
      audio.play().catch(() => {})
    } else {
      audio.pause()
    }
  }, [isMediaLoaded, isPaused, isHolding, showViewersModal, isReplying, isMuted, currentStory?.id])

  // ── Navigation Functions ───────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (!currentGroup) {
      onClose?.()
      return
    }

    if (storyIdx < currentStories.length - 1) {
      setDirection(1)
      setStoryIdx(s => s + 1)
    } else if (userGroupIdx < userGroups.length - 1) {
      const nextGroup = userGroups[userGroupIdx + 1]
      const unreadIdx = nextGroup?.stories?.findIndex(s => s.hasNew)
      setDirection(1)
      setUserGroupIdx(u => u + 1)
      setStoryIdx(unreadIdx >= 0 ? unreadIdx : 0)
    } else {
      onClose?.()
    }
  }, [storyIdx, currentStories.length, userGroupIdx, userGroups, currentGroup, onClose])

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setDirection(-1)
      setStoryIdx(s => s - 1)
    } else if (userGroupIdx > 0) {
      const prevGroup = userGroups[userGroupIdx - 1]
      setDirection(-1)
      setUserGroupIdx(u => u - 1)
      setStoryIdx(Math.max(0, (prevGroup?.stories?.length || 1) - 1))
    }
  }, [storyIdx, userGroupIdx, userGroups])

  const goNextRef = useRef(goNext)
  goNextRef.current = goNext

  // ── Record view when a story activates ─────────────────────────────────────
  useEffect(() => {
    if (!currentStory?.id) return

    if (!isOwnStory) {
      apiRecordStoryView(currentStory.id).catch(err => {
        console.warn('Failed to record story view:', err)
      })
      onStoryViewed?.(currentStory.id)
    }
  }, [currentStory?.id, isOwnStory, onStoryViewed])

  // ── Frame-Accurate Progress Timer Loop ─────────────────────────────────────
  useEffect(() => {
    const active = isMediaLoaded && !isPaused && !isHolding && !showViewersModal && !isReplying

    if (!active) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      lastTimeRef.current = null
      return
    }

    const step = (timestamp) => {
      if (!lastTimeRef.current) {
        lastTimeRef.current = timestamp
      }
      const delta = timestamp - lastTimeRef.current
      lastTimeRef.current = timestamp

      elapsedRef.current += delta
      const pct = Math.min((elapsedRef.current / DURATION) * 100, 100)
      setProgress(pct)

      if (elapsedRef.current >= DURATION) {
        goNextRef.current()
      } else {
        animFrameRef.current = requestAnimationFrame(step)
      }
    }

    animFrameRef.current = requestAnimationFrame(step)

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
    }
  }, [isMediaLoaded, isPaused, isHolding, showViewersModal, isReplying, userGroupIdx, storyIdx])

  // ── Keyboard Navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (isReplying) return // don't navigate while typing message
      if (e.key === 'Escape') {
        if (showViewersModal) {
          setShowViewersModal(false)
        } else {
          onClose?.()
        }
      } else if (e.key === 'ArrowRight' && !showViewersModal) {
        goNextRef.current()
      } else if (e.key === 'ArrowLeft' && !showViewersModal) {
        goPrev()
      } else if (e.key === ' ' && !showViewersModal) {
        e.preventDefault()
        setIsPaused(p => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, goPrev, showViewersModal, isReplying])

  // ── Touch & Pointer: Hold to Pause & Tap to Navigate ───────────────────────
  // ── Touch & Pointer: Hold to Pause & Tap to Navigate ───────────────────────
  const handlePointerDown = (e) => {
    if (showViewersModal || isReplying) return
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('form') || e.target.closest('.story-interactive')) return

    pointerDownRef.current = {
      time: Date.now(),
      x: e.clientX ?? e.touches?.[0]?.clientX ?? 0,
      y: e.clientY ?? e.touches?.[0]?.clientY ?? 0,
      moved: false,
    }
    setIsHolding(true)
  }

  const handlePointerMove = (e) => {
    if (!pointerDownRef.current.time) return
    const curX = e.clientX ?? e.touches?.[0]?.clientX ?? 0
    const curY = e.clientY ?? e.touches?.[0]?.clientY ?? 0
    const dx = Math.abs(curX - pointerDownRef.current.x)
    const dy = Math.abs(curY - pointerDownRef.current.y)
    if (dx > 10 || dy > 10) {
      pointerDownRef.current.moved = true
    }
  }

  const handlePointerUp = (e) => {
    if (showViewersModal || isReplying) return
    if (e.target.closest('button') || e.target.closest('input') || e.target.closest('form') || e.target.closest('.story-interactive')) return
    const down = pointerDownRef.current
    if (!down.time) return

    const duration = Date.now() - down.time
    const upX = e.clientX ?? e.changedTouches?.[0]?.clientX ?? down.x
    const upY = e.clientY ?? e.changedTouches?.[0]?.clientY ?? down.y
    const dx = Math.abs(upX - down.x)
    const dy = Math.abs(upY - down.y)

    setIsHolding(false)
    pointerDownRef.current = { time: 0, x: 0, y: 0, moved: false }

    if (dx > 25 || dy > 25 || down.moved) return

    if (duration < 240) {
      if (!cardRef.current) return
      const rect = cardRef.current.getBoundingClientRect()
      const relativeX = upX - rect.left
      const cardWidth = rect.width

      if (relativeX < cardWidth * 0.35) {
        goPrev()
      } else {
        goNextRef.current()
      }
    }
  }

  // ── Floating Emoji Particle Spawner ────────────────────────────────────────
  const triggerFloatingReaction = (emoji) => {
    const newReaction = {
      id: Math.random().toString(),
      emoji,
      x: Math.floor(Math.random() * 80) + 10, // random % x-pos
    }
    setFlyingReactions(prev => [...prev, newReaction])
    setTimeout(() => {
      setFlyingReactions(prev => prev.filter(r => r.id !== newReaction.id))
    }, 1800)
  }

  // ── Like / Heart Handler ───────────────────────────────────────────────────
  const handleLikeStory = async (e) => {
    e?.stopPropagation()
    if (!currentStory?.id) return
    triggerFloatingReaction('❤️')
    setViewers(prev => {
      const exists = prev.some(v => v.id === currentUser?.id)
      if (exists) {
        return prev.map(v => v.id === currentUser?.id ? { ...v, reaction: '❤️', reactedAt: new Date().toISOString() } : v)
      }
      return prev
    })
    await likeStory?.(currentStory.id)
  }

  // ── Quick Emoji Reaction Handler (Reflects in Messaging + Views, not in Comments) ─
  const handleSendEmojiReaction = async (emoji, e) => {
    e?.stopPropagation()
    if (!currentStory?.id) return
    triggerFloatingReaction(emoji)
    setReplyStatus(`Reacted ${emoji}`)
    setTimeout(() => setReplyStatus(''), 2000)

    // Optimistically update the viewer's reaction in the viewers list
    setViewers(prev => {
      const exists = prev.some(v => v.id === currentUser?.id)
      if (exists) {
        return prev.map(v => v.id === currentUser?.id ? { ...v, reaction: emoji, reactedAt: new Date().toISOString() } : v)
      }
      return [
        {
          id: currentUser?.id,
          name: currentUser?.name || 'You',
          username: currentUser?.username || '',
          initials: currentUser?.initials || 'U',
          avatarColor: currentUser?.avatarColor || '#6366f1',
          profilePhoto: currentUser?.profilePhoto || null,
          reaction: emoji,
          reactedAt: new Date().toISOString(),
          viewedAt: new Date().toISOString(),
          time: 'Just now',
        },
        ...prev,
      ]
    })

    // Sends reaction to backend (creates DM in Messaging + reflects in Views + sends Notification)
    await reactStory?.(currentStory.id, emoji)
  }

  // ── Submit Text Comment / Direct Reply ─────────────────────────────────────
  const handleSubmitReply = async (e) => {
    e?.preventDefault()
    if (!replyText.trim() || !currentStory?.id) return

    const textToSend = replyText.trim()
    setReplyText('')
    setIsReplying(false)
    setReplyStatus('Comment posted ✓')
    setTimeout(() => setReplyStatus(''), 2500)

    const optimisticReply = {
      id: `opt-${Date.now()}`,
      userId: currentUser?.id,
      name: currentUser?.name || 'You',
      username: currentUser?.username || '',
      initials: currentUser?.initials || 'U',
      avatarColor: currentUser?.avatarColor || '#6366f1',
      profilePhoto: currentUser?.profilePhoto || null,
      text: textToSend,
      createdAt: new Date().toISOString(),
      time: 'Just now',
    }
    setStoryReplies(prev => [...prev, optimisticReply])

    const res = await replyStory?.(currentStory.id, textToSend)
    if (res?.ok && res.reply) {
      setStoryReplies(prev => prev.map(r => r.id === optimisticReply.id ? res.reply : r))
    }
  }

  // ── Submit In-Drawer Comment ───────────────────────────────────────────────
  const handleSubmitDrawerComment = async (e) => {
    e?.preventDefault()
    if (!drawerCommentText.trim() || !currentStory?.id) return

    const textToSend = drawerCommentText.trim()
    setDrawerCommentText('')
    setReplyStatus('Comment posted ✓')
    setTimeout(() => setReplyStatus(''), 2500)

    const optimisticReply = {
      id: `opt-${Date.now()}`,
      userId: currentUser?.id,
      name: currentUser?.name || 'You',
      username: currentUser?.username || '',
      initials: currentUser?.initials || 'U',
      avatarColor: currentUser?.avatarColor || '#6366f1',
      profilePhoto: currentUser?.profilePhoto || null,
      text: textToSend,
      createdAt: new Date().toISOString(),
      time: 'Just now',
    }
    setStoryReplies(prev => [...prev, optimisticReply])

    const res = await replyStory?.(currentStory.id, textToSend)
    if (res?.ok && res.reply) {
      setStoryReplies(prev => prev.map(r => r.id === optimisticReply.id ? res.reply : r))
    }
  }

  // ── Open Viewers & Activity Modal (For Story Owner) ────────────────────────
  const handleOpenOwnerModal = async (e) => {
    e?.stopPropagation()
    if (!currentStory?.id) return

    setShowViewersModal(true)
    setActiveOwnerTab('viewers')
    setLoadingOwnerData(true)
    try {
      const [viewersRes, repliesRes] = await Promise.all([
        apiGetStoryViewers(currentStory.id),
        apiGetStoryReplies(currentStory.id),
      ])
      setViewers(viewersRes.ok ? viewersRes.viewers || [] : [])
      setStoryReplies(repliesRes.ok ? repliesRes.replies || [] : (currentStory.replies || []))
    } catch (err) {
      console.error('Failed to load viewers or replies:', err)
      setViewers([])
      setStoryReplies(currentStory.replies || [])
    } finally {
      setLoadingOwnerData(false)
    }
  }

  // ── Open Comments Drawer (For Anyone: Owner or Viewer) ──────────────────────
  const handleOpenCommentsModal = async (e) => {
    e?.stopPropagation()
    if (!currentStory?.id) return

    setShowViewersModal(true)
    setActiveOwnerTab('replies')
    setLoadingOwnerData(true)
    try {
      const repliesRes = await apiGetStoryReplies(currentStory.id)
      setStoryReplies(repliesRes.ok ? repliesRes.replies || [] : (currentStory.replies || []))
      if (isOwnStory) {
        const viewersRes = await apiGetStoryViewers(currentStory.id)
        setViewers(viewersRes.ok ? viewersRes.viewers || [] : [])
      }
    } catch (err) {
      console.error('Failed to load replies:', err)
      setStoryReplies(currentStory.replies || [])
    } finally {
      setLoadingOwnerData(false)
    }
  }

  if (!currentStory) return null

  const isFirst = userGroupIdx === 0 && storyIdx === 0
  const isLast = userGroupIdx === userGroups.length - 1 && storyIdx === currentStories.length - 1
  const filterCss = STORY_FILTERS.find(f => f.id === currentStory.filter)?.css || ''

  return (
    <>
      {/* Immersive Dark Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 cursor-pointer"
      />

      {/* Viewer Modal Wrapper */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 select-none pointer-events-none">
        
        {/* Prev Arrow (Desktop) */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            goPrev()
          }}
          disabled={isFirst}
          className="pointer-events-auto p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all mr-4 flex-shrink-0 disabled:opacity-0 disabled:pointer-events-none cursor-pointer hidden sm:flex items-center justify-center shadow-lg"
          aria-label="Previous story"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Story Card Container - Instagram Full-Size 9:16 Vertical Frame */}
        <motion.div
          ref={cardRef}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.65}
          onDragEnd={(_, info) => {
            if (info.offset.y > 100 || info.offset.y < -100) {
              onClose?.()
            }
          }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={() => setIsHolding(false)}
          className="pointer-events-auto relative w-full h-[100dvh] sm:h-[94vh] sm:max-h-[960px] sm:w-auto sm:aspect-[9/16] sm:rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between"
          style={{
            background: currentStory.bg || `linear-gradient(145deg, ${currentStory.avatarColor || '#6366f1'} 0%, #0f172a 100%)`,
          }}
          onClick={e => e.stopPropagation()}
        >
          {/* ── Slide Media with AnimatePresence Directional Transition ── */}
          <div className="absolute inset-0 overflow-hidden">
            <AnimatePresence initial={false} custom={direction}>
              <motion.div
                key={currentStory.id || `${userGroupIdx}-${storyIdx}`}
                custom={direction}
                initial={{ opacity: 0, scale: 1.03 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                className="absolute inset-0 w-full h-full"
              >
                {currentStory.imageUrl ? (
                  <>
                    <img
                      src={currentStory.imageUrl}
                      alt="Story"
                      style={{ filter: filterCss }}
                      onLoad={() => setIsMediaLoaded(true)}
                      className="w-full h-full object-cover transition-all"
                    />
                    {/* Top & bottom scrim gradients for text readability */}
                    <div className="absolute inset-x-0 top-0 h-36 bg-gradient-to-b from-black/80 via-black/35 to-transparent pointer-events-none z-10" />
                    <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-black/90 via-black/50 to-transparent pointer-events-none z-10" />
                  </>
                ) : (
                  <div
                    className="w-full h-full flex items-center justify-center p-8 text-center"
                    style={{ background: currentStory.bg || currentStory.avatarColor || '#6366f1' }}
                  >
                    <p className="text-white text-xl font-bold drop-shadow-md">
                      {currentStory.caption || 'Campus Story'}
                    </p>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Buffering Spinner */}
            {!isMediaLoaded && currentStory.imageUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs z-15 pointer-events-none">
                <Loader2 className="w-8 h-8 text-white/80 animate-spin" />
              </div>
            )}

            {/* Floating Flying Emoji Reactions (Instagram Style) */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden z-25">
              <AnimatePresence>
                {flyingReactions.map(r => (
                  <motion.div
                    key={r.id}
                    initial={{ opacity: 1, y: 550, scale: 1.4, x: `${r.x}%` }}
                    animate={{ opacity: 0, y: 150, scale: 0.8, x: `${r.x + (Math.random() * 20 - 10)}%` }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 1.6, ease: 'easeOut' }}
                    className="absolute text-3xl drop-shadow-lg"
                  >
                    {r.emoji}
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>

          {/* ── Overlays: Progress, Header, Captions, Comments ── */}
          <div
            className={`relative z-20 flex flex-col justify-between h-full p-4 transition-opacity duration-200 ${
              isHolding ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            {/* Top Section: Progress Bars & User Header */}
            <div>
              {/* Segmented Progress Bars */}
              <div className="flex gap-1.5 w-full pt-1 pb-3">
                {currentStories.map((_, i) => (
                  <div
                    key={i}
                    className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden shadow-xs"
                  >
                    <div
                      className="h-full bg-white rounded-full transition-none will-change-[width]"
                      style={{
                        width:
                          i < storyIdx
                            ? '100%'
                            : i === storyIdx
                            ? `${progress}%`
                            : '0%',
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* User Identity, Music Badge & Audio Controls */}
              <div className="flex items-center justify-between mt-1">
                <div className="flex items-center gap-2.5">
                  <div
                    className="w-9 h-9 rounded-full border-2 border-white/50 flex items-center justify-center text-white text-xs font-bold overflow-hidden shadow-sm"
                    style={{ backgroundColor: currentStory.avatarColor || '#6366f1' }}
                  >
                    {currentStory.user?.profilePhoto ? (
                      <img src={currentStory.user.profilePhoto} alt="" className="w-full h-full object-cover" />
                    ) : (
                      currentStory.initials || 'U'
                    )}
                  </div>
                  <div>
                    <p className="text-white text-sm font-bold leading-tight drop-shadow-sm flex items-center gap-1.5">
                      {isOwnStory
                        ? (currentStories.length > 1 ? `Your Story (${storyIdx + 1}/${currentStories.length})` : 'Your Story')
                        : (currentStory.user?.name || currentStory.label)}
                    </p>
                    <p className="text-white/80 text-[11px] drop-shadow-xs flex items-center gap-1 mt-0.5">
                      <Clock size={10} /> {currentStory.time || 'Just now'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {/* Music Mute/Unmute Toggle Button */}
                  {currentStory?.music && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsMuted(m => !m)
                      }}
                      className="p-1.5 rounded-full bg-black/40 backdrop-blur-md text-white/90 hover:text-white hover:bg-black/60 transition-all cursor-pointer shadow-sm border border-white/10"
                      aria-label={isMuted ? 'Unmute' : 'Mute'}
                    >
                      {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                    </button>
                  )}

                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onClose?.()
                    }}
                    className="p-1.5 rounded-full bg-black/40 backdrop-blur-md text-white/90 hover:text-white hover:bg-black/60 transition-all cursor-pointer shadow-sm border border-white/10"
                    aria-label="Close story"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Music Sticker Badge (Instagram Style) */}
              {currentStory.music && (
                <div className="mt-2.5 flex items-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/55 backdrop-blur-md text-white text-[11px] font-semibold border border-white/15 shadow-md">
                    <Music2 size={12} className="text-pink-400" />
                    <span className="truncate max-w-[190px]">{currentStory.music.title} • {currentStory.music.artist}</span>
                    {/* Animated sound wave bars */}
                    <span className="flex items-center gap-0.5 ml-1 text-pink-400 font-mono text-[10px]">
                      ılıılı
                    </span>
                  </div>
                </div>
              )}

              {/* Campus Sticker Badge */}
              {currentStory.sticker && (
                <div className="mt-2 flex items-center">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-md text-slate-900 dark:text-white text-xs font-bold border border-white/30 shadow-md">
                    <span>{currentStory.sticker.label}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Section: Caption, Actions, and Universal Instagram Story Comments/Replies Bar */}
            <div
              className="story-interactive pb-3 px-3 sm:px-4 pointer-events-auto select-auto relative z-30"
              onClick={e => e.stopPropagation()}
              onPointerDown={e => e.stopPropagation()}
              onPointerUp={e => e.stopPropagation()}
              onTouchStart={e => e.stopPropagation()}
              onTouchEnd={e => e.stopPropagation()}
            >
              {currentStory.caption && (
                <div className="mb-2.5 text-center">
                  <p className="inline-block bg-black/65 backdrop-blur-md text-white text-xs sm:text-sm font-medium px-4 py-2 rounded-2xl max-w-[90%] drop-shadow-md border border-white/15">
                    {currentStory.caption}
                  </p>
                </div>
              )}

              {/* Status Toast Message */}
              <AnimatePresence>
                {replyStatus && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="mb-2 text-center"
                  >
                    <span className="inline-block px-3.5 py-1 rounded-full bg-emerald-500/90 text-white text-xs font-bold shadow-lg backdrop-blur-xs">
                      {replyStatus}
                    </span>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* ── Story Owner Pill Bar (Views, Edit, Delete) ── */}
              {isOwnStory && (
                <div className="flex items-center justify-between px-1 mb-2.5">
                  <button
                    type="button"
                    onClick={handleOpenOwnerModal}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white text-xs font-semibold transition-all shadow-sm border border-white/20 cursor-pointer"
                  >
                    <Eye size={13} className="text-indigo-400" />
                    <span>{currentStory.viewsCount || 0} views</span>
                    {(currentStory.repliesCount || storyReplies.length) > 0 && (
                      <span className="ml-1 px-1.5 py-0.2 text-[10px] bg-indigo-500 rounded-full font-bold">
                        {currentStory.repliesCount || storyReplies.length}
                      </span>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setIsPaused(true)
                        onEdit?.(currentStory)
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-full text-white text-xs font-semibold transition-all border border-white/15 cursor-pointer"
                    >
                      <Edit2 size={12} /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete?.(currentStory.id)
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-500/80 hover:bg-rose-500 backdrop-blur-md rounded-full text-white text-xs font-semibold transition-all border border-rose-400/20 cursor-pointer"
                    >
                      <Trash2 size={12} /> Delete
                    </button>
                  </div>
                </div>
              )}

              {/* ── Universal Story Comments & Quick Reactions Bar (Always Visible!) ── */}
              <div className="flex flex-col gap-2">
                {/* Quick Reaction Emojis Row */}
                <div className="flex items-center justify-around px-2 py-1.5 bg-black/50 backdrop-blur-md rounded-2xl border border-white/15 shadow-lg">
                  {QUICK_EMOJIS.map(emoji => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={(e) => handleSendEmojiReaction(emoji, e)}
                      className="text-xl hover:scale-130 active:scale-90 transition-transform p-1 cursor-pointer"
                      title={`React ${emoji}`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>

                {/* Main Comment Input Bar + Comments Drawer Toggle + Heart Button */}
                <form onSubmit={handleSubmitReply} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      onFocus={() => setIsReplying(true)}
                      onBlur={() => {
                        if (!replyText.trim()) setIsReplying(false)
                      }}
                      placeholder={
                        isOwnStory
                          ? 'Add a comment or note to your story...'
                          : `Send message to ${currentStory.user?.name?.split(' ')[0] || 'user'}...`
                      }
                      maxLength={180}
                      className="w-full pl-4 pr-10 py-2.5 text-xs sm:text-sm rounded-full bg-black/55 backdrop-blur-md text-white placeholder-white/60 border border-white/20 focus:outline-none focus:border-indigo-400 focus:bg-black/75 transition-all shadow-md"
                    />
                    {replyText.trim() && (
                      <button
                        type="submit"
                        className="absolute right-2.5 top-2.5 text-indigo-400 hover:text-white transition-colors cursor-pointer"
                        title="Send comment"
                      >
                        <Send size={16} />
                      </button>
                    )}
                  </div>

                  {/* Comment Drawer / Sheet Button */}
                  <button
                    type="button"
                    onClick={handleOpenCommentsModal}
                    className="relative p-2.5 rounded-full bg-black/55 backdrop-blur-md text-white hover:bg-black/75 border border-white/20 transition-all cursor-pointer shadow-md group shrink-0"
                    title="View all comments"
                    aria-label="View comments"
                  >
                    <MessageCircle size={20} className="text-white group-hover:text-indigo-400 transition-colors" />
                    {(currentStory.repliesCount || storyReplies.length) > 0 && (
                      <span className="absolute -top-1 -right-1 bg-indigo-500 text-white text-[10px] font-bold min-w-4 h-4 px-1 rounded-full flex items-center justify-center border-2 border-slate-900 shadow-sm">
                        {currentStory.repliesCount || storyReplies.length}
                      </span>
                    )}
                  </button>

                  {/* Story Heart / Like Button */}
                  <button
                    type="button"
                    onClick={handleLikeStory}
                    className="p-2.5 rounded-full bg-black/55 backdrop-blur-md text-white hover:bg-black/75 border border-white/20 transition-all cursor-pointer shadow-md group shrink-0"
                    aria-label="Like story"
                  >
                    <Heart
                      size={20}
                      className={`transition-colors ${
                        currentStory.isLiked
                          ? 'text-rose-500 fill-rose-500 scale-110'
                          : 'text-white group-hover:text-rose-400'
                      }`}
                    />
                  </button>
                </form>
              </div>
            </div>
          </div>

          {/* ── Slide-Up Viewers & Comments Sheet ── */}
          <AnimatePresence>
            {showViewersModal && (
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                className="absolute inset-x-0 bottom-0 max-h-[85%] bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl z-40 flex flex-col overflow-hidden border-t border-slate-200 dark:border-gray-800"
                onClick={e => e.stopPropagation()}
              >
                {/* Header with Tabs: Viewers vs Comments */}
                <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-gray-800 shrink-0">
                  {isOwnStory ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setActiveOwnerTab('viewers')}
                        className={`text-xs font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                          activeOwnerTab === 'viewers'
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-gray-200'
                        }`}
                      >
                        👁 Viewers ({viewers.length})
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveOwnerTab('replies')}
                        className={`text-xs font-bold py-1.5 px-3 rounded-lg transition-all cursor-pointer ${
                          activeOwnerTab === 'replies'
                            ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                            : 'text-slate-400 hover:text-slate-700 dark:hover:text-gray-200'
                        }`}
                      >
                        💬 Comments ({storyReplies.length})
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs sm:text-sm font-bold text-slate-800 dark:text-gray-100 flex items-center gap-1.5">
                        <MessageCircle size={15} className="text-indigo-500" /> Comments ({storyReplies.length})
                      </h3>
                    </div>
                  )}

                  <button
                    onClick={() => setShowViewersModal(false)}
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Content Area */}
                <div className="p-3 overflow-y-auto max-h-[350px] divide-y divide-slate-50 dark:divide-gray-800/60">
                  {loadingOwnerData ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                      <span className="text-xs text-slate-400">Loading data...</span>
                    </div>
                  ) : activeOwnerTab === 'viewers' && isOwnStory ? (
                    /* Viewers Tab */
                    viewers.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-400 mb-2">
                          <Users size={18} />
                        </div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-gray-300">No views yet</p>
                        <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">
                          Followers who watch this story will show up here.
                        </p>
                      </div>
                    ) : (
                      viewers.map((viewer) => (
                        <div key={viewer.id} className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-50 dark:hover:bg-gray-800/40 rounded-xl transition-colors">
                          <div className="flex items-center gap-2.5">
                            <div className="relative shrink-0">
                              <div
                                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold overflow-hidden"
                                style={{ backgroundColor: viewer.avatarColor || '#6366f1' }}
                              >
                                {viewer.profilePhoto ? (
                                  <img src={viewer.profilePhoto} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  viewer.initials || 'U'
                                )}
                              </div>
                              {viewer.reaction && (
                                <span
                                  className="absolute -bottom-1 -right-1 text-xs leading-none bg-white dark:bg-gray-900 rounded-full shadow-xs px-0.5 border border-slate-200/50 dark:border-gray-700 select-none"
                                  title={`Reacted ${viewer.reaction}`}
                                >
                                  {viewer.reaction}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs font-semibold text-slate-800 dark:text-gray-100 leading-tight">
                                  {viewer.name}
                                </p>
                                {viewer.reaction && (
                                  <span className="text-[11px] font-medium text-slate-500 dark:text-gray-400">
                                    reacted {viewer.reaction}
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 dark:text-gray-500">
                                @{viewer.username || 'user'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {viewer.reaction && (
                              <span className="text-sm px-2 py-0.5 rounded-full bg-slate-100 dark:bg-gray-800 border border-slate-200/80 dark:border-gray-700 shadow-xs">
                                {viewer.reaction}
                              </span>
                            )}
                            <span className="text-[10px] text-slate-400 dark:text-gray-500">
                              {viewer.time || 'Just now'}
                            </span>
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    /* Comments Tab (Available for all) */
                    storyReplies.length === 0 ? (
                      <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-400 mb-2">
                          <MessageCircle size={18} />
                        </div>
                        <p className="text-xs font-semibold text-slate-700 dark:text-gray-300">No comments yet</p>
                        <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">
                          Be the first to comment on this story!
                        </p>
                      </div>
                    ) : (
                      storyReplies.map((r) => (
                        <div key={r.id || r._id || Math.random()} className="flex items-start justify-between py-2.5 px-2 hover:bg-slate-50 dark:hover:bg-gray-800/40 rounded-xl transition-colors">
                          <div className="flex items-start gap-2.5">
                            <div
                              className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold overflow-hidden shrink-0"
                              style={{ backgroundColor: r.avatarColor || '#6366f1' }}
                            >
                              {r.profilePhoto ? (
                                <img src={r.profilePhoto} alt="" className="w-full h-full object-cover" />
                              ) : (
                                r.initials || 'U'
                              )}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-slate-800 dark:text-gray-100">
                                  {r.name}
                                </span>
                                <span className="text-[10px] text-slate-400">
                                  {r.time || 'Just now'}
                                </span>
                              </div>
                              <p className="text-xs text-slate-700 dark:text-gray-200 mt-0.5 bg-slate-100 dark:bg-gray-800 px-3 py-1.5 rounded-2xl inline-block max-w-[260px] break-words">
                                {r.text}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))
                    )
                  )}
                </div>

                {/* In-Drawer Comment Composer (When on Comments tab) */}
                {(activeOwnerTab === 'replies' || !isOwnStory) && (
                  <div className="p-3 border-t border-slate-100 dark:border-gray-800 bg-slate-50/80 dark:bg-gray-850 shrink-0">
                    {/* Quick Emojis strip inside drawer */}
                    <div className="flex items-center gap-2 mb-2 px-1">
                      {QUICK_EMOJIS.slice(0, 6).map(emoji => (
                        <button
                          key={`drawer-${emoji}`}
                          type="button"
                          onClick={(e) => handleSendEmojiReaction(emoji, e)}
                          className="text-base p-1 rounded-full hover:bg-white dark:hover:bg-gray-700 transition-transform active:scale-90 cursor-pointer shadow-xs border border-slate-200/60 dark:border-gray-700"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>

                    <form onSubmit={handleSubmitDrawerComment} className="flex items-center gap-2">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0 overflow-hidden"
                        style={{ backgroundColor: currentUser?.avatarColor || '#6366f1' }}
                      >
                        {currentUser?.profilePhoto ? (
                          <img src={currentUser.profilePhoto} alt="" className="w-full h-full object-cover" />
                        ) : (
                          currentUser?.initials || 'U'
                        )}
                      </div>
                      <input
                        type="text"
                        value={drawerCommentText}
                        onChange={e => setDrawerCommentText(e.target.value)}
                        placeholder={`Comment as ${currentUser?.name?.split(' ')[0] || 'User'}...`}
                        maxLength={280}
                        className="flex-1 px-3 py-1.5 text-xs rounded-full bg-white dark:bg-gray-800 text-slate-800 dark:text-gray-100 placeholder-slate-400 border border-slate-200 dark:border-gray-700 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={!drawerCommentText.trim()}
                        className="p-1.5 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-all cursor-pointer shadow-sm"
                        title="Send comment"
                      >
                        <Send size={14} />
                      </button>
                    </form>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Synchronized Story Audio Player */}
          {currentStory?.music && (
            <audio
              key={currentStory.id || `story-audio-${userGroupIdx}-${storyIdx}`}
              ref={audioRef}
              src={resolveAudioUrl(currentStory.music)}
              preload="auto"
              loop
              playsInline
            />
          )}
        </motion.div>

        {/* Next Arrow (Desktop) */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            goNextRef.current()
          }}
          disabled={isLast}
          className="pointer-events-auto p-3 rounded-full bg-white/10 hover:bg-white/20 text-white backdrop-blur-md transition-all ml-4 flex-shrink-0 disabled:opacity-0 disabled:pointer-events-none cursor-pointer hidden sm:flex items-center justify-center shadow-lg"
          aria-label="Next story"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </>
  )
}
