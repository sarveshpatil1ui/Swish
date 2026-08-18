import { NavLink, useNavigate } from 'react-router-dom'
import { Home, Compass, PlusCircle, Bell, User, Settings, LogOut, Zap, Shield, MessageSquare, Sun, Moon, GraduationCap } from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { useTheme } from '../../context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import CreatePostModal from './CreatePostModal'
import { notifications } from '../../data/mockData'

const baseNavItems = [
  { to: '/home',          icon: Home,     label: 'Home' },
  { to: '/explore',       icon: Compass,  label: 'Explore' },
  { to: '/notifications', icon: Bell,     label: 'Notifications' },
  { to: '/settings',      icon: Settings, label: 'Settings' },
]

export default function Sidebar() {
  const { currentUser: user, logout } = useSwish()
  const { dark, toggle } = useTheme()
  const navigate = useNavigate()
  const [showCreate, setShowCreate] = useState(false)

  const unreadCount = notifications.filter(n => !n.read).length
  const badgeLabel = unreadCount > 9 ? '9+' : String(unreadCount)

  const navItems = [
    ...baseNavItems.slice(0, 3),
    { to: `/profile/${user?.id || 'user-1'}`, icon: User, label: 'Profile' },
    baseNavItems[3],
  ]

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <>
      <aside className="hidden md:flex flex-col sticky top-0 h-screen w-16 lg:w-60 border-r border-slate-200 dark:border-gray-800 bg-white dark:bg-gray-950 transition-colors duration-300 flex-shrink-0 py-5 px-2 lg:px-4">
        {/* Logo */}
        <NavLink to="/home" className="flex items-center gap-2.5 px-2 mb-8 group">
          <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0 group-hover:bg-indigo-700 transition-colors">
            <Zap size={16} className="text-white fill-white" />
          </div>
          <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="hidden lg:block font-extrabold text-lg text-slate-900 dark:text-white">
            Swish
          </span>
        </NavLink>

        {/* Main nav */}
        <nav className="flex-1 space-y-0.5" aria-label="App navigation">
          {navItems.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-semibold'
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon size={20} className={`flex-shrink-0 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                  <span className="hidden lg:block text-sm">{label}</span>
                  {label === 'Notifications' && unreadCount > 0 && (
                    <span className="hidden lg:flex ml-auto w-5 h-5 bg-rose-500 rounded-full text-white text-[10px] font-bold items-center justify-center">
                      {badgeLabel}
                    </span>
                  )}
                  {label === 'Notifications' && unreadCount > 0 && (
                    <span className="lg:hidden absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full ring-2 ring-white dark:ring-gray-950" />
                  )}
                </>
              )}
            </NavLink>
          ))}

          {/* Create button */}
          <button
            onClick={() => setShowCreate(true)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white transition-all duration-150"
          >
            <PlusCircle size={20} className="flex-shrink-0" />
            <span className="hidden lg:block text-sm font-medium">Create</span>
          </button>

          {/* Messages link */}
          <NavLink
            to="/messages"
            title="Messages"
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 relative ${
                isActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-semibold'
                  : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white'
              }`
            }
          >
            <MessageSquare size={20} className="flex-shrink-0" />
            <span className="hidden lg:block text-sm">Messages</span>
          </NavLink>

          {/* Admin link */}
          {user?.role === 'admin' && (
            <NavLink
              to="/admin"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 font-semibold'
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800'
                }`
              }
            >
              <Shield size={20} className="flex-shrink-0" />
              <span className="hidden lg:block text-sm">Admin</span>
            </NavLink>
          )}

          {/* Faculty link */}
          {user?.role === 'faculty' && (
            <NavLink
              to="/faculty"
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 ${
                  isActive
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-semibold'
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800'
                }`
              }
            >
              <GraduationCap size={20} className="flex-shrink-0" />
              <span className="hidden lg:block text-sm">Faculty</span>
            </NavLink>
          )}

        </nav>

        {/* Bottom actions */}
        <div className="space-y-0.5 border-t border-slate-100 dark:border-gray-800 pt-4">
          {user && (
            <NavLink to={`/profile/${user?.id || 'user-1'}`} className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 transition-all mb-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: user.avatarColor }}>
                {user.initials}
              </div>
              <div className="hidden lg:block min-w-0">
                <p className="text-slate-900 dark:text-white text-sm font-semibold truncate">{user.name}</p>
                <p className="text-slate-400 dark:text-gray-500 text-xs truncate">{user.dept}</p>
              </div>
            </NavLink>
          )}

          <button
            onClick={toggle}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white transition-all"
          >
            <AnimatePresence mode="wait" initial={false}>
              {dark ? (
                <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Sun size={18} />
                </motion.span>
              ) : (
                <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Moon size={18} />
                </motion.span>
              )}
            </AnimatePresence>
            <span className="hidden lg:block text-sm">{dark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-gray-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-all"
          >
            <LogOut size={18} />
            <span className="hidden lg:block text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {showCreate && <CreatePostModal onClose={() => setShowCreate(false)} />}
    </>
  )
}
