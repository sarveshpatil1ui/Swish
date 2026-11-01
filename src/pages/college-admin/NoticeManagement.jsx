import { useState, useEffect, useRef } from 'react'
import { Search, Megaphone, Plus, Edit, Trash2, Eye, EyeOff, Calendar, User, Building2, Pin } from 'lucide-react'
import { apiGetNotices, apiCreateNotice, apiUpdateNotice, apiDeleteNotice, apiPublishNotice, apiPinNotice, apiGetDepartments } from '../../utils/auth'
import { useSwish } from '../../context/SwishContext'

export default function NoticeManagement() {
  const { currentUser } = useSwish()
  const [notices, setNotices] = useState([])
  const [filteredNotices, setFilteredNotices] = useState([])
  const [departments, setDepartments] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [scopeFilter, setScopeFilter] = useState('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingNotice, setEditingNotice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetAudience: 'all',
    priority: 'medium',
    category: 'General',
    departmentId: '',
    department: '',
    expiresAt: '',
    published: false
  })
  const [errors, setErrors] = useState({})
  const [expandedNotices, setExpandedNotices] = useState({})

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    let filtered = notices
    if (searchQuery) {
      const q = searchQuery.toLowerCase()
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content?.toLowerCase().includes(q)
      )
    }
    if (selectedPriority !== 'all') {
      filtered = filtered.filter(n => n.priority === selectedPriority)
    }
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(n => n.category === selectedCategory)
    }
    if (scopeFilter === 'mine' && currentUser) {
      const currentId = (currentUser.id || currentUser._id)?.toString()
      filtered = filtered.filter(n => {
        const authorId = (n.createdBy?._id || n.createdBy?.id || n.createdBy)?.toString()
        return authorId === currentId
      })
    }
    setFilteredNotices(filtered)
  }, [searchQuery, selectedPriority, selectedCategory, scopeFilter, notices, currentUser])

  const fetchData = async () => {
    try {
      const [noticesRes, deptsRes] = await Promise.all([
        apiGetNotices(),
        apiGetDepartments(),
      ])
      if (noticesRes.ok && Array.isArray(noticesRes.notices)) {
        const seen = new Set()
        const unique = []
        for (const n of noticesRes.notices) {
          const id = (n.id || n._id)?.toString()
          if (id && !seen.has(id)) {
            seen.add(id)
            unique.push(n)
          }
        }
        setNotices(unique)
        setFilteredNotices(unique)
      }
      if (deptsRes.ok) {
        setDepartments(deptsRes.departments)
      }
    } catch (err) {
      console.error('[NoticeManagement] Error fetching data:', err)
    } finally {
      setLoading(false)
    }
  }

  const currentUserId = (currentUser?.id || currentUser?._id)?.toString()
  const myNoticesCount = notices.filter(n => {
    const authorId = (n.createdBy?._id || n.createdBy?.id || n.createdBy)?.toString()
    return Boolean(authorId && currentUserId && authorId === currentUserId)
  }).length

  const canManageNotice = (notice) => {
    if (!currentUser) return false
    if (currentUser.role === 'admin' || currentUser.role === 'college_admin') {
      return true
    }
    const authorId = (notice.createdBy?._id || notice.createdBy?.id || notice.createdBy)?.toString()
    return Boolean(authorId && currentUserId && authorId === currentUserId)
  }

  const handleOpenAddForm = () => {
    let defaultDeptId = ''
    let defaultDeptName = ''
    if (currentUser?.dept && departments.length > 0) {
      const matched = departments.find(d => 
        d.name?.toLowerCase() === currentUser.dept.toLowerCase() ||
        d.code?.toLowerCase() === currentUser.dept.toLowerCase()
      )
      if (matched) {
        defaultDeptId = matched.id || matched._id
        defaultDeptName = matched.name
      } else {
        defaultDeptName = currentUser.dept
      }
    }
    setFormData({
      title: '',
      content: '',
      targetAudience: 'all',
      priority: 'medium',
      category: 'General',
      departmentId: defaultDeptId,
      department: defaultDeptName,
      expiresAt: '',
      published: false
    })
    setErrors({})
    setShowAddForm(true)
  }

  const handleTargetAudienceChange = (val) => {
    let deptId = formData.departmentId
    let deptName = formData.department
    if (val === 'department' && !deptId && currentUser?.dept && departments.length > 0) {
      const matched = departments.find(d => 
        d.name?.toLowerCase() === currentUser.dept.toLowerCase() ||
        d.code?.toLowerCase() === currentUser.dept.toLowerCase()
      )
      if (matched) {
        deptId = matched.id || matched._id
        deptName = matched.name
      } else {
        deptName = currentUser.dept
      }
    }
    setFormData(prev => ({
      ...prev,
      targetAudience: val,
      departmentId: deptId,
      department: deptName,
    }))
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    if (isSubmittingRef.current) return

    const validationErrors = {}
    if (!formData.title.trim()) validationErrors.title = 'Required'
    if (!formData.content.trim()) validationErrors.content = 'Required'
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)

    try {
      const idempotencyKey = `notice_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
      const res = await apiCreateNotice({ ...formData, idempotencyKey })
      if (res.ok && res.notice) {
        setNotices(prev => {
          const newNotice = res.notice
          const newId = (newNotice.id || newNotice._id)?.toString()
          if (!newId) return prev
          const exists = prev.some(n => (n.id || n._id)?.toString() === newId)
          if (exists) {
            return prev.map(n => (n.id || n._id)?.toString() === newId ? newNotice : n)
          }
          return [newNotice, ...prev]
        })
        setShowAddForm(false)
        resetForm()
      } else {
        console.error('[NoticeManagement] Failed to create notice:', res.error)
      }
    } catch (err) {
      console.error('[NoticeManagement] Error creating notice:', err)
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    if (isSubmittingRef.current) return

    const validationErrors = {}
    if (!formData.title.trim()) validationErrors.title = 'Required'
    if (!formData.content.trim()) validationErrors.content = 'Required'
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    isSubmittingRef.current = true
    setIsSubmitting(true)

    const noticeId = (editingNotice.id || editingNotice._id)?.toString()
    try {
      const res = await apiUpdateNotice(noticeId, formData)
      if (res.ok && res.notice) {
        setNotices(prev => prev.map(n => ((n.id || n._id)?.toString() === noticeId ? res.notice : n)))
        setEditingNotice(null)
        resetForm()
      } else {
        console.error('[NoticeManagement] Failed to update notice:', res.error)
      }
    } catch (err) {
      console.error('[NoticeManagement] Error updating notice:', err)
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return
    
    try {
      const res = await apiDeleteNotice(id)
      if (res.ok) {
        setNotices(prev => prev.filter(n => n.id !== id && n._id !== id))
      } else {
        console.error('[NoticeManagement] Failed to delete notice:', res.error)
      }
    } catch (err) {
      console.error('[NoticeManagement] Error deleting notice:', err)
    }
  }

  const handlePublish = async (id) => {
    try {
      const res = await apiPublishNotice(id)
      if (res.ok) {
        setNotices(prev => prev.map(n => (n.id === id || n._id === id) ? res.notice : n))
      } else {
        console.error('[NoticeManagement] Failed to toggle publish status:', res.error)
      }
    } catch (err) {
      console.error('[NoticeManagement] Error toggling publish:', err)
    }
  }

  const handlePin = async (id) => {
    try {
      const res = await apiPinNotice(id)
      if (res.ok) {
        setNotices(prev => prev.map(n => (n.id === id || n._id === id) ? res.notice : n))
      } else {
        console.error('[NoticeManagement] Failed to toggle pin status:', res.error)
      }
    } catch (err) {
      console.error('[NoticeManagement] Error toggling pin:', err)
    }
  }

  const handleEdit = (notice) => {
    setEditingNotice(notice)
    setFormData({
      title: notice.title,
      content: notice.content,
      targetAudience: notice.targetAudience,
      priority: notice.priority,
      category: notice.category || 'General',
      departmentId: notice.departmentId || '',
      department: notice.department || '',
      expiresAt: notice.expiresAt ? notice.expiresAt.slice(0, 16) : '',
      published: notice.published
    })
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      targetAudience: 'all',
      priority: 'medium',
      category: 'General',
      departmentId: '',
      department: '',
      expiresAt: '',
      published: false
    })
    setErrors({})
  }

  const handleCancel = () => {
    if (isSubmitting) return
    setShowAddForm(false)
    setEditingNotice(null)
    resetForm()
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400'
      case 'high': return 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-400'
      case 'medium': return 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400'
      default: return 'bg-slate-100 text-slate-700 dark:bg-gray-800 dark:text-gray-400'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Notices & Announcements</h1>
          <p className="text-slate-500 dark:text-gray-500 text-xs sm:text-sm mt-0.5">Create and manage notices for your college</p>
        </div>
        <button
          onClick={handleOpenAddForm}
          className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-500/20 active:scale-95 w-full sm:w-auto"
        >
          <Plus size={18} /> Create Notice
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Search notices by title or content..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 transition-all"
        />
      </div>

      {/* Filters & Scope */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Scope Toggle: All Notices vs My Notices */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setScopeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              scopeFilter === 'all'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All Notices ({notices.length})
          </button>
          <button
            type="button"
            onClick={() => setScopeFilter('mine')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              scopeFilter === 'mine'
                ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            My Notices ({myNoticesCount})
          </button>
        </div>

        {/* Priority Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
        {['all', 'urgent', 'high', 'medium', 'low'].map(p => {
          const count = p === 'all'
            ? notices.length
            : notices.filter(n => n.priority === p).length

          const isActive = selectedPriority === p

          return (
            <button
              key={p}
              type="button"
              onClick={() => setSelectedPriority(p)}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                isActive
                  ? p === 'urgent'
                    ? 'bg-rose-600 text-white shadow-sm shadow-rose-500/20'
                    : p === 'high'
                    ? 'bg-amber-500 text-white shadow-sm shadow-amber-500/20'
                    : 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/20'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-gray-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {p === 'urgent' && '🚨 '}
              {p === 'high' && '⚠️ '}
              {p}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-gray-400'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
        </div>
      </div>

      {/* Category Filters */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {['all', 'Examinations', 'Placements', 'Holiday', 'Administrative', 'Sports', 'General'].map(cat => {
          const count = cat === 'all'
            ? notices.length
            : notices.filter(n => n.category === cat).length

          const isActive = selectedCategory === cat

          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-gray-400 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {cat}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                isActive
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-gray-400'
              }`}>
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingNotice) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-4 md:p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            {editingNotice ? 'Edit Notice' : 'Create New Notice'}
          </h2>
          <form onSubmit={editingNotice ? handleUpdate : handleAdd} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-3 text-base focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all"
                placeholder="Enter notice title"
              />
              {errors.title && <p className="text-rose-500 text-xs mt-1">{errors.title}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-3 text-base focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all resize-none"
                placeholder="Enter notice content"
              />
              {errors.content && <p className="text-rose-500 text-xs mt-1">{errors.content}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Target Audience</label>
                <select
                  value={formData.targetAudience}
                  onChange={(e) => handleTargetAudienceChange(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-3 text-base focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all"
                >
                  <option value="all">All</option>
                  <option value="students">Students</option>
                  <option value="faculty">Faculty</option>
                  <option value="department">Department</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Priority</label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-3 text-base focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-3 text-base focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all"
                >
                  <option value="General">General</option>
                  <option value="Examinations">Examinations</option>
                  <option value="Placements">Placements</option>
                  <option value="Holiday">Holiday</option>
                  <option value="Administrative">Administrative</option>
                  <option value="Sports">Sports</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Expires At</label>
                <input
                  type="datetime-local"
                  value={formData.expiresAt}
                  onChange={(e) => setFormData({ ...formData, expiresAt: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-3 text-base focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Department</label>
              <select
                value={formData.departmentId}
                onChange={(e) => {
                  const dept = departments.find(d => d.id === e.target.value)
                  setFormData({ 
                    ...formData, 
                    departmentId: e.target.value,
                    department: dept?.name || ''
                  })
                }}
                disabled={formData.targetAudience !== 'department'}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-4 py-3 text-base focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <option value="">Select Department</option>
                {departments.map(dept => (
                  <option key={dept.id} value={dept.id}>{dept.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="published"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                className="w-5 h-5 rounded border-slate-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="published" className="text-sm text-slate-700 dark:text-gray-300 cursor-pointer select-none">Publish immediately</label>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 justify-end sm:justify-end">
              <button
                type="button"
                onClick={handleCancel}
                disabled={isSubmitting}
                className="w-full sm:w-auto px-6 py-3 text-slate-600 dark:text-gray-400 text-sm font-medium hover:text-slate-900 dark:hover:text-white transition-colors rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className={`w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-500/20 flex items-center justify-center gap-2 ${
                  isSubmitting ? 'opacity-60 cursor-not-allowed' : 'active:scale-95'
                }`}
              >
                {isSubmitting && (
                  <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                )}
                {isSubmitting
                  ? (editingNotice ? 'Updating...' : 'Publishing...')
                  : (editingNotice ? 'Update Notice' : 'Create Notice')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Notices List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden">
        {filteredNotices.length === 0 ? (
          <div className="text-center py-12">
            <Megaphone size={32} className="text-slate-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-gray-500 text-sm">No notices found</p>
            <p className="text-slate-400 dark:text-gray-500 text-xs mt-1">Create a notice to communicate important information to your college.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredNotices.map((notice) => (
              <div key={notice.id || notice._id} className="p-4 md:p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h3 className="text-slate-900 dark:text-white font-semibold text-base">{notice.title}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getPriorityColor(notice.priority)}`}>
                        {notice.priority}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        notice.published ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-gray-400'
                      }`}>
                        {notice.published ? 'Published' : 'Draft'}
                      </span>
                      {notice.pinned && (
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-400">
                          Pinned
                        </span>
                      )}
                    </div>
                    <p className={`text-slate-600 dark:text-gray-400 text-sm mb-2 whitespace-pre-line leading-relaxed ${
                      expandedNotices[notice.id || notice._id] ? '' : 'line-clamp-2'
                    }`}>
                      {notice.content}
                    </p>
                    {notice.content && notice.content.length > 100 && (
                      <button
                        type="button"
                        onClick={() => setExpandedNotices(prev => ({
                          ...prev,
                          [notice.id || notice._id]: !prev[notice.id || notice._id]
                        }))}
                        className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline mb-3 inline-block"
                      >
                        {expandedNotices[notice.id || notice._id] ? 'Show less' : 'Read full notice →'}
                      </button>
                    )}
                    <div className="flex flex-wrap items-center gap-3 md:gap-4 text-xs text-slate-500 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <User size={12} /> {notice.targetAudience}
                      </span>
                      {notice.createdBy && (
                        <span className="flex items-center gap-1 font-medium text-slate-700 dark:text-gray-300">
                          <User size={12} className="text-indigo-500" />
                          {typeof notice.createdBy === 'object' && notice.createdBy.name
                            ? `${notice.createdBy.name} (${notice.createdBy.role === 'faculty' ? 'Faculty' : 'College Admin'})`
                            : 'College Admin'}
                        </span>
                      )}
                      
                      {notice.department && (
                        <span className="flex items-center gap-1">
                          <Building2 size={12} /> {notice.department}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar size={12} /> {new Date(notice.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {canManageNotice(notice) && (
                    <div className="flex items-center justify-end sm:justify-start gap-1 pt-2 sm:pt-0 border-t border-slate-100 dark:border-slate-800/60 sm:border-0 mt-3 sm:mt-0 flex-shrink-0">
                      <button
                        onClick={() => handlePin(notice.id || notice._id)}
                      className={`p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors ${notice.pinned ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-600 dark:text-gray-400'}`}
                      title={notice.pinned ? 'Unpin' : 'Pin'}
                    >
                      <Pin size={16} fill={notice.pinned ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={() => handlePublish(notice.id || notice._id)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title={notice.published ? 'Unpublish' : 'Publish'}
                    >
                      {notice.published ? (
                        <EyeOff size={16} className="text-slate-600 dark:text-gray-400" />
                      ) : (
                        <Eye size={16} className="text-slate-600 dark:text-gray-400" />
                      )}
                    </button>
                    <button
                      onClick={() => handleEdit(notice)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                      title="Edit"
                    >
                      <Edit size={16} className="text-slate-600 dark:text-gray-400" />
                    </button>
                    <button
                      onClick={() => handleDelete(notice.id || notice._id)}
                      className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-rose-600 dark:text-rose-400" />
                    </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
