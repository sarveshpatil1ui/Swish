import React, { createContext, useContext, useState } from 'react';
import { mockPosts, mockUsers, mockNotifications, mockReports, currentUser } from '../data/mockData';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('swish-dark');
    if (saved !== null) {
      const isDark = JSON.parse(saved);
      if (isDark) document.documentElement.classList.add('dark');
      return isDark;
    }
    return false;
  });

  const [posts, setPosts] = useState(mockPosts);
  const [users, setUsers] = useState(mockUsers);
  const [notifications, setNotifications] = useState(mockNotifications);
  const [reports, setReports] = useState(mockReports);

  // ── User (Student / Faculty) Auth ──────────────────────────────────────────
  const [isUserAuth, setIsUserAuth] = useState(() => {
    return localStorage.getItem('swish-user-auth') === 'true';
  });

  const [me, setMe] = useState(() => {
    const savedUserId = localStorage.getItem('swish-user-id');
    if (savedUserId) {
      const user = [...mockUsers, currentUser].find(u => u.id === savedUserId);
      if (user) return user;
    }
    return currentUser;
  });

  /**
   * Log in as a student / faculty member.
   * Simple prototype logic — email containing 'kedar' → currentUser, otherwise mockUsers[0].
   */
  const loginUser = (email) => {
    const isKedar = email.toLowerCase().includes('kedar');
    const user = isKedar ? currentUser : mockUsers[0];
    setMe(user);
    setIsUserAuth(true);
    localStorage.setItem('swish-user-id', user.id);
    localStorage.setItem('swish-user-auth', 'true');
  };

  const logoutUser = () => {
    setIsUserAuth(false);
    localStorage.removeItem('swish-user-auth');
    localStorage.removeItem('swish-user-id');
  };

  // ── Admin Auth ──────────────────────────────────────────────────────────────
  const [isAdminAuth, setIsAdminAuth] = useState(() => {
    return localStorage.getItem('swish-admin') === 'true';
  });

  /** Admin credentials are validated in AdminLogin.jsx before calling this. */
  const adminLogin = () => {
    setIsAdminAuth(true);
    localStorage.setItem('swish-admin', 'true');
  };

  const adminLogout = () => {
    setIsAdminAuth(false);
    localStorage.removeItem('swish-admin');
  };

  // ── Derived state ───────────────────────────────────────────────────────────
  const unreadCount = notifications.filter(n => !n.isRead).length;

  // ── Dark mode ───────────────────────────────────────────────────────────────
  const toggleDarkMode = () => {
    setDarkMode(d => {
      const next = !d;
      if (next) document.documentElement.classList.add('dark');
      else document.documentElement.classList.remove('dark');
      localStorage.setItem('swish-dark', JSON.stringify(next));
      return next;
    });
  };

  // ── Post actions ────────────────────────────────────────────────────────────
  const toggleLike = (postId) => {
    setPosts(ps => ps.map(p =>
      p.id === postId
        ? { ...p, isLiked: !p.isLiked, likes: p.isLiked ? p.likes - 1 : p.likes + 1 }
        : p
    ));
  };

  const toggleBookmark = (postId) => {
    setPosts(ps => ps.map(p =>
      p.id === postId ? { ...p, isBookmarked: !p.isBookmarked } : p
    ));
  };

  const addComment = (postId, text) => {
    setPosts(ps => ps.map(p =>
      p.id === postId ? { ...p, comments: p.comments + 1 } : p
    ));
  };

  const addPost = (newPost) => {
    const post = {
      id: `p${Date.now()}`,
      author: me,
      content: newPost.content,
      image: newPost.image || null,
      tags: newPost.tags || [],
      likes: 0,
      comments: 0,
      shares: 0,
      isLiked: false,
      isBookmarked: false,
      createdAt: new Date().toISOString(),
      visibility: newPost.visibility || 'campus',
    };
    setPosts(ps => [post, ...ps]);
  };

  const deletePost = (postId) => {
    setPosts(ps => ps.filter(p => p.id !== postId));
  };

  // ── User / follow actions ───────────────────────────────────────────────────
  const toggleFollow = (userId) => {
    setUsers(us => us.map(u =>
      u.id === userId
        ? { ...u, isFollowing: !u.isFollowing, followers: u.isFollowing ? u.followers - 1 : u.followers + 1 }
        : u
    ));
  };

  // ── Notification actions ────────────────────────────────────────────────────
  const markAllRead = () => {
    setNotifications(ns => ns.map(n => ({ ...n, isRead: true })));
  };

  const markRead = (id) => {
    setNotifications(ns => ns.map(n => n.id === id ? { ...n, isRead: true } : n));
  };

  // ── Report actions ──────────────────────────────────────────────────────────
  const addReport = (reportData) => {
    const report = {
      id: `r${Date.now()}`,
      reporter: me,
      reported: reportData.reported,
      post: reportData.post,
      reason: reportData.reason,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    setReports(rs => [report, ...rs]);
  };

  const updateReportStatus = (reportId, status) => {
    setReports(rs => rs.map(r => r.id === reportId ? { ...r, status } : r));
  };

  return (
    <AppContext.Provider value={{
      darkMode, toggleDarkMode,
      posts, toggleLike, toggleBookmark, addComment, addPost, deletePost,
      users, toggleFollow,
      notifications, unreadCount, markAllRead, markRead,
      reports, addReport, updateReportStatus,
      me,
      // User auth
      isUserAuth, loginUser, logoutUser,
      // Admin auth
      isAdminAuth, adminLogin, adminLogout,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
};
