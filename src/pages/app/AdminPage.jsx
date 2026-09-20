import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard,
  Building2,
  Users,
  Flag,
  BarChart3,
  ClipboardCheck,
  UserCog,
  ChevronDown,
  LogOut,
  Menu,
  X,
  ArrowRight,
  ShieldCheck,
  Activity,
  GraduationCap,
  Briefcase,
  AlertTriangle,
  Clock3,
  CheckCircle2,
  Search,
  Filter,
  Eye,
  Power,
  XCircle,
  AlertCircle,
  Plus,
  Moon,
  Sun,
  FileText,
  Trash2,
  Heart,
  MessageSquare,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useSwish } from '../../context/SwishContext'
import { useTheme } from '../../context/ThemeContext'

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001'

const adminCardClass =
  'bg-white/95 dark:bg-gray-900/95 border border-slate-200/80 dark:border-gray-800 rounded-2xl shadow-sm shadow-slate-200/40 dark:shadow-black/20'

const adminInteractiveClass =
  'transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98]'

const adminButtonClass =
  'transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.97] disabled:hover:translate-y-0 disabled:active:scale-100'

const adminInputClass =
  'bg-slate-50/80 dark:bg-gray-950/70 border border-slate-200 dark:border-gray-700 focus:border-indigo-400 dark:focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-950/80 transition-all'

function StatCard({ icon: Icon, label, value, description, iconClass }) {
  return (
    <motion.div
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.985 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className={`${adminCardClass} p-6`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-slate-500 dark:text-gray-400 text-xs font-semibold">
            {label}
          </p>

          <p
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            className="text-slate-950 dark:text-white font-extrabold text-3xl mt-3 tracking-tight"
          >
            {typeof value === 'number' ? value.toLocaleString() : value}
          </p>

          {description && (
            <p className="text-slate-500 dark:text-gray-400 text-xs mt-1.5">
              {description}
            </p>
          )}
        </div>

        <div
          className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${iconClass}`}
        >
          <Icon size={19} className="text-white" />
        </div>
      </div>
    </motion.div>
  )
}

function SidebarItem({
  icon: Icon,
  label,
  active,
  onClick,
  expandable = false,
  expanded = false,
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold ${adminInteractiveClass} ${
        active
          ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 shadow-sm'
          : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800/70 hover:text-slate-900 dark:hover:text-gray-200'
      }`}
    >
      <Icon size={17} />

      <span className="flex-1 text-left">
        {label}
      </span>

      {expandable && (
        <ChevronDown
          size={15}
          className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
        />
      )}
    </button>
  )
}

