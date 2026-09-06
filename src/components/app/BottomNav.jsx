import { NavLink } from 'react-router-dom'
import { Home, Compass, PlusSquare, User } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CreatePostModal from './CreatePostModal'
import { useSwish } from '../../context/SwishContext'

export default function BottomNav() {
  const [showCreate, setShowCreate] = useState(false)
  const { currentUser } = useSwish()

  const tabs = [
    { to: '/home',                                    icon: Home,    label: 'Home'    },
    { to: '/explore',                                 icon: Compass, label: 'Explore' },
    { create: true },
    { to: `/profile/${currentUser?.id || 'user-1'}`, icon: User,    label: 'Profile' },
  ]

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white dark:bg-black border-t border-slate-100 dark:border-gray-900 transition-colors duration-300"
        aria-label="Mobile navigation"
        style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
      >
        <div className="flex items-center justify-around h-[54px] px-6">
          {tabs.map((tab) => {

            /* ── Create button ── */
            if (tab.create) {
              return (
                <button
                  key="create"
                  onClick={() => setShowCreate(true)}
                  aria-label="Create post"
                  className="flex items-center justify-center w-11 h-11 rounded-[12px] bg-indigo-600 active:scale-90 transition-transform duration-150 shadow-lg shadow-indigo-500/25"
                >
                  <PlusSquare size={21} className="text-white" strokeWidth={2} />
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
                className="relative flex items-center justify-center w-12 h-12 rounded-xl active:scale-90 transition-transform duration-150"
              >
                {({ isActive }) => (
                  <>
                    {/* Animated active background */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.span
                          key="bg"
                          layoutId="tab-bg"
                          className="absolute inset-0 rounded-xl bg-indigo-50 dark:bg-indigo-500/10"
                          initial={{ opacity: 0, scale: 0.75 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.75 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                        />
                      )}
                    </AnimatePresence>

                    <Icon
                      size={24}
                      strokeWidth={isActive ? 2.5 : 1.75}
                      className={`relative z-10 transition-all duration-150 ${
                        isActive
                          ? 'text-indigo-600 dark:text-indigo-400'
                          : 'text-gray-400 dark:text-gray-500'
                      }`}
                    />
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
