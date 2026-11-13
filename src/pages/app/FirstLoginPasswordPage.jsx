import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSwish } from '../../context/SwishContext'
import {
  LockKeyhole,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
function PasswordInput({
  value,
  onChange,
  placeholder,
  show,
  setShow,
}) {
  return (
    <div className="relative">
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full px-4 py-3 pr-12 rounded-xl border border-base-200 dark:border-base-750 bg-white dark:bg-base-900 text-base-900 dark:text-white placeholder-base-400 focus:outline-none focus:ring-2 focus:ring-accent-500/20 focus:border-accent-400 transition-all text-sm"
      />

      <button
        type="button"
        onClick={() => setShow((prev) => !prev)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-base-400 hover:text-base-700 dark:hover:text-white transition-colors"
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  )
}
export default function FirstLoginPasswordPage() {
  const navigate = useNavigate()
  const { changePassword } = useSwish()

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()

    setError('')
    setSuccess('')

    if (!currentPassword) {
      setError('Please enter your temporary password.')
      return
    }

    if (newPassword.length < 8) {
      setError(
        'New password must be at least 8 characters long.'
      )
      return
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.')
      return
    }

    if (currentPassword === newPassword) {
      setError(
        'New password must be different from your temporary password.'
      )
      return
    }

    try {
      setLoading(true)

      const result = await changePassword(currentPassword, newPassword)

      if (!result.ok) {
        throw new Error(
          result.error || 'Unable to change password.'
        )
      }

      setSuccess(
        'Password changed successfully. Redirecting...'
      )

      setTimeout(() => {
        navigate('/college-admin')
      }, 1000)
    } catch (err) {
      console.error('[First Login Password Change]', err)

      setError(
        err.message || 'Unable to change password.'
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-base-50 dark:bg-base-950 flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-base-900 border border-base-100 dark:border-[rgba(255,255,255,0.07)] rounded-xl shadow-xs p-7">
          <div className="w-14 h-14 rounded-xl bg-accent-50 dark:bg-accent-950/40 border border-accent-100 dark:border-accent-900/40 flex items-center justify-center mb-5">
            <LockKeyhole
              size={26}
              className="text-accent-600 dark:text-accent-400"
            />
          </div>

          <h1 className="text-2xl font-bold text-base-900 dark:text-white" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
            Change Your Password
          </h1>

          <p className="text-sm text-base-500 dark:text-base-400 mt-2">
            This is your first login. For security, please
            create a new password before continuing.
          </p>

          <div className="mt-5 flex items-start gap-3 rounded-xl bg-accent-50 dark:bg-accent-950/30 border border-accent-100 dark:border-accent-900/50 p-4">
            <ShieldCheck
              size={18}
              className="text-accent-600 dark:text-accent-400 mt-0.5 shrink-0"
            />

            <p className="text-xs text-accent-700 dark:text-accent-300">
              Your temporary password should not be reused.
              Choose a strong password that only you know.
            </p>
          </div>

          {error && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-rose-200 dark:border-rose-900 bg-rose-50 dark:bg-rose-950/30 px-4 py-3 text-sm text-rose-700 dark:text-rose-300">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mt-5 flex items-start gap-2 rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/30 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
              <CheckCircle2
                size={17}
                className="mt-0.5 shrink-0"
              />
              <span>{success}</span>
            </div>
          )}

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium mb-2 text-base-700 dark:text-base-300">
                Temporary Password
              </label>

              <PasswordInput
                value={currentPassword}
                onChange={(e) =>
                  setCurrentPassword(e.target.value)
                }
                placeholder="Enter temporary password"
                show={showCurrent}
                setShow={setShowCurrent}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-base-700 dark:text-base-300">
                New Password
              </label>

              <PasswordInput
                value={newPassword}
                onChange={(e) =>
                  setNewPassword(e.target.value)
                }
                placeholder="Enter new password"
                show={showNew}
                setShow={setShowNew}
              />

              <p className="text-xs text-base-400 mt-1.5">
                Minimum 8 characters.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2 text-base-700 dark:text-base-300">
                Confirm New Password
              </label>

              <PasswordInput
                value={confirmPassword}
                onChange={(e) =>
                  setConfirmPassword(e.target.value)
                }
                placeholder="Re-enter new password"
                show={showConfirm}
                setShow={setShowConfirm}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 rounded-xl bg-accent-500 text-white font-medium hover:bg-accent-600 disabled:opacity-50 transition-colors shadow-xs"
            >
              {loading
                ? 'Updating Password...'
                : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}