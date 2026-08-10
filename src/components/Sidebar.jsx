import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Home, Compass, Bell, Search, User, Settings,
  Moon, Sun, Waves, PlusCircle, Bookmark, LogOut
} from 'lucide-react';
import { useApp } from '../context/AppContext';

const navItems = [
  { icon: Home,     label: 'Home',          path: '/feed' },
  { icon: Compass,  label: 'Explore',       path: '/explore' },
  { icon: Search,   label: 'Search',        path: '/search' },
  { icon: Bell,     label: 'Notifications', path: '/notifications' },
  { icon: User,     label: 'Profile',       path: '/profile' },
  { icon: Bookmark, label: 'Bookmarks',     path: '/bookmarks' },
  { icon: Settings, label: 'Settings',      path: '/settings' },
];

export default function Sidebar({ onCreatePost }) {
  const navigate  = useNavigate();
  const location  = useLocation();
  const { darkMode, toggleDarkMode, unreadCount, me, logoutUser } = useApp();

  const handleLogout = () => {
    logoutUser();
    navigate('/login', { replace: true });
  };

  return (
    <aside className="fixed left-0 top-0 h-full w-64 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 z-40 hidden lg:flex">
      {/* Logo */}
      <div className="px-6 py-6 flex items-center gap-3">
        <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/30">
          <Waves size={20} className="text-white" />
        </div>
        <span className="text-xl font-bold gradient-text">Swish</span>
        <span className="text-xs text-slate-400 mt-0.5 font-medium">MIT Pune</span>
      </div>

      {/* Create Post Button */}
      <div className="px-4 mb-2">
        <button
          onClick={onCreatePost}
          className="w-full btn-primary flex items-center justify-center gap-2 py-2.5"
        >
          <PlusCircle size={18} />
          <span>Create Post</span>
        </button>
      </div>

      {/* Nav Links */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {navItems.map(({ icon: Icon, label, path }) => {
          const isActive  = location.pathname === path;
          const showBadge = label === 'Notifications' && unreadCount > 0;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={`w-full text-left ${isActive ? 'nav-item-active' : 'nav-item'}`}
            >
              <span className="relative">
                <Icon size={20} />
                {showBadge && (
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </span>
              <span>{label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom: user card + dark mode + logout */}
      <div className="px-4 pb-4 space-y-2 border-t border-slate-100 dark:border-slate-800 pt-3">
        <button
          onClick={toggleDarkMode}
          className="w-full nav-item text-sm"
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>

        {/* User info row */}
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors group"
          onClick={() => navigate('/profile')}
        >
          <img src={me.avatar} alt={me.name} className="w-9 h-9 avatar ring-2 ring-brand-500/30 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">{me.name}</p>
            <p className="text-xs text-slate-400 truncate">@{me.username}</p>
          </div>
          {/* Logout button — separate from the profile navigate */}
          <button
            onClick={e => { e.stopPropagation(); handleLogout(); }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors flex-shrink-0"
            title="Log out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
