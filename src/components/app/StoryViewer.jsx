import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'

const DURATION = 5000 // ms per story

export default function StoryViewer({ stories, startIndex = 0, onClose }) {
  const [index,    setIndex]    = useState(startIndex)
  const [progress, setProgress] = useState(0)

  const story = stories[index]

  const goNext = useCallback(() => {
    if (index < stories.length - 1) {
      setIndex(i => i + 1)
      setProgress(0)
    } else {
      onClose()
    }
  }, [index, stories.length, onClose])

  const goPrev = useCallback(() => {
    if (index > 0) {
      setIndex(i => i - 1)
      setProgress(0)
    }
  }, [index])

  // Keep a stable ref to avoid stale closures in the timer
  const goNextRef = useRef(goNext)
  goNextRef.current = goNext

  // Auto-advance with smooth progress bar
  useEffect(() => {
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
  }, [index]) // re-run only when story index changes

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape')      onClose()
      if (e.key === 'ArrowRight')  goNextRef.current()
      if (e.key === 'ArrowLeft')   goPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, goPrev])

  if (!story) return null

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.2 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-50"
      />

      {/* Viewer layout */}
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4">

        {/* Prev arrow */}
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all mr-3 flex-shrink-0 disabled:opacity-0 disabled:pointer-events-none"
          aria-label="Previous story"
        >
          <ChevronLeft size={22} />
        </button>

        {/* Story card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.93, x: 24 }}
            animate={{ opacity: 1, scale: 1, x: 0 }}
            exit={{ opacity: 0, scale: 0.93, x: -24 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-[360px] rounded-3xl overflow-hidden shadow-2xl select-none"
            style={{
              height: 580,
              background: story.bg || `linear-gradient(145deg, ${story.avatarColor} 0%, ${story.avatarColor}88 100%)`,
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Progress bars */}
            <div className="absolute top-3 left-3 right-3 flex gap-1 z-20">
              {stories.map((_, i) => (
                <div
                  key={i}
                  className="flex-1 h-[3px] rounded-full bg-white/30 overflow-hidden"
                >
                  <div
                    className="h-full bg-white rounded-full transition-none"
                    style={{
                      width:
                        i < index      ? '100%'        :
                        i === index    ? `${progress}%` :
                        '0%',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Header — user info + close */}
            <div className="absolute top-8 left-4 right-4 flex items-center justify-between z-20">
              <div className="flex items-center gap-2.5">
                <div
                  className="w-9 h-9 rounded-full border-2 border-white/40 flex items-center justify-center text-white text-xs font-bold"
                  style={{ backgroundColor: 'rgba(255,255,255,0.18)' }}
                >
                  {story.initials}
                </div>
                <div>
                  <p className="text-white text-sm font-semibold leading-tight drop-shadow">
                    {story.label}
                  </p>
                  <p className="text-white/55 text-[11px]">{story.time || 'Just now'}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-full bg-black/25 backdrop-blur-sm text-white/80 hover:text-white hover:bg-black/40 transition-all"
                aria-label="Close story"
              >
                <X size={16} />
              </button>
            </div>

            {/* Story content (centred) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center px-8 text-center z-10 pointer-events-none">
              <div className="text-[84px] leading-none mb-6">
                {story.emoji || '📸'}
              </div>
              <h2
                className="text-white font-extrabold text-[22px] leading-snug mb-3 drop-shadow-sm"
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              >
                {story.caption || story.label}
              </h2>
              {story.subcaption && (
                <p className="text-white/70 text-sm leading-relaxed max-w-[260px]">
                  {story.subcaption}
                </p>
              )}
            </div>

            {/* Invisible tap zones — left third = prev, right two-thirds = next */}
            <button
              onClick={goPrev}
              className="absolute left-0 top-0 bottom-0 w-1/3 z-10"
              aria-label="Previous"
            />
            <button
              onClick={() => goNextRef.current()}
              className="absolute right-0 top-0 bottom-0 w-2/3 z-10"
              aria-label="Next"
            />
          </motion.div>
        </AnimatePresence>

        {/* Next arrow */}
        <button
          onClick={() => goNextRef.current()}
          disabled={index === stories.length - 1}
          className="p-2.5 rounded-full bg-white/10 backdrop-blur-sm text-white hover:bg-white/20 transition-all ml-3 flex-shrink-0 disabled:opacity-0 disabled:pointer-events-none"
          aria-label="Next story"
        >
          <ChevronRight size={22} />
        </button>
      </div>
    </>
  )
}
