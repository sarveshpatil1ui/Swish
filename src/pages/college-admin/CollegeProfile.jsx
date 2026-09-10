import { useState, useEffect } from 'react'
import { Building2, MapPin, Globe, Phone, Mail, Save, Edit2 } from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { apiGetMyCollege, apiUpdateCollege } from '../../utils/auth'

export default function CollegeProfile() {
  const { currentUser } = useSwish()
  const [college, setCollege] = useState(null)
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    location: '',
    website: '',
    address: '',
    phone: '',
    email: '',
    description: ''
  })
  const [errors, setErrors] = useState({})

  useEffect(() => {
    fetchCollege()
  }, [])

  const fetchCollege = async () => {
    try {
      const res = await apiGetMyCollege()
      if (res.ok) {
        setCollege(res.college)
        setFormData({
          name: res.college.name || '',
          code: res.college.code || '',
          location: res.college.location || '',
          website: res.college.website || '',
          address: res.college.address || '',
          phone: res.college.phone || '',
          email: res.college.email || '',
          description: res.college.description || ''
        })
      }
    } catch (err) {
      console.error('[CollegeProfile] Error fetching college:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (e) => {
    e.preventDefault()
    const validationErrors = {}
    if (!formData.name.trim()) validationErrors.name = 'Required'
    if (!formData.code.trim()) validationErrors.code = 'Required'
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    try {
      const res = await apiUpdateCollege(college._id || college.id, formData)
      if (res.ok) {
        setCollege(res.college)
        setEditing(false)
        setErrors({})
      } else {
        console.error('[CollegeProfile] Failed to update college profile:', res.error)
      }
    } catch (err) {
      console.error('[CollegeProfile] Error updating college:', err)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setFormData({
      name: college?.name || '',
      code: college?.code || '',
      location: college?.location || '',
      website: college?.website || '',
      address: college?.address || '',
      phone: college?.phone || '',
      email: college?.email || '',
      description: college?.description || ''
    })
    setErrors({})
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    )
  }

  if (!college) {
    return (
      <div className="text-center py-12">
        <Building2 size={32} className="text-slate-300 dark:text-gray-600 mx-auto mb-3" />
        <p className="text-slate-500 dark:text-gray-500 text-sm">College information not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">College Profile</h1>
          <p className="text-slate-500 dark:text-gray-500 mt-1">Manage your college information</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors"
          >
            <Edit2 size={18} /> Edit Profile
          </button>
        )}
      </div>

      {/* College Info Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-8">
          <div className="flex items-center gap-4">
            <div className="w-20 h-20 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center">
              <Building2 size={32} className="text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{college.name}</h2>
              <p className="text-indigo-200 text-sm">{college.code}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {editing ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">College Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                  />
                  {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">College Code</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                  />
                  {errors.code && <p className="text-rose-500 text-xs mt-1">{errors.code}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Location</label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Website</label>
                  <input
                    type="url"
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Phone</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                />
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
                  disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                  <Save size={16} /> {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-slate-400 dark:text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-gray-500">Location</p>
                    <p className="text-slate-900 dark:text-white font-medium">{college.location || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Globe size={18} className="text-slate-400 dark:text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-gray-500">Website</p>
                    {college.website ? (
                      <a href={college.website} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                        {college.website}
                      </a>
                    ) : (
                      <p className="text-slate-900 dark:text-white font-medium">Not specified</p>
                    )}
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Phone size={18} className="text-slate-400 dark:text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-gray-500">Phone</p>
                    <p className="text-slate-900 dark:text-white font-medium">{college.phone || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail size={18} className="text-slate-400 dark:text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-gray-500">Email</p>
                    {college.email ? (
                      <a href={`mailto:${college.email}`} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline">
                        {college.email}
                      </a>
                    ) : (
                      <p className="text-slate-900 dark:text-white font-medium">Not specified</p>
                    )}
                  </div>
                </div>
              </div>
              {college.address && (
                <div className="flex items-start gap-3">
                  <MapPin size={18} className="text-slate-400 dark:text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-gray-500">Address</p>
                    <p className="text-slate-900 dark:text-white font-medium">{college.address}</p>
                  </div>
                </div>
              )}
              {college.description && (
                <div>
                  <p className="text-sm text-slate-500 dark:text-gray-500 mb-2">About</p>
                  <p className="text-slate-700 dark:text-gray-300 text-sm leading-relaxed">{college.description}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
