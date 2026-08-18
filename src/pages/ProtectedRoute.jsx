import { Navigate } from 'react-router-dom'
import { useSwish } from '../context/SwishContext'

export default function ProtectedRoute({ children, dashboardOnly = false, allowedRoles }) {
  const { isAuthenticated, currentUser } = useSwish()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (allowedRoles && !allowedRoles.includes(currentUser?.role)) {
    return <Navigate to={currentUser?.role === 'faculty' ? '/faculty' : '/home'} replace />
  }

  if (dashboardOnly && currentUser?.role !== 'admin') {
    return <Navigate to="/home" replace />
  }

  return children
}
