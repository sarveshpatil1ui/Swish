import { Link, useLocation } from 'react-router-dom'
import { Zap, MessageSquare, Bell, Settings } from 'lucide-react'
import { motion } from 'framer-motion'

const notifications = [] // replace with real data when available
const unreadCount = notifications.filter(n => !n.read).length

export default function MobileTopBar() {
  const { pathname } = useLocation()
  const isProfile = pathname.startsWith('/profile')

  return (
    <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-4 h-[52px] bg-white dark:bg-black border-b border-slate-100 dark:border-gray-900 transition-colors duration-300">
      {/* Logo */}
      <Link to="/home" className="flex items-center gap-2 group">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center group-active:scale-90 transition-transform">
          <Zap size={14} className="text-white fill-white" />
        </div>
        <span
          className="font-extrabold text-lg text-slate-900 dark:text-white"
          style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
        >
          Swish
        </span>
      </Link>

      {/* Right icons */}
      <div className="flex items-center gap-0.5">
        {/* Messages — always visible */}
        <Link
          to="/messages"
          aria-label="Messages"
          className="relative flex items-center justify-center w-10 h-10 rounded-xl text-slate-600 dark:text-gray-400 active:bg-slate-100 dark:active:bg-gray-800 active:scale-90 transition-all duration-150"
        >
          <MessageSquare size={21} strokeWidth={1.8} />
        </Link>

        {/* Right icon: Notifications (default) or Settings (on profile) */}
        {isProfile ? (
          <Link
            to="/settings"
            aria-label="Settings"
            className="flex items-center justify-center w-10 h-10 rounded-xl text-slate-600 dark:text-gray-400 active:bg-slate-100 dark:active:bg-gray-800 active:scale-90 transition-all duration-150"
          >
            <Settings size={21} strokeWidth={1.8} />
          </Link>
        ) : (
          <Link
            to="/notifications"
            aria-label="Notifications"
            className="relative flex items-center justify-center w-10 h-10 rounded-xl text-slate-600 dark:text-gray-400 active:bg-slate-100 dark:active:bg-gray-800 active:scale-90 transition-all duration-150"
          >
            <Bell size={21} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <motion.span
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute top-2 right-2 w-[7px] h-[7px] bg-rose-500 rounded-full ring-[1.5px] ring-white dark:ring-black"
              />
            )}
          </Link>
        )}
      </div>
    </header>
  )
}
