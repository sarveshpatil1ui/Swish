import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search,
  Eye,
  EyeOff,
  AlertTriangle,
  MessageSquare,
  Filter,
  Loader2,
  X,
  Trash2,
  Heart,
  Flag,
  Shield,
  User,
  CheckCircle2,
  AlertCircle,
  Calendar,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  CornerDownRight,
  UserX,
  UserCheck,
} from 'lucide-react'
import {
  apiGetModerationPosts,
  apiGetModerationComments,
  apiHidePost,
  apiRestorePost,
  apiDeleteModerationPost,
  apiDeleteModerationComment,
  apiGetDepartments,
  apiToggleUserStatus,
  apiIssueDisciplinaryWarning,
} from '../../utils/auth'
import { formatRelativeTime, resolveImageUrl } from '../../utils/posts'

export default function ModerationManagement() {
  const [activeTab, setActiveTab] = useState('posts') // 'posts' | 'comments'
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [notification, setNotification] = useState(null) // { type: 'success' | 'error', message: string }

  // Stats from backend
  const [stats, setStats] = useState({
    total: 0,
    reportedCount: 0,
    hiddenCount: 0,
  })

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all') // 'all' | 'reported' | 'unreported' | 'hidden' | 'visible'
  const [filterRole, setFilterRole] = useState('all') // 'all' | 'student' | 'faculty'
  const [filterDept, setFilterDept] = useState('all') // department name or 'all'
  const [sortBy, setSortBy] = useState('newest') // 'newest' | 'oldest' | 'reports'

  // Pagination
  const [page, setPage] = useState(1)
  const [limit, setLimit] = useState(20)
  const [totalPages, setTotalPages] = useState(1)
  const [totalCount, setTotalCount] = useState(0)

  // Departments list for filter
  const [departments, setDepartments] = useState([])

  // Modals state
  const [showHideModal, setShowHideModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showInspectModal, setShowInspectModal] = useState(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [selectedItem, setSelectedItem] = useState(null) // { type: 'post'|'comment', data: ... }
  const [hideReason, setHideReason] = useState('')

  // Warning Form state
  const [warningForm, setWarningForm] = useState({
    warningType: 'written',
    severity: 'medium',
    category: 'policy_violation',
    description: '',
    incidentDate: new Date().toISOString().split('T')[0],
  })

  // Debounce search input (350ms)
  const searchTimeoutRef = useRef(null)
  const handleSearchChange = (e) => {
    const val = e.target.value
    setSearchQuery(val)
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current)
    searchTimeoutRef.current = setTimeout(() => {
      setDebouncedSearch(val)
      setPage(1)
    }, 350)
  }

  const clearSearch = () => {
    setSearchQuery('')
    setDebouncedSearch('')
    setPage(1)
  }

  // Load departments once
  useEffect(() => {
    async function loadDepts() {
      try {
        const res = await apiGetDepartments()
        if (res.ok && res.departments) {
          setDepartments(res.departments)
        }
      } catch (err) {
        console.error('[ModerationManagement] Failed to load departments:', err)
      }
    }
    loadDepts()
  }, [])

  // Show temporary toast notification
  const showToast = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr))
    }, 4000)
  }

  // Fetch posts or comments with all active filters
  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const params = {
        search: debouncedSearch.trim() || undefined,
        status: filterStatus !== 'all' ? filterStatus : undefined,
        role: filterRole !== 'all' ? filterRole : undefined,
        dept: filterDept !== 'all' ? filterDept : undefined,
        sort: sortBy,
        page,
        limit,
      }

      if (activeTab === 'posts') {
        const res = await apiGetModerationPosts(params)
        if (res.ok) {
          setItems(res.posts || [])
          setTotalCount(res.pagination?.total || 0)
          setTotalPages(res.pagination?.totalPages || 1)
          if (res.stats) {
            setStats({
              total: res.stats.totalPosts || 0,
              reportedCount: res.stats.reportedCount || 0,
              hiddenCount: res.stats.hiddenCount || 0,
            })
          }
        } else {
          showToast('error', res.error || 'Failed to load posts.')
        }
      } else {
        const res = await apiGetModerationComments(params)
        if (res.ok) {
          setItems(res.comments || [])
          setTotalCount(res.pagination?.total || 0)
          setTotalPages(res.pagination?.totalPages || 1)
          if (res.stats) {
            setStats({
              total: res.stats.totalComments || 0,
              reportedCount: res.stats.reportedCount || 0,
              hiddenCount: res.stats.hiddenCount || 0,
            })
          }
        } else {
          showToast('error', res.error || 'Failed to load comments.')
        }
      }
    } catch (err) {
      console.error('[ModerationManagement] Error fetching data:', err)
      showToast('error', 'Error loading content. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [activeTab, debouncedSearch, filterStatus, filterRole, filterDept, sortBy, page, limit])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  // Reset page when tab changes
  const handleTabChange = (tab) => {
    if (tab !== activeTab) {
      setActiveTab(tab)
      setPage(1)
    }
  }

  // Reset all filters
  const resetFilters = () => {
    setSearchQuery('')
    setDebouncedSearch('')
    setFilterStatus('all')
    setFilterRole('all')
    setFilterDept('all')
    setSortBy('newest')
    setPage(1)
  }

  const hasActiveFilters =
    debouncedSearch.trim() !== '' ||
    filterStatus !== 'all' ||
    filterRole !== 'all' ||
    filterDept !== 'all' ||
    sortBy !== 'newest'

  // Actions
  const handleOpenHide = (type, item) => {
    setSelectedItem({ type, data: item })
    setHideReason('')
    setShowHideModal(true)
  }

  const confirmHide = async () => {
    if (!selectedItem) return
    setActionLoading(true)
    try {
      const id = selectedItem.data.id || selectedItem.data._id
      const isPost = selectedItem.type === 'post'
      const res = isPost
        ? await apiHidePost(id, hideReason)
        : await apiHideComment(id, hideReason)

      if (res.ok) {
        showToast('success', `${isPost ? 'Post' : 'Comment'} has been hidden.`)
        // Update item in state
        const updated = isPost ? res.post : res.comment
        setItems((prev) =>
          prev.map((it) => ((it.id || it._id) === id ? { ...it, ...updated, hidden: true, hiddenReason: hideReason } : it))
        )
        // If modal was open, update it
        if (selectedItem?.data) {
          setSelectedItem((prev) => ({
            ...prev,
            data: { ...prev.data, ...updated, hidden: true, hiddenReason: hideReason },
          }))
        }
        setShowHideModal(false)
      } else {
        showToast('error', res.error || 'Failed to hide item.')
      }
    } catch (err) {
      console.error('[ModerationManagement] Hide error:', err)
      showToast('error', 'Failed to hide item.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleRestore = async (type, item) => {
    const id = item.id || item._id
    setActionLoading(true)
    try {
      const isPost = type === 'post'
      const res = isPost ? await apiRestorePost(id) : await apiRestoreComment(id)

      if (res.ok) {
        showToast('success', `${isPost ? 'Post' : 'Comment'} restored and visible.`)
        const updated = isPost ? res.post : res.comment
        setItems((prev) =>
          prev.map((it) => ((it.id || it._id) === id ? { ...it, ...updated, hidden: false, hiddenReason: '' } : it))
        )
        if (selectedItem?.data) {
          setSelectedItem((prev) => ({
            ...prev,
            data: { ...prev.data, ...updated, hidden: false, hiddenReason: '' },
          }))
        }
      } else {
        showToast('error', res.error || 'Failed to restore item.')
      }
    } catch (err) {
      console.error('[ModerationManagement] Restore error:', err)
      showToast('error', 'Failed to restore item.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenDelete = (type, item) => {
    setSelectedItem({ type, data: item })
    setShowDeleteModal(true)
  }

  const confirmDelete = async () => {
    if (!selectedItem) return
    setActionLoading(true)
    try {
      const id = selectedItem.data.id || selectedItem.data._id
      const isPost = selectedItem.type === 'post'
      const res = isPost
        ? await apiDeleteModerationPost(id)
        : await apiDeleteModerationComment(id)

      if (res.ok) {
        showToast('success', `${isPost ? 'Post' : 'Comment'} deleted successfully.`)
        setItems((prev) => prev.filter((it) => (it.id || it._id) !== id))
        setTotalCount((c) => Math.max(0, c - 1))
        setShowDeleteModal(false)
        setShowInspectModal(false)
        setSelectedItem(null)
      } else {
        showToast('error', res.error || 'Failed to delete item.')
      }
    } catch (err) {
      console.error('[ModerationManagement] Delete error:', err)
      showToast('error', 'Failed to delete item.')
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenInspect = (type, item) => {
    setSelectedItem({ type, data: item })
    setShowInspectModal(true)
  }

  // Toggle suspension of the content author
  const handleToggleUserSuspension = async (user) => {
    if (!user?._id && !user?.id) return
    const userId = user._id || user.id
    setActionLoading(true)
    try {
      const res = await apiToggleUserStatus(userId)
      if (res.ok) {
        const isNowSuspended = res.user?.suspended
        showToast(
          'success',
          `User @${user.username} account has been ${isNowSuspended ? 'suspended' : 'reactivated'}.`
        )
        // Update user state in item cards
        setItems((prev) =>
          prev.map((it) => {
            const authorId = it.user?._id || it.user?.id
            if (authorId === userId) {
              return {
                ...it,
                user: { ...it.user, suspended: isNowSuspended },
              }
            }
            return it
          })
        )
        if (selectedItem?.data?.user) {
          setSelectedItem((prev) => ({
            ...prev,
            data: {
              ...prev.data,
              user: { ...prev.data.user, suspended: isNowSuspended },
            },
          }))
        }
      } else {
        showToast('error', res.error || 'Failed to update user status.')
      }
    } catch (err) {
      console.error('[ModerationManagement] Toggle user suspension error:', err)
      showToast('error', 'Failed to update user status.')
    } finally {
      setActionLoading(false)
    }
  }

  // Issue formal warning
  const handleOpenWarning = (user) => {
    setWarningForm({
      warningType: 'written',
      severity: 'medium',
      category: 'policy_violation',
      description: '',
      incidentDate: new Date().toISOString().split('T')[0],
    })
    setShowWarningModal(true)
  }

  const submitWarning = async () => {
    if (!selectedItem?.data?.user) return
    const author = selectedItem.data.user
    const userId = author._id || author.id

    if (!warningForm.description.trim()) {
      showToast('error', 'Please enter a warning description.')
      return
    }

    setActionLoading(true)
    try {
      const payload = {
        userId,
        warningType: warningForm.warningType,
        severity: warningForm.severity,
        category: warningForm.category,
        description: warningForm.description.trim(),
        incidentDate: warningForm.incidentDate,
      }
      const res = await apiIssueDisciplinaryWarning(payload)
      if (res.ok) {
        showToast('success', `Disciplinary warning issued to ${author.name}.`)
        setShowWarningModal(false)
      } else {
        showToast('error', res.error || 'Failed to issue disciplinary warning.')
      }
    } catch (err) {
      console.error('[ModerationManagement] Issue warning error:', err)
      showToast('error', 'Failed to issue warning.')
    } finally {
      setActionLoading(false)
    }
  }

  const cleanCount = Math.max(0, stats.total - stats.reportedCount)

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border transition-all animate-in fade-in slide-in-from-top-4 ${
            notification.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/80 dark:text-emerald-300 dark:border-emerald-800'
              : 'bg-rose-50 text-rose-800 border-rose-200 dark:bg-rose-950/80 dark:text-rose-300 dark:border-rose-800'
          }`}
        >
          {notification.type === 'success' ? (
            <CheckCircle2 size={18} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-600 dark:text-rose-400 flex-shrink-0" />
          )}
          <span className="text-sm font-medium">{notification.message}</span>
          <button
            onClick={() => setNotification(null)}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 ml-2"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Header & Description */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Content Moderation</h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              College Admin
            </span>
          </div>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Review and moderate all posts and comments created across your college, both reported and clean content.
          </p>
        </div>

        <button
          onClick={fetchData}
          disabled={loading}
          className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors self-start md:self-auto"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Stats Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Total {activeTab === 'posts' ? 'Posts' : 'Comments'}</span>
            <span className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
              <MessageSquare size={16} />
            </span>
          </div>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-2">{stats.total.toLocaleString()}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">In your college directory</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-amber-700 dark:text-amber-400">Reported Items</span>
            <span className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
              <AlertTriangle size={16} />
            </span>
          </div>
          <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-2">{stats.reportedCount.toLocaleString()}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Active reports filed</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-rose-700 dark:text-rose-400">Hidden / Filtered</span>
            <span className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <EyeOff size={16} />
            </span>
          </div>
          <p className="text-2xl font-bold text-rose-600 dark:text-rose-400 mt-2">{stats.hiddenCount.toLocaleString()}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Hidden from feed</p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Clean Content</span>
            <span className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
              <Shield size={16} />
            </span>
          </div>
          <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{cleanCount.toLocaleString()}</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">Unreported & active</p>
        </div>
      </div>

      {/* Tabs (Posts vs Comments) */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex gap-2">
          <button
            onClick={() => handleTabChange('posts')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'posts'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare size={16} />
            Posts
            {activeTab === 'posts' && (
              <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {totalCount}
              </span>
            )}
          </button>
          <button
            onClick={() => handleTabChange('comments')}
            className={`px-5 py-3 text-sm font-semibold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'comments'
                ? 'border-indigo-600 text-indigo-600 dark:text-indigo-400'
                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare size={16} />
            Comments
            {activeTab === 'comments' && (
              <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                {totalCount}
              </span>
            )}
          </button>
        </div>

        {hasActiveFilters && (
          <button
            onClick={resetFilters}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <X size={12} />
            Reset filters
          </button>
        )}
      </div>

      {/* Search and Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {/* Search */}
        <div className="relative lg:col-span-2">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab} by text, author or username...`}
            value={searchQuery}
            onChange={handleSearchChange}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white placeholder-slate-400 text-sm rounded-xl pl-9 pr-9 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value)
              setPage(1)
            }}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
          >
            <option value="all">All Content</option>
            <option value="reported">Reported Only ⚠️</option>
            <option value="unreported">Unreported (Clean)</option>
            <option value="hidden">Hidden Only</option>
            <option value="visible">Visible Only</option>
          </select>
          <Filter size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Role Filter */}
        <div className="relative">
          <select
            value={filterRole}
            onChange={(e) => {
              setFilterRole(e.target.value)
              setPage(1)
            }}
            className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-sm rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all appearance-none cursor-pointer"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="faculty">Faculty</option>
          </select>
          <User size={14} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        </div>

        {/* Department & Sort Filter */}
        <div className="flex gap-2">
          <select
            value={filterDept}
            onChange={(e) => {
              setFilterDept(e.target.value)
              setPage(1)
            }}
            className="w-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-xl px-2.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer truncate"
          >
            <option value="all">All Depts</option>
            {departments.map((d) => (
              <option key={d._id || d.name} value={d.name}>
                {d.code || d.name}
              </option>
            ))}
          </select>

          <select
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value)
              setPage(1)
            }}
            className="w-1/2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white text-xs rounded-xl px-2.5 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="reports">Most Reports</option>
          </select>
        </div>
      </div>

      {/* Content List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 size={36} className="animate-spin text-indigo-600 dark:text-indigo-400 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">Loading {activeTab}...</p>
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto mb-3 text-slate-400">
              <MessageSquare size={24} />
            </div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">No {activeTab} found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              {hasActiveFilters
                ? 'No content matches your current search or filter criteria. Try resetting filters.'
                : `There are currently no ${activeTab} in your college directory.`}
            </p>
            {hasActiveFilters && (
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white text-xs font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {activeTab === 'posts'
              ? items.map((post) => (
                  <PostCardItem
                    key={post._id || post.id}
                    post={post}
                    onInspect={() => handleOpenInspect('post', post)}
                    onHide={() => handleOpenHide('post', post)}
                    onRestore={() => handleRestore('post', post)}
                    onDelete={() => handleOpenDelete('post', post)}
                  />
                ))
              : items.map((comment) => (
                  <CommentCardItem
                    key={comment._id || comment.id}
                    comment={comment}
                    onInspect={() => handleOpenInspect('comment', comment)}
                    onHide={() => handleOpenHide('comment', comment)}
                    onRestore={() => handleRestore('comment', comment)}
                    onDelete={() => handleOpenDelete('comment', comment)}
                  />
                ))}
          </div>
        )}
      </div>

      {/* Pagination Controls */}
      {!loading && totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-700 dark:text-slate-200">{(page - 1) * limit + 1}</span> to{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {Math.min(page * limit, totalCount)}
            </span>{' '}
            of <span className="font-semibold text-slate-700 dark:text-slate-200">{totalCount}</span> items
          </p>

          <div className="flex items-center gap-2">
            <select
              value={limit}
              onChange={(e) => {
                setLimit(Number(e.target.value))
                setPage(1)
              }}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-300 focus:outline-none"
            >
              <option value={10}>10 per page</option>
              <option value={20}>20 per page</option>
              <option value={50}>50 per page</option>
            </select>

            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Previous page"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-300">
                {page} / {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                title="Next page"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS ── */}

      {/* 1. Hide Confirmation Modal */}
      {showHideModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowHideModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <EyeOff size={18} className="text-rose-600" />
                Hide {selectedItem.type === 'post' ? 'Post' : 'Comment'}
              </h2>
              <button
                onClick={() => setShowHideModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-4">
              Hiding this content will immediately remove it from feeds and searches for students and faculty.
              Please provide an administrative reason:
            </p>
            <textarea
              value={hideReason}
              onChange={(e) => setHideReason(e.target.value)}
              rows={3}
              placeholder="e.g., Inappropriate language, policy violation, offensive content..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 mb-4"
            />
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setShowHideModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmHide}
                disabled={actionLoading || !hideReason.trim()}
                className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors inline-flex items-center gap-2"
              >
                {actionLoading && <Loader2 size={16} className="animate-spin" />}
                Hide Content
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Delete Confirmation Modal */}
      {showDeleteModal && selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-rose-600 dark:text-rose-400 flex items-center gap-2">
                <Trash2 size={20} />
                Confirm Deletion
              </h2>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>
            <p className="text-sm text-slate-600 dark:text-slate-300 mb-5">
              Are you sure you want to permanently delete this {selectedItem.type}? This action cannot be undone and will
              remove the content for all users.
            </p>
            <div className="flex gap-2.5 justify-end">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={actionLoading}
                className="px-4 py-2 bg-rose-600 text-white text-sm font-semibold rounded-xl hover:bg-rose-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
              >
                {actionLoading && <Loader2 size={16} className="animate-spin" />}
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Detailed Inspection Modal (Full details + filed reports + author actions) */}
      {showInspectModal && selectedItem && (
        <InspectModal
          item={selectedItem.data}
          type={selectedItem.type}
          onClose={() => setShowInspectModal(false)}
          onHide={() => handleOpenHide(selectedItem.type, selectedItem.data)}
          onRestore={() => handleRestore(selectedItem.type, selectedItem.data)}
          onDelete={() => handleOpenDelete(selectedItem.type, selectedItem.data)}
          onToggleSuspension={() => handleToggleUserSuspension(selectedItem.data?.user)}
          onOpenWarning={() => handleOpenWarning(selectedItem.data?.user)}
          actionLoading={actionLoading}
        />
      )}

      {/* 4. Disciplinary Warning Modal */}
      {showWarningModal && selectedItem?.data?.user && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowWarningModal(false)} />
          <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle size={18} className="text-amber-500" />
                Issue Warning to {selectedItem.data.user?.name}
              </h2>
              <button
                onClick={() => setShowWarningModal(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Warning Type
                  </label>
                  <select
                    value={warningForm.warningType}
                    onChange={(e) => setWarningForm({ ...warningForm, warningType: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="verbal">Verbal</option>
                    <option value="written">Written</option>
                    <option value="probation">Probation</option>
                    <option value="suspension">Suspension</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Severity</label>
                  <select
                    value={warningForm.severity}
                    onChange={(e) => setWarningForm({ ...warningForm, severity: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Category</label>
                <select
                  value={warningForm.category}
                  onChange={(e) => setWarningForm({ ...warningForm, category: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
                >
                  <option value="policy_violation">Policy Violation</option>
                  <option value="harassment">Harassment</option>
                  <option value="behavioral">Behavioral Misconduct</option>
                  <option value="academic_misconduct">Academic Misconduct</option>
                  <option value="attendance">Attendance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Incident Date
                </label>
                <input
                  type="date"
                  value={warningForm.incidentDate}
                  onChange={(e) => setWarningForm({ ...warningForm, incidentDate: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Description / Incident Details *
                </label>
                <textarea
                  value={warningForm.description}
                  onChange={(e) => setWarningForm({ ...warningForm, description: e.target.value })}
                  rows={3}
                  placeholder="Detail the infraction and disciplinary expectations..."
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-900 dark:text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex gap-2.5 justify-end mt-6">
              <button
                onClick={() => setShowWarningModal(false)}
                className="px-4 py-2 text-slate-600 dark:text-slate-400 text-sm font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitWarning}
                disabled={actionLoading || !warningForm.description.trim()}
                className="px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-xl hover:bg-amber-700 disabled:opacity-50 transition-colors inline-flex items-center gap-2"
              >
                {actionLoading && <Loader2 size={16} className="animate-spin" />}
                Issue Warning
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── SUB-COMPONENT: POST CARD ITEM ─────────────────────────────────────────────
function PostCardItem({ post, onInspect, onHide, onRestore, onDelete }) {
  const author = post.user || {}
  const profilePhotoUrl = resolveImageUrl(author.profilePhoto)
  const postImageUrl = resolveImageUrl(post.imageUrl)

  return (
    <div
      className={`p-5 transition-colors ${
        post.hidden
          ? 'bg-rose-50/40 dark:bg-rose-950/20'
          : post.isReported
          ? 'bg-amber-50/20 dark:bg-amber-950/10'
          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        {/* Author Avatar & Header */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            <div className="relative">
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt={author.name || 'User'}
                  className="w-10 h-10 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm"
                  style={{ backgroundColor: author.avatarColor || '#6366f1' }}
                >
                  {author.initials || author.name?.slice(0, 2).toUpperCase() || '?'}
                </div>
              )}
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                  {author.name || 'Anonymous User'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  @{author.username || 'unknown'}
                </span>

                {author.verifiedBadge && (
                  <span className="text-indigo-600 dark:text-indigo-400" title="Verified Member">
                    <CheckCircle2 size={14} />
                  </span>
                )}

                {/* Role Badge */}
                {author.role && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                      author.role === 'faculty'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    }`}
                  >
                    {author.role}
                  </span>
                )}

                {/* Dept Badge */}
                {author.dept && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {author.dept}
                  </span>
                )}

                {/* Suspended Indicator */}
                {author.suspended && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300">
                    Suspended
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                <Calendar size={12} />
                <span>{formatRelativeTime(post.createdAt)}</span>
                {post.createdAt && (
                  <span className="text-[11px]">({new Date(post.createdAt).toLocaleDateString()})</span>
                )}
              </div>
            </div>

            {/* Status Badges */}
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {post.hidden && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
                  <EyeOff size={12} />
                  Hidden
                </span>
              )}

              {post.isReported ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-800">
                  <AlertTriangle size={12} />
                  {post.reportCount} {post.reportCount === 1 ? 'Report' : 'Reports'}
                </span>
              ) : (
                !post.hidden && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                    <Shield size={11} />
                    Clean
                  </span>
                )
              )}
            </div>
          </div>

          {/* Post Caption */}
          <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed mb-3 whitespace-pre-wrap">
            {post.caption || <span className="italic text-slate-400">No caption provided.</span>}
          </p>

          {/* Post Image Preview */}
          {postImageUrl && (
            <div className="mb-3">
              <img
                src={postImageUrl}
                alt="Post attachment"
                className="max-h-60 rounded-xl object-cover border border-slate-200 dark:border-slate-800 cursor-pointer hover:opacity-95 transition-opacity"
                onClick={onInspect}
              />
            </div>
          )}

          {/* Engagement metrics & hide reason */}
          <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
            <span className="flex items-center gap-1">
              <Heart size={14} className="text-rose-500" />
              {post.likeCount ?? post.likes?.length ?? 0} likes
            </span>
            <span className="flex items-center gap-1">
              <MessageSquare size={14} className="text-indigo-500" />
              {post.commentCount ?? 0} comments
            </span>

            {post.hidden && post.hiddenReason && (
              <span className="text-rose-600 dark:text-rose-400 truncate max-w-md font-medium">
                Reason: {post.hiddenReason}
              </span>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex sm:flex-col items-center gap-1.5 self-end sm:self-start flex-shrink-0">
          <button
            onClick={onInspect}
            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition-colors"
            title="Inspect & View Reports"
          >
            <Eye size={17} />
          </button>

          {post.hidden ? (
            <button
              onClick={onRestore}
              className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-xl transition-colors"
              title="Restore to feed"
            >
              <Shield size={17} />
            </button>
          ) : (
            <button
              onClick={onHide}
              className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-xl transition-colors"
              title="Hide from feed"
            >
              <EyeOff size={17} />
            </button>
          )}

          <button
            onClick={onDelete}
            className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-colors"
            title="Delete post permanently"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SUB-COMPONENT: COMMENT CARD ITEM ──────────────────────────────────────────
function CommentCardItem({ comment, onInspect, onHide, onRestore, onDelete }) {
  const author = comment.user || {}
  const profilePhotoUrl = resolveImageUrl(author.profilePhoto)
  const originalPost = comment.post || {}
  const originalPostAuthor = originalPost.user || {}

  return (
    <div
      className={`p-5 transition-colors ${
        comment.hidden
          ? 'bg-rose-50/40 dark:bg-rose-950/20'
          : comment.isReported
          ? 'bg-amber-50/20 dark:bg-amber-950/10'
          : 'hover:bg-slate-50/60 dark:hover:bg-slate-800/40'
      }`}
    >
      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
        {/* Comment Author & Body */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2 flex-wrap">
            {profilePhotoUrl ? (
              <img
                src={profilePhotoUrl}
                alt={author.name || 'User'}
                className="w-9 h-9 rounded-full object-cover border border-slate-200 dark:border-slate-700"
              />
            ) : (
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-xs"
                style={{ backgroundColor: author.avatarColor || '#6366f1' }}
              >
                {author.initials || author.name?.slice(0, 2).toUpperCase() || '?'}
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-900 dark:text-white text-sm truncate">
                  {author.name || 'Anonymous User'}
                </span>
                <span className="text-xs text-slate-500 dark:text-slate-400 truncate">
                  @{author.username || 'unknown'}
                </span>

                {author.role && (
                  <span
                    className={`text-[11px] font-semibold px-2 py-0.5 rounded-full capitalize ${
                      author.role === 'faculty'
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-950/60 dark:text-purple-300'
                        : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                    }`}
                  >
                    {author.role}
                  </span>
                )}

                {author.dept && (
                  <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    {author.dept}
                  </span>
                )}

                {author.suspended && (
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-300">
                    Suspended
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                <Calendar size={12} />
                <span>{formatRelativeTime(comment.createdAt)}</span>
              </div>
            </div>

            {/* Badges */}
            <div className="ml-auto flex items-center gap-2 flex-wrap">
              {comment.hidden && (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 px-2.5 py-1 rounded-full border border-rose-200 dark:border-rose-800">
                  <EyeOff size={12} />
                  Hidden
                </span>
              )}

              {comment.isReported ? (
                <span className="inline-flex items-center gap-1 text-xs font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 px-2.5 py-1 rounded-full border border-amber-300 dark:border-amber-800">
                  <AlertTriangle size={12} />
                  {comment.reportCount} {comment.reportCount === 1 ? 'Report' : 'Reports'}
                </span>
              ) : (
                !comment.hidden && (
                  <span className="inline-flex items-center gap-1 text-xs font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full">
                    <Shield size={11} />
                    Clean
                  </span>
                )
              )}
            </div>
          </div>

          {/* Comment text */}
          <p className="text-slate-800 dark:text-slate-200 text-sm leading-relaxed mb-3 whitespace-pre-wrap">
            {comment.text}
          </p>

          {/* Original Post Context box */}
          {originalPost && (
            <div className="mb-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 flex items-start gap-2.5">
              <CornerDownRight size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
              <div className="text-xs text-slate-600 dark:text-slate-300 flex-1 min-w-0">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  Replying to @{originalPostAuthor.username || 'user'}:
                </span>{' '}
                <span className="italic line-clamp-1">{originalPost.caption || 'Photo Post'}</span>
              </div>
              {originalPost.imageUrl && (
                <img
                  src={resolveImageUrl(originalPost.imageUrl)}
                  alt="Post preview"
                  className="w-8 h-8 rounded object-cover flex-shrink-0"
                />
              )}
            </div>
          )}

          {comment.hidden && comment.hiddenReason && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              Reason: {comment.hiddenReason}
            </p>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex sm:flex-col items-center gap-1.5 self-end sm:self-start flex-shrink-0">
          <button
            onClick={onInspect}
            className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-xl transition-colors"
            title="Inspect & View Reports"
          >
            <Eye size={17} />
          </button>

          {comment.hidden ? (
            <button
              onClick={onRestore}
              className="p-2 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 rounded-xl transition-colors"
              title="Restore comment"
            >
              <Shield size={17} />
            </button>
          ) : (
            <button
              onClick={onHide}
              className="p-2 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/60 rounded-xl transition-colors"
              title="Hide comment"
            >
              <EyeOff size={17} />
            </button>
          )}

          <button
            onClick={onDelete}
            className="p-2 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl transition-colors"
            title="Delete comment permanently"
          >
            <Trash2 size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ── SUB-COMPONENT: FULL INSPECTION MODAL ──────────────────────────────────────
function InspectModal({
  item,
  type,
  onClose,
  onHide,
  onRestore,
  onDelete,
  onToggleSuspension,
  onOpenWarning,
  actionLoading,
}) {
  const author = item?.user || {}
  const profilePhotoUrl = resolveImageUrl(author.profilePhoto)
  const itemImageUrl = resolveImageUrl(item.imageUrl)
  const reports = item.reports || []

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-5">
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white capitalize">
              {type} Inspection & Reports
            </h2>
            {item.hidden ? (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-400">
                Hidden
              </span>
            ) : item.isReported ? (
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300">
                {item.reportCount} Reports
              </span>
            ) : (
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-400">
                Clean
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
            <X size={20} />
          </button>
        </div>

        {/* Content Author Profile Banner */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-800 mb-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {profilePhotoUrl ? (
                <img
                  src={profilePhotoUrl}
                  alt={author.name}
                  className="w-12 h-12 rounded-full object-cover border border-slate-200 dark:border-slate-700"
                />
              ) : (
                <div
                  className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-base"
                  style={{ backgroundColor: author.avatarColor || '#6366f1' }}
                >
                  {author.initials || author.name?.slice(0, 2).toUpperCase() || '?'}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-bold text-slate-900 dark:text-white text-sm">{author.name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500">@{author.username}</p>
                  {author.verifiedBadge && <CheckCircle2 size={14} className="text-indigo-600" />}
                </div>
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
                  <span className="capitalize font-semibold text-slate-700 dark:text-slate-300">
                    Role: {author.role || 'Student'}
                  </span>
                  {author.dept && <span>• Dept: {author.dept}</span>}
                  {author.year && <span>• Year: {author.year}</span>}
                  {author.designation && <span>• Desig: {author.designation}</span>}
                  {author.studentId && <span>• ID: {author.studentId}</span>}
                </div>
              </div>
            </div>

            {/* Author Disciplinary Controls */}
            <div className="flex items-center gap-2 self-end sm:self-auto">
              <button
                onClick={onToggleSuspension}
                disabled={actionLoading}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 ${
                  author.suspended
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : 'bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 hover:bg-rose-100'
                }`}
                title={author.suspended ? 'Reactivate Account' : 'Suspend Account'}
              >
                {author.suspended ? <UserCheck size={14} /> : <UserX size={14} />}
                {author.suspended ? 'Reactivate' : 'Suspend'}
              </button>

              <button
                onClick={onOpenWarning}
                disabled={actionLoading}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 hover:bg-amber-100 transition-colors flex items-center gap-1.5"
                title="Issue formal warning"
              >
                <AlertTriangle size={14} />
                Warn
              </button>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-4 mb-6">
          <div>
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
              Content Text
            </h4>
            <div className="p-3.5 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800 text-sm text-slate-800 dark:text-slate-200 whitespace-pre-wrap leading-relaxed">
              {type === 'post' ? item.caption || <span className="italic text-slate-400">No caption.</span> : item.text}
            </div>
          </div>

          {/* Image preview */}
          {itemImageUrl && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">
                Attached Media
              </h4>
              <img
                src={itemImageUrl}
                alt="Post Media"
                className="max-h-72 w-full object-contain rounded-xl border border-slate-200 dark:border-slate-800 bg-black/5"
              />
            </div>
          )}

          {/* If hidden: show hide info */}
          {item.hidden && (
            <div className="p-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-xs text-rose-800 dark:text-rose-300">
              <p className="font-semibold flex items-center gap-1.5">
                <EyeOff size={14} />
                Hidden by moderation
              </p>
              <p className="mt-1">Reason: {item.hiddenReason || 'No reason specified'}</p>
              {item.hiddenAt && (
                <p className="text-[11px] text-rose-500 mt-0.5">Date: {new Date(item.hiddenAt).toLocaleString()}</p>
              )}
            </div>
          )}
        </div>

        {/* Reports Section */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Flag size={14} className="text-amber-500" />
              Filed Reports ({reports.length})
            </h4>
          </div>

          {reports.length === 0 ? (
            <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-900/40 text-center">
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">
                No reports have been filed against this {type}. Content is clean.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {reports.map((report, idx) => (
                <div
                  key={report._id || report.id || `rep-${idx}`}
                  className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-xs space-y-1.5"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900 dark:text-white">{report.reporterName}</span>
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 capitalize">
                        {report.reporterRole || 'Student'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 capitalize">
                        {report.category?.replace('_', ' ')}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {report.createdAt ? new Date(report.createdAt).toLocaleDateString() : ''}
                      </span>
                    </div>
                  </div>

                  <p className="text-slate-700 dark:text-slate-300 text-sm">{report.description}</p>

                  {report.resolutionNotes && (
                    <p className="text-slate-500 italic text-[11px] pt-1">
                      Resolution Notes: {report.resolutionNotes}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Moderation Action Buttons at bottom of modal */}
        <div className="pt-4 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={onDelete}
            disabled={actionLoading}
            className="px-4 py-2 bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 text-xs font-semibold rounded-xl hover:bg-rose-100 transition-colors flex items-center gap-1.5"
          >
            <Trash2 size={15} />
            Delete {type}
          </button>

          <div className="flex items-center gap-2">
            {item.hidden ? (
              <button
                onClick={onRestore}
                disabled={actionLoading}
                className="px-4 py-2 bg-emerald-600 text-white text-xs font-semibold rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-1.5"
              >
                <Shield size={15} />
                Restore Content
              </button>
            ) : (
              <button
                onClick={onHide}
                disabled={actionLoading}
                className="px-4 py-2 bg-amber-600 text-white text-xs font-semibold rounded-xl hover:bg-amber-700 transition-colors flex items-center gap-1.5"
              >
                <EyeOff size={15} />
                Hide Content
              </button>
            )}

            <button
              onClick={onClose}
              className="px-4 py-2 text-slate-600 dark:text-slate-400 text-xs font-medium hover:text-slate-900 dark:hover:text-white"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