export default function AdminPage() {
  const navigate = useNavigate()

  const { currentUser: user, authLoading, isAuthenticated } = useSwish()
  const { dark, toggle } = useTheme()

  const [activeSection, setActiveSection] = useState('Dashboard')
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [collegeMenuOpen, setCollegeMenuOpen] = useState(true)


  const [dashboardStats, setDashboardStats] = useState({
    totalColleges: 0,
    activeColleges: 0,
    totalStudents: 0,
    totalFaculty: 0,
    totalCollegeAdmins: 0,
    pendingCollegeRequests: 0,
    activeUsers: 0,
    escalatedReports: 0,
  })
  const [dashboardLoading, setDashboardLoading] = useState(true)
  const [dashboardError, setDashboardError] = useState('')

  // Colleges section state
  const [collegesList, setCollegesList] = useState([])
  const [collegesLoading, setCollegesLoading] = useState(false)
  const [collegesError, setCollegesError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [selectedCollege, setSelectedCollege] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  const loadDashboardStats = async (isRetry = false) => {
    try {
      setDashboardLoading(true)

      const response = await fetch(
        `${API_BASE}/api/admin/dashboard`,
        {
          method: 'GET',
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok || !data.ok) {
        if (!isRetry && response.status === 401) {
          setTimeout(() => loadDashboardStats(true), 500)
          return
        }
        throw new Error(data.error || 'Unable to load dashboard data.')
      }

      setDashboardStats(data.stats)
      setDashboardError('')
    } catch (err) {
      console.error('[Admin Dashboard]', err)
      setDashboardError(err.message || 'Unable to load dashboard data.')
    } finally {
      setDashboardLoading(false)
    }
  }

  const fetchColleges = async (isRetry = false) => {
    try {
      setCollegesLoading(true)

      const response = await fetch(
        `${API_BASE}/api/admin/colleges`,
        {
          method: 'GET',
          credentials: 'include',
        }
      )

      const data = await response.json()

      if (!response.ok || !data.ok) {
        if (!isRetry && response.status === 401) {
          setTimeout(() => fetchColleges(true), 500)
          return
        }
        throw new Error(data.error || 'Unable to load colleges.')
      }

      setCollegesList(data.colleges || [])
      setCollegesError('')
    } catch (err) {
      console.error('[Admin Colleges]', err)
      setCollegesError(err.message || 'Unable to load colleges list.')
    } finally {
      setCollegesLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      loadDashboardStats()
    }
  }, [authLoading, isAuthenticated])

  useEffect(() => {
    if (!authLoading && isAuthenticated && (activeSection === 'Colleges' || activeSection === 'All Colleges')) {
      fetchColleges()
    }
  }, [activeSection, authLoading, isAuthenticated])

  const handleToggleCollegeActive = async (collegeId, currentActive) => {
    try {
      setTogglingId(collegeId)
      const res = await fetch(
        `${API_BASE}/api/admin/colleges/${collegeId}/toggle`,
        {
          method: 'PATCH',
          credentials: 'include',
        }
      )

      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to toggle status.')
      }

      setCollegesList(prev =>
        prev.map(c => (c.id === collegeId ? { ...c, active: !currentActive } : c))
      )
      if (selectedCollege && selectedCollege.id === collegeId) {
        setSelectedCollege(prev => ({ ...prev, active: !currentActive }))
      }
      loadDashboardStats()
    } catch (err) {
      alert(err.message || 'Failed to toggle college status.')
    } finally {
      setTogglingId(null)
    }
  }

  // College Admins section state
  const [collegeAdminsList, setCollegeAdminsList] = useState([])
  const [adminsLoading, setAdminsLoading] = useState(false)
  const [adminsError, setAdminsError] = useState('')
  const [adminSearchQuery, setAdminSearchQuery] = useState('')
  const [adminStatusFilter, setAdminStatusFilter] = useState('All')
  const [selectedAdmin, setSelectedAdmin] = useState(null)
  const [adminTogglingId, setAdminTogglingId] = useState(null)

  // Add College Admin Modal state
  const [showAddAdminModal, setShowAddAdminModal] = useState(false)
  const [addAdminForm, setAddAdminForm] = useState({ collegeId: '', name: '', officialEmail: '', designation: '' })
  const [addAdminLoading, setAddAdminLoading] = useState(false)
  const [addAdminError, setAddAdminError] = useState('')

  // Users section state
  const [usersList, setUsersList] = useState([])
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState('')
  const [userSearchQuery, setUserSearchQuery] = useState('')
  const [userRoleFilter, setUserRoleFilter] = useState('All')
  const [userCollegeFilter, setUserCollegeFilter] = useState('All')
  const [userStatusFilter, setUserStatusFilter] = useState('All')
  const [selectedUser, setSelectedUser] = useState(null)
  const [userTogglingId, setUserTogglingId] = useState(null)

  const fetchCollegeAdmins = async (isRetry = false) => {
    try {
      setAdminsLoading(true)
      const response = await fetch(`${API_BASE}/api/admin/college-admins`, {
        method: 'GET',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        if (!isRetry && response.status === 401) {
          setTimeout(() => fetchCollegeAdmins(true), 500)
          return
        }
        throw new Error(data.error || 'Unable to load college admins.')
      }
      setCollegeAdminsList(data.admins || [])
      setAdminsError('')
    } catch (err) {
      console.error('[Admin College Admins]', err)
      setAdminsError(err.message || 'Unable to load college admins list.')
    } finally {
      setAdminsLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && isAuthenticated && activeSection === 'College Admins') {
      fetchCollegeAdmins()
      if (collegesList.length === 0) fetchColleges()
    }
  }, [activeSection, authLoading, isAuthenticated])

  const handleToggleAdminActive = async (adminId, currentActive) => {
    try {
      setAdminTogglingId(adminId)
      const res = await fetch(`${API_BASE}/api/admin/college-admins/${adminId}/toggle`, {
        method: 'PATCH',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to toggle status.')
      }

      setCollegeAdminsList(prev =>
        prev.map(a => (a.id === adminId ? { ...a, active: !currentActive, deactivated: currentActive } : a))
      )
      if (selectedAdmin && selectedAdmin.id === adminId) {
        setSelectedAdmin(prev => ({ ...prev, active: !currentActive, deactivated: currentActive }))
      }
      loadDashboardStats()
    } catch (err) {
      alert(err.message || 'Failed to toggle admin status.')
    } finally {
      setAdminTogglingId(null)
    }
  }

  const handleProvisionCollegeAdmin = async (e) => {
    e.preventDefault()
    try {
      setAddAdminLoading(true)
      setAddAdminError('')
      const res = await fetch(`${API_BASE}/api/admin/college-admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(addAdminForm),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to provision college admin.')
      }

      setShowAddAdminModal(false)
      setAddAdminForm({ collegeId: '', name: '', officialEmail: '', designation: '' })
      fetchCollegeAdmins()
      loadDashboardStats()
    } catch (err) {
      setAddAdminError(err.message || 'Failed to provision college admin.')
    } finally {
      setAddAdminLoading(false)
    }
  }

  const fetchUsers = async (isRetry = false) => {
    try {
      setUsersLoading(true)
      const response = await fetch(`${API_BASE}/api/admin/users`, {
        method: 'GET',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        if (!isRetry && response.status === 401) {
          setTimeout(() => fetchUsers(true), 500)
          return
        }
        throw new Error(data.error || 'Unable to load users.')
      }
      setUsersList(data.users || [])
      setUsersError('')
    } catch (err) {
      console.error('[Admin Users]', err)
      setUsersError(err.message || 'Unable to load users list.')
    } finally {
      setUsersLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && isAuthenticated && activeSection === 'Users') {
      fetchUsers()
    }
  }, [activeSection, authLoading, isAuthenticated])

  const handleToggleUserActive = async (userId, currentActive) => {
    try {
      setUserTogglingId(userId)
      const res = await fetch(`${API_BASE}/api/admin/users/${userId}/toggle`, {
        method: 'PATCH',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to toggle status.')
      }

      setUsersList(prev =>
        prev.map(u => (u.id === userId ? { ...u, active: !currentActive, deactivated: currentActive } : u))
      )
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => ({ ...prev, active: !currentActive, deactivated: currentActive }))
      }
      loadDashboardStats()
    } catch (err) {
      alert(err.message || 'Failed to toggle user status.')
    } finally {
      setUserTogglingId(null)
    }
  }

  // Posts section state
  const [adminPostsList, setAdminPostsList] = useState([])
  const [postsLoading, setPostsLoading] = useState(false)
  const [postsError, setPostsError] = useState('')
  const [postSearchQuery, setPostSearchQuery] = useState('')
  const [deletingPostId, setDeletingPostId] = useState(null)

  const fetchAdminPosts = async (isRetry = false) => {
    try {
      setPostsLoading(true)
      const response = await fetch(`${API_BASE}/api/posts`, {
        method: 'GET',
        credentials: 'include',
      })
      const data = await response.json()
      if (!response.ok || !data.ok) {
        if (!isRetry && response.status === 401) {
          setTimeout(() => fetchAdminPosts(true), 500)
          return
        }
        throw new Error(data.error || 'Unable to load posts.')
      }
      setAdminPostsList(data.posts || [])
      setPostsError('')
    } catch (err) {
      console.error('[Admin Posts]', err)
      setPostsError(err.message || 'Unable to load posts list.')
    } finally {
      setPostsLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading && isAuthenticated && activeSection === 'Posts') {
      fetchAdminPosts()
    }
  }, [activeSection, authLoading, isAuthenticated])

  const handleDeletePost = async (postId) => {
    if (!window.confirm('Are you sure you want to delete this post? This action cannot be undone.')) return
    try {
      setDeletingPostId(postId)
      const res = await fetch(`${API_BASE}/api/posts/${postId}`, {
        method: 'DELETE',
        credentials: 'include',
      })
      const data = await res.json()
      if (!res.ok || !data.ok) {
        throw new Error(data.error || 'Failed to delete post.')
      }
      setAdminPostsList(prev => prev.filter(p => (p.id !== postId && p._id !== postId)))
    } catch (err) {
      alert(err.message || 'Failed to delete post.')
    } finally {
      setDeletingPostId(null)
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Current data available from SwishContext.
  // These are used only for the initial dashboard UI.
  // ─────────────────────────────────────────────────────────────────────────

  const navigateSection = section => {
    setActiveSection(section)
    setMobileSidebarOpen(false)
  }

  const sidebar = (
    <aside className="w-64 h-full bg-white dark:bg-gray-950 border-r border-slate-200/80 dark:border-gray-800 flex flex-col shadow-sm shadow-slate-200/60 dark:shadow-black/20">
      {/* Logo */}
      <div className="h-16 px-5 flex items-center border-b border-slate-100 dark:border-gray-800">
        <button
          onClick={() => navigate('/')}
          className={`flex items-center gap-2.5 ${adminInteractiveClass}`}
        >
          <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm shadow-indigo-200 dark:shadow-none">
            <ShieldCheck size={19} className="text-white" />
          </div>

          <div className="text-left">
            <p
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
              className="font-extrabold text-slate-900 dark:text-white text-base"
            >
              SWISH
            </p>

            <p className="text-[10px] text-slate-400 dark:text-gray-500 font-medium">
              MAIN ADMIN
            </p>
          </div>
        </button>
      </div>

      {/* Navigation */}
      <div className="flex-1 px-3 py-5 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-600">
          Platform
        </p>

        <nav className="space-y-1">
          <SidebarItem
            icon={LayoutDashboard}
            label="Dashboard"
            active={activeSection === 'Dashboard'}
            onClick={() => navigateSection('Dashboard')}
          />

          {/* Colleges */}
          <SidebarItem
            icon={Building2}
            label="Colleges"
            active={activeSection === 'Colleges'}
            expandable
            expanded={collegeMenuOpen}
            onClick={() => {
              setCollegeMenuOpen(value => !value)
              navigateSection('Colleges')
            }}
          />

          {collegeMenuOpen && (
            <div className="ml-7 pl-3 border-l border-slate-200 dark:border-gray-800 space-y-1">
              <button
                onClick={() => navigateSection('All Colleges')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${adminInteractiveClass} ${
                  activeSection === 'All Colleges'
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800/70'
                }`}
              >
                All Colleges
              </button>

              <button
                onClick={() => navigate('/admin/pending-requests')}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold ${adminInteractiveClass} ${
                  activeSection === 'Pending Requests'
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800/70'
                }`}
              >
                <span>Pending Requests</span>

                {dashboardStats.pendingCollegeRequests > 0 && (
                  <span className="min-w-5 h-5 px-1.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 text-[10px] font-bold flex items-center justify-center">
                    {dashboardStats.pendingCollegeRequests}
                  </span>
                )}
              </button>

              <button
                onClick={() => navigateSection('College Admins')}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold ${adminInteractiveClass} ${
                  activeSection === 'College Admins'
                    ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40'
                    : 'text-slate-500 dark:text-gray-500 hover:text-slate-800 dark:hover:text-gray-300 hover:bg-slate-50 dark:hover:bg-gray-800/70'
                }`}
              >
                College Admins
              </button>
            </div>
          )}

          <SidebarItem
            icon={Users}
            label="Users"
            active={activeSection === 'Users'}
            onClick={() => navigateSection('Users')}
          />

          <SidebarItem
            icon={FileText}
            label="All Posts"
            active={activeSection === 'Posts'}
            onClick={() => navigateSection('Posts')}
          />

          <SidebarItem
            icon={Flag}
            label="Reports"
            active={activeSection === 'Reports'}
            onClick={() => navigateSection('Reports')}
          />

          <SidebarItem
            icon={BarChart3}
            label="Analytics"
            active={activeSection === 'Analytics'}
            onClick={() => navigateSection('Analytics')}
          />
        </nav>
      </div>

      {/* Bottom profile */}
      <div className="border-t border-slate-100 dark:border-gray-800 p-3">
        <button
          onClick={() => navigateSection('Profile')}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-gray-800 ${adminInteractiveClass}`}
        >
          <div className="w-9 h-9 rounded-full bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 flex items-center justify-center text-xs font-bold">
            {user?.initials || 'A'}
          </div>

          <div className="min-w-0 flex-1 text-left">
            <p className="text-slate-800 dark:text-gray-200 text-xs font-semibold truncate">
              {user?.name || 'Main Admin'}
            </p>

            <p className="text-slate-400 dark:text-gray-500 text-[10px] truncate">
              Main Admin
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={toggle}
          aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          className={`w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-xl text-xs font-semibold text-slate-500 dark:text-gray-500 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-white ${adminInteractiveClass}`}
        >
          {dark ? (
            <Sun size={15} className="text-amber-500" />
          ) : (
            <Moon size={15} className="text-slate-500" />
          )}
          {dark ? 'Light Mode' : 'Dark Mode'}
        </button>

        <button
          onClick={() => navigate('/')}
          className={`w-full flex items-center gap-2 px-3 py-2 mt-1 rounded-xl text-xs font-semibold text-slate-500 dark:text-gray-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 hover:text-rose-600 dark:hover:text-rose-400 ${adminInteractiveClass}`}
        >
          <LogOut size={15} />
          Logout
        </button>
      </div>
    </aside>
  )

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-950 text-slate-900 dark:text-white flex">
      {/* Desktop sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 z-40">
        {sidebar}
      </div>

      {/* Mobile sidebar */}
      {mobileSidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />

          <div className="fixed inset-y-0 left-0 z-50 lg:hidden">
            {sidebar}
          </div>
        </>
      )}

      {/* Main content */}
      <main className="flex-1 min-w-0 lg:ml-64">
        {/* Top bar */}
        <header className="h-16 bg-white/90 dark:bg-gray-950/90 backdrop-blur border-b border-slate-200/80 dark:border-gray-800 flex items-center justify-between px-4 sm:px-6 lg:px-8 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileSidebarOpen(true)}
              className={`lg:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-gray-800 ${adminButtonClass}`}
            >
              <Menu size={20} />
            </button>

            <div>
              <p className="text-slate-400 dark:text-gray-500 text-[11px] font-medium">
                Main Administration
              </p>

              <h1
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="text-slate-900 dark:text-white text-lg font-bold"
              >
                {activeSection === 'Dashboard'
                  ? 'Dashboard'
                  : activeSection}
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-gray-400 bg-slate-100/70 dark:bg-gray-900 border border-slate-200/70 dark:border-gray-800 rounded-full px-3 py-1.5">
            <Activity size={14} />
            Platform Overview
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {activeSection === 'Dashboard' ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Welcome */}
              <div>
                <h2
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  className="text-2xl font-extrabold text-slate-900 dark:text-white"
                >
                  Welcome back, {user?.name || 'Main Admin'}
                </h2>

                <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
                  Here's what's happening across the SWISH platform.
                </p>
              </div>

           {/* KPI Cards */}

{dashboardError && (
  <div className="bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-xl px-4 py-3 text-sm text-rose-700 dark:text-rose-300 mb-4">
    {dashboardError}
  </div>
)}

<div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
  {dashboardLoading ? (
    <>
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className={`${adminCardClass} p-6 animate-pulse`}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="h-3 w-24 bg-slate-200 dark:bg-gray-800 rounded mb-3" />
              <div className="h-7 w-16 bg-slate-200 dark:bg-gray-800 rounded" />
              <div className="h-2.5 w-28 bg-slate-200 dark:bg-gray-800 rounded mt-3" />
            </div>

            <div className="w-10 h-10 bg-slate-200 dark:bg-gray-800 rounded-xl" />
          </div>
        </div>
      ))}
    </>
  ) : (
    <>
      <StatCard
        icon={Building2}
        label="Total Colleges"
        value={dashboardStats.totalColleges}
        description="Registered on SWISH"
        iconClass="bg-indigo-500"
      />

      <StatCard
        icon={CheckCircle2}
        label="Active Colleges"
        value={dashboardStats.activeColleges}
        description="Currently active"
        iconClass="bg-emerald-500"
      />

      <StatCard
        icon={GraduationCap}
        label="Total Students"
        value={dashboardStats.totalStudents}
        description="Across all colleges"
        iconClass="bg-sky-500"
      />

      <StatCard
        icon={Briefcase}
        label="Total Faculty"
        value={dashboardStats.totalFaculty}
        description="Across all colleges"
        iconClass="bg-violet-500"
      />

      <StatCard
        icon={UserCog}
        label="Total College Admins"
        value={dashboardStats.totalCollegeAdmins}
        description="Campus administrators"
        iconClass="bg-purple-500"
      />

      <StatCard
        icon={ClipboardCheck}
        label="Pending Requests"
        value={dashboardStats.pendingCollegeRequests}
        description="Awaiting review"
        iconClass="bg-amber-500"
      />

      <StatCard
        icon={Users}
        label="Active Users"
        value={dashboardStats.activeUsers}
        description="Currently active accounts"
        iconClass="bg-indigo-500"
      />

      <StatCard
        icon={AlertTriangle}
        label="Escalated Reports"
        value={dashboardStats.escalatedReports}
        description="Require attention"
        iconClass="bg-rose-500"
      />
    </>
  )}
</div>
              {/* Activity + Pending requests */}
              <div className="grid lg:grid-cols-[1.6fr_1fr] gap-6">
                {/* Platform Activity */}
                <section className={`${adminCardClass} p-6`}>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-slate-900 dark:text-white text-sm font-bold">
                        Platform Activity
                      </h3>
                      <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">
                        Growth and activity overview
                      </p>
                    </div>

                    <span className="text-xs font-medium text-slate-500 dark:text-gray-400">
                      Last 30 days
                    </span>
                  </div>

                  {/* Chart placeholder */}
                  <div className="h-64 rounded-2xl bg-slate-50/80 dark:bg-gray-800/60 border border-slate-100 dark:border-gray-800 flex items-center justify-center">
                    <div className="text-center">
                      <BarChart3
                        size={30}
                        className="text-slate-300 dark:text-gray-600 mx-auto mb-2"
                      />

                      <p className="text-slate-500 dark:text-gray-400 text-sm font-medium">
                        Platform activity chart
                      </p>

                      <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">
                        Growth analytics will appear here
                      </p>
                    </div>
                  </div>
                </section>

                {/* Pending requests */}
                <section className={`${adminCardClass} p-6`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-slate-900 dark:text-white text-sm font-bold">
                        Pending College Requests
                      </h3>

                      <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">
                        Applications awaiting verification
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex items-center justify-center">
                      <Clock3
                        size={17}
                        className="text-amber-600 dark:text-amber-400"
                      />
                    </div>
                  </div>

                  <div className="mt-8">
                    <p
                      style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                      className="text-4xl font-extrabold text-slate-900 dark:text-white"
                    >
                      {dashboardStats.pendingCollegeRequests}
                    </p>

                    <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">
                      Requests need your attention
                    </p>
                  </div>

                  <button
                    onClick={() => navigate('/admin/pending-requests')}
                    className={`mt-7 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none ${adminButtonClass}`}
                  >
                    Review Requests
                    <ArrowRight size={14} />
                  </button>
                </section>
              </div>

              {/* Reports + Recent activity */}
              <div className="grid lg:grid-cols-2 gap-6">
                {/* Escalated reports */}
                <section className={`${adminCardClass} p-6`}>
                  <div className="flex items-start justify-between gap-3 mb-5">
                    <div>
                      <h3 className="text-slate-900 dark:text-white text-sm font-bold">
                        Escalated Reports
                      </h3>

                      <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">
                        Serious issues requiring Main Admin attention
                      </p>
                    </div>

                    <div className="w-9 h-9 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center">
                      <Flag
                        size={17}
                        className="text-rose-600 dark:text-rose-400"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div>
                      <p
                        style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                        className="text-3xl font-extrabold text-slate-900 dark:text-white"
                      >
                        {dashboardStats.escalatedReports}
                      </p>

                      <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">
                        Open escalated reports
                      </p>
                    </div>

                    <div className="h-10 w-px bg-slate-200 dark:bg-gray-800" />

                    <div>
                      <p className="text-rose-600 dark:text-rose-400 font-bold text-lg">
                        —
                      </p>

                      <p className="text-slate-400 dark:text-gray-500 text-xs">
                        Critical
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => navigateSection('Reports')}
                    className={`mt-6 flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 text-xs font-semibold hover:text-indigo-700 ${adminButtonClass}`}
                  >
                    View Reports
                    <ArrowRight size={13} />
                  </button>
                </section>

                {/* Recent activity */}
                <section className={`${adminCardClass} p-6`}>
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-slate-900 dark:text-white text-sm font-bold">
                        Recent Platform Activity
                      </h3>

                      <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">
                        Important administrative events
                      </p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center flex-shrink-0">
                        <Building2
                          size={15}
                          className="text-indigo-600 dark:text-indigo-400"
                        />
                      </div>

                      <div>
                        <p className="text-slate-700 dark:text-gray-300 text-xs font-medium">
                          College onboarding activity
                        </p>

                        <p className="text-slate-400 dark:text-gray-500 text-[11px] mt-0.5">
                          Recent registration activity will appear here.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center flex-shrink-0">
                        <UserCog
                          size={15}
                          className="text-emerald-600 dark:text-emerald-400"
                        />
                      </div>

                      <div>
                        <p className="text-slate-700 dark:text-gray-300 text-xs font-medium">
                          Administrative activity
                        </p>

                        <p className="text-slate-400 dark:text-gray-500 text-[11px] mt-0.5">
                          Important platform actions will appear here.
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-rose-50 dark:bg-rose-950/40 flex items-center justify-center flex-shrink-0">
                        <Flag
                          size={15}
                          className="text-rose-600 dark:text-rose-400"
                        />
                      </div>

                      <div>
                        <p className="text-slate-700 dark:text-gray-300 text-xs font-medium">
                          Report activity
                        </p>

                        <p className="text-slate-400 dark:text-gray-500 text-[11px] mt-0.5">
                          Escalations and resolutions will appear here.
                        </p>
                      </div>
                    </div>
                  </div>
                </section>
              </div>
            </motion.div>
          ) : activeSection === 'Colleges' || activeSection === 'All Colleges' ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header + description */}
              <div>
                <h2
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  className="text-2xl font-extrabold text-slate-900 dark:text-white"
                >
                  All Colleges
                </h2>
                <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
                  Manage registered institutions, view activity, and control campus access on SWISH.
                </p>
              </div>

              {/* Summary cards: Total Colleges, Active Colleges, Inactive Colleges */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  icon={Building2}
                  label="Total Colleges"
                  value={collegesList.length}
                  description="Registered institutions"
                  iconClass="bg-indigo-500"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Active Colleges"
                  value={collegesList.filter(c => c.active).length}
                  description="Campus access active"
                  iconClass="bg-emerald-500"
                />
                <StatCard
                  icon={XCircle}
                  label="Inactive Colleges"
                  value={collegesList.filter(c => !c.active).length}
                  description="Campus access disabled"
                  iconClass="bg-rose-500"
                />
              </div>

              {/* Search + Status filter */}
              <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${adminCardClass} p-4`}>
                <div className="relative w-full sm:w-80">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500"
                  />
                  <input
                    type="text"
                    placeholder="Search by name, code, domain..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none ${adminInputClass}`}
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  {['All', 'Active', 'Inactive'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setStatusFilter(tab)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold ${adminButtonClass} ${
                        statusFilter === tab
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* College Table */}
              <div className={`${adminCardClass} overflow-hidden`}>
                {collegesError && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs">
                    {collegesError}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                        <th className="py-3.5 px-4">College</th>
                        <th className="py-3.5 px-4">Domain</th>
                        <th className="py-3.5 px-4">College Admin</th>
                        <th className="py-3.5 px-4">Users</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-800 text-xs">
                      {collegesLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="py-4 px-4"><div className="h-4 w-36 bg-slate-200 dark:bg-gray-800 rounded" /></td>
                            <td className="py-4 px-4"><div className="h-4 w-24 bg-slate-200 dark:bg-gray-800 rounded" /></td>
                            <td className="py-4 px-4"><div className="h-4 w-28 bg-slate-200 dark:bg-gray-800 rounded" /></td>
                            <td className="py-4 px-4"><div className="h-4 w-12 bg-slate-200 dark:bg-gray-800 rounded" /></td>
                            <td className="py-4 px-4"><div className="h-4 w-16 bg-slate-200 dark:bg-gray-800 rounded" /></td>
                            <td className="py-4 px-4"><div className="h-4 w-20 bg-slate-200 dark:bg-gray-800 rounded ml-auto" /></td>
                          </tr>
                        ))
                      ) : collegesList.filter(c => {
                          const q = searchQuery.toLowerCase()
                          const matches = c.name.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q) || (c.code && c.code.toLowerCase().includes(q))
                          const matchesStatus = statusFilter === 'All' ? true : statusFilter === 'Active' ? c.active : !c.active
                          return matches && matchesStatus
                        }).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-gray-500">
                            No colleges found matching criteria.
                          </td>
                        </tr>
                      ) : (
                        collegesList
                          .filter(c => {
                            const q = searchQuery.toLowerCase()
                            const matches = c.name.toLowerCase().includes(q) || c.domain.toLowerCase().includes(q) || (c.code && c.code.toLowerCase().includes(q))
                            const matchesStatus = statusFilter === 'All' ? true : statusFilter === 'Active' ? c.active : !c.active
                            return matches && matchesStatus
                          })
                          .map(college => (
                            <tr key={college.id} className="hover:bg-slate-50/60 dark:hover:bg-gray-800/30 transition-colors">
                              {/* College Info */}
                              <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                                <div className="flex items-center gap-2">
                                  <span>{college.name}</span>
                                  {college.code && (
                                    <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 rounded">
                                      {college.code}
                                    </span>
                                  )}
                                </div>
                                {college.location && (
                                  <p className="text-[11px] text-slate-400 dark:text-gray-500 font-normal">
                                    {college.location}
                                  </p>
                                )}
                              </td>

                              {/* Domain */}
                              <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-gray-300">
                                @{college.domain}
                              </td>

                              {/* College Admin */}
                              <td className="py-3.5 px-4">
                                {college.collegeAdmin ? (
                                  <div>
                                    <p className="font-semibold text-slate-800 dark:text-gray-200">{college.collegeAdmin.name}</p>
                                    <p className="text-[11px] text-slate-400 dark:text-gray-500">{college.collegeAdmin.email}</p>
                                  </div>
                                ) : (
                                  <span className="text-slate-400 dark:text-gray-500 italic">Not Assigned</span>
                                )}
                              </td>

                              {/* Users */}
                              <td className="py-3.5 px-4 text-slate-700 dark:text-gray-300">
                                <span className="font-bold">{college.stats?.totalUsers || 0}</span>
                                <span className="text-[11px] text-slate-400 dark:text-gray-500 block">
                                  {college.stats?.students || 0} S · {college.stats?.faculty || 0} F
                                </span>
                              </td>

                              {/* Status */}
                              <td className="py-3.5 px-4">
                                {college.active ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    Inactive
                                  </span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 text-right space-x-2">
                                <button
                                  onClick={() => setSelectedCollege(college)}
                                  className={`px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg ${adminButtonClass}`}
                                >
                                  View Details
                                </button>

                                <button
                                  disabled={togglingId === college.id}
                                  onClick={() => handleToggleCollegeActive(college.id, college.active)}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${adminButtonClass} ${
                                    college.active
                                      ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900'
                                      : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900'
                                  }`}
                                >
                                  {togglingId === college.id
                                    ? 'Updating...'
                                    : college.active
                                    ? 'Deactivate College'
                                    : 'Activate College'}
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : activeSection === 'College Admins' ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header + description + Add button */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2
                    style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                    className="text-2xl font-extrabold text-slate-900 dark:text-white"
                  >
                    College Admins
                  </h2>
                  <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
                    Manage campus administrator accounts, access status, and college assignments.
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (collegesList.length === 0) fetchColleges()
                    setShowAddAdminModal(true)
                  }}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none self-start sm:self-auto ${adminButtonClass}`}
                >
                  <Plus size={15} />
                  Add College Admin
                </button>
              </div>

              {/* Summary cards: Total Admins, Active Admins, Inactive Admins */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard
                  icon={UserCog}
                  label="Total Admins"
                  value={collegeAdminsList.length}
                  description="College Administrators"
                  iconClass="bg-indigo-500"
                />
                <StatCard
                  icon={CheckCircle2}
                  label="Active Admins"
                  value={collegeAdminsList.filter(a => a.active).length}
                  description="Accounts active"
                  iconClass="bg-emerald-500"
                />
                <StatCard
                  icon={XCircle}
                  label="Inactive Admins"
                  value={collegeAdminsList.filter(a => !a.active).length}
                  description="Accounts deactivated"
                  iconClass="bg-rose-500"
                />
              </div>

              {/* Search + Status filter */}
              <div className={`flex flex-col sm:flex-row items-center justify-between gap-4 ${adminCardClass} p-4`}>
                <div className="relative w-full sm:w-80">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500"
                  />
                  <input
                    type="text"
                    placeholder="Search by name, email, or college..."
                    value={adminSearchQuery}
                    onChange={e => setAdminSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none ${adminInputClass}`}
                  />
                </div>

                <div className="flex items-center gap-1.5 w-full sm:w-auto">
                  {['All', 'Active', 'Inactive'].map(tab => (
                    <button
                      key={tab}
                      onClick={() => setAdminStatusFilter(tab)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold ${adminButtonClass} ${
                        adminStatusFilter === tab
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className={`${adminCardClass} overflow-hidden`}>
                {adminsError && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs">
                    {adminsError}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                        <th className="py-3.5 px-4">Admin</th>
                        <th className="py-3.5 px-4">College</th>
                        <th className="py-3.5 px-4">Official Email</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-800 text-xs">
                      {adminsLoading ? (
                        Array.from({ length: 4 }).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="py-4 px-4"><div className="h-4 w-32 bg-slate-200 dark:bg-gray-800 rounded" /></td>
                            <td className="py-4 px-4"><div className="h-4 w-36 bg-slate-200 dark:bg-gray-800 rounded" /></td>
                            <td className="py-4 px-4"><div className="h-4 w-40 bg-slate-200 dark:bg-gray-800 rounded" /></td>
                            <td className="py-4 px-4"><div className="h-4 w-16 bg-slate-200 dark:bg-gray-800 rounded" /></td>
                            <td className="py-4 px-4"><div className="h-4 w-24 bg-slate-200 dark:bg-gray-800 rounded ml-auto" /></td>
                          </tr>
                        ))
                      ) : collegeAdminsList.filter(a => {
                          const q = adminSearchQuery.toLowerCase()
                          const matches =
                            a.name.toLowerCase().includes(q) ||
                            a.email.toLowerCase().includes(q) ||
                            (a.college?.name && a.college.name.toLowerCase().includes(q)) ||
                            (a.college?.domain && a.college.domain.toLowerCase().includes(q))
                          const matchesStatus =
                            adminStatusFilter === 'All' ? true : adminStatusFilter === 'Active' ? a.active : !a.active
                          return matches && matchesStatus
                        }).length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-12 text-center text-slate-400 dark:text-gray-500">
                            No college admins found matching criteria.
                          </td>
                        </tr>
                      ) : (
                        collegeAdminsList
                          .filter(a => {
                            const q = adminSearchQuery.toLowerCase()
                            const matches =
                              a.name.toLowerCase().includes(q) ||
                              a.email.toLowerCase().includes(q) ||
                              (a.college?.name && a.college.name.toLowerCase().includes(q)) ||
                              (a.college?.domain && a.college.domain.toLowerCase().includes(q))
                            const matchesStatus =
                              adminStatusFilter === 'All' ? true : adminStatusFilter === 'Active' ? a.active : !a.active
                            return matches && matchesStatus
                          })
                          .map(admin => (
                            <tr key={admin.id} className="hover:bg-slate-50/60 dark:hover:bg-gray-800/30 transition-colors">
                              {/* Admin */}
                              <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-white">
                                <p className="font-semibold text-slate-900 dark:text-white">{admin.name}</p>
                                {admin.designation && (
                                  <p className="text-[11px] text-slate-400 dark:text-gray-500 font-normal">
                                    {admin.designation}
                                  </p>
                                )}
                              </td>

                              {/* College */}
                              <td className="py-3.5 px-4 text-slate-700 dark:text-gray-300">
                                {admin.college ? (
                                  <div className="flex items-center gap-2">
                                    <span>{admin.college.name}</span>
                                    {admin.college.code && (
                                      <span className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 rounded">
                                        {admin.college.code}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-slate-400 dark:text-gray-500 italic">Not Assigned</span>
                                )}
                              </td>

                              {/* Official Email */}
                              <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-gray-300">
                                {admin.email}
                              </td>

                              {/* Status */}
                              <td className="py-3.5 px-4">
                                {admin.active ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    Active
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                    Inactive
                                  </span>
                                )}
                              </td>

                              {/* Action */}
                              <td className="py-3.5 px-4 text-right space-x-2">
                                <button
                                  onClick={() => setSelectedAdmin(admin)}
                                  className={`px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg ${adminButtonClass}`}
                                >
                                  View
                                </button>

                                <button
                                  disabled={adminTogglingId === admin.id}
                                  onClick={() => handleToggleAdminActive(admin.id, admin.active)}
                                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg ${adminButtonClass} ${
                                    admin.active
                                      ? 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 border border-rose-200 dark:border-rose-900'
                                      : 'text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-900'
                                  }`}
                                >
                                  {adminTogglingId === admin.id
                                    ? 'Updating...'
                                    : admin.active
                                    ? 'Deactivate Admin'
                                    : 'Activate Admin'}
                                </button>
                              </td>
                            </tr>
                          ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : activeSection === 'Users' ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header */}
              <div>
                <h2
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  className="text-2xl font-extrabold text-slate-900 dark:text-white"
                >
                  Users
                </h2>
                <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
                  Manage all student, faculty, and college admin accounts on SWISH.
                </p>
              </div>

              {/* Summary cards */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                  icon={Users}
                  label="Total Users"
                  value={usersList.length}
                  description="All non-admin accounts"
                  iconClass="bg-indigo-500"
                />
                <StatCard
                  icon={GraduationCap}
                  label="Students"
                  value={usersList.filter(u => u.role === 'student').length}
                  description="Student accounts"
                  iconClass="bg-sky-500"
                />
                <StatCard
                  icon={Briefcase}
                  label="Faculty"
                  value={usersList.filter(u => u.role === 'faculty').length}
                  description="Faculty accounts"
                  iconClass="bg-violet-500"
                />
                <StatCard
                  icon={UserCog}
                  label="College Admins"
                  value={usersList.filter(u => u.role === 'college_admin').length}
                  description="Campus administrators"
                  iconClass="bg-purple-500"
                />
              </div>

              {/* Search + Filters */}
              <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 ${adminCardClass} p-4`}>
                {/* Search */}
                <div className="relative w-full sm:w-72">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500"
                  />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={userSearchQuery}
                    onChange={e => setUserSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none ${adminInputClass}`}
                  />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  {/* Role filter */}
                  <div className="flex items-center gap-1.5">
                    <Filter size={13} className="text-slate-400 dark:text-gray-500" />
                    <span className="text-[11px] font-medium text-slate-500 dark:text-gray-400 mr-0.5">Role:</span>
                    {['All', 'student', 'faculty', 'college_admin'].map(role => (
                      <button
                        key={role}
                        onClick={() => setUserRoleFilter(role)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${adminButtonClass} ${
                          userRoleFilter === role
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {role === 'college_admin' ? 'Admin' : role === 'All' ? 'All' : role.charAt(0).toUpperCase() + role.slice(1)}
                      </button>
                    ))}
                  </div>

                  {/* Status filter */}
                  <div className="flex items-center gap-1.5 ml-1">
                    <span className="text-[11px] font-medium text-slate-500 dark:text-gray-400 mr-0.5">Status:</span>
                    {['All', 'Active', 'Inactive'].map(s => (
                      <button
                        key={s}
                        onClick={() => setUserStatusFilter(s)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${adminButtonClass} ${
                          userStatusFilter === s
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-400 hover:bg-slate-200 dark:hover:bg-gray-700'
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>

                  {/* College filter */}
                  <select
                    value={userCollegeFilter}
                    onChange={e => setUserCollegeFilter(e.target.value)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium text-slate-600 dark:text-gray-400 focus:outline-none ml-1 ${adminInputClass}`}
                  >
                    <option value="All">All Colleges</option>
                    {[...new Set(usersList.filter(u => u.college?.name).map(u => u.college.name))].sort().map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Users Table */}
              <div className={`${adminCardClass} overflow-hidden`}>
                {usersError && (
                  <div className="p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs">
                    {usersError}
                  </div>
                )}

                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-800/40 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-gray-400">
                        <th className="py-3.5 px-4">User</th>
                        <th className="py-3.5 px-4">Role</th>
                        <th className="py-3.5 px-4">College</th>
                        <th className="py-3.5 px-4">Email</th>
                        <th className="py-3.5 px-4">Status</th>
                        <th className="py-3.5 px-4 text-right">View</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-gray-800 text-xs">
                      {usersLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                          <tr key={i} className="animate-pulse">
                            <td className="py-4 px-4"><div className="h-4 w-32 bg-slate-200 dark:bg-gray-800 rounded" /></td>
                            <td className="py-4 px-4"><div className="h-4 w-20 bg-slate-200 dark:bg-gray-800 rounded" /></td>
                            <td className="py-4 px-4"><div className="h-4 w-36 bg-slate-200 dark:bg-gray-800 rounded" /></td>
                            <td className="py-4 px-4"><div className="h-4 w-40 bg-slate-200 dark:bg-gray-800 rounded" /></td>
                            <td className="py-4 px-4"><div className="h-4 w-16 bg-slate-200 dark:bg-gray-800 rounded" /></td>
                            <td className="py-4 px-4"><div className="h-4 w-12 bg-slate-200 dark:bg-gray-800 rounded ml-auto" /></td>
                          </tr>
                        ))
                      ) : (() => {
                        const filtered = usersList.filter(u => {
                          const q = userSearchQuery.toLowerCase()
                          const matchesSearch = u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
                          const matchesRole = userRoleFilter === 'All' || u.role === userRoleFilter
                          const matchesStatus = userStatusFilter === 'All' ? true : userStatusFilter === 'Active' ? u.active : !u.active
                          const matchesCollege = userCollegeFilter === 'All' || (u.college?.name === userCollegeFilter)
                          return matchesSearch && matchesRole && matchesStatus && matchesCollege
                        })

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={6} className="py-12 text-center text-slate-400 dark:text-gray-500">
                                No users found matching the selected filters.
                              </td>
                            </tr>
                          )
                        }

                        return filtered.map(u => (
                          <tr key={u.id} className="hover:bg-slate-50/60 dark:hover:bg-gray-800/30 transition-colors">
                            {/* User */}
                            <td className="py-3.5 px-4">
                              <p className="font-semibold text-slate-900 dark:text-white">{u.name}</p>
                              {(u.designation || u.dept) && (
                                <p className="text-[11px] text-slate-400 dark:text-gray-500 font-normal">
                                  {u.designation || u.dept}
                                </p>
                              )}
                            </td>

                            {/* Role */}
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                u.role === 'student'
                                  ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                                  : u.role === 'faculty'
                                  ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                                  : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                              }`}>
                                {u.role === 'college_admin' ? 'College Admin' : u.role.charAt(0).toUpperCase() + u.role.slice(1)}
                              </span>
                            </td>

                            {/* College */}
                            <td className="py-3.5 px-4 text-slate-700 dark:text-gray-300">
                              {u.college ? (
                                <span>{u.college.name}</span>
                              ) : (
                                <span className="text-slate-400 dark:text-gray-500 italic">—</span>
                              )}
                            </td>

                            {/* Email */}
                            <td className="py-3.5 px-4 font-mono text-slate-600 dark:text-gray-300">
                              {u.email}
                            </td>

                            {/* Status */}
                            <td className="py-3.5 px-4">
                              {u.active ? (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                  Active
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800">
                                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                  Inactive
                                </span>
                              )}
                            </td>

                            {/* View */}
                            <td className="py-3.5 px-4 text-right">
                              <button
                                onClick={() => setSelectedUser(u)}
                                className={`px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg ${adminButtonClass}`}
                              >
                                View
                              </button>
                            </td>
                          </tr>
                        ))
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          ) : activeSection === 'Posts' ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Header */}
              <div>
                <h2
                  style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                  className="text-2xl font-extrabold text-slate-900 dark:text-white"
                >
                  All Posts
                </h2>
                <p className="text-slate-500 dark:text-gray-400 text-sm mt-1">
                  Review, monitor, and moderate user posts across all campuses.
                </p>
              </div>

              {/* Summary stats */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <StatCard
                  icon={FileText}
                  label="Total Posts"
                  value={adminPostsList.length}
                  description="Across all campuses"
                  iconClass="bg-indigo-500"
                />
                <StatCard
                  icon={Eye}
                  label="Posts with Media"
                  value={adminPostsList.filter(p => p.imageUrl).length}
                  description="Photos / Media attached"
                  iconClass="bg-sky-500"
                />
                <StatCard
                  icon={Heart}
                  label="Total Likes"
                  value={adminPostsList.reduce((acc, p) => acc + (p.likeCount || p.likes || 0), 0)}
                  description="Platform reactions"
                  iconClass="bg-rose-500"
                />
                <StatCard
                  icon={MessageSquare}
                  label="Total Comments"
                  value={adminPostsList.reduce((acc, p) => acc + (p.commentCount || 0), 0)}
                  description="Discussion threads"
                  iconClass="bg-violet-500"
                />
              </div>

              {/* Search */}
              <div className={`flex flex-col sm:flex-row items-center justify-between gap-3 ${adminCardClass} p-4`}>
                <div className="relative w-full sm:w-80">
                  <Search
                    size={16}
                    className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500"
                  />
                  <input
                    type="text"
                    placeholder="Search by caption, author name, or username..."
                    value={postSearchQuery}
                    onChange={e => setPostSearchQuery(e.target.value)}
                    className={`w-full pl-10 pr-4 py-2.5 rounded-xl text-xs font-medium text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none ${adminInputClass}`}
                  />
                </div>
                <div className="text-xs text-slate-400 dark:text-gray-500 font-medium">
                  Showing {adminPostsList.filter(p => {
                    const q = postSearchQuery.toLowerCase()
                    return (
                      (p.caption && p.caption.toLowerCase().includes(q)) ||
                      (p.user?.name && p.user.name.toLowerCase().includes(q)) ||
                      (p.user?.username && p.user.username.toLowerCase().includes(q))
                    )
                  }).length} posts
                </div>
              </div>

              {/* Posts Feed / List */}
              {postsError && (
                <div className="p-4 bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-300 text-xs rounded-xl border border-rose-200 dark:border-rose-800">
                  {postsError}
                </div>
              )}

              {postsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className={`${adminCardClass} p-5 animate-pulse space-y-3`}>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-gray-800" />
                        <div className="space-y-1.5 flex-1">
                          <div className="h-4 w-32 bg-slate-200 dark:bg-gray-800 rounded" />
                          <div className="h-3 w-20 bg-slate-200 dark:bg-gray-800 rounded" />
                        </div>
                      </div>
                      <div className="h-4 w-3/4 bg-slate-200 dark:bg-gray-800 rounded" />
                    </div>
                  ))}
                </div>
              ) : adminPostsList.filter(p => {
                  const q = postSearchQuery.toLowerCase()
                  return (
                    (p.caption && p.caption.toLowerCase().includes(q)) ||
                    (p.user?.name && p.user.name.toLowerCase().includes(q)) ||
                    (p.user?.username && p.user.username.toLowerCase().includes(q))
                  )
                }).length === 0 ? (
                <div className={`${adminCardClass} py-16 text-center text-slate-400 dark:text-gray-500`}>
                  <FileText size={36} className="mx-auto mb-2 text-slate-300 dark:text-gray-600" />
                  <p className="font-semibold text-sm">No posts found</p>
                  <p className="text-xs mt-1">No posts match the search query.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {adminPostsList
                    .filter(p => {
                      const q = postSearchQuery.toLowerCase()
                      return (
                        (p.caption && p.caption.toLowerCase().includes(q)) ||
                        (p.user?.name && p.user.name.toLowerCase().includes(q)) ||
                        (p.user?.username && p.user.username.toLowerCase().includes(q))
                      )
                    })
                    .map(p => {
                      const postId = p.id || p._id
                      return (
                        <div
                          key={postId}
                          className={`${adminCardClass} p-5 transition-all duration-150 hover:shadow-md`}
                        >
                          {/* Top Author Row */}
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-center gap-3">
                              <div
                                className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                                style={{ backgroundColor: p.user?.avatarColor || '#6366f1' }}
                              >
                                {p.user?.initials || p.user?.name?.slice(0, 2)?.toUpperCase() || 'U'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-slate-900 dark:text-white text-sm">
                                    {p.user?.name || 'Unknown User'}
                                  </span>
                                  {p.user?.username && (
                                    <span className="text-xs text-slate-400 dark:text-gray-500 font-mono">
                                      @{p.user.username}
                                    </span>
                                  )}
                                </div>
                                <span className="text-[11px] text-slate-400 dark:text-gray-500">
                                  {p.createdAt ? new Date(p.createdAt).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  }) : ''}
                                </span>
                              </div>
                            </div>

                            {/* Moderation Actions */}
                            <button
                              disabled={deletingPostId === postId}
                              onClick={() => handleDeletePost(postId)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-rose-200 dark:border-rose-900 transition-colors disabled:opacity-50"
                            >
                              <Trash2 size={13} />
                              {deletingPostId === postId ? 'Deleting...' : 'Delete Post'}
                            </button>
                          </div>

                          {/* Caption */}
                          {p.caption && (
                            <p className="text-slate-800 dark:text-gray-200 text-sm mt-3 whitespace-pre-wrap leading-relaxed">
                              {p.caption}
                            </p>
                          )}

                          {/* Media Preview */}
                          {p.imageUrl && (
                            <div className="mt-3 rounded-xl overflow-hidden max-w-md border border-slate-200 dark:border-gray-800 bg-slate-100 dark:bg-gray-800">
                              <img
                                src={p.imageUrl.startsWith('http') ? p.imageUrl : `${API_BASE}${p.imageUrl}`}
                                alt="Post media"
                                className="w-full h-auto max-h-72 object-cover"
                                onError={e => { e.currentTarget.style.display = 'none' }}
                              />
                            </div>
                          )}

                          {/* Tags */}
                          {Array.isArray(p.tags) && p.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-3">
                              {p.tags.map((tag, idx) => (
                                <span
                                  key={idx}
                                  className="text-[11px] font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-md"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}

                          {/* Stats footer */}
                          <div className="flex items-center gap-4 mt-4 pt-3 border-t border-slate-100 dark:border-gray-800 text-xs font-medium text-slate-500 dark:text-gray-400">
                            <span className="flex items-center gap-1.5">
                              <Heart size={14} className="text-rose-500" />
                              {p.likeCount ?? p.likes ?? 0} Likes
                            </span>
                            <span className="flex items-center gap-1.5">
                              <MessageSquare size={14} className="text-indigo-500" />
                              {p.commentCount ?? 0} Comments
                            </span>
                            <span className="ml-auto text-[11px] text-slate-400 dark:text-gray-600 font-mono">
                              ID: {postId}
                            </span>
                          </div>
                        </div>
                      )
                    })}
                </div>
              )}
            </motion.div>
          ) : (
            /* Temporary placeholder for future dedicated pages */
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={`${adminCardClass} p-10 text-center`}
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 flex items-center justify-center mx-auto mb-4">
                <Building2
                  size={22}
                  className="text-indigo-600 dark:text-indigo-400"
                />
              </div>

              <h2
                style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
                className="text-lg font-bold text-slate-900 dark:text-white"
              >
                {activeSection}
              </h2>

              <p className="text-slate-400 dark:text-gray-500 text-sm mt-2 max-w-md mx-auto">
                This section will become a dedicated Main Admin page in the next UI implementation step.
              </p>
            </motion.div>
          )}

          {/* View Details Modal */}
          <AnimatePresence>
            {selectedCollege && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`${adminCardClass} w-full max-w-xl overflow-hidden shadow-xl shadow-slate-300/50 dark:shadow-black/40`}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center">
                        <Building2 size={19} className="text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                          {selectedCollege.name}
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-gray-500 font-mono">
                          @{selectedCollege.domain}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedCollege(null)}
                      className={`p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 ${adminButtonClass}`}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-6">
                    {/* College Info */}
                    <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-gray-800/50 p-4 rounded-xl text-xs">
                      <div>
                        <p className="text-slate-400 dark:text-gray-500 font-medium">Short Code</p>
                        <p className="text-slate-800 dark:text-gray-200 font-semibold mt-0.5">
                          {selectedCollege.code || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 dark:text-gray-500 font-medium">Location</p>
                        <p className="text-slate-800 dark:text-gray-200 font-semibold mt-0.5">
                          {selectedCollege.location || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 dark:text-gray-500 font-medium">Status</p>
                        <p className="mt-0.5">
                          {selectedCollege.active ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
                          ) : (
                            <span className="text-rose-600 dark:text-rose-400 font-bold">Inactive</span>
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-400 dark:text-gray-500 font-medium">Registered Date</p>
                        <p className="text-slate-800 dark:text-gray-200 font-semibold mt-0.5">
                          {selectedCollege.createdAt
                            ? new Date(selectedCollege.createdAt).toLocaleDateString()
                            : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {/* College Admin Details */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-2">
                        College Administrator
                      </h4>
                      {selectedCollege.collegeAdmin ? (
                        <div className="border border-slate-200 dark:border-gray-800 rounded-xl p-3 text-xs flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">
                              {selectedCollege.collegeAdmin.name}
                            </p>
                            <p className="text-slate-500 dark:text-gray-400">
                              {selectedCollege.collegeAdmin.email}
                            </p>
                            {selectedCollege.collegeAdmin.designation && (
                              <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">
                                {selectedCollege.collegeAdmin.designation}
                              </p>
                            )}
                          </div>
                          <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold">
                            <UserCog size={16} />
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-gray-500 italic bg-slate-50 dark:bg-gray-800/40 p-3 rounded-xl border border-slate-100 dark:border-gray-800">
                          No college admin assigned yet.
                        </p>
                      )}
                    </div>

                    {/* User Statistics */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-2">
                        User Statistics
                      </h4>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-slate-50 dark:bg-gray-800/50 p-3 rounded-xl border border-slate-100 dark:border-gray-800">
                          <p className="text-slate-400 dark:text-gray-500 text-[10px] font-medium">Total Users</p>
                          <p className="text-slate-900 dark:text-white font-bold text-lg mt-0.5">
                            {selectedCollege.stats?.totalUsers || 0}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-gray-800/50 p-3 rounded-xl border border-slate-100 dark:border-gray-800">
                          <p className="text-slate-400 dark:text-gray-500 text-[10px] font-medium">Students</p>
                          <p className="text-indigo-600 dark:text-indigo-400 font-bold text-lg mt-0.5">
                            {selectedCollege.stats?.students || 0}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-gray-800/50 p-3 rounded-xl border border-slate-100 dark:border-gray-800">
                          <p className="text-slate-400 dark:text-gray-500 text-[10px] font-medium">Faculty</p>
                          <p className="text-violet-600 dark:text-violet-400 font-bold text-lg mt-0.5">
                            {selectedCollege.stats?.faculty || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-900/50">
                    <button
                      disabled={togglingId === selectedCollege.id}
                      onClick={() => handleToggleCollegeActive(selectedCollege.id, selectedCollege.active)}
                      className={`px-4 py-2 text-xs font-semibold rounded-xl ${adminButtonClass} ${
                        selectedCollege.active
                          ? 'bg-rose-600 text-white hover:bg-rose-700'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {togglingId === selectedCollege.id
                        ? 'Updating...'
                        : selectedCollege.active
                        ? 'Deactivate College'
                        : 'Activate College'}
                    </button>

                    <button
                      onClick={() => setSelectedCollege(null)}
                      className={`px-4 py-2 text-xs font-medium text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl ${adminButtonClass}`}
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Selected College Admin Overview Modal */}
          <AnimatePresence>
            {selectedAdmin && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`${adminCardClass} w-full max-w-xl overflow-hidden shadow-xl shadow-slate-300/50 dark:shadow-black/40`}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center">
                        <UserCog size={19} className="text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                          {selectedAdmin.name}
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-gray-500 font-mono">
                          {selectedAdmin.email}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedAdmin(null)}
                      className={`p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 ${adminButtonClass}`}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-6">
                    {/* 1. Administrator Information */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-2">
                        1. Administrator Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-gray-800/50 p-4 rounded-xl text-xs">
                        <div>
                          <p className="text-slate-400 dark:text-gray-500 font-medium">Full Name</p>
                          <p className="text-slate-800 dark:text-gray-200 font-semibold mt-0.5">
                            {selectedAdmin.name}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 dark:text-gray-500 font-medium">Official Email</p>
                          <p className="text-slate-800 dark:text-gray-200 font-semibold font-mono mt-0.5">
                            {selectedAdmin.email}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 dark:text-gray-500 font-medium">Status</p>
                          <p className="mt-0.5">
                            {selectedAdmin.active ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 font-bold">Inactive</span>
                            )}
                          </p>
                        </div>
                        {selectedAdmin.createdAt && (
                          <div>
                            <p className="text-slate-400 dark:text-gray-500 font-medium">Account Created</p>
                            <p className="text-slate-800 dark:text-gray-200 font-semibold mt-0.5">
                              {new Date(selectedAdmin.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 2. College Overview */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-2">
                        2. College Overview
                      </h4>
                      {selectedAdmin.college ? (
                        <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-gray-800/50 p-4 rounded-xl text-xs">
                          <div>
                            <p className="text-slate-400 dark:text-gray-500 font-medium">College Name</p>
                            <p className="text-slate-800 dark:text-gray-200 font-semibold mt-0.5">
                              {selectedAdmin.college.name}
                            </p>
                          </div>
                          <div>
                            <p className="text-slate-400 dark:text-gray-500 font-medium">Domain</p>
                            <p className="text-slate-800 dark:text-gray-200 font-semibold font-mono mt-0.5">
                              @{selectedAdmin.college.domain}
                            </p>
                          </div>
                          {selectedAdmin.college.location && (
                            <div>
                              <p className="text-slate-400 dark:text-gray-500 font-medium">Location</p>
                              <p className="text-slate-800 dark:text-gray-200 font-semibold mt-0.5">
                                {selectedAdmin.college.location}
                              </p>
                            </div>
                          )}
                          {selectedAdmin.college.createdAt && (
                            <div>
                              <p className="text-slate-400 dark:text-gray-500 font-medium">Registration Date</p>
                              <p className="text-slate-800 dark:text-gray-200 font-semibold mt-0.5">
                                {new Date(selectedAdmin.college.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-gray-500 italic bg-slate-50 dark:bg-gray-800/40 p-3 rounded-xl border border-slate-100 dark:border-gray-800">
                          No college assigned.
                        </p>
                      )}
                    </div>

                    {/* 3. College Statistics */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-2">
                        3. College Statistics
                      </h4>
                      <div className="grid grid-cols-3 gap-3 text-center">
                        <div className="bg-slate-50 dark:bg-gray-800/50 p-3 rounded-xl border border-slate-100 dark:border-gray-800">
                          <p className="text-slate-400 dark:text-gray-500 text-[10px] font-medium">Total Users</p>
                          <p className="text-slate-900 dark:text-white font-bold text-lg mt-0.5">
                            {selectedAdmin.stats?.totalUsers || 0}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-gray-800/50 p-3 rounded-xl border border-slate-100 dark:border-gray-800">
                          <p className="text-slate-400 dark:text-gray-500 text-[10px] font-medium">Students</p>
                          <p className="text-indigo-600 dark:text-indigo-400 font-bold text-lg mt-0.5">
                            {selectedAdmin.stats?.students || 0}
                          </p>
                        </div>
                        <div className="bg-slate-50 dark:bg-gray-800/50 p-3 rounded-xl border border-slate-100 dark:border-gray-800">
                          <p className="text-slate-400 dark:text-gray-500 text-[10px] font-medium">Faculty</p>
                          <p className="text-violet-600 dark:text-violet-400 font-bold text-lg mt-0.5">
                            {selectedAdmin.stats?.faculty || 0}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-900/50">
                    <button
                      disabled={adminTogglingId === selectedAdmin.id}
                      onClick={() => handleToggleAdminActive(selectedAdmin.id, selectedAdmin.active)}
                      className={`px-4 py-2 text-xs font-semibold rounded-xl ${adminButtonClass} ${
                        selectedAdmin.active
                          ? 'bg-rose-600 text-white hover:bg-rose-700'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {adminTogglingId === selectedAdmin.id
                        ? 'Updating...'
                        : selectedAdmin.active
                        ? 'Deactivate Admin'
                        : 'Activate Admin'}
                    </button>

                    <button
                      onClick={() => setSelectedAdmin(null)}
                      className={`px-4 py-2 text-xs font-medium text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl ${adminButtonClass}`}
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* Add College Admin Modal */}
          <AnimatePresence>
            {showAddAdminModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`${adminCardClass} w-full max-w-lg overflow-hidden shadow-xl shadow-slate-300/50 dark:shadow-black/40`}
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 flex items-center justify-center">
                        <UserCog size={19} className="text-indigo-600 dark:text-indigo-400" />
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                          Add College Admin
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-gray-500">
                          Provision a new administrator for an existing college
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setShowAddAdminModal(false)}
                      className={`p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 ${adminButtonClass}`}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  <form onSubmit={handleProvisionCollegeAdmin} className="p-6 space-y-4">
                    {addAdminError && (
                      <div className="p-3 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 rounded-xl text-xs">
                        {addAdminError}
                      </div>
                    )}

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                        Select Existing College *
                      </label>
                      <select
                        required
                        value={addAdminForm.collegeId}
                        onChange={e => {
                          const collegeId = e.target.value
                          const selectedCol = collegesList.find(c => c.id === collegeId)
                          setAddAdminForm(prev => ({
                            ...prev,
                            collegeId,
                            officialEmail: selectedCol ? `admin@${selectedCol.domain}` : prev.officialEmail,
                          }))
                        }}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs text-slate-900 dark:text-white focus:outline-none ${adminInputClass}`}
                      >
                        <option value="">-- Choose a College --</option>
                        {collegesList.map(col => (
                          <option key={col.id} value={col.id}>
                            {col.name} (@{col.domain})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                        Administrator Full Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Dr. Ramesh Kumar"
                        value={addAdminForm.name}
                        onChange={e => setAddAdminForm(prev => ({ ...prev, name: e.target.value }))}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none ${adminInputClass}`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                        Official Campus Email *
                      </label>
                      <input
                        type="email"
                        required
                        placeholder="e.g. admin@kjsce.edu"
                        value={addAdminForm.officialEmail}
                        onChange={e => setAddAdminForm(prev => ({ ...prev, officialEmail: e.target.value }))}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none ${adminInputClass}`}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1">
                        Designation (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Campus IT Administrator"
                        value={addAdminForm.designation}
                        onChange={e => setAddAdminForm(prev => ({ ...prev, designation: e.target.value }))}
                        className={`w-full px-3.5 py-2.5 rounded-xl text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none ${adminInputClass}`}
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-gray-800">
                      <button
                        type="button"
                        onClick={() => setShowAddAdminModal(false)}
                        className={`px-4 py-2 text-xs font-medium text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl ${adminButtonClass}`}
                      >
                        Cancel
                      </button>

                      <button
                        type="submit"
                        disabled={addAdminLoading}
                        className={`px-4 py-2 text-xs font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 shadow-sm shadow-indigo-200 dark:shadow-none disabled:opacity-50 ${adminButtonClass}`}
                      >
                        {addAdminLoading ? 'Provisioning...' : 'Provision Admin'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </div>
            )}
          </AnimatePresence>

          {/* User Overview Modal */}
          <AnimatePresence>
            {selectedUser && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`${adminCardClass} w-full max-w-xl overflow-hidden shadow-xl shadow-slate-300/50 dark:shadow-black/40`}
                >
                  {/* Modal Header */}
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-gray-800">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                        selectedUser.role === 'student'
                          ? 'bg-sky-50 dark:bg-sky-950/60'
                          : selectedUser.role === 'faculty'
                          ? 'bg-violet-50 dark:bg-violet-950/60'
                          : 'bg-purple-50 dark:bg-purple-950/60'
                      }`}>
                        {selectedUser.role === 'student' ? (
                          <GraduationCap size={19} className="text-sky-600 dark:text-sky-400" />
                        ) : selectedUser.role === 'faculty' ? (
                          <Briefcase size={19} className="text-violet-600 dark:text-violet-400" />
                        ) : (
                          <UserCog size={19} className="text-purple-600 dark:text-purple-400" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 dark:text-white text-base">
                          {selectedUser.name}
                        </h3>
                        <p className="text-xs text-slate-400 dark:text-gray-500 font-mono">
                          {selectedUser.email}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedUser(null)}
                      className={`p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 ${adminButtonClass}`}
                    >
                      <X size={18} />
                    </button>
                  </div>

                  {/* Modal Body */}
                  <div className="p-6 space-y-5">
                    {/* User Information */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-2">
                        User Information
                      </h4>
                      <div className="grid grid-cols-2 gap-4 bg-slate-50 dark:bg-gray-800/50 p-4 rounded-xl text-xs">
                        <div>
                          <p className="text-slate-400 dark:text-gray-500 font-medium">Full Name</p>
                          <p className="text-slate-800 dark:text-gray-200 font-semibold mt-0.5">{selectedUser.name}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 dark:text-gray-500 font-medium">Email</p>
                          <p className="text-slate-800 dark:text-gray-200 font-semibold font-mono mt-0.5">{selectedUser.email}</p>
                        </div>
                        <div>
                          <p className="text-slate-400 dark:text-gray-500 font-medium">Role</p>
                          <p className="mt-0.5">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                              selectedUser.role === 'student'
                                ? 'bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300'
                                : selectedUser.role === 'faculty'
                                ? 'bg-violet-50 dark:bg-violet-950/40 text-violet-700 dark:text-violet-300'
                                : 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300'
                            }`}>
                              {selectedUser.role === 'college_admin' ? 'College Admin' : selectedUser.role.charAt(0).toUpperCase() + selectedUser.role.slice(1)}
                            </span>
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-400 dark:text-gray-500 font-medium">Status</p>
                          <p className="mt-0.5">
                            {selectedUser.active ? (
                              <span className="text-emerald-600 dark:text-emerald-400 font-bold">Active</span>
                            ) : (
                              <span className="text-rose-600 dark:text-rose-400 font-bold">Inactive</span>
                            )}
                          </p>
                        </div>
                        {(selectedUser.designation || selectedUser.dept) && (
                          <div>
                            <p className="text-slate-400 dark:text-gray-500 font-medium">
                              {selectedUser.designation ? 'Designation' : 'Department'}
                            </p>
                            <p className="text-slate-800 dark:text-gray-200 font-semibold mt-0.5">
                              {selectedUser.designation || selectedUser.dept}
                            </p>
                          </div>
                        )}
                        {selectedUser.createdAt && (
                          <div>
                            <p className="text-slate-400 dark:text-gray-500 font-medium">Account Created</p>
                            <p className="text-slate-800 dark:text-gray-200 font-semibold mt-0.5">
                              {new Date(selectedUser.createdAt).toLocaleDateString()}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* College */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 mb-2">
                        College
                      </h4>
                      {selectedUser.college ? (
                        <div className="border border-slate-200 dark:border-gray-800 rounded-xl p-3 text-xs flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-slate-900 dark:text-white">{selectedUser.college.name}</p>
                            <p className="text-slate-500 dark:text-gray-400 font-mono">@{selectedUser.college.domain}</p>
                            {selectedUser.college.location && (
                              <p className="text-[11px] text-slate-400 dark:text-gray-500 mt-0.5">{selectedUser.college.location}</p>
                            )}
                          </div>
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                            selectedUser.college.active
                              ? 'bg-emerald-50 dark:bg-emerald-950/50'
                              : 'bg-rose-50 dark:bg-rose-950/50'
                          }`}>
                            <Building2 size={15} className={selectedUser.college.active ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'} />
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-slate-400 dark:text-gray-500 italic bg-slate-50 dark:bg-gray-800/40 p-3 rounded-xl border border-slate-100 dark:border-gray-800">
                          No college associated with this account.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Modal Footer */}
                  <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 dark:border-gray-800 bg-slate-50/50 dark:bg-gray-900/50">
                    <button
                      disabled={userTogglingId === selectedUser.id}
                      onClick={() => handleToggleUserActive(selectedUser.id, selectedUser.active)}
                      className={`px-4 py-2 text-xs font-semibold rounded-xl ${adminButtonClass} ${
                        selectedUser.active
                          ? 'bg-rose-600 text-white hover:bg-rose-700'
                          : 'bg-emerald-600 text-white hover:bg-emerald-700'
                      }`}
                    >
                      {userTogglingId === selectedUser.id
                        ? 'Updating...'
                        : selectedUser.active
                        ? 'Deactivate User'
                        : 'Activate User'}
                    </button>

                    <button
                      onClick={() => setSelectedUser(null)}
                      className={`px-4 py-2 text-xs font-medium text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl ${adminButtonClass}`}
                    >
                      Close
                    </button>
                  </div>
                </motion.div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  )
}
