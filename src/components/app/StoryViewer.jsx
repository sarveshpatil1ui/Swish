import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Trash2, Edit2, Eye, Clock, Users, Loader2 } from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { apiRecordStoryView, apiGetStoryViewers } from '../../utils/auth'

const DURATION = 5000 // 5 seconds per story

export default function StoryViewer({
  userGroups = [],
  initialUserIndex = 0,
  initialStoryIndex = 0,
  onClose,
  onDelete,
  onEdit,
  onStoryViewed,
}) {
  const { currentUser } = useSwish()
  const [userGroupIdx, setUserGroupIdx] = useState(initialUserIndex)
  const [storyIdx, setStoryIdx] = useState(initialStoryIndex)
  const [direction, setDirection] = useState(1) // 1 = forward, -1 = backward
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [isHolding, setIsHolding] = useState(false)
  const [isMediaLoaded, setIsMediaLoaded] = useState(false)

  // Viewers Modal state for own stories
  const [showViewersModal, setShowViewersModal] = useState(false)
  const [viewers, setViewers] = useState([])
  const [loadingViewers, setLoadingViewers] = useState(false)

  const cardRef = useRef(null)
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

    if (!currentStory?.imageUrl) {
      setIsMediaLoaded(true)
    } else {
      setIsMediaLoaded(false)
    }
  }, [userGroupIdx, storyIdx, currentStory?.id, currentStory?.imageUrl])

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
      // Start at next user's first unread story if available
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
    // Only tick when media is ready, viewer is active, and not paused / modal opened
    const active = isMediaLoaded && !isPaused && !isHolding && !showViewersModal

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
  }, [isMediaLoaded, isPaused, isHolding, showViewersModal, userGroupIdx, storyIdx])

  // ── Keyboard Navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
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
  }, [onClose, goPrev, showViewersModal])

  // ── Touch & Pointer: Hold to Pause & Tap to Navigate (Instagram-Style) ─────
  const handlePointerDown = (e) => {
    if (showViewersModal) return
    // Ignore clicks on buttons/actions
    if (e.target.closest('button')) return

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
    if (showViewersModal) return
    const down = pointerDownRef.current
    if (!down.time) return

    const duration = Date.now() - down.time
    const upX = e.clientX ?? e.changedTouches?.[0]?.clientX ?? down.x
    const upY = e.clientY ?? e.changedTouches?.[0]?.clientY ?? down.y
    const dx = Math.abs(upX - down.x)
    const dy = Math.abs(upY - down.y)

    setIsHolding(false)
    pointerDownRef.current = { time: 0, x: 0, y: 0, moved: false }

    // If moved or dragged, don't trigger tap
    if (dx > 25 || dy > 25 || down.moved) return

    // Quick tap (< 240ms): navigate left vs right
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
    // Long press (>= 240ms): was a hold. Stays on current story and smoothly resumes.
  }

  const handleOpenViewers = async (e) => {
    e.stopPropagation()
    if (!currentStory?.id) return

    setShowViewersModal(true)
    setLoadingViewers(true)
    try {
      const res = await apiGetStoryViewers(currentStory.id)
      if (res.ok) {
        setViewers(res.viewers || [])
      } else {
        setViewers([])
      }
    } catch (err) {
      console.error('Failed to load viewers:', err)
      setViewers([])
    } finally {
      setLoadingViewers(false)
    }
  }

  if (!currentStory) return null

  const isFirst = userGroupIdx === 0 && storyIdx === 0
  const isLast = userGroupIdx === userGroups.length - 1 && storyIdx === currentStories.length - 1

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
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 select-none pointer-events-none">
        
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

        {/* Story Card with Touch Handling and Framer Motion Drag-to-Dismiss */}
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
          className="pointer-events-auto relative w-full max-w-[380px] rounded-3xl overflow-hidden shadow-2xl touch-none flex flex-col justify-between"
          style={{
            height: 620,
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
                      onLoad={() => setIsMediaLoaded(true)}
                      className="w-full h-full object-cover"
                    />
                    {/* Top & bottom subtle scrim gradients for readable text */}
                    <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/75 via-black/30 to-transparent pointer-events-none z-10" />
                    <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/85 via-black/40 to-transparent pointer-events-none z-10" />
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

            {/* Subtle Buffering Spinner while image is downloading */}
            {!isMediaLoaded && currentStory.imageUrl && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-xs z-15 pointer-events-none">
                <Loader2 className="w-8 h-8 text-white/80 animate-spin" />
              </div>
            )}
          </div>

          {/* ── Overlays: Progress Bars, Header, Captions, Controls ── */}
          {/* Note: Fades out smoothly when user holds down to inspect clean photo */}
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

              {/* User Identity & Top Actions */}
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

            {/* Bottom Section: Caption & Owner Action Bar */}
            <div className="pb-1">
              {currentStory.caption && (
                <div className="mb-4 text-center">
                  <p className="inline-block bg-black/55 backdrop-blur-md text-white text-xs font-medium px-4 py-2.5 rounded-2xl max-w-full drop-shadow-sm border border-white/10">
                    {currentStory.caption}
                  </p>
                </div>
              )}

              {/* Owner Action Buttons: Edit, Delete, Seen By */}
              {isOwnStory && (
                <div className="flex items-center justify-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setIsPaused(true)
                      onEdit?.(currentStory)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-white text-xs font-semibold transition-all shadow-sm border border-white/15 cursor-pointer"
                  >
                    <Edit2 size={13} /> Edit
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete?.(currentStory.id)
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/80 hover:bg-rose-500 backdrop-blur-md rounded-xl text-white text-xs font-semibold transition-all shadow-sm border border-rose-400/20 cursor-pointer"
                  >
                    <Trash2 size={13} /> Delete
                  </button>
                  <button
                    onClick={handleOpenViewers}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-xl text-white text-xs font-semibold transition-all shadow-sm border border-white/15 cursor-pointer"
                  >
                    <Eye size={13} /> Seen by {currentStory.viewsCount || 0}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* ── Slide-Up Viewers Sheet for Story Owner ── */}
          <AnimatePresence>
            {showViewersModal && (
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 26, stiffness: 300 }}
                className="absolute inset-x-0 bottom-0 max-h-[80%] bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl z-40 flex flex-col overflow-hidden border-t border-slate-200 dark:border-gray-800"
                onClick={e => e.stopPropagation()}
              >
                {/* Header */}
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 dark:border-gray-800 shrink-0">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                      <Eye size={15} />
                    </div>
                    <div>
                      <h3 className="text-slate-900 dark:text-white font-bold text-sm leading-tight">
                        Story Viewers
                      </h3>
                      <p className="text-[11px] text-slate-400 dark:text-gray-500">
                        {viewers.length} {viewers.length === 1 ? 'view' : 'views'}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowViewersModal(false)}
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors cursor-pointer"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Viewers List */}
                <div className="p-3 overflow-y-auto max-h-[300px] divide-y divide-slate-50 dark:divide-gray-800/60">
                  {loadingViewers ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                      <span className="text-xs text-slate-400">Loading viewers...</span>
                    </div>
                  ) : viewers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-8 text-center px-4">
                      <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-gray-800 flex items-center justify-center text-slate-400 mb-2">
                        <Users size={18} />
                      </div>
                      <p className="text-xs font-semibold text-slate-700 dark:text-gray-300">No views yet</p>
                      <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">
                        Followers who view this story will appear here.
                      </p>
                    </div>
                  ) : (
                    viewers.map((viewer) => (
                      <div key={viewer.id} className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-50 dark:hover:bg-gray-800/40 rounded-xl transition-colors">
                        <div className="flex items-center gap-2.5">
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
                          <div>
                            <p className="text-xs font-semibold text-slate-800 dark:text-gray-100 leading-tight">
                              {viewer.name}
                            </p>
                            <p className="text-[10px] text-slate-400 dark:text-gray-500">
                              @{viewer.username || 'user'}
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-400 dark:text-gray-500">
                          {viewer.time || 'Just now'}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
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
