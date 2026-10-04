import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Zap, MessageSquare, Bell, Settings, Sun, Moon, LogOut, User, Shield, GraduationCap, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../../context/ThemeContext'
import { useSwish } from '../../context/SwishContext'

const notifications = [] // replace with real data when available
const unreadCount = notifications.filter(n => !n.read).length

export default function MobileTopBar() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { dark, toggle } = useTheme()
  const { currentUser: user, logout } = useSwish()
  const [accountOpen, setAccountOpen] = useState(false)

  const isMessages = pathname.startsWith('/messages')
  const isNotifications = pathname.startsWith('/notifications')

  const handleLogout = async () => {
    setAccountOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <>
      <header className="md:hidden sticky top-0 z-30 flex items-center justify-between px-3.5 h-14 bg-white/95 dark:bg-gray-950/95 backdrop-blur-md border-b border-slate-200/80 dark:border-gray-800/80 transition-colors duration-300">
        {/* Logo */}
        <Link to="/home" className="flex items-center gap-2 group flex-shrink-0" aria-label="Swish Home">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center group-active:scale-95 transition-transform shadow-sm">
            <Zap size={14} className="text-white fill-white" />
          </div>
          <span
            className="font-extrabold text-base sm:text-lg text-slate-900 dark:text-white tracking-tight"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Swish
          </span>
        </Link>

        {/* Right actions: Theme Toggle + Messages + Notifications + Account */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          {/* Dark / Night mode toggle */}
          <button
            id="mobile-topbar-theme-toggle"
            onClick={toggle}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 active:scale-90 transition-all"
          >
            <AnimatePresence mode="wait" initial={false}>
              {dark ? (
                <motion.span
                  key="sun"
                  initial={{ rotate: -90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: 90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Sun size={18} className="text-amber-400" />
                </motion.span>
              ) : (
                <motion.span
                  key="moon"
                  initial={{ rotate: 90, opacity: 0 }}
                  animate={{ rotate: 0, opacity: 1 }}
                  exit={{ rotate: -90, opacity: 0 }}
                  transition={{ duration: 0.15 }}
                >
                  <Moon size={18} className="text-slate-600" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          {/* Messages */}
          <Link
            to="/messages"
            aria-label="Messages"
            className={`flex items-center justify-center w-8 h-8 rounded-lg active:scale-90 transition-all ${
              isMessages
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
                : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800'
            }`}
          >
            <MessageSquare size={19} strokeWidth={1.8} />
          </Link>

          {/* Notifications */}
          <Link
            to="/notifications"
            aria-label="Notifications"
            className={`relative flex items-center justify-center w-8 h-8 rounded-lg active:scale-90 transition-all ${
              isNotifications
                ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60'
                : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800'
            }`}
          >
            <Bell size={19} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-gray-950" />
            )}
          </Link>

          {/* Account button / Avatar */}
          <button
            id="mobile-account-button"
            onClick={() => setAccountOpen(!accountOpen)}
            aria-label="Account menu"
            aria-expanded={accountOpen}
            className="flex items-center justify-center w-8 h-8 rounded-full ring-2 ring-indigo-600/20 dark:ring-indigo-400/20 active:scale-90 transition-transform overflow-hidden flex-shrink-0"
            style={{ backgroundColor: user?.avatarColor || '#6366f1' }}
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <span className="text-white text-xs font-bold leading-none select-none">
                {user?.initials || (user?.name ? user.name[0].toUpperCase() : 'U')}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Account Menu Drawer / Popover for Mobile */}
      <AnimatePresence>
        {accountOpen && (
          <>
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setAccountOpen(false)}
              className="md:hidden fixed inset-0 z-40 bg-black/40 backdrop-blur-sm"
            />

            {/* Menu Dropdown Modal */}
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="md:hidden fixed top-16 right-3 left-3 sm:left-auto sm:w-80 z-50 bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl shadow-2xl p-4 max-h-[85vh] overflow-y-auto"
            >
              {/* User Header Info */}
              <div className="flex items-center gap-3 pb-3.5 border-b border-slate-100 dark:border-gray-800">
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0 shadow-sm"
                  style={{ backgroundColor: user?.avatarColor || '#6366f1' }}
                >
                  {user?.initials || (user?.name ? user.name[0].toUpperCase() : 'U')}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-slate-900 dark:text-white font-semibold text-sm truncate">
                    {user?.name || 'Campus Student'}
                  </p>
                  <p className="text-slate-500 dark:text-gray-400 text-xs truncate">
                    {user?.email || user?.dept || 'Swish Member'}
                  </p>
                  {user?.role && (
                    <span className="inline-block mt-1 px-2 py-0.5 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 text-[10px] font-semibold rounded-full uppercase tracking-wider">
                      {user.role}
                    </span>
                  )}
                </div>
              </div>

              {/* Account Links */}
              <div className="py-2 space-y-1">
                <Link
                  to={`/profile/${user?.id || 'user-1'}`}
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <User size={18} className="text-slate-500 dark:text-gray-400" />
                    <span className="text-sm font-medium">My Profile</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </Link>

                <Link
                  to="/settings"
                  onClick={() => setAccountOpen(false)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Settings size={18} className="text-slate-500 dark:text-gray-400" />
                    <span className="text-sm font-medium">Account Settings</span>
                  </div>
                  <ChevronRight size={16} className="text-slate-400" />
                </Link>

                {/* Role-specific Links */}
                {user?.role === 'admin' && (
                  <Link
                    to="/admin"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Shield size={18} />
                      <span className="text-sm font-medium">Admin Dashboard</span>
                    </div>
                    <ChevronRight size={16} />
                  </Link>
                )}

                {user?.role === 'faculty' && (
                  <Link
                    to="/faculty"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <GraduationCap size={18} />
                      <span className="text-sm font-medium">Faculty Portal</span>
                    </div>
                    <ChevronRight size={16} />
                  </Link>
                )}

                {user?.role === 'college_admin' && (
                  <Link
                    to="/college-admin"
                    onClick={() => setAccountOpen(false)}
                    className="flex items-center justify-between px-3 py-2.5 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Zap size={18} />
                      <span className="text-sm font-medium">College Admin</span>
                    </div>
                    <ChevronRight size={16} />
                  </Link>
                )}
              </div>

              {/* Theme toggle row in drawer */}
              <div className="pt-2 border-t border-slate-100 dark:border-gray-800">
                <button
                  onClick={toggle}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {dark ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-slate-600" />}
                    <span className="text-sm font-medium">Appearance</span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded-md bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400">
                    {dark ? 'Dark' : 'Light'}
                  </span>
                </button>
              </div>

              {/* Logout button */}
              <div className="pt-2 border-t border-slate-100 dark:border-gray-800 mt-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-sm font-semibold"
                >
                  <LogOut size={18} />
                  <span>Log Out of Swish</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}
