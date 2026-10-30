import { useEffect, lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { SwishProvider } from './context/SwishContext'
import { SocketProvider, useSocket } from './context/SocketContext'
import { useSwish } from './context/SwishContext'

// ── Shared Route Fallback ─────────────────────────────────────────────────────
function PageFallback() {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-3 bg-white dark:bg-gray-950"
      role="status"
      aria-live="polite"
      aria-label="Loading page"
    >
      <div className="w-8 h-8 border-2 border-indigo-200 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin" />
      <p className="text-sm text-slate-500 dark:text-gray-400 font-medium">Loading…</p>
    </div>
  )
}

// ── Public pages (Lazy) ───────────────────────────────────────────────────────
const LandingPage = lazy(() => import('./pages/LandingPage'))
const LoginPage = lazy(() => import('./pages/LoginPage'))
const JoinPage = lazy(() => import('./pages/JoinPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const CollegeOnboardingPage = lazy(() => import('./pages/CollegeOnboardingPage'))
import ProtectedRoute from './pages/ProtectedRoute'

// ── Authenticated app shell ───────────────────────────────────────────────────
import AppLayout from './components/app/AppLayout'
import GlobalToast from './components/app/GlobalToast'

// ── App pages (Lazy) ──────────────────────────────────────────────────────────
const HomePage = lazy(() => import('./pages/app/HomePage'))
const ExplorePage = lazy(() => import('./pages/app/ExplorePage'))
const TrendingPage = lazy(() => import('./pages/app/TrendingPage'))
const ProfilePage = lazy(() => import('./pages/app/ProfilePage'))
const NotificationsPage = lazy(() => import('./pages/app/NotificationsPage'))
const AdminPage = lazy(() => import('./pages/app/AdminPage'))
const SettingsPage = lazy(() => import('./pages/app/SettingsPage'))
const FacultyPage = lazy(() => import('./pages/app/FacultyPage'))
const MessagesPage = lazy(() => import('./pages/app/MessagesPage'))
const PendingRequestsPage = lazy(() => import('./pages/app/PendingRequestsPage'))
const PendingRequestReviewPage = lazy(() => import('./pages/app/PendingRequestReviewPage'))
const FirstLoginPasswordPage = lazy(() => import('./pages/app/FirstLoginPasswordPage'))
const PostPage = lazy(() => import('./pages/app/PostPage'))

// ── College Admin pages (Lazy) ────────────────────────────────────────────────
const CollegeAdminLayout = lazy(() => import('./components/college-admin/CollegeAdminLayout'))
const CollegeAdminDashboard = lazy(() => import('./pages/college-admin/CollegeAdminDashboard'))
const CollegeAdminAnalytics = lazy(() => import('./pages/college-admin/CollegeAdminAnalytics'))
const StudentManagement = lazy(() => import('./pages/college-admin/StudentManagement'))
const FacultyManagement = lazy(() => import('./pages/college-admin/FacultyManagement'))
const DepartmentManagement = lazy(() => import('./pages/college-admin/DepartmentManagement'))
const NoticeManagement = lazy(() => import('./pages/college-admin/NoticeManagement'))
const ReportsManagement = lazy(() => import('./pages/college-admin/ReportsManagement'))
const ModerationManagement = lazy(() => import('./pages/college-admin/ModerationManagement'))
const ActivityLog = lazy(() => import('./pages/college-admin/ActivityLog'))
const CollegeAdminMessages = lazy(() => import('./pages/college-admin/CollegeAdminMessages'))
const CollegeProfile = lazy(() => import('./pages/college-admin/CollegeProfile'))
const AdminProfile = lazy(() => import('./pages/college-admin/AdminProfile'))
const ChangePassword = lazy(() => import('./pages/college-admin/ChangePassword'))

// Synchronizes real-time socket events with global SwishContext state
function RealtimeListener() {
  const { on, off } = useSocket()
  const { updatePostLikeRealtime, updatePostCommentRealtime, addNotificationRealtime, updateStoryReplyRealtime } = useSwish()

  useEffect(() => {
    if (!on || !off) return

    const handleLikeUpdate = (data) => {
      if (data?.postId) {
        updatePostLikeRealtime(data)
      }
    }

    const handleCommentUpdate = (data) => {
      if (data?.postId) {
        updatePostCommentRealtime(data)
      }
    }

    const handleNewNotification = (data) => {
      if (data?.id) {
        addNotificationRealtime(data)
      }
    }

    const handleStoryReply = (data) => {
      if (data?.storyId && data?.reply) {
        updateStoryReplyRealtime(data)
      }
    }

    on('post:like:update', handleLikeUpdate)
    on('post:comment:update', handleCommentUpdate)
    on('notification:new', handleNewNotification)
    on('story:reply', handleStoryReply)

    return () => {
      off('post:like:update', handleLikeUpdate)
      off('post:comment:update', handleCommentUpdate)
      off('notification:new', handleNewNotification)
      off('story:reply', handleStoryReply)
    }
  }, [on, off, updatePostLikeRealtime, updatePostCommentRealtime, addNotificationRealtime, updateStoryReplyRealtime])

  return null
}

// Inner wrapper so we can read currentUser from SwishContext
function SocketBridge({ children }) {
  const { currentUser } = useSwish()
  return (
    <SocketProvider userId={currentUser?.id}>
      <RealtimeListener />
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
            <GlobalToast />
            <Suspense fallback={<PageFallback />}>
              <Routes>
                {/* ── Public ─────────────────────────────────────────────── */}
                <Route path="/" element={<LandingPage />} />
                <Route path="/login" element={<LoginPage />} />
                <Route path="/join" element={<JoinPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
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
                  <Route path="/trending" element={<TrendingPage />} />
                  <Route path="/profile/:userId" element={<ProfilePage />} />
                  <Route path="/notifications" element={<NotificationsPage />} />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/messages" element={<MessagesPage />} />
                  <Route path="/post/:postId" element={<PostPage />} />
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
                  <Route path="notices" element={<FacultyPage defaultTab="Notices" />} />
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
                  <Route path="analytics" element={<CollegeAdminAnalytics />} />
                  <Route path="students" element={<StudentManagement />} />
                  <Route path="faculty" element={<FacultyManagement />} />
                  <Route path="departments" element={<DepartmentManagement />} />
                  <Route path="notices" element={<NoticeManagement />} />
                  <Route path="reports" element={<ReportsManagement />} />
                  <Route path="moderation" element={<ModerationManagement />} />
                  <Route path="activity-log" element={<ActivityLog />} />
                  <Route path="messages" element={<CollegeAdminMessages />} />
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
            </Suspense>
          </BrowserRouter>
        </SocketBridge>
      </SwishProvider>
    </ThemeProvider>
  )
}

