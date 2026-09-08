import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, Users, GraduationCap, Building2,
  Megaphone, Settings, User, LogOut, Menu, X,
  ChevronRight
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'

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
          <div>
            <h1 className="text-slate-900 dark:text-white font-semibold text-sm">College Admin</h1>
            <p className="text-slate-500 dark:text-gray-500 text-xs">{currentUser?.college}</p>
          </div>
        </div>
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 bg-black/50"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static top-0 left-0 z-50 h-screen w-64 bg-white dark:bg-gray-900 border-r border-slate-200 dark:border-gray-800 transform transition-transform duration-300 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-slate-200 dark:border-gray-800">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">SWISH</h2>
          <p className="text-xs text-slate-500 dark:text-gray-500 mt-1">College Admin Portal</p>
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-slate-200 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold"
              style={{ backgroundColor: currentUser?.avatarColor || '#6366f1' }}
            >
              {currentUser?.initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-slate-900 dark:text-white text-sm font-semibold truncate">{currentUser?.name}</p>
              <p className="text-slate-500 dark:text-gray-500 text-xs truncate">{currentUser?.college}</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="p-4 space-y-1 overflow-y-auto flex-1">
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
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                    : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon size={18} />
                <span>{item.label}</span>
                {isActive && <ChevronRight size={16} className="ml-auto" />}
              </button>
            )
          })}
        </nav>

        {/* Logout */}
        <div className="p-4 border-t border-slate-200 dark:border-gray-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 transition-colors"
          >
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>

        {/* Close button for mobile */}
        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden absolute top-4 right-4 p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
        >
          <X size={20} className="text-slate-600 dark:text-gray-400" />
        </button>
      </aside>

      {/* Main Content */}
      <main className="lg:ml-64 pt-16 lg:pt-0 min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
