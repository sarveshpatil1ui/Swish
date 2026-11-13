import { Outlet, useNavigate, useLocation, Link } from 'react-router-dom'
import { useState, useEffect, Suspense } from 'react'
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Building2,
  Megaphone,
  Settings,
  User,
  LogOut,
  Menu,
  X,
  Zap,
  Sun,
  Moon,
  AlertTriangle,
  MessageSquare,
  BarChart3,
  Shield,
  Activity,
  ChevronDown
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { useTheme } from '../../context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'

const menuSections = [
  {
    title: 'Overview',
    items: [
      { icon: LayoutDashboard, label: 'Dashboard', path: '/college-admin' },
      { icon: BarChart3, label: 'Analytics', path: '/college-admin/analytics' },
    ]
  },
  {
    title: 'People',
    items: [
      { icon: Users, label: 'Students', path: '/college-admin/students' },
      { icon: GraduationCap, label: 'Faculty', path: '/college-admin/faculty' },
    ]
  },
  {
    title: 'College',
    items: [
      { icon: Building2, label: 'Departments', path: '/college-admin/departments' },
      { icon: Megaphone, label: 'Notices', path: '/college-admin/notices' },
    ]
  },
  {
    title: 'Management',
    items: [
      { icon: AlertTriangle, label: 'Reports', path: '/college-admin/reports' },
      { icon: Shield, label: 'Moderation', path: '/college-admin/moderation' },
      { icon: Activity, label: 'Activity Log', path: '/college-admin/activity-log' },
    ]
  },
  {
    title: 'Communication',
    items: [
      { icon: MessageSquare, label: 'Messages', path: '/college-admin/messages' },
    ]
  },
  {
    title: 'Settings',
    items: [
      { icon: Settings, label: 'College Profile', path: '/college-admin/college-profile' },
      { icon: User, label: 'My Profile', path: '/college-admin/profile' },
    ]
  },
]

