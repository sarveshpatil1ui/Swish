import { NavLink } from 'react-router-dom'
import { Home, Compass, Flame, PlusSquare, User, MessageSquare } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CreatePostModal from './CreatePostModal'
import { useSwish } from '../../context/SwishContext'

export default function BottomNav() {
  const [showCreate, setShowCreate] = useState(false)
  const { currentUser, unreadMsgCount = 0, platformConfig } = useSwish()
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'main_admin'
  const isPostCreationPaused = platformConfig?.features?.allowPostCreation === false && !isAdmin
  const msgBadgeLabel = unreadMsgCount > 9 ? '9+' : String(unreadMsgCount)

  const tabs = [
    { to: '/home',                                    icon: Home,          label: 'Home' },
    { to: '/explore',                                 icon: Compass,       label: 'Explore' },
    { to: '/trending',                                icon: Flame,         label: 'Trending' },
    { create: true },
    { to: '/messages',                                icon: MessageSquare, label: 'Messages', badge: unreadMsgCount },
    { to: `/profile/${currentUser?.id || 'user-1'}`, icon: User,          label: 'Profile' },
  ]

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-black border-t border-base-100 dark:border-[rgba(255,255,255,0.06)] transition-colors duration-300"
        aria-label="Mobile navigation"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around h-[56px] px-2 sm:px-4">
          {tabs.map((tab) => {

            /* ── Create button ── */
            if (tab.create) {
              return (
                <button
                  key="create"
                  onClick={() => {
                    if (isPostCreationPaused) return
                    setShowCreate(true)
                  }}
                  disabled={isPostCreationPaused}
                  aria-label={isPostCreationPaused ? 'Post creation paused' : 'Create post'}
                  className={`flex items-center justify-center w-10 h-10 rounded-[12px] active:scale-90 transition-transform duration-150 flex-shrink-0 relative ${
                    isPostCreationPaused
                      ? 'bg-slate-400 dark:bg-gray-700 cursor-not-allowed opacity-60'
                      : 'bg-accent-500 shadow-md shadow-accent-500/20'
                  }`}
                >
                  <PlusSquare size={20} className="text-white" strokeWidth={2} />
                  {isPostCreationPaused && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-white dark:ring-black" />
                  )}
                </button>
              )
            }

            /* ── Regular tab ── */
            const Icon = tab.icon
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                aria-label={tab.label}
                className="relative flex items-center justify-center w-11 h-11 rounded-xl active:scale-90 transition-transform duration-150 flex-shrink-0"
              >
                {({ isActive }) => (
                  <>
                    {/* Animated active background */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.span
                          key="bg"
                          layoutId="tab-bg"
                          className="absolute inset-0 rounded-xl bg-accent-50 dark:bg-accent-500/10"
                          initial={{ opacity: 0, scale: 0.75 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.75 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                        />
                      )}
                    </AnimatePresence>

                    <Icon
                      size={22}
                      strokeWidth={isActive ? 2.5 : 1.75}
                      className={`relative z-10 transition-all duration-150 ${
                        isActive
                          ? 'text-accent-500 dark:text-accent-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                    />

                    {tab.badge > 0 && (
                      <span className="absolute top-1 right-1 z-20 min-w-[15px] h-3.5 px-1 bg-accent-500 rounded-full text-white text-[8px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-black leading-none shadow-sm shadow-accent-500/25">
                        {msgBadgeLabel}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
      </nav>

      <AnimatePresence>
        {showCreate && (
          <CreatePostModal onClose={() => setShowCreate(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
