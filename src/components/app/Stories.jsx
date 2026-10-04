import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Eye, X, ChevronRight, ImagePlus } from 'lucide-react'
import StoryViewer from './StoryViewer'
import CreateStoryModal from './CreateStoryModal'
import { useSwish } from '../../context/SwishContext'

// ── "Your Story" Action Menu Modal ───────────────────────────────────────────
function YourStoryActionModal({ activeCount = 0, onView, onAdd, onClose }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 8 }}
        transition={{ duration: 0.18, ease: 'easeOut' }}
        className="relative w-full max-w-xs bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-gray-800">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">Your Story</h3>
            <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">
              {activeCount > 0 ? `${activeCount} active ${activeCount === 1 ? 'story' : 'stories'}` : 'Share a photo'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors"
            aria-label="Close menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Options */}
        <div className="p-3 flex flex-col gap-2">
          {activeCount > 0 && (
            <button
              onClick={() => {
                onClose()
                onView()
              }}
              className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-indigo-50/70 dark:hover:bg-indigo-950/40 text-left transition-all group border border-transparent hover:border-indigo-100 dark:hover:border-indigo-900/50 cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                  <Eye size={18} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    View Your Story
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-gray-500">
                    Watch your {activeCount} active {activeCount === 1 ? 'story' : 'stories'}
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-slate-400 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all" />
            </button>
          )}

          <button
            onClick={() => {
              onClose()
              onAdd()
            }}
            className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-emerald-50/70 dark:hover:bg-emerald-950/40 text-left transition-all group border border-transparent hover:border-emerald-100 dark:hover:border-emerald-900/50 cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                <Plus size={18} />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                  Add New Story
                </p>
                <p className="text-[11px] text-slate-400 dark:text-gray-500">
                  Share a photo to your story
                </p>
              </div>
            </div>
            <ChevronRight size={16} className="text-slate-400 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition-all" />
          </button>
        </div>
      </motion.div>
    </div>
  )
}

