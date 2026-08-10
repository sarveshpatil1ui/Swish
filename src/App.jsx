import React, { useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { ToastProvider } from './context/ToastContext';
import Sidebar from './components/Sidebar';
import BottomNav from './components/BottomNav';
import TopBar from './components/TopBar';
import CreatePostModal from './components/CreatePostModal';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import FeedPage from './pages/FeedPage';
import ExplorePage from './pages/ExplorePage';
import SearchPage from './pages/SearchPage';
import NotificationsPage from './pages/NotificationsPage';
import ProfilePage from './pages/ProfilePage';
import OtherProfilePage from './pages/OtherProfilePage';
import BookmarksPage from './pages/BookmarksPage';
import SettingsPage from './pages/SettingsPage';

// Admin
import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsersPage from './pages/admin/AdminUsersPage';
import AdminPostsPage from './pages/admin/AdminPostsPage';
import AdminReportsPage from './pages/admin/AdminReportsPage';
import AdminModerationPage from './pages/admin/AdminModerationPage';
import AdminLogin from './pages/admin/AdminLogin';

import { useApp } from './context/AppContext';

// ─── Guard: Admin-only routes ───────────────────────────────────────────────
function AdminGuard({ children }) {
  const { isAdminAuth } = useApp();
  return isAdminAuth ? children : <Navigate to="/admin/login" replace />;
}

// ─── Guard: Student/Faculty-only routes ─────────────────────────────────────
function UserGuard({ children }) {
  const { isUserAuth } = useApp();
  return isUserAuth ? children : <Navigate to="/login" replace />;
}

// ─── Wrapper: Admin login guard (redirect away if already logged in as admin) ─
function AdminLoginGuard({ children }) {
  const { isAdminAuth } = useApp();
  return isAdminAuth ? <Navigate to="/admin" replace /> : children;
}

// ─── Wrapper: User login guard (redirect away if already logged in as user) ─
function UserLoginGuard({ children }) {
  const { isUserAuth } = useApp();
  return isUserAuth ? <Navigate to="/feed" replace /> : children;
}

// ─── The authenticated user app shell (sidebar + topbar + bottom nav) ───────
function UserAppShell() {
  const [showCreatePost, setShowCreatePost] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      <TopBar onCreatePost={() => setShowCreatePost(true)} />
      <Sidebar onCreatePost={() => setShowCreatePost(true)} />

      <div className="lg:ml-64 flex-1 flex flex-col min-h-0">
        <Routes>
          <Route path="/feed" element={<FeedPage onCreatePost={() => setShowCreatePost(true)} />} />
          <Route path="/explore" element={<ExplorePage />} />
          <Route path="/search" element={<SearchPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/profile" element={<ProfilePage onCreatePost={() => setShowCreatePost(true)} />} />
          <Route path="/user/:userId" element={<OtherProfilePage />} />
          <Route path="/bookmarks" element={<BookmarksPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/feed" replace />} />
        </Routes>
      </div>

      <BottomNav onCreatePost={() => setShowCreatePost(true)} />

      {showCreatePost && (
        <CreatePostModal onClose={() => setShowCreatePost(false)} />
      )}
    </div>
  );
}

// ─── Root app with all top-level routing ────────────────────────────────────
function AppShell() {
  return (
    <Routes>
      {/* Public marketing pages */}
      <Route path="/" element={<LandingPage />} />

      {/* User auth pages (redirect away if already logged in) */}
      <Route
        path="/login"
        element={
          <UserLoginGuard>
            <LoginPage />
          </UserLoginGuard>
        }
      />
      <Route
        path="/register"
        element={
          <UserLoginGuard>
            <RegisterPage />
          </UserLoginGuard>
        }
      />

      {/* Admin auth page (redirect away if already admin logged in) */}
      <Route
        path="/admin/login"
        element={
          <AdminLoginGuard>
            <AdminLogin />
          </AdminLoginGuard>
        }
      />

      {/* ── Admin-only section ── */}
      <Route
        path="/admin"
        element={
          <AdminGuard>
            <AdminLayout />
          </AdminGuard>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="posts" element={<AdminPostsPage />} />
        <Route path="reports" element={<AdminReportsPage />} />
        <Route path="moderation" element={<AdminModerationPage />} />
      </Route>

      {/* ── Authenticated user app section ── */}
      <Route
        path="/*"
        element={
          <UserGuard>
            <UserAppShell />
          </UserGuard>
        }
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AppProvider>
      <ToastProvider>
        <AppShell />
      </ToastProvider>
    </AppProvider>
  );
}
