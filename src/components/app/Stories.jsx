import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import { stories } from '../../data/mockData'
import StoryViewer from './StoryViewer'

// Viewable stories (all except "Your Story") used by the viewer
const viewableStories = stories.filter(s => !s.isYours)

// ── Story bubble ──────────────────────────────────────────────────────────────
function StoryBubble({ story, onClick }) {
  if (story.isYours) {
    return (
      <div
        className="flex flex-col items-center gap-2 flex-shrink-0 group cursor-pointer"
        aria-label="Add your story"
      >
        <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 dark:border-gray-600 bg-slate-50 dark:bg-gray-800 flex items-center justify-center transition-transform group-hover:scale-105">
          <div className="w-7 h-7 rounded-full bg-indigo-600 group-hover:bg-indigo-700 transition-colors flex items-center justify-center shadow-sm">
            <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
              <path d="M6.5 2v9M2 6.5h9" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <span className="text-slate-500 dark:text-gray-400 text-[11px] font-medium">Your Story</span>
      </div>
    )
  }

  if (story.hasNew) {
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center gap-2 flex-shrink-0 group"
        aria-label={`View ${story.label}'s story — new`}
      >
        {/* Gradient ring */}
        <div
          className="w-14 h-14 rounded-full p-[2px] transition-transform group-hover:scale-105 group-active:scale-95"
          style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #ec4899 50%, #8b5cf6 100%)' }}
        >
          <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 p-[2px]">
            <div
              className="w-full h-full rounded-full flex items-center justify-center text-white text-xs font-bold"
              style={{ backgroundColor: story.avatarColor }}
            >
              {story.initials}
            </div>
          </div>
        </div>
        <span className="text-slate-700 dark:text-gray-300 text-[11px] font-semibold max-w-[56px] truncate text-center">
          {story.label}
        </span>
      </button>
    )
  }

  // Seen story — plain ring
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 flex-shrink-0 group"
      aria-label={`View ${story.label}'s story`}
    >
      <div
        className="w-14 h-14 rounded-full ring-2 ring-slate-200 dark:ring-gray-700 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 flex items-center justify-center text-white text-xs font-bold transition-transform group-hover:scale-105 group-active:scale-95"
        style={{ backgroundColor: story.avatarColor }}
      >
        {story.initials}
      </div>
      <span className="text-slate-400 dark:text-gray-500 text-[11px] max-w-[56px] truncate text-center">
        {story.label}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Stories() {
  const [viewerIndex, setViewerIndex] = useState(null)

  const openViewer = (storyId) => {
    const idx = viewableStories.findIndex(s => s.id === storyId)
    if (idx !== -1) setViewerIndex(idx)
  }

  return (
    <>
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl px-4 py-4">
        {/* Cross-browser scrollbar hide */}
        <style>{`
          .stories-scroll::-webkit-scrollbar { display: none; }
          .stories-scroll { scrollbar-width: none; -ms-overflow-style: none; }
        `}</style>
        <div className="stories-scroll flex gap-4 overflow-x-auto pb-1">
          {stories.map(s => (
            <StoryBubble
              key={s.id}
              story={s}
              onClick={s.isYours ? undefined : () => openViewer(s.id)}
            />
          ))}
        </div>
      </div>

      {/* Story viewer portal */}
      <AnimatePresence>
        {viewerIndex !== null && (
          <StoryViewer
            stories={viewableStories}
            startIndex={viewerIndex}
            onClose={() => setViewerIndex(null)}
          />
        )}
      </AnimatePresence>
    </>
  )
}
