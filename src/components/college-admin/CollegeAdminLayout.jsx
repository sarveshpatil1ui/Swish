import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
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
  Moon
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { useTheme } from '../../context/ThemeContext'
import { motion, AnimatePresence } from 'framer-motion'

const menuItems = [
  { icon: LayoutDashboard, label: 'Dashboard', path: '/college-admin' },
  { icon: Users, label: 'Students', path: '/college-admin/students' },
  { icon: GraduationCap, label: 'Faculty', path: '/college-admin/faculty' },
  { icon: Building2, label: 'Departments', path: '/college-admin/departments' },
  { icon: Megaphone, label: 'Notices', path: '/college-admin/notices' },
  { icon: Settings, label: 'College Profile', path: '/college-admin/college-profile' },
  { icon: User, label: 'My Profile', path: '/college-admin/profile' },
]

export default function CollegeAdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { currentUser, logout } = useSwish()
  const { dark, toggle } = useTheme()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 transition-colors duration-300">

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-slate-200 dark:border-gray-800 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Menu size={20} className="text-slate-600 dark:text-gray-400" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
              <Zap size={14} className="text-white fill-white" />
            </div>
            <div>
              <h1 className="text-slate-900 dark:text-white font-semibold text-sm">
                Swish
              </h1>
              <p className="text-slate-500 dark:text-gray-500 text-xs">
                College Admin
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-50 h-screen w-16 lg:w-60
          bg-white dark:bg-gray-950
          border-r border-slate-200 dark:border-gray-800
          flex flex-col
          transform transition-transform duration-300
          ${
            sidebarOpen
              ? 'translate-x-0'
              : '-translate-x-full lg:translate-x-0'
          }`}
      >

        {/* Logo */}
        <div className="p-5 lg:px-4 border-b border-slate-100 dark:border-gray-800 flex-shrink-0">
          <div className="flex items-center gap-2.5 px-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center flex-shrink-0">
              <Zap size={16} className="text-white fill-white" />
            </div>
            <span style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }} className="hidden lg:block font-extrabold text-lg text-slate-900 dark:text-white">
              Swish
            </span>
          </div>
          <p className="hidden lg:block text-xs text-slate-500 dark:text-gray-500 mt-2 px-2">
            College Admin Portal
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2 lg:px-4 py-4 space-y-0.5 overflow-y-auto">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path

            return (
              <button
                key={item.path}
                onClick={() => {
                  navigate(item.path)
                  setSidebarOpen(false)
                }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-400 font-semibold'
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon size={20} className={`flex-shrink-0 ${isActive ? 'stroke-[2.5]' : 'stroke-2'}`} />
                <span className="hidden lg:block text-sm">{item.label}</span>
              </button>
            )
          })}
        </nav>

        {/* Bottom Section */}
        <div className="px-2 lg:px-4 py-4 space-y-0.5 border-t border-slate-100 dark:border-gray-800 flex-shrink-0">
          {/* Admin Profile */}
          {currentUser && (
            <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 transition-all mb-1">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0" style={{ backgroundColor: currentUser.avatarColor }}>
                {currentUser.initials}
              </div>
              <div className="hidden lg:block min-w-0">
                <p className="text-slate-900 dark:text-white text-sm font-semibold truncate">{currentUser.name}</p>
                <p className="text-slate-400 dark:text-gray-500 text-xs truncate">{currentUser.college}</p>
              </div>
            </div>
          )}

          {/* Theme Toggle */}
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

          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-500 dark:text-gray-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 transition-all"
          >
            <LogOut size={18} />
            <span className="hidden lg:block text-sm">Logout</span>
          </button>
        </div>

        {/* Mobile Close Button */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X size={20} className="text-slate-600 dark:text-gray-400" />
        </button>

      </aside>

      {/* Main Content */}
      <main className="lg:ml-60 min-h-screen">
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pt-20 lg:pt-6">
          <Outlet />
        </div>
      </main>

    </div>
  )
}