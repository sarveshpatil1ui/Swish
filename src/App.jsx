import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { SwishProvider } from './context/SwishContext'
import { SocketProvider } from './context/SocketContext'
import { useSwish } from './context/SwishContext'

// ── Public pages ──────────────────────────────────────────────────────────────
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import JoinPage from './pages/JoinPage'
import CollegeOnboardingPage from './pages/CollegeOnboardingPage'
import ProtectedRoute from './pages/ProtectedRoute'

// ── Authenticated app shell ───────────────────────────────────────────────────
import AppLayout from './components/app/AppLayout'

// ── App pages ─────────────────────────────────────────────────────────────────
import HomePage from './pages/app/HomePage'
import ExplorePage from './pages/app/ExplorePage'
import ProfilePage from './pages/app/ProfilePage'
import NotificationsPage from './pages/app/NotificationsPage'
import AdminPage from './pages/app/AdminPage'
import SettingsPage from './pages/app/SettingsPage'
import FacultyPage from './pages/app/FacultyPage'
import MessagesPage from './pages/app/MessagesPage'
import PendingRequestsPage from './pages/app/PendingRequestsPage'
import PendingRequestReviewPage from './pages/app/PendingRequestReviewPage'
import FirstLoginPasswordPage from './pages/app/FirstLoginPasswordPage'


// ── College Admin pages ───────────────────────────────────────────────────────
import CollegeAdminLayout from './components/college-admin/CollegeAdminLayout'
import CollegeAdminDashboard from './pages/college-admin/CollegeAdminDashboard'
import StudentManagement from './pages/college-admin/StudentManagement'
import FacultyManagement from './pages/college-admin/FacultyManagement'
import DepartmentManagement from './pages/college-admin/DepartmentManagement'
import NoticeManagement from './pages/college-admin/NoticeManagement'
import CollegeProfile from './pages/college-admin/CollegeProfile'
import AdminProfile from './pages/college-admin/AdminProfile'
import ChangePassword from './pages/college-admin/ChangePassword'

// Inner wrapper so we can read currentUser from SwishContext
function SocketBridge({ children }) {
  const { currentUser } = useSwish()
  return (
    <SocketProvider userId={currentUser?.id}>
      {children}
    </SocketProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <SwishProvider>
        <SocketBridge>
          <BrowserRouter>
            <Routes>
              {/* ── Public ─────────────────────────────────────────────── */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/join" element={<JoinPage />} />
              <Route path="/college-onboarding" element={<CollegeOnboardingPage />} />

              {/* ── Authenticated app (sidebar + bottom nav layout) ─────── */}
              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/home" element={<HomePage />} />
                <Route path="/explore" element={<ExplorePage />} />
                <Route path="/profile/:userId" element={<ProfilePage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/messages" element={<MessagesPage />} />
              </Route>

              {/* ── Admin (requires admin role) ─────────────────────────── */}
            {/* ── Main Admin ───────────────────────────────────────────── */}
<Route
  path="/admin"
  element={
    <ProtectedRoute dashboardOnly>
      <AdminPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/admin/pending-requests"
  element={
    <ProtectedRoute dashboardOnly>
      <PendingRequestsPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/admin/pending-requests/:id"
  element={
    <ProtectedRoute dashboardOnly>
      <PendingRequestReviewPage />
    </ProtectedRoute>
  }
/>
<Route
  path="/first-login"
  element={
    <ProtectedRoute allowedRoles={['college_admin']} requirePasswordChange>
      <FirstLoginPasswordPage />
    </ProtectedRoute>
  }
/>

              {/* ── Faculty (accessible by faculty and admin) ───────────── */}
              <Route
                path="/faculty"
                element={
                  <ProtectedRoute allowedRoles={['faculty', 'admin']}>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<FacultyPage />} />
                <Route path="students" element={<FacultyPage defaultTab="Students" />} />
                <Route path="reports" element={<FacultyPage defaultTab="Reports" />} />
                <Route path="moderation" element={<FacultyPage defaultTab="Moderation" />} />
                <Route path="posts" element={<FacultyPage defaultTab="Posts" />} />
              </Route>

              {/* ── College Admin (requires college_admin role) ─────────── */}
              <Route
                path="/college-admin"
                element={
                  <ProtectedRoute allowedRoles={['college_admin']}>
                    <CollegeAdminLayout />
                  </ProtectedRoute>
                }
              >
                <Route index element={<CollegeAdminDashboard />} />
                <Route path="students" element={<StudentManagement />} />
                <Route path="faculty" element={<FacultyManagement />} />
                <Route path="departments" element={<DepartmentManagement />} />
                <Route path="notices" element={<NoticeManagement />} />
                <Route path="college-profile" element={<CollegeProfile />} />
                <Route path="profile" element={<AdminProfile />} />
              </Route>

              {/* ── Change Password (standalone, for forced password change) */}
              <Route
                path="/change-password"
                element={
                  <ProtectedRoute allowedRoles={['college_admin']}>
                    <ChangePassword />
                  </ProtectedRoute>
                }
              />

              {/* ── Fallback ────────────────────────────────────────────── */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </SocketBridge>
      </SwishProvider>
    </ThemeProvider>
  )
}

