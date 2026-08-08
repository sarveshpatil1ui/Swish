import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { ThemeProvider } from './context/ThemeContext'
import { AuthProvider } from './context/AuthContext'

// ── Public pages ──────────────────────────────────────────────────────────────
import LandingPage from './pages/LandingPage'
import LoginPage from './pages/LoginPage'
import JoinPage from './pages/JoinPage'
import ProtectedRoute from './pages/ProtectedRoute'

// ── Authenticated app shell ───────────────────────────────────────────────────
import AppLayout from './components/app/AppLayout'

// ── App pages ─────────────────────────────────────────────────────────────────
import HomePage from './pages/app/HomePage'
import ExplorePage from './pages/app/ExplorePage'
import ProfilePage from './pages/app/ProfilePage'
import NotificationsPage from './pages/app/NotificationsPage'
import AdminPage from './pages/app/AdminPage'

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* ── Public ─────────────────────────────────────────────── */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/join" element={<JoinPage />} />

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
            </Route>

            {/* ── Admin (requires admin role) ─────────────────────────── */}
            <Route
              path="/admin"
              element={
                <ProtectedRoute adminOnly>
                  <AppLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<AdminPage />} />
            </Route>

            {/* ── Fallback ────────────────────────────────────────────── */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}
