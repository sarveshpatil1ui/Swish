import { useState, useEffect } from 'react'
import { Search, Building2, Plus, Edit, Trash2, ToggleRight, ToggleLeft, User } from 'lucide-react'
import { apiGetDepartments, apiCreateDepartment, apiUpdateDepartment, apiToggleDepartment } from '../../utils/auth'

export default function DepartmentManagement() {
  const [departments, setDepartments] = useState([])
  const [filteredDepartments, setFilteredDepartments] = useState([])
  const [searchQuery, setSearchQuery] = useState('')
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingDept, setEditingDept] = useState(null)
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({ name: '', code: '', description: '', headOfDepartment: '' })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchDepartments()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      const filtered = departments.filter(d =>
        d.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        d.code?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredDepartments(filtered)
    } else {
      setFilteredDepartments(departments)
    }
  }, [searchQuery, departments])

  const fetchDepartments = async () => {
    try {
      const res = await apiGetDepartments()
      if (res.ok) {
        setDepartments(res.departments)
        setFilteredDepartments(res.departments)
      }
    } catch (err) {
      console.error('[DepartmentManagement] Error fetching departments:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleAdd = async (e) => {
    e.preventDefault()
    const validationErrors = {}
    if (!formData.name.trim()) validationErrors.name = 'Required'
    if (!formData.code.trim()) validationErrors.code = 'Required'
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    try {
      const res = await apiCreateDepartment(formData)
      if (res.ok) {
        setDepartments(prev => [...prev, res.department])
        setShowAddForm(false)
        setFormData({ name: '', code: '', description: '', headOfDepartment: '' })
        setErrors({})
      } else {
        alert(res.error || 'Failed to create department')
      }
    } catch (err) {
      console.error('[DepartmentManagement] Error creating department:', err)
    }
  }

  const handleUpdate = async (e) => {
    e.preventDefault()
    const validationErrors = {}
    if (!formData.name.trim()) validationErrors.name = 'Required'
    if (!formData.code.trim()) validationErrors.code = 'Required'
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    try {
      const res = await apiUpdateDepartment(editingDept.id, formData)
      if (res.ok) {
        setDepartments(prev => prev.map(d => d.id === editingDept.id ? res.department : d))
        setEditingDept(null)
        setFormData({ name: '', code: '', description: '', headOfDepartment: '' })
        setErrors({})
      } else {
        alert(res.error || 'Failed to update department')
      }
    } catch (err) {
      console.error('[DepartmentManagement] Error updating department:', err)
    }
  }

  const handleToggle = async (id) => {
    try {
      const res = await apiToggleDepartment(id)
      if (res.ok) {
        setDepartments(prev => prev.map(d => d.id === id ? res.department : d))
      } else {
        alert(res.error || 'Failed to toggle department status')
      }
    } catch (err) {
      console.error('[DepartmentManagement] Error toggling department:', err)
    }
  }

  const handleEdit = (dept) => {
    setEditingDept(dept)
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || '',
      headOfDepartment: dept.headOfDepartment || ''
    })
  }

  const handleCancel = () => {
    setShowAddForm(false)
    setEditingDept(null)
    setFormData({ name: '', code: '', description: '', headOfDepartment: '' })
    setErrors({})
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
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Department Management</h1>
          <p className="text-slate-500 dark:text-gray-500 mt-1">Manage departments in your college</p>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
        >
          <Plus size={18} /> Add Department
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500" />
        <input
          type="text"
          placeholder="Search departments by name or code..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-gray-500 rounded-xl pl-11 pr-4 py-3 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600 transition-all"
        />
      </div>

      {/* Add/Edit Form */}
      {(showAddForm || editingDept) && (
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            {editingDept ? 'Edit Department' : 'Add New Department'}
          </h2>
          <form onSubmit={editingDept ? handleUpdate : handleAdd} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Department Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
              />
              {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Department Code</label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
              />
              {errors.code && <p className="text-rose-500 text-xs mt-1">{errors.code}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Head of Department</label>
              <input
                type="text"
                value={formData.headOfDepartment}
                onChange={(e) => setFormData({ ...formData, headOfDepartment: e.target.value })}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Description</label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
              />
            </div>
            <div className="md:col-span-2 flex gap-3 justify-end">
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
                {editingDept ? 'Update Department' : 'Add Department'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Departments List */}
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl overflow-hidden">
        {filteredDepartments.length === 0 ? (
          <div className="text-center py-12">
            <Building2 size={32} className="text-slate-300 dark:text-gray-600 mx-auto mb-3" />
            <p className="text-slate-500 dark:text-gray-500 text-sm">No departments found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 dark:bg-gray-800/60 border-b border-slate-200 dark:border-gray-800">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Department</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Code</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Head</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-gray-800">
                {filteredDepartments.map((dept) => (
                  <tr key={dept.id} className="hover:bg-slate-50 dark:hover:bg-gray-800/30 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-100 dark:bg-violet-950/60 flex items-center justify-center">
                          <Building2 size={18} className="text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                          <p className="text-slate-900 dark:text-white font-medium text-sm">{dept.name}</p>
                          {dept.description && (
                            <p className="text-slate-500 dark:text-gray-500 text-xs truncate max-w-xs">{dept.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-mono text-slate-600 dark:text-gray-400 bg-slate-100 dark:bg-gray-800 px-2 py-1 rounded">
                        {dept.code}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-slate-900 dark:text-white text-sm flex items-center gap-1">
                        {dept.headOfDepartment ? (
                          <>
                            <User size={14} /> {dept.headOfDepartment}
                          </>
                        ) : (
                          <span className="text-slate-400 dark:text-gray-500">Not assigned</span>
                        )}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                        dept.active
                          ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40'
                          : 'text-slate-600 dark:text-gray-400 bg-slate-50 dark:bg-gray-800'
                      }`}>
                        {dept.active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEdit(dept)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit size={16} className="text-slate-600 dark:text-gray-400" />
                        </button>
                        <button
                          onClick={() => handleToggle(dept.id)}
                          className="p-2 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                          title={dept.active ? 'Deactivate' : 'Activate'}
                        >
                          {dept.active ? (
                            <ToggleLeft size={16} className="text-rose-600 dark:text-rose-400" />
                          ) : (
                            <ToggleRight size={16} className="text-emerald-600 dark:text-emerald-400" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
