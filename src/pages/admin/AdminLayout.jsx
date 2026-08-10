import React, { useState } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import {
  LayoutDashboard, Users, FileText, Flag, Shield,
  ArrowLeft, Waves, Bell, Settings, ChevronRight,
  Activity, LogOut
} from 'lucide-react';
import { mockAdminStats } from '../../data/mockData';
import { useApp } from '../../context/AppContext';

const adminNav = [
  { icon: LayoutDashboard, label: 'Overview', path: '/admin', badge: null },
  { icon: Users,           label: 'Users',    path: '/admin/users', badge: null },
  { icon: FileText,        label: 'Posts',    path: '/admin/posts', badge: null },
  { icon: Flag,            label: 'Reports',  path: '/admin/reports', badge: mockAdminStats.pendingReports },
  { icon: Shield,          label: 'Moderation', path: '/admin/moderation', badge: null },
];

export default function AdminLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { adminLogout } = useApp();

  const currentPage = adminNav.find(n => 
    n.path === '/admin' 
      ? location.pathname === '/admin' 
      : location.pathname.startsWith(n.path)
  );

  const handleLogout = () => {
    adminLogout();
    navigate('/admin/login');
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-[#09090b] overflow-hidden">
      {/* Admin Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800 flex flex-col shadow-sm">
        {/* Logo / Brand */}
        <div className="px-5 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-brand-500 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-brand-500/20">
              <Waves size={18} className="text-white" />
            </div>
            <div>
              <p className="font-bold text-[15px] text-slate-900 dark:text-white leading-tight">Admin Panel</p>
              <p className="text-[11px] text-slate-400 font-medium">Swish · MIT Pune</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-3">Navigation</p>
          {adminNav.map(({ icon: Icon, label, path, badge }) => {
            const isActive = path === '/admin'
              ? location.pathname === '/admin'
              : location.pathname.startsWith(path);
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 group ${
                  isActive
                    ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <Icon size={18} className={isActive ? '' : 'group-hover:scale-105 transition-transform'} />
                <span className="flex-1">{label}</span>
                {badge && (
                  <span className="w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                    {badge}
                  </span>
                )}
                {isActive && <div className="w-1.5 h-1.5 bg-brand-600 rounded-full" />}
              </button>
            );
          })}
        </nav>

        {/* Admin Footer */}
        <div className="px-4 py-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
          <div className="flex items-center justify-between px-2 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/50">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gradient-to-br from-brand-500 to-violet-600 rounded-full flex items-center justify-center flex-shrink-0">
                <Shield size={14} className="text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-bold text-slate-800 dark:text-slate-200 leading-tight">Kedar Bhanage</p>
                <p className="text-[11px] text-slate-400 truncate">Super Admin</p>
              </div>
            </div>
            <button 
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-lg transition-colors"
              title="Logout Admin"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Admin Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="h-14 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between px-6 flex-shrink-0 shadow-sm">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400 font-medium">Admin</span>
            <ChevronRight size={14} className="text-slate-300" />
            <span className="font-bold text-slate-900 dark:text-white">{currentPage?.label || 'Overview'}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 rounded-full">
              <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <span className="text-[12px] font-semibold text-emerald-700 dark:text-emerald-400">
                {mockAdminStats.activeToday.toLocaleString()} online
              </span>
            </div>
            <button className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <Bell size={18} />
            </button>
            <button className="p-2 text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <Settings size={18} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
