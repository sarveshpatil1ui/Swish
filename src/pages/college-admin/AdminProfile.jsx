import { useState, useEffect } from 'react'
import {
  User, Mail, Briefcase, Building2, Save, Edit2, Lock, Shield,
  Camera, Trash2, Upload, Laptop, Smartphone, Tablet, Monitor,
  Globe, LogOut, CheckCircle2, AlertCircle, RefreshCw, Clock
} from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import {
  apiChangePassword,
  apiUpdateProfile,
  apiUploadProfilePhoto,
  apiRemoveProfilePhoto,
  apiGetSessions,
  apiRevokeOtherSessions,
  apiRevokeSession,
} from '../../utils/auth'

export default function AdminProfile() {
  const { currentUser, setCurrentUser } = useSwish()
  const [editing, setEditing] = useState(false)
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
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

  // ── Active Sessions & Device State ─────────────────────────────────────────
  const [sessions, setSessions] = useState([])
  const [loadingSessions, setLoadingSessions] = useState(true)
  const [revokingSessionId, setRevokingSessionId] = useState(null)
  const [terminatingOthers, setTerminatingOthers] = useState(false)
  const [sessionError, setSessionError] = useState(null)

  const fetchSessions = async () => {
    try {
      setLoadingSessions(true)
      setSessionError(null)
      const res = await apiGetSessions()
      if (res.ok && Array.isArray(res.sessions)) {
        setSessions(res.sessions)
      } else {
        setSessionError(res.error || 'Failed to load active sessions')
      }
    } catch (err) {
      console.error('[AdminProfile] Error fetching sessions:', err)
      setSessionError('Failed to load active sessions')
    } finally {
      setLoadingSessions(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  const handleRevokeSession = async (sessionId) => {
    if (!sessionId) return
    setRevokingSessionId(sessionId)
    try {
      const res = await apiRevokeSession(sessionId)
      if (res.ok) {
        setSuccessMessage('Session revoked successfully')
        setTimeout(() => setSuccessMessage(''), 3000)
        await fetchSessions()
      } else {
        setSessionError(res.error || 'Failed to revoke session')
      }
    } catch (err) {
      console.error('[AdminProfile] Error revoking session:', err)
      setSessionError('Failed to revoke session')
    } finally {
      setRevokingSessionId(null)
    }
  }

  const handleTerminateOtherSessions = async () => {
    if (!confirm('Are you sure you want to terminate all other active sessions and remembered devices? Your current session will remain active.')) {
      return
    }
    setTerminatingOthers(true)
    try {
      const res = await apiRevokeOtherSessions()
      if (res.ok) {
        setSuccessMessage('All other active sessions have been terminated')
        setTimeout(() => setSuccessMessage(''), 3000)
        await fetchSessions()
      } else {
        setSessionError(res.error || 'Failed to terminate other sessions')
      }
    } catch (err) {
      console.error('[AdminProfile] Error terminating other sessions:', err)
      setSessionError('Failed to terminate other sessions')
    } finally {
      setTerminatingOthers(false)
    }
  }

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
      const res = await apiUpdateProfile(currentUser.id, { 
        name: formData.name,
        designation: formData.designation
      })
      if (res.ok) {
        setEditing(false)
        setErrors({})
        setSuccessMessage('Profile updated successfully')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setErrors({ profile: res.error || 'Failed to update profile' })
      }
    } catch (err) {
      console.error('[AdminProfile] Error updating profile:', err)
      setErrors({ profile: 'Failed to update profile' })
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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif']
    if (!validTypes.includes(file.type)) {
      setErrors({ photo: 'Only JPEG, PNG, WEBP, or GIF images are allowed.' })
      return
    }

    // Validate file size (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setErrors({ photo: 'Image must be 5MB or smaller.' })
      return
    }

    setUploadingPhoto(true)
    setErrors({})

    try {
      const res = await apiUploadProfilePhoto(file)
      if (res.ok) {
        setCurrentUser(res.user)
        setSuccessMessage('Profile photo updated successfully')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setErrors({ photo: res.error || 'Failed to upload photo' })
      }
    } catch (err) {
      console.error('[AdminProfile] Error uploading photo:', err)
      setErrors({ photo: 'Failed to upload photo' })
    } finally {
      setUploadingPhoto(false)
    }
  }

  const handleRemovePhoto = async () => {
    if (!confirm('Are you sure you want to remove your profile photo?')) return

    setUploadingPhoto(true)
    try {
      const res = await apiRemoveProfilePhoto()
      if (res.ok) {
        setCurrentUser(res.user)
        setSuccessMessage('Profile photo removed successfully')
        setTimeout(() => setSuccessMessage(''), 3000)
      } else {
        setErrors({ photo: res.error || 'Failed to remove photo' })
      }
    } catch (err) {
      console.error('[AdminProfile] Error removing photo:', err)
      setErrors({ photo: 'Failed to remove photo' })
    } finally {
      setUploadingPhoto(false)
    }
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
            <div className="relative">
              {currentUser?.profilePhoto ? (
                <img
                  src={currentUser.profilePhoto}
                  alt={currentUser.name}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white/30"
                />
              ) : (
                <div
                  className="w-20 h-20 rounded-full flex items-center justify-center text-white text-2xl font-bold border-4 border-white/30"
                  style={{ backgroundColor: currentUser?.avatarColor || '#6366f1' }}
                >
                  {currentUser?.initials}
                </div>
              )}
              <label className="absolute bottom-0 right-0 bg-white text-indigo-600 rounded-full p-1.5 cursor-pointer hover:bg-indigo-50 transition-colors shadow-lg">
                <Camera size={14} />
                <input
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handlePhotoUpload}
                  className="hidden"
                  disabled={uploadingPhoto}
                />
              </label>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-white">{currentUser?.name}</h2>
              <p className="text-indigo-200 text-sm">College Admin</p>
              <p className="text-indigo-200 text-xs mt-1">{currentUser?.college}</p>
            </div>
            {currentUser?.profilePhoto && (
              <button
                onClick={handleRemovePhoto}
                disabled={uploadingPhoto}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
              >
                <Trash2 size={12} />
                Remove
              </button>
            )}
          </div>
          {errors.photo && (
            <p className="text-rose-200 text-xs mt-2">{errors.photo}</p>
          )}
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
                {errors.profile && <p className="text-rose-500 text-sm">{errors.profile}</p>}
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

          {/* Active Sessions & Devices Section */}
          <div className="border-t border-slate-200 dark:border-slate-800 pt-6 mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                  <Monitor size={18} className="text-indigo-600 dark:text-indigo-400" />
                  Active Sessions & Devices
                </h3>
                <p className="text-xs text-slate-500 dark:text-gray-400 mt-0.5">
                  Devices and locations where your administrator account is currently active.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={fetchSessions}
                  disabled={loadingSessions}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors border border-slate-200 dark:border-slate-700 disabled:opacity-50"
                  title="Refresh active sessions"
                >
                  <RefreshCw size={13} className={loadingSessions ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>

                {sessions.some((s) => !s.isCurrent) && (
                  <button
                    type="button"
                    onClick={handleTerminateOtherSessions}
                    disabled={terminatingOthers}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors border border-rose-200 dark:border-rose-900/60 disabled:opacity-50"
                  >
                    <LogOut size={13} />
                    <span>{terminatingOthers ? 'Terminating...' : 'Terminate Other Sessions'}</span>
                  </button>
                )}
              </div>
            </div>

            {sessionError && (
              <div className="mb-4 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl p-3 flex items-center gap-2 text-rose-700 dark:text-rose-400 text-xs">
                <AlertCircle size={16} className="flex-shrink-0" />
                <span>{sessionError}</span>
              </div>
            )}

            {loadingSessions && sessions.length === 0 ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2">
                <div className="w-5 h-5 border-2 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
                <p className="text-xs text-slate-400">Loading active sessions...</p>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-6 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                <Monitor size={24} className="mx-auto text-slate-400 dark:text-gray-500 mb-1" />
                <p className="text-xs text-slate-500 dark:text-gray-400 font-medium">No other active sessions detected.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sessions.map((s) => {
                  const isMobile = s.deviceType === 'mobile'
                  const isTablet = s.deviceType === 'tablet'
                  const DeviceIcon = isMobile ? Smartphone : isTablet ? Tablet : Monitor

                  return (
                    <div
                      key={s.id}
                      className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 ${
                        s.isCurrent
                          ? 'bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-800/60'
                          : 'bg-slate-50/70 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${
                            s.isCurrent
                              ? 'bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-400'
                              : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <DeviceIcon size={18} />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-semibold text-slate-900 dark:text-white">
                              {s.deviceName || `${s.browser} on ${s.os}`}
                            </p>
                            {s.isCurrent && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Current Session
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 mt-1 text-xs text-slate-500 dark:text-gray-400 flex-wrap">
                            <span className="flex items-center gap-1 font-mono text-[11px]">
                              {s.ipAddress}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Globe size={11} className="text-slate-400" />
                              {s.location || 'Local Network'}
                            </span>
                            <span>•</span>
                            <span className="flex items-center gap-1">
                              <Clock size={11} className="text-slate-400" />
                              {s.isCurrent ? 'Active now' : `Last active: ${new Date(s.lastActivity).toLocaleDateString()} ${new Date(s.lastActivity).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                            </span>
                          </div>
                        </div>
                      </div>

                      {!s.isCurrent && (
                        <div className="sm:self-center flex-shrink-0">
                          <button
                            type="button"
                            onClick={() => handleRevokeSession(s.id)}
                            disabled={revokingSessionId === s.id}
                            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg border border-rose-200 dark:border-rose-900/60 transition-colors disabled:opacity-50"
                          >
                            <LogOut size={12} />
                            <span>{revokingSessionId === s.id ? 'Revoking...' : 'Revoke'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
