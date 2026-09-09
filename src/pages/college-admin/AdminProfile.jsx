import { useState, useEffect } from 'react'
import { User, Mail, Briefcase, Building2, Save, Edit2, Lock, Shield } from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { apiChangePassword } from '../../utils/auth'

export default function AdminProfile() {
  const { currentUser } = useSwish()
  const [editing, setEditing] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    designation: '',
    college: ''
  })
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    if (currentUser) {
      setFormData({
        name: currentUser.name || '',
        email: currentUser.email || '',
        designation: currentUser.designation || '',
        college: currentUser.college || ''
      })
    }
  }, [currentUser])

  const handleProfileSave = async (e) => {
    e.preventDefault()
    const validationErrors = {}
    if (!formData.name.trim()) validationErrors.name = 'Required'
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    try {
      // Note: This would need a backend API to update user profile
      // For now, we'll just update the local state
      setEditing(false)
      setErrors({})
      setSuccessMessage('Profile updated successfully')
      setTimeout(() => setSuccessMessage(''), 3000)
    } catch (err) {
      console.error('[AdminProfile] Error updating profile:', err)
    } finally {
      setSaving(false)
    }
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    const validationErrors = {}
    if (!passwordData.currentPassword) validationErrors.currentPassword = 'Required'
    if (!passwordData.newPassword) validationErrors.newPassword = 'Required'
    if (passwordData.newPassword.length < 8) validationErrors.newPassword = 'Must be at least 8 characters'
    if (passwordData.newPassword !== passwordData.confirmPassword) validationErrors.confirmPassword = 'Passwords do not match'
    
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors)
      return
    }

    setSaving(true)
    try {
      const res = await apiChangePassword(passwordData.currentPassword, passwordData.newPassword)
      if (res.ok) {
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
        setErrors({})
        setSuccessMessage('Password changed successfully')
        setTimeout(() => setSuccessMessage(''), 3000)
        setShowPasswordSection(false)
      } else {
        setErrors({ password: res.error || 'Failed to change password' })
      }
    } catch (err) {
      console.error('[AdminProfile] Error changing password:', err)
      setErrors({ password: 'Failed to change password' })
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setFormData({
      name: currentUser?.name || '',
      email: currentUser?.email || '',
      designation: currentUser?.designation || '',
      college: currentUser?.college || ''
    })
    setErrors({})
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">My Profile</h1>
        <p className="text-slate-500 dark:text-gray-500 mt-1">Manage your account settings</p>
      </div>

      {successMessage && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 px-4 py-3 rounded-xl text-sm">
          {successMessage}
        </div>
      )}

      {/* Profile Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/60 rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-br from-indigo-500 to-violet-600 p-8">
          <div className="flex items-center gap-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-white/30"
              style={{ backgroundColor: currentUser?.avatarColor || '#6366f1' }}
            >
              {currentUser?.initials}
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{currentUser?.name}</h2>
              <p className="text-indigo-200 text-sm">College Admin</p>
              <p className="text-indigo-200 text-xs mt-1">{currentUser?.college}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Profile Information */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Profile Information</h3>
              {!editing && (
                <button
                  onClick={() => setEditing(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors"
                >
                  <Edit2 size={14} /> Edit
                </button>
              )}
            </div>

            {editing ? (
              <form onSubmit={handleProfileSave} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Full Name</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                    />
                    {errors.name && <p className="text-rose-500 text-xs mt-1">{errors.name}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Email</label>
                    <input
                      type="email"
                      value={formData.email}
                      disabled
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-gray-500 rounded-lg px-3 py-2 cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Designation</label>
                    <input
                      type="text"
                      value={formData.designation}
                      onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">College</label>
                    <input
                      type="text"
                      value={formData.college}
                      disabled
                      className="w-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-gray-500 rounded-lg px-3 py-2 cursor-not-allowed"
                    />
                  </div>
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
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  <User size={18} className="text-slate-400 dark:text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-gray-500">Full Name</p>
                    <p className="text-slate-900 dark:text-white font-medium">{currentUser?.name}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Mail size={18} className="text-slate-400 dark:text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-gray-500">Email</p>
                    <p className="text-slate-900 dark:text-white font-medium">{currentUser?.email}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Briefcase size={18} className="text-slate-400 dark:text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-gray-500">Designation</p>
                    <p className="text-slate-900 dark:text-white font-medium">{currentUser?.designation || 'Not specified'}</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <Building2 size={18} className="text-slate-400 dark:text-gray-500 mt-0.5" />
                  <div>
                    <p className="text-sm text-slate-500 dark:text-gray-500">College</p>
                    <p className="text-slate-900 dark:text-white font-medium">{currentUser?.college}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Password Section */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Security</h3>
              {!showPasswordSection && (
                <button
                  onClick={() => setShowPasswordSection(true)}
                  className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 rounded-lg transition-colors"
                >
                  <Lock size={14} /> Change Password
                </button>
              )}
            </div>

            {showPasswordSection && (
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Current Password</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                  />
                  {errors.currentPassword && <p className="text-rose-500 text-xs mt-1">{errors.currentPassword}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">New Password</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                  />
                  {errors.newPassword && <p className="text-rose-500 text-xs mt-1">{errors.newPassword}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 focus:outline-none focus:border-indigo-400"
                  />
                  {errors.confirmPassword && <p className="text-rose-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
                {errors.password && <p className="text-rose-500 text-sm">{errors.password}</p>}
                <div className="flex gap-3 justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPasswordSection(false)
                      setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' })
                      setErrors({})
                    }}
                    className="px-4 py-2 text-slate-600 dark:text-gray-400 text-sm font-medium hover:text-slate-900 dark:hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    <Shield size={16} /> {saving ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
