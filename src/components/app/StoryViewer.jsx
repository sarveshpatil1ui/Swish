import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, Trash2, Edit2, Eye, Clock, Users } from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { apiRecordStoryView, apiGetStoryViewers } from '../../utils/auth'

const DURATION = 5000 // ms per story

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
  const [progress, setProgress] = useState(0)
  const [isPaused, setIsPaused] = useState(false)

  // Viewers Modal state for own stories
  const [showViewersModal, setShowViewersModal] = useState(false)
  const [viewers, setViewers] = useState([])
  const [loadingViewers, setLoadingViewers] = useState(false)

  const currentGroup = userGroups[userGroupIdx]
  const currentStories = currentGroup?.stories || []
  const currentStory = currentStories[storyIdx]
  const isOwnStory = currentStory?.userId === currentUser?.id || currentStory?.isOwnStory

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goNext = useCallback(() => {
    if (!currentGroup) {
      onClose?.()
      return
    }

    if (storyIdx < currentStories.length - 1) {
      setStoryIdx(s => s + 1)
      setProgress(0)
    } else if (userGroupIdx < userGroups.length - 1) {
      setUserGroupIdx(u => u + 1)
      setStoryIdx(0)
      setProgress(0)
    } else {
      onClose?.()
    }
  }, [storyIdx, currentStories.length, userGroupIdx, userGroups.length, currentGroup, onClose])

  const goPrev = useCallback(() => {
    if (storyIdx > 0) {
      setStoryIdx(s => s - 1)
      setProgress(0)
    } else if (userGroupIdx > 0) {
      const prevGroup = userGroups[userGroupIdx - 1]
      setUserGroupIdx(u => u - 1)
      setStoryIdx(Math.max(0, (prevGroup?.stories?.length || 1) - 1))
      setProgress(0)
    }
  }, [storyIdx, userGroupIdx, userGroups])

  const goNextRef = useRef(goNext)
  goNextRef.current = goNext

  // ── Record view when a story becomes active ────────────────────────────────
  useEffect(() => {
    if (!currentStory) return

    // If it's another user's story, record the view on backend
    if (!isOwnStory && currentStory.id) {
      apiRecordStoryView(currentStory.id).catch(err => {
        console.warn('Failed to record story view:', err)
      })
      onStoryViewed?.(currentStory.id)
    }
  }, [currentStory?.id, isOwnStory])

  // ── Auto-advance timer ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isPaused || showViewersModal) return

    setProgress(0)
    const start = Date.now()
    const timer = setInterval(() => {
      const elapsed = Date.now() - start
      const pct = Math.min((elapsed / DURATION) * 100, 100)
      setProgress(pct)
      if (elapsed >= DURATION) {
        clearInterval(timer)
        goNextRef.current()
      }
    }, 30)

    return () => clearInterval(timer)
  }, [userGroupIdx, storyIdx, isPaused, showViewersModal])

  // ── Keyboard navigation ────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showViewersModal) {
          setShowViewersModal(false)
        } else {
          onClose?.()
        }
      }
      if (e.key === 'ArrowRight' && !showViewersModal) goNextRef.current()
      if (e.key === 'ArrowLeft' && !showViewersModal) goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, goPrev, showViewersModal])

  // ── Open Viewers List Modal ────────────────────────────────────────────────
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
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-md z-50"
      />

      {/* Viewer container */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">

        {/* Prev arrow */}
        <button
          onClick={goPrev}
          disabled={isFirst}
          className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all mr-3 flex-shrink-0 disabled:opacity-0 disabled:pointer-events-none"
          aria-label="Previous story"
        >
          <ChevronLeft size={24} />
        </button>

        {/* Story Card */}
        <div
          className="relative w-full max-w-[360px] rounded-3xl overflow-hidden shadow-2xl select-none"
          style={{
            height: 580,
            background: currentStory.bg || `linear-gradient(145deg, ${currentStory.avatarColor} 0%, ${currentStory.avatarColor}88 100%)`,
          }}
          onMouseDown={() => setIsPaused(true)}
          onMouseUp={() => setIsPaused(false)}
          onTouchStart={() => setIsPaused(true)}
          onTouchEnd={() => setIsPaused(false)}
          onClick={e => e.stopPropagation()}
        >
          {/* Story media */}
          {currentStory.imageUrl && (
            <>
              <img
                src={currentStory.imageUrl}
                alt="Story"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-black/60 via-black/20 to-transparent pointer-events-none z-10" />
              <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-black/75 via-black/35 to-transparent pointer-events-none z-10" />
            </>
          )}

          {/* Progress Bars (Segmented for current user's active stories) */}
          <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
            {currentStories.map((_, i) => (
              <div
                key={i}
                className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden"
              >
                <div
                  className="h-full bg-white rounded-full transition-none"
                  style={{
                    width:
                      i < storyIdx ? '100%' :
                      i === storyIdx ? `${progress}%` :
                      '0%',
                  }}
                />
              </div>
            ))}
          </div>

          {/* Header — User info + Close */}
          <div className="absolute top-7 left-4 right-4 flex items-center justify-between z-20">
            <div className="flex items-center gap-2.5">
              <div
                className="w-9 h-9 rounded-full border-2 border-white/40 flex items-center justify-center text-white text-xs font-bold overflow-hidden"
                style={{ backgroundColor: currentStory.avatarColor || '#6366f1' }}
              >
                {currentStory.user?.profilePhoto ? (
                  <img src={currentStory.user.profilePhoto} alt="" className="w-full h-full object-cover" />
                ) : (
                  currentStory.initials
                )}
              </div>
              <div>
                <p className="text-white text-sm font-semibold leading-tight drop-shadow">
                  {isOwnStory
                    ? (currentStories.length > 1 ? `Your Story (${storyIdx + 1}/${currentStories.length})` : 'Your Story')
                    : (currentStory.user?.name || currentStory.label)}
                </p>
                <p className="text-white/75 text-[11px] drop-shadow flex items-center gap-1">
                  <Clock size={10} /> {currentStory.time || 'Just now'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full bg-black/40 backdrop-blur-sm text-white/90 hover:text-white hover:bg-black/60 transition-all"
              aria-label="Close story"
            >
              <X size={16} />
            </button>
          </div>

          {/* Story Caption */}
          {currentStory.caption ? (
            <div className="absolute bottom-20 left-4 right-4 text-center z-20 pointer-events-none">
              <p className="inline-block bg-black/50 backdrop-blur-md text-white text-xs font-medium px-4 py-2 rounded-xl max-w-full truncate shadow-md border border-white/10">
                {currentStory.caption}
              </p>
            </div>
          ) : null}

          {/* Tap Zones: Left 1/3 = prev, Right 2/3 = next */}
          {!showViewersModal && (
            <>
              <button
                onClick={goPrev}
                className="absolute left-0 top-16 bottom-20 w-1/3 z-10"
                aria-label="Previous"
              />
              <button
                onClick={() => goNextRef.current()}
                className="absolute right-0 top-16 bottom-20 w-2/3 z-10"
                aria-label="Next"
              />
            </>
          )}

          {/* Owner Actions Overlay: [ Edit ] [ Delete ] [ 👁 Seen by {N} ] */}
          {isOwnStory && (
            <div className="absolute bottom-5 left-0 right-0 flex items-center justify-center gap-2.5 z-30 px-3">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setIsPaused(true)
                  onEdit?.(currentStory)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md rounded-xl text-white text-xs font-semibold transition-all shadow-sm border border-white/10"
              >
                <Edit2 size={13} /> Edit
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete?.(currentStory.id)
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/80 hover:bg-rose-500 backdrop-blur-md rounded-xl text-white text-xs font-semibold transition-all shadow-sm border border-rose-400/20"
              >
                <Trash2 size={13} /> Delete
              </button>
              <button
                onClick={handleOpenViewers}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-xl text-white text-xs font-semibold transition-all shadow-sm border border-white/15"
              >
                <Eye size={13} /> Seen by {currentStory.viewsCount || 0}
              </button>
            </div>
          )}

          {/* ── Viewers List Modal (Slide-up sheet for owner) ────────────────── */}
          <AnimatePresence>
            {showViewersModal && (
              <motion.div
                initial={{ y: '100%', opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: '100%', opacity: 0 }}
                transition={{ type: 'spring', damping: 25, stiffness: 280 }}
                className="absolute inset-x-0 bottom-0 max-h-[75%] bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl z-40 flex flex-col overflow-hidden border-t border-slate-200 dark:border-gray-800"
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
                    className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-gray-800 text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Viewers List */}
                <div className="p-3 overflow-y-auto max-h-[300px] divide-y divide-slate-50 dark:divide-gray-800/60">
                  {loadingViewers ? (
                    <div className="flex flex-col items-center justify-center py-8 gap-2">
                      <span className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
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
                              viewer.initials
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
        </div>

        {/* Next arrow */}
        <button
          onClick={() => goNextRef.current()}
          disabled={isLast}
          className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all ml-3 flex-shrink-0 disabled:opacity-0 disabled:pointer-events-none"
          aria-label="Next story"
        >
          <ChevronRight size={24} />
        </button>
      </div>
    </>
  )
}
