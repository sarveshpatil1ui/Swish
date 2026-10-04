// src/pages/ProtectedRoute.jsx
// ─────────────────────────────────────────────────────────────────────────────
// Route guard that waits for the /api/auth/me rehydration on page load before
// making redirect decisions. Without this, a hard refresh would flash-redirect
// authenticated users to /login while the session check is still in-flight.
// ─────────────────────────────────────────────────────────────────────────────
import { Navigate } from 'react-router-dom'
import { useSwish } from '../context/SwishContext'

export default function ProtectedRoute({ children, dashboardOnly = false, allowedRoles,requirePasswordChange = false }) {
  const { isAuthenticated, currentUser, authLoading } = useSwish()

  // While the /api/auth/me call is in-flight, show a clear loading state
  // instead of a blank screen (prevents flash redirect).
  if (authLoading) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-3 bg-white dark:bg-gray-950"
        role="status"
        aria-live="polite"
        aria-label="Checking your session"
      >
        <div className="w-8 h-8 border-2 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
        <p className="text-sm text-slate-500 dark:text-gray-400">Checking your session…</p>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'main_admin'

  if (
    requirePasswordChange &&
    currentUser?.role === 'college_admin' &&
    !currentUser?.mustChangePassword
  ) {
    return <Navigate to="/home" replace />
  }

  // Dashboard-only routes (/admin, /admin/pending-requests, etc.)
  if (dashboardOnly) {
    if (!isAdmin) {
      return <Navigate to="/home" replace />
    }
    return children
  }

  // Role-restricted routes
  if (allowedRoles) {
    const isAllowed = allowedRoles.includes(currentUser?.role) || (allowedRoles.includes('admin') && isAdmin)
    if (!isAllowed) {
      if (isAdmin) {
        return <Navigate to="/admin" replace />
      }
      if (currentUser?.role === 'college_admin') {
        return <Navigate to="/college-admin" replace />
      }
      if (currentUser?.role === 'faculty') {
        return <Navigate to="/faculty" replace />
      }
      return <Navigate to="/home" replace />
    }
    return children
  }

  // General student shell routes (/home, /messages, /explore, etc.)
  // Admins must stay in the admin portal and not access student feed / direct messages
  if (isAdmin) {
    return <Navigate to="/admin" replace />
  }
  if (currentUser?.role === 'college_admin') {
    return <Navigate to="/college-admin" replace />
  }

  return children
}