// ── Story bubble ──────────────────────────────────────────────────────────────
function StoryBubble({ bubble, onClick }) {
  // ── Logged-in User's "Your Story" circle (ALWAYS exactly ONE circle) ────────
  if (bubble.isYourStoryBubble) {
    if (!bubble.hasActiveStories) {
      // No active stories: dashed upload style
      return (
        <button
          onClick={onClick}
          className="flex flex-col items-center gap-2 flex-shrink-0 group cursor-pointer"
          aria-label="Add your story"
        >
          <div className="w-14 h-14 rounded-full border-2 border-dashed border-slate-300 dark:border-gray-600 bg-slate-50 dark:bg-gray-800 flex items-center justify-center transition-transform group-hover:scale-105">
            <div className="w-7 h-7 rounded-full bg-indigo-600 group-hover:bg-indigo-700 transition-colors flex items-center justify-center shadow-sm">
              <Plus size={14} className="text-white stroke-[2.5]" />
            </div>
          </div>
          <span className="text-slate-500 dark:text-gray-400 text-[11px] font-medium max-w-[64px] truncate text-center">
            Your Story
          </span>
        </button>
      )
    }

    // Has active stories: single circle with avatar and colorful gradient ring
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center gap-2 flex-shrink-0 group cursor-pointer"
        aria-label="Your story"
      >
        <div
          className="relative w-14 h-14 rounded-full p-[2px] transition-transform group-hover:scale-105 group-active:scale-95"
          style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #ec4899 50%, #8b5cf6 100%)' }}
        >
          <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 p-[2px] overflow-hidden">
            <div
              className="w-full h-full rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden"
              style={{ backgroundColor: bubble.avatarColor || '#6366f1' }}
            >
              {bubble.profilePhoto ? (
                <img src={bubble.profilePhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                bubble.initials
              )}
            </div>
          </div>
          {/* Subtle plus badge in corner for quick add recognition */}
          <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-indigo-600 text-white flex items-center justify-center border-2 border-white dark:border-gray-900 shadow-xs">
            <Plus size={10} className="stroke-[3]" />
          </div>
        </div>
        <span className="text-slate-700 dark:text-gray-300 text-[11px] font-semibold max-w-[64px] truncate text-center">
          Your Story
        </span>
      </button>
    )
  }

  // ── Follower Stories (ALWAYS exactly ONE circle per follower) ───────────────
  if (bubble.hasNew) {
    // Unseen follower story: gradient ring
    return (
      <button
        onClick={onClick}
        className="flex flex-col items-center gap-2 flex-shrink-0 group cursor-pointer"
        aria-label={`View ${bubble.label}'s story`}
      >
        <div
          className="w-14 h-14 rounded-full p-[2px] transition-transform group-hover:scale-105 group-active:scale-95"
          style={{ background: 'linear-gradient(135deg, #fbbf24 0%, #ec4899 50%, #8b5cf6 100%)' }}
        >
          <div className="w-full h-full rounded-full bg-white dark:bg-gray-900 p-[2px] overflow-hidden">
            <div
              className="w-full h-full rounded-full flex items-center justify-center text-white text-xs font-bold overflow-hidden"
              style={{ backgroundColor: bubble.avatarColor || '#6366f1' }}
            >
              {bubble.profilePhoto ? (
                <img src={bubble.profilePhoto} alt="" className="w-full h-full object-cover" />
              ) : (
                bubble.initials
              )}
            </div>
          </div>
        </div>
        <span className="text-slate-700 dark:text-gray-300 text-[11px] font-semibold max-w-[64px] truncate text-center">
          {bubble.label}
        </span>
      </button>
    )
  }

  // Seen follower story: plain ring
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 flex-shrink-0 group cursor-pointer"
      aria-label={`View ${bubble.label}'s story`}
    >
      <div
        className="w-14 h-14 rounded-full ring-2 ring-slate-200 dark:ring-gray-700 ring-offset-2 ring-offset-white dark:ring-offset-gray-900 flex items-center justify-center text-white text-xs font-bold overflow-hidden transition-transform group-hover:scale-105 group-active:scale-95"
        style={{ backgroundColor: bubble.avatarColor || '#6366f1' }}
      >
        {bubble.profilePhoto ? (
          <img src={bubble.profilePhoto} alt="" className="w-full h-full object-cover" />
        ) : (
          bubble.initials
        )}
      </div>
      <span className="text-slate-400 dark:text-gray-500 text-[11px] max-w-[64px] truncate text-center">
        {bubble.label}
      </span>
    </button>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
export default function Stories() {
  const { currentUser, stories, fetchStories, createStory, updateStory, deleteStory } = useSwish()
  const [viewerState, setViewerState] = useState(null) // { userIdx, storyIdx }
  const [showCreate, setShowCreate] = useState(false)
  const [showActionModal, setShowActionModal] = useState(false)
  const [editingStory, setEditingStory] = useState(null)

  useEffect(() => {
    fetchStories()
  }, [])

  // ── Group stories by user (Strictly ONE circle per user) ───────────────────
  const { ownStories, allUserGroups, trayBubbles } = useMemo(() => {
    const own = stories.filter(s => s.isOwnStory)
    const followers = stories.filter(s => !s.isOwnStory)

    // Group followers' stories by unique user ID
    const fMap = new Map()
    for (const s of followers) {
      const uId = s.userId || s.user?.id || s.user?._id
      if (!uId) continue

      if (!fMap.has(uId)) {
        fMap.set(uId, {
          userId: uId,
          user: s.user,
          label: s.user?.name?.split(' ')[0] || s.label || 'User',
          initials: s.initials || (s.user?.name ? s.user.name.slice(0, 2).toUpperCase() : 'U'),
          avatarColor: s.avatarColor || '#6366f1',
          profilePhoto: s.user?.profilePhoto || null,
          stories: [],
          hasNew: false,
        })
      }
      const group = fMap.get(uId)
      group.stories.push(s)
      if (s.hasNew) group.hasNew = true
    }
    const followerGroupsList = Array.from(fMap.values())

    // Group own stories into a single userGroup for StoryViewer
    const ownGroupList = own.length > 0 ? [{
      userId: currentUser?.id,
      user: {
        id: currentUser?.id,
        name: currentUser?.name || 'You',
        username: currentUser?.username || '',
        initials: currentUser?.initials || 'U',
        avatarColor: currentUser?.avatarColor || '#6366f1',
        profilePhoto: currentUser?.profilePhoto || null,
      },
      isOwnGroup: true,
      stories: own,
    }] : []

    const userGroups = [...ownGroupList, ...followerGroupsList]

    // Construct story tray:
    // ALWAYS exactly ONE "Your Story" circle, followed by exactly ONE circle per follower
    const yourStoryBubble = {
      id: 'single-your-story-circle',
      isYourStoryBubble: true,
      hasActiveStories: own.length > 0,
      activeStoriesCount: own.length,
      label: 'Your Story',
      initials: currentUser?.initials || 'U',
      avatarColor: currentUser?.avatarColor || '#6366f1',
      profilePhoto: currentUser?.profilePhoto || null,
      stories: own,
    }

    const followerBubbles = followerGroupsList.map((fg) => ({
      id: `fg-${fg.userId}`,
      isFollowerGroup: true,
      group: fg,
      label: fg.label,
      initials: fg.initials,
      avatarColor: fg.avatarColor,
      profilePhoto: fg.profilePhoto,
      hasNew: fg.hasNew,
    }))

    return {
      ownStories: own,
      allUserGroups: userGroups,
      trayBubbles: [yourStoryBubble, ...followerBubbles],
    }
  }, [stories, currentUser])

  // ── Handle bubble click ────────────────────────────────────────────────────
  const handleBubbleClick = (bubble) => {
    // Click on logged-in user's "Your Story" bubble
    if (bubble.isYourStoryBubble) {
      if (bubble.hasActiveStories) {
        // Open action menu modal: "View Your Story" / "Add New Story"
        setShowActionModal(true)
      } else {
        // No active story: open story upload flow directly
        setEditingStory(null)
        setShowCreate(true)
      }
      return
    }

    // Click on a follower's bubble -> open that follower's stories
    if (bubble.isFollowerGroup) {
      const uIdx = allUserGroups.findIndex(g => g.userId === bubble.group.userId)
      if (uIdx !== -1) {
        const unreadIdx = bubble.group.stories.findIndex(s => s.hasNew)
        setViewerState({
          userIdx: uIdx,
          storyIdx: unreadIdx >= 0 ? unreadIdx : 0,
        })
      }
    }
  }

  // ── "View Your Story" action handler ───────────────────────────────────────
  const handleViewOwnStory = () => {
    if (ownStories.length > 0) {
      setViewerState({
        userIdx: 0,
        storyIdx: 0,
      })
    }
  }

  // ── "Add New Story" action handler ─────────────────────────────────────────
  const handleAddStory = () => {
    setEditingStory(null)
    setShowCreate(true)
  }

  // ── Delete Story handler ───────────────────────────────────────────────────
  const handleDeleteStory = async (storyId) => {
    await deleteStory(storyId)
    setViewerState(null)
  }

  // ── Edit Story handler ─────────────────────────────────────────────────────
  const handleEditStory = (story) => {
    setEditingStory(story)
    setShowCreate(true)
    setViewerState(null)
  }

  // ── Publish / Update handler ───────────────────────────────────────────────
  const handlePublishStory = async ({ imageFile, caption }) => {
    if (editingStory) {
      return updateStory(editingStory.id, { imageFile, caption })
    }
    return createStory({ imageFile, caption })
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
          {trayBubbles.map(bubble => (
            <StoryBubble
              key={bubble.id}
              bubble={bubble}
              onClick={() => handleBubbleClick(bubble)}
            />
          ))}
        </div>
      </div>

      {/* Your Story Action Menu Modal (View Your Story / Add New Story) */}
      <AnimatePresence>
        {showActionModal && (
          <YourStoryActionModal
            activeCount={ownStories.length}
            onView={handleViewOwnStory}
            onAdd={handleAddStory}
            onClose={() => setShowActionModal(false)}
          />
        )}
      </AnimatePresence>

      {/* Story viewer portal */}
      <AnimatePresence>
        {viewerState !== null && allUserGroups.length > 0 && (
          <StoryViewer
            userGroups={allUserGroups}
            initialUserIndex={viewerState.userIdx}
            initialStoryIndex={viewerState.storyIdx}
            onClose={() => setViewerState(null)}
            onDelete={handleDeleteStory}
            onEdit={handleEditStory}
          />
        )}
      </AnimatePresence>

      {/* Create / Edit story modal */}
      <AnimatePresence>
        {showCreate && (
          <CreateStoryModal
            initialStory={editingStory}
            onClose={() => {
              setShowCreate(false)
              setEditingStory(null)
            }}
            onPublish={handlePublishStory}
          />
        )}
      </AnimatePresence>
    </>
  )
}
