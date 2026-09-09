import { useState, useEffect } from 'react'
import { Search, Megaphone, Plus, Edit, Trash2, Eye, EyeOff, Calendar, User, Building2 } from 'lucide-react'
import { apiGetNotices, apiCreateNotice, apiUpdateNotice, apiDeleteNotice, apiPublishNotice, apiGetDepartments } from '../../utils/auth'

export default function NoticeManagement() {
  const [notices, setNotices] = useState([])
  const [filteredNotices, setFilteredNotices] = useState([])
  const [departments, setDepartments] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingNotice, setEditingNotice] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    targetAudience: 'all',
    priority: 'medium',
    departmentId: '',
    department: '',
    published: false
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchData()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = notices.filter(n =>
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredNotices(filtered)
    } else {
      setFilteredNotices(notices)
    }
  }, [searchQuery, notices])

  const fetchData = async () => {
    try {
      const [noticesRes, deptsRes] = await Promise.all([
        apiGetNotices(),
        apiGetDepartments(),
      ])
      if (noticesRes.ok) {
        setNotices(noticesRes.notices)
        setFilteredNotices(noticesRes.notices)
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

  const handleAdd = async (e) => {
    e.preventDefault()
    const validationErrors = {}
    if (!formData.title.trim()) validationErrors.title = 'Required'
    if (!formData.content.trim()) validationErrors.content = 'Required'
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    try {
      const res = await apiCreateNotice(formData)
      if (res.ok) {
        setNotices(prev => [res.notice, ...prev])
        setShowAddForm(false)
        resetForm()
      } else {
        console.error('[NoticeManagement] Failed to create notice:', res.error)
      }
    } catch (err) {
      console.error('[NoticeManagement] Error creating notice:', err)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    const validationErrors = {}
    if (!formData.title.trim()) validationErrors.title = 'Required'
    if (!formData.content.trim()) validationErrors.content = 'Required'
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    try {
      const res = await apiUpdateNotice(editingNotice.id, formData)
      if (res.ok) {
        setNotices(prev => prev.map(n => n.id === editingNotice.id ? res.notice : n))
        setEditingNotice(null)
        resetForm()
      } else {
        console.error('[NoticeManagement] Failed to update notice:', res.error)
      }
    } catch (err) {
      console.error('[NoticeManagement] Error updating notice:', err)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this notice?')) return
    
    try {
      const res = await apiDeleteNotice(id)
      if (res.ok) {
        setNotices(prev => prev.filter(n => n.id !== id))
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
        setNotices(prev => prev.map(n => n.id === id ? res.notice : n))
      } else {
        console.error('[NoticeManagement] Failed to toggle publish status:', res.error)
      }
    } catch (err) {
      console.error('[NoticeManagement] Error toggling publish:', err)
    }
  }

  const handleEdit = (notice) => {
    setEditingNotice(notice)
    setFormData({
      title: notice.title,
      content: notice.content,
      targetAudience: notice.targetAudience,
      priority: notice.priority,
      departmentId: notice.departmentId || '',
      department: notice.department || '',
      published: notice.published
    })
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      targetAudience: 'all',
      priority: 'medium',
      departmentId: '',
      department: '',
      published: false
    })
    setErrors({})
  }

  const handleCancel = () => {
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Notices & Announcements</h1>
          <p className="text-slate-500 dark:text-gray-500 mt-1">Create and manage notices for your college</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
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

      {/* Add/Edit Form */}
      {(showAddForm || editingNotice) && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl p-6">
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
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
              />
              {errors.title && <p className="text-rose-500 text-xs mt-1">{errors.title}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                rows={4}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
              />
              {errors.content && <p className="text-rose-500 text-xs mt-1">{errors.content}</p>}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Target Audience</label>
                <select
                  value={formData.targetAudience}
                  onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
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
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400 disabled:opacity-50"
                >
                  <option value="">Select Department</option>
                  {departments.map(dept => (
                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="published"
                checked={formData.published}
                onChange={(e) => setFormData({ ...formData, published: e.target.checked })}
                className="rounded border-slate-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="published" className="text-sm text-slate-700 dark:text-gray-300">Publish immediately</label>
            </div>
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 text-slate-600 dark:text-gray-400 text-sm font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {editingNotice ? 'Update Notice' : 'Create Notice'}
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
              <div key={notice.id} className="p-6 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-slate-900 dark:text-white font-semibold">{notice.title}</h3>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${getPriorityColor(notice.priority)}`}>
                        {notice.priority}
                      </span>
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        notice.published ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-400' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-gray-400'
                      }`}>
                        {notice.published ? 'Published' : 'Draft'}
                      </span>
                    </div>
                    <p className="text-slate-600 dark:text-gray-400 text-sm mb-3 line-clamp-2">{notice.content}</p>
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-gray-500">
                      <span className="flex items-center gap-1">
                        <User size={12} /> {notice.targetAudience}
                      </span>
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
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePublish(notice.id)}
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
                      onClick={() => handleDelete(notice.id)}
                      className="p-2 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 size={16} className="text-rose-600 dark:text-rose-400" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
