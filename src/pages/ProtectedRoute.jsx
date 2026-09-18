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

  // While the /api/auth/me call is in-flight, show nothing (prevents flash redirect)
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="w-8 h-8 border-2 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }
  if (
  requirePasswordChange &&
  currentUser?.role === 'college_admin' &&
  !currentUser?.mustChangePassword
) {
  return <Navigate to="/home" replace />
}

 if (allowedRoles && !allowedRoles.includes(currentUser?.role)) {
  if (currentUser?.role === 'admin') {
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

  if (dashboardOnly && currentUser?.role !== 'admin') {
    return <Navigate to="/home" replace />
  }

  return children
}
