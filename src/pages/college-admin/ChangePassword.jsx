import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react'
import { useSwish } from '../../context/SwishContext'
import { apiChangePassword } from '../../utils/auth'

export default function ChangePassword() {
  const navigate = useNavigate()
  const { currentUser } = useSwish()
  const [showPassword, setShowPassword] = useState({ current: false, new: false, confirm: false })
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  const validateForm = () => {
    const validationErrors = {}
    
    if (!formData.currentPassword) {
      validationErrors.currentPassword = 'Current password is required'
    }
    
    if (!formData.newPassword) {
      validationErrors.newPassword = 'New password is required'
    } else if (formData.newPassword.length < 8) {
      validationErrors.newPassword = 'Password must be at least 8 characters'
    }
    
    if (!formData.confirmPassword) {
      validationErrors.confirmPassword = 'Please confirm your new password'
    } else if (formData.newPassword !== formData.confirmPassword) {
      validationErrors.confirmPassword = 'Passwords do not match'
    }
    
    setErrors(validationErrors)
    return Object.keys(validationErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!validateForm()) return
    
    setLoading(true)
    try {
      const res = await apiChangePassword(formData.currentPassword, formData.newPassword)
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => {
          navigate('/college-admin')
        }, 2000)
      } else {
        setErrors({ form: res.error || 'Failed to change password' })
      }
    } catch (err) {
      console.error('[ChangePassword] Error:', err)
      setErrors({ form: 'Failed to change password. Please try again.' })
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-8 max-w-md w-full mx-4 text-center">
          <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={32} className="text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Password Changed!</h2>
          <p className="text-slate-500 dark:text-gray-500 mb-4">Your password has been successfully updated. Redirecting to dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 border border-slate-200 dark:border-gray-800 rounded-2xl p-8 max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-indigo-100 dark:bg-indigo-950/60 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock size={32} className="text-indigo-600 dark:text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Change Password</h1>
          <p className="text-slate-500 dark:text-gray-500 text-sm mt-2">
            {currentUser?.mustChangePassword 
              ? 'You must change your password before continuing'
              : 'Update your password to keep your account secure'
            }
          </p>
        </div>

        {/* Error Message */}
        {errors.form && (
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-400 px-4 py-3 rounded-xl text-sm mb-4 flex items-center gap-2">
            <AlertCircle size={16} />
            {errors.form}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Current Password</label>
            <div className="relative">
              <input
                type={showPassword.current ? 'text' : 'password'}
                value={formData.currentPassword}
                onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-white rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300"
              >
                {showPassword.current ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.currentPassword && <p className="text-rose-500 text-xs mt-1">{errors.currentPassword}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">New Password</label>
            <div className="relative">
              <input
                type={showPassword.new ? 'text' : 'password'}
                value={formData.newPassword}
                onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-white rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300"
              >
                {showPassword.new ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.newPassword && <p className="text-rose-500 text-xs mt-1">{errors.newPassword}</p>}
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-gray-300 mb-1">Confirm New Password</label>
            <div className="relative">
              <input
                type={showPassword.confirm ? 'text' : 'password'}
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                className="w-full bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-900 dark:text-white rounded-lg px-3 py-2.5 pr-10 focus:outline-none focus:border-indigo-400 dark:focus:border-indigo-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-300"
              >
                {showPassword.confirm ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-rose-500 text-xs mt-1">{errors.confirmPassword}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Changing Password...' : 'Change Password'}
          </button>
        </form>

        {/* Password Requirements */}
        <div className="mt-6 p-4 bg-slate-50 dark:bg-gray-800 rounded-xl">
          <p className="text-xs font-medium text-slate-700 dark:text-gray-300 mb-2">Password Requirements:</p>
          <ul className="text-xs text-slate-500 dark:text-gray-500 space-y-1">
            <li>• At least 8 characters long</li>
            <li>• Different from current password</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