export default function CollegeAdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, logout, unreadMsgCount = 0 } = useSwish()
  const { dark, toggle } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const msgBadgeLabel = unreadMsgCount > 9 ? '9+' : String(unreadMsgCount)

  // Prevent background body scroll when mobile drawer is open
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [sidebarOpen])

  // Close mobile drawer on Escape key
  useEffect(() => {
    if (!sidebarOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setSidebarOpen(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [sidebarOpen])

  const handleLogout = async () => {
    setSidebarOpen(false)
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-base-25 dark:bg-base-950 transition-colors duration-300">

      {/* Mobile Top Header (Hidden on Desktop: lg:hidden) */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 bg-white dark:bg-base-900 border-b border-base-150 dark:border-[rgba(255,255,255,0.07)] px-3.5 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 hover:bg-base-100 dark:hover:bg-base-800/60 rounded-lg transition-colors text-base-600 dark:text-base-400"
            aria-label="Open navigation menu"
            aria-expanded={sidebarOpen}
          >
            <Menu size={20} />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-accent-600 flex items-center justify-center shadow-xs">
              <Zap size={14} className="text-white fill-white" />
            </div>
            <div>
              <h1 className="text-base-900 dark:text-white font-heading font-semibold text-sm leading-tight">
                Swish
              </h1>
              <p className="text-base-500 dark:text-base-400 text-[11px] leading-tight">
                College Admin
              </p>
            </div>
          </div>
        </div>

        {/* Right actions: Theme toggle + Messages + Account Profile */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={toggle}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-base-600 dark:text-base-300 hover:bg-base-100 dark:hover:bg-base-800/60 active:scale-90 transition-all"
          >
            <AnimatePresence mode="wait" initial={false}>
              {dark ? (
                <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Sun size={18} className="text-amber-400" />
                </motion.span>
              ) : (
                <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
                  <Moon size={18} className="text-base-600" />
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <Link
            to="/college-admin/messages"
            aria-label="Messages"
            className="relative flex items-center justify-center w-8 h-8 rounded-lg text-base-600 dark:text-base-300 hover:bg-base-100 dark:hover:bg-base-800/60 active:scale-90 transition-all"
          >
            <MessageSquare size={18} />
            {unreadMsgCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-accent-600 rounded-full text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-base-900 leading-none shadow-xs shadow-accent-500/30">
                {msgBadgeLabel}
              </span>
            )}
          </Link>

          <Link
            to="/college-admin/profile"
            aria-label="Admin Profile"
            className="flex items-center justify-center w-8 h-8 rounded-full bg-accent-600 text-white text-xs font-bold ring-2 ring-accent-500/20 active:scale-95 transition-transform"
          >
            {currentUser?.initials || 'A'}
          </Link>
        </div>
      </div>

      {/* Mobile Drawer Backdrop Overlay (Hidden on Desktop: lg:hidden) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-xs"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] lg:w-60 h-[100dvh] max-h-[100dvh] lg:h-screen
          bg-white dark:bg-base-950
          border-r border-base-150 dark:border-[rgba(255,255,255,0.07)]
          flex flex-col overflow-hidden
          shadow-2xl lg:shadow-none
          transform transition-transform duration-300 ease-in-out
          ${
            sidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          }`}
        aria-label="College admin sidebar"
      >

        {/* Drawer Header (Logo + Mobile Close Button) */}
        <div className="p-4 sm:p-5 lg:px-4 border-b border-base-100 dark:border-[rgba(255,255,255,0.06)] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-2.5 px-1 sm:px-2">
            <div className="w-8 h-8 rounded-xl bg-accent-600 flex items-center justify-center flex-shrink-0 shadow-xs">
              <Zap size={16} className="text-white fill-white" />
            </div>
            <div>
              <span className="font-heading font-extrabold text-lg text-base-900 dark:text-white leading-tight block">
                Swish
              </span>
              <p className="text-[11px] text-base-500 dark:text-base-400 leading-tight">
                College Admin Portal
              </p>
            </div>
          </div>

          {/* Close button strictly visible on mobile drawer, hidden on desktop */}
          <button
            onClick={() => setSidebarOpen(false)}
            aria-label="Close navigation menu"
            className="lg:hidden p-1.5 hover:bg-base-100 dark:hover:bg-base-800/60 text-base-500 hover:text-base-800 dark:text-base-400 dark:hover:text-base-200 rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Navigation Sections & Links */}
        <nav className="flex-1 min-h-0 px-3 lg:px-4 py-3.5 space-y-4 overflow-y-auto overscroll-contain">
          {menuSections.map((section) => (
            <div key={section.title}>
              <h3 className="text-xs font-semibold text-base-400 dark:text-base-500 uppercase tracking-wider px-3 mb-2">
                {section.title}
              </h3>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const Icon = item.icon
                  const isActive = location.pathname === item.path

                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        navigate(item.path)
                        setSidebarOpen(false)
                      }}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group relative text-left ${
                        isActive
                          ? 'bg-accent-50 dark:bg-accent-950/60 text-accent-700 dark:text-accent-400 font-semibold shadow-xs'
                          : 'text-base-600 dark:text-base-400 hover:bg-base-100 dark:hover:bg-base-800/60 hover:text-base-900 dark:hover:text-white'
                      }`}
                    >
                      <Icon size={20} className={`flex-shrink-0 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                      <span className="text-sm font-medium">{item.label}</span>
                      {item.label === 'Messages' && unreadMsgCount > 0 && (
                        <span className="ml-auto min-w-[20px] h-5 px-1.5 bg-accent-600 rounded-full text-white text-[10px] font-bold flex items-center justify-center shadow-xs shadow-accent-500/30">
                          {msgBadgeLabel}
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* Bottom Section: Profile, Theme, and Logout */}
        <div
          className="px-3 lg:px-4 pt-2.5 space-y-1 border-t border-base-100 dark:border-[rgba(255,255,255,0.06)] flex-shrink-0 bg-white dark:bg-base-950 z-20 shadow-[0_-4px_12px_rgba(0,0,0,0.03)] dark:shadow-[0_-4px_12px_rgba(0,0,0,0.25)]"
          style={{ paddingBottom: 'max(1.25rem, env(safe-area-inset-bottom, 1.25rem))' }}
        >
          {/* Admin Profile */}
          {currentUser && (
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-xl hover:bg-base-100/70 dark:hover:bg-base-800/60 transition-all mb-0.5">
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-xs"
                style={{ backgroundColor: currentUser.avatarColor || '#5B5FEF' }}
              >
                {currentUser.initials || 'A'}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-base-900 dark:text-white text-sm font-semibold truncate leading-tight">
                  {currentUser.name}
                </p>
                <p className="text-base-400 dark:text-base-500 text-xs truncate leading-tight mt-0.5">
                  {currentUser.college || 'College Admin'}
                </p>
              </div>
            </div>
          )}

          {/* Theme Toggle */}
          <button
            type="button"
            onClick={toggle}
            aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-base-600 dark:text-base-400 hover:bg-base-100 dark:hover:bg-base-800/60 hover:text-base-900 dark:hover:text-white transition-all text-sm font-medium"
          >
            <AnimatePresence mode="wait" initial={false}>
              {dark ? (
                <motion.span key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }} className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                  <Sun size={18} className="text-amber-400" />
                </motion.span>
              ) : (
                <motion.span key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }} className="flex items-center justify-center w-5 h-5 flex-shrink-0">
                  <Moon size={18} className="text-base-600" />
                </motion.span>
              )}
            </AnimatePresence>
            <span>{dark ? 'Light Mode' : 'Dark Mode'}</span>
          </button>

          {/* Logout (reuses existing handleLogout cleanly) */}
          <button
            type="button"
            onClick={handleLogout}
            data-testid="college-admin-logout-btn"
            id="college-admin-logout-btn"
            aria-label="Logout"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 active:bg-rose-100 dark:active:bg-rose-950/50 transition-all text-sm font-semibold"
          >
            <div className="flex items-center justify-center w-5 h-5 flex-shrink-0">
              <LogOut size={18} className="stroke-[2.25]" />
            </div>
            <span>Logout</span>
          </button>
        </div>

      </aside>

      {/* Main Content (Desktop margin lg:ml-60 preserved, pt-20 on mobile for header, pt-6 on desktop) */}
      <main className="lg:ml-60 min-h-screen">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-20 lg:pt-6">
          <Suspense
            fallback={
              <div className="flex items-center justify-center py-24" role="status" aria-label="Loading dashboard view">
                <div className="w-7 h-7 border-2 border-accent-200 dark:border-accent-900 border-t-accent-600 dark:border-t-accent-400 rounded-full animate-spin" />
              </div>
            }
          >
            <Outlet />
          </Suspense>
        </div>
      </main>

    </div>
  )
}
