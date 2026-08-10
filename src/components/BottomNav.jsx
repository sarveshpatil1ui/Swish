import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Compass, Bell, Search, User } from 'lucide-react';
import { useApp } from '../context/AppContext';

const items = [
  { icon: Home, label: 'Home', path: '/feed' },
  { icon: Compass, label: 'Explore', path: '/explore' },
  { icon: Search, label: 'Search', path: '/search' },
  { icon: Bell, label: 'Alerts', path: '/notifications' },
  { icon: User, label: 'Profile', path: '/profile' },
];

export default function BottomNav({ onCreatePost }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { unreadCount } = useApp();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border-t border-slate-100 dark:border-slate-800 flex lg:hidden z-40 pb-safe shadow-[0_-4px_24px_rgba(0,0,0,0.04)]">
      {items.map(({ icon: Icon, label, path }) => {
        const isActive = location.pathname === path;
        const showBadge = label === 'Alerts' && unreadCount > 0;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 min-h-[56px] transition-colors ${
              isActive
                ? 'text-brand-600 dark:text-brand-400'
                : 'text-slate-500 dark:text-slate-400'
            }`}
          >
            <span className="relative flex items-center justify-center w-8 h-8 rounded-full">
              <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
              {showBadge && (
                <span className="absolute top-0 -right-0.5 w-3.5 h-3.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                  
                </span>
              )}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
