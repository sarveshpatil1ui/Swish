import { NavLink } from 'react-router-dom'
import { Home, Compass, PlusCircle, Bell, User } from 'lucide-react'
import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import CreatePostModal from './CreatePostModal'
import { notifications } from '../../data/mockData'

const tabs = [
  { to: '/home',          icon: Home,    label: 'Home' },
  { to: '/explore',       icon: Compass, label: 'Explore' },
  { create: true },
  { to: '/notifications', icon: Bell,    label: 'Alerts', badge: true },
  { to: '/profile/user-1',icon: User,    label: 'Profile' },
]

export default function BottomNav() {
  const [showCreate, setShowCreate] = useState(false)
  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-white/95 dark:bg-gray-950/95 backdrop-blur-sm border-t border-slate-200 dark:border-gray-800 transition-colors duration-300 safe-area-pb"
        aria-label="Mobile navigation"
      >
        <div className="flex items-stretch justify-around h-16 px-1">
          {tabs.map((tab, i) => {
            if (tab.create) {
              return (
                <div key="create" className="flex items-center justify-center px-2">
                  <button
                    onClick={() => setShowCreate(true)}
                    className="flex items-center justify-center w-11 h-11 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl transition-all shadow-sm active:scale-95"
                    aria-label="Create post"
                  >
                    <PlusCircle size={22} className="text-white" />
                  </button>
                </div>
              )
            }

            const Icon = tab.icon
            return (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={({ isActive }) =>
                  `relative flex flex-col items-center justify-center flex-1 gap-0.5 transition-all ${
                    isActive
                      ? 'text-indigo-600 dark:text-indigo-400'
                      : 'text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300'
                  }`
                }
                aria-label={tab.label}
              >
                {({ isActive }) => (
                  <>
                    {/* Top active bar */}
                    <AnimatePresence>
                      {isActive && (
                        <motion.span
                          layoutId="bottom-nav-bar"
                          className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-[2.5px] bg-indigo-600 dark:bg-indigo-400 rounded-full"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: 1 }}
                          exit={{ scaleX: 0 }}
                          transition={{ duration: 0.2, ease: 'easeOut' }}
                        />
                      )}
                    </AnimatePresence>

                    {/* Icon */}
                    <Icon
                      size={22}
                      className={`transition-transform ${isActive ? 'stroke-[2.5] scale-110' : 'stroke-2'}`}
                    />

                    {/* Label — only when active */}
                    <span
                      className={`text-[10px] font-semibold leading-none transition-all ${
                        isActive ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'
                      }`}
                    >
                      {tab.label}
                    </span>

                    {/* Notification dot */}
                    {tab.badge && unreadCount > 0 && (
                      <span className="absolute top-2 right-2.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-gray-950" />
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
